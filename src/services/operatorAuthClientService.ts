/**
 * TASC IIoT Studio — Operator Auth Client Service
 *
 * HTTP wrapper for all /api/auth/op endpoints.
 * Manages session token in sessionStorage (dies on tab/browser close).
 *
 * Key design decisions:
 * - Token is NEVER stored in localStorage (avoids XSS persistence)
 * - All requests include Authorization: Bearer <token>
 * - On 401: dispatches a custom 'op_session_expired' DOM event
 * - On NetworkError: dispatches 'op_server_offline' DOM event
 */

import type {
  OperatorSession,
  OperatorUser,
  OperatorSecurityPolicy,
  OperatorAuditEvent,
  OperatorAuditAction,
  CreateUserRequest,
  UpdateUserRequest,
  PackagedOperatorCredentials,
  AuditLogQuery,
  AuditExportFormat
} from '../types/auth';

const SESSION_STORAGE_KEY = 'tasc_op_token';
const API_BASE = '/api/auth/op';

// ─── Token Helpers ────────────────────────────────────────────────────────────

export function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, token);
  } catch {}
}

export function clearStoredToken(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

// ─── Fetch Wrapper ────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  requireToken = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {})
  };

  let isEngineeringMode = false;
  try {
    const raw = localStorage.getItem('tasc_app_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.userRole === 'admin') isEngineeringMode = true;
    }
  } catch {}

  if (requireToken) {
    const token = getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (isEngineeringMode) {
      headers['x-tasc-engineering-admin'] = 'true';
    }
  } else if (isEngineeringMode) {
    headers['x-tasc-engineering-admin'] = 'true';
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    // Network error — server unreachable
    window.dispatchEvent(new CustomEvent('op_server_offline'));
    throw new Error('TASC server is unreachable. Check network connection.');
  }

  if (response.status === 401) {
    if (!isEngineeringMode) {
      clearStoredToken();
      window.dispatchEvent(new CustomEvent('op_session_expired'));
    }
    throw new Error('Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error ?? `HTTP ${response.status}`);
  return data as T;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const operatorAuthClient = {

  // ── Status & Init ──────────────────────────────────────────────────────────

  async getStatus(): Promise<{ isInitialized: boolean; requireSetup: boolean }> {
    return apiFetch('/status', {}, false);
  },

  async initAdmin(username: string, displayName: string, password: string): Promise<{ session: OperatorSession }> {
    const data = await apiFetch<{ session: OperatorSession }>(
      '/init-admin',
      { method: 'POST', body: JSON.stringify({ username, displayName, password }) },
      false
    );
    storeToken(data.session.token);
    return data;
  },

  // ── Login / Logout ─────────────────────────────────────────────────────────

  async login(username: string, password: string): Promise<{
    token: string;
    user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>;
    expiresAt: string;
    sessionTimeoutMinutes: number;
  }> {
    const data = await apiFetch<{
      token: string;
      user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>;
      expiresAt: string;
      sessionTimeoutMinutes: number;
    }>('/login', { method: 'POST', body: JSON.stringify({ username, password }) }, false);
    storeToken(data.token);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await apiFetch('/logout', { method: 'POST' });
    } catch {}
    clearStoredToken();
  },

  // ── Session Verify (on page reload) ───────────────────────────────────────

  async verifySession(): Promise<{
    user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>;
    expiresAt: string;
    sessionTimeoutMinutes: number;
  } | null> {
    const token = getStoredToken();
    if (!token) return null;
    try {
      return await apiFetch('/session/verify');
    } catch {
      clearStoredToken();
      return null;
    }
  },

  // ── User Management ────────────────────────────────────────────────────────

  async listUsers(): Promise<{ users: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>[] }> {
    return apiFetch('/users');
  },

  async createUser(data: CreateUserRequest): Promise<{ user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'> }> {
    return apiFetch('/users', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateUser(id: string, data: UpdateUserRequest): Promise<{ success: boolean }> {
    return apiFetch(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/users/${id}`, { method: 'DELETE' });
  },

  async unlockUser(id: string): Promise<{ success: boolean }> {
    return apiFetch(`/users/${id}/unlock`, { method: 'POST' });
  },

  async updatePolicy(policy: OperatorSecurityPolicy): Promise<{ success: boolean }> {
    return apiFetch('/policy', { method: 'PUT', body: JSON.stringify(policy) });
  },

  // ── Audit Log ──────────────────────────────────────────────────────────────

  async getAuditLog(query: AuditLogQuery): Promise<{
    events: OperatorAuditEvent[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.pageSize) params.set('pageSize', String(query.pageSize));
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.username) params.set('username', query.username);
    if (query.action) params.set('action', query.action);
    if (query.success !== undefined) params.set('success', String(query.success));
    return apiFetch(`/audit-log?${params.toString()}`);
  },

  /**
   * Trigger a file download for audit log export.
   * Opens a hidden anchor link — browser handles the file download dialog.
   */
  downloadAuditExport(format: AuditExportFormat, query: AuditLogQuery = {}): void {
    const params = new URLSearchParams({ format });
    if (query.from) params.set('from', query.from);
    if (query.to) params.set('to', query.to);
    if (query.username) params.set('username', query.username);
    if (query.action) params.set('action', query.action);
    const token = getStoredToken();
    const url = `${API_BASE}/audit-log/export?${params.toString()}`;
    // Use fetch to download with auth header, then trigger download
    fetch(url, { headers: { Authorization: `Bearer ${token ?? ''}` } })
      .then(res => {
        const contentDisp = res.headers.get('Content-Disposition') ?? '';
        const match = contentDisp.match(/filename="([^"]+)"/);
        const filename = match ? match[1] : `audit_export.${format}`;
        return res.blob().then(blob => ({ blob, filename }));
      })
      .then(({ blob, filename }) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      })
      .catch(err => console.error('[AuditExport] Download failed:', err));
  },

  /**
   * Fire-and-forget audit event log from frontend.
   * Used by handlePublish and handleAcknowledgeAlarm in AppContext.
   */
  logAuditEvent(action: OperatorAuditAction, details: Record<string, any>): void {
    const token = getStoredToken();
    if (!token) return;
    // Non-blocking fetch — don't await, don't block the actual operation
    fetch(`${API_BASE}/audit-log/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, success: true, details })
    }).catch(() => {}); // Silently ignore — audit logging must never block operations
  },

  // ── Package Export / Import ────────────────────────────────────────────────

  async exportForPackaging(): Promise<PackagedOperatorCredentials | null> {
    try {
      return await apiFetch('/export');
    } catch {
      return null;
    }
  },

  async importFromPackage(
    pkg: PackagedOperatorCredentials,
    confirmOverwrite: boolean,
    sourcePkgName?: string
  ): Promise<{ success: boolean; requiresConfirmation?: boolean; error?: string }> {
    try {
      return await apiFetch('/import', {
        method: 'POST',
        body: JSON.stringify({ pkg, confirmOverwrite, sourcePkgName })
      });
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
