/**
 * TASC IIoT Studio — Operator Auth Context
 *
 * Provides the operator authentication state and methods to the entire
 * Client Edition component tree.
 *
 * Responsibilities:
 * - Check system initialization status on mount (GET /api/auth/op/status)
 * - Restore session from sessionStorage token on page reload
 * - Manage session auto-lock timer (based on securityPolicy.sessionTimeoutMinutes)
 * - Reset lock timer on any user activity (click, keydown)
 * - Listen for 'op_session_expired' and 'op_server_offline' events
 * - Expose hasPermission() for component-level guards
 * - Expose logAuditEvent() for handlePublish / handleAcknowledgeAlarm
 *
 * NOTE: Engineering Edition (TASC_ENGG admin, userRole === 'admin') bypasses
 * this context entirely. The auth gate in App.tsx is skipped for that role.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback
} from 'react';
import { operatorAuthClient } from '../services/operatorAuthClientService';
import type {
  OperatorSession,
  OperatorUser,
  OperatorPermissions,
  OperatorSecurityPolicy,
  OperatorAuditEvent,
  OperatorAuditAction,
  CreateUserRequest,
  UpdateUserRequest,
  AuditLogQuery,
  AuditExportFormat
} from '../types/auth';

// ─── Context Types ────────────────────────────────────────────────────────────

export interface OperatorAuthContextType {
  // State
  currentOperator: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'> | null;
  isAuthenticated: boolean;
  isInitialized: boolean;   // credentials file exists on server
  requireSetup: boolean;    // first-boot: no admin created yet
  isServerOnline: boolean;
  isLoading: boolean;       // true during initial status check

  // Auth actions
  login(username: string, password: string): Promise<{
    success: boolean;
    error?: string;
    attemptsLeft?: number;
    lockedUntilMs?: number | null;
  }>;
  logout(): Promise<void>;
  initAdmin(username: string, displayName: string, password: string): Promise<{ success: boolean; error?: string }>;

  // Permission check (main gatekeeper used by handlePublish, etc.)
  hasPermission(perm: keyof OperatorPermissions): boolean;

  // User management (Admin only — components should also check hasPermission('manageUsers'))
  listUsers(): Promise<Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>[]>;
  createUser(data: CreateUserRequest): Promise<{ success: boolean; error?: string }>;
  updateUser(id: string, data: UpdateUserRequest): Promise<{ success: boolean; error?: string }>;
  deleteUser(id: string): Promise<{ success: boolean; error?: string }>;
  unlockUser(id: string): Promise<{ success: boolean; error?: string }>;
  updatePolicy(policy: OperatorSecurityPolicy): Promise<{ success: boolean; error?: string }>;
  getPolicy(): Promise<OperatorSecurityPolicy | null>;

  // Audit
  getAuditLog(query: AuditLogQuery): Promise<{ events: OperatorAuditEvent[]; total: number; page: number; pageSize: number }>;
  downloadAuditExport(format: AuditExportFormat, query?: AuditLogQuery): void;
  logAuditEvent(action: OperatorAuditAction, details: Record<string, any>): void;

  // Session timer (exposed for OperatorStatusBar countdown)
  sessionTimeoutMinutes: number;
  sessionExpiresAt: string | null;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const OperatorAuthContext = createContext<OperatorAuthContextType | null>(null);

export function useOperatorAuth(): OperatorAuthContextType {
  const ctx = useContext(OperatorAuthContext);
  if (!ctx) throw new Error('useOperatorAuth must be used inside <OperatorAuthProvider>');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props { children: React.ReactNode; }

export const OperatorAuthProvider: React.FC<Props> = ({ children }) => {
  const [currentOperator, setCurrentOperator] = useState<Omit<OperatorUser, 'passwordHash' | 'passwordSalt'> | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [requireSetup, setRequireSetup] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(480);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<string | null>(null);

  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityListenerRef = useRef<(() => void) | null>(null);

  // ── Session Lock Timer ───────────────────────────────────────────────────────

  const startLockTimer = useCallback((timeoutMinutes: number) => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    const ms = timeoutMinutes * 60 * 1000;
    lockTimerRef.current = setTimeout(() => {
      // Session expired — force re-login
      setIsAuthenticated(false);
      setCurrentOperator(null);
      operatorAuthClient.logout().catch(() => {});
      window.dispatchEvent(new CustomEvent('op_session_expired'));
    }, ms);
  }, []);

  const resetLockTimer = useCallback(() => {
    if (isAuthenticated && sessionTimeoutMinutes > 0) {
      startLockTimer(sessionTimeoutMinutes);
    }
  }, [isAuthenticated, sessionTimeoutMinutes, startLockTimer]);

  // Activity reset on any user interaction
  useEffect(() => {
    if (!isAuthenticated) return;
    const handler = () => resetLockTimer();
    activityListenerRef.current = handler;
    window.addEventListener('click', handler, { passive: true });
    window.addEventListener('keydown', handler, { passive: true });
    return () => {
      window.removeEventListener('click', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [isAuthenticated, resetLockTimer]);

  // ── Initialization & Session Restore ─────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // 1. Check system status
        const status = await operatorAuthClient.getStatus();
        if (cancelled) return;
        setIsInitialized(status.isInitialized);
        setRequireSetup(status.requireSetup);
        setIsServerOnline(true);

        // 2. Restore session from sessionStorage if token exists
        if (status.isInitialized) {
          const verified = await operatorAuthClient.verifySession();
          if (!cancelled && verified) {
            setCurrentOperator(verified.user as any);
            setIsAuthenticated(true);
            setSessionTimeoutMinutes(verified.sessionTimeoutMinutes);
            setSessionExpiresAt(verified.expiresAt);
            startLockTimer(verified.sessionTimeoutMinutes);
          }
        }
      } catch {
        if (!cancelled) {
          setIsServerOnline(false);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();

    // Listen for server-offline events from client service
    const offlineHandler = () => { setIsServerOnline(false); };
    const expiredHandler = () => { setIsAuthenticated(false); setCurrentOperator(null); };
    window.addEventListener('op_server_offline', offlineHandler);
    window.addEventListener('op_session_expired', expiredHandler);

    return () => {
      cancelled = true;
      window.removeEventListener('op_server_offline', offlineHandler);
      window.removeEventListener('op_session_expired', expiredHandler);
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth Actions ─────────────────────────────────────────────────────────────

  const login = useCallback(async (username: string, password: string) => {
    try {
      const data = await operatorAuthClient.login(username, password);
      setCurrentOperator(data.user as any);
      setIsAuthenticated(true);
      setSessionTimeoutMinutes(data.sessionTimeoutMinutes);
      setSessionExpiresAt(data.expiresAt);
      startLockTimer(data.sessionTimeoutMinutes);
      return { success: true };
    } catch (err: any) {
      // Parse attemptsLeft/lockedUntilMs from error response if available
      return { success: false, error: err.message };
    }
  }, [startLockTimer]);

  const logout = useCallback(async () => {
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    await operatorAuthClient.logout();
    setIsAuthenticated(false);
    setCurrentOperator(null);
    setSessionExpiresAt(null);
  }, []);

  const initAdmin = useCallback(async (username: string, displayName: string, password: string) => {
    try {
      const data = await operatorAuthClient.initAdmin(username, displayName, password);
      setCurrentOperator(data.session as any);
      setIsAuthenticated(true);
      setIsInitialized(true);
      setRequireSetup(false);
      setSessionTimeoutMinutes(480);
      startLockTimer(480);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [startLockTimer]);

  // ── Permission Check ─────────────────────────────────────────────────────────

  const hasPermission = useCallback((perm: keyof OperatorPermissions): boolean => {
    // Check if in Engineering Studio mode
    try {
      const raw = localStorage.getItem('tasc_app_state');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.userRole === 'admin') return true;
      }
    } catch {}

    if (!isAuthenticated || !currentOperator) return false;
    return currentOperator.permissions[perm] === true;
  }, [isAuthenticated, currentOperator]);

  // ── User Management ──────────────────────────────────────────────────────────

  const listUsers = useCallback(async () => {
    const data = await operatorAuthClient.listUsers();
    return data.users;
  }, []);

  const createUser = useCallback(async (data: CreateUserRequest) => {
    try {
      await operatorAuthClient.createUser(data);
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  }, []);

  const updateUser = useCallback(async (id: string, data: UpdateUserRequest) => {
    try {
      await operatorAuthClient.updateUser(id, data);
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await operatorAuthClient.deleteUser(id);
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  }, []);

  const unlockUser = useCallback(async (id: string) => {
    try {
      await operatorAuthClient.unlockUser(id);
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  }, []);

  const updatePolicy = useCallback(async (policy: OperatorSecurityPolicy) => {
    try {
      await operatorAuthClient.updatePolicy(policy);
      setSessionTimeoutMinutes(policy.sessionTimeoutMinutes);
      return { success: true };
    } catch (err: any) { return { success: false, error: err.message }; }
  }, []);

  const getPolicy = useCallback(async (): Promise<OperatorSecurityPolicy | null> => {
    // Policy is returned on session verify; for now fetch from the users list context
    return null; // Components that need policy fetch it from listUsers or a dedicated endpoint
  }, []);

  // ── Audit ────────────────────────────────────────────────────────────────────

  const getAuditLog = useCallback(async (query: AuditLogQuery) => {
    return operatorAuthClient.getAuditLog(query);
  }, []);

  const downloadAuditExport = useCallback((format: AuditExportFormat, query: AuditLogQuery = {}) => {
    operatorAuthClient.downloadAuditExport(format, query);
  }, []);

  const logAuditEvent = useCallback((action: OperatorAuditAction, details: Record<string, any>) => {
    operatorAuthClient.logAuditEvent(action, details);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────

  const value: OperatorAuthContextType = {
    currentOperator,
    isAuthenticated,
    isInitialized,
    requireSetup,
    isServerOnline,
    isLoading,
    login,
    logout,
    initAdmin,
    hasPermission,
    listUsers,
    createUser,
    updateUser,
    deleteUser,
    unlockUser,
    updatePolicy,
    getPolicy,
    getAuditLog,
    downloadAuditExport,
    logAuditEvent,
    sessionTimeoutMinutes,
    sessionExpiresAt
  };

  return (
    <OperatorAuthContext.Provider value={value}>
      {children}
    </OperatorAuthContext.Provider>
  );
};
