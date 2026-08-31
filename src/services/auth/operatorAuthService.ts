/**
 * TASC IIoT Studio — Operator Authentication Backend Service
 *
 * Handles all persistent operations for the Operator Credential System:
 * - PBKDF2-SHA256 password hashing & verification
 * - User CRUD with last-admin protection
 * - In-process session token issuance and management
 * - Rate limiting (brute-force protection)
 * - Audit event appending to data/operator_audit.json
 * - Audit log export in CSV, HTML, and PDF formats
 * - Credential block export/import for .tasc packaging
 *
 * Storage files (all in <project_root>/data/):
 *   operator_credentials.json  — users, policy, credential signature
 *   operator_audit.json        — append-only audit event array
 *
 * NOTE: Engineering Edition (TASC_ENGG) login is completely separate
 * and is NOT handled by this service.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  OperatorUser,
  OperatorCredentialsStore,
  OperatorSecurityPolicy,
  OperatorSession,
  OperatorAuditEvent,
  OperatorAuditAction,
  OperatorAuditDetails,
  PackagedOperatorCredentials,
  CreateUserRequest,
  UpdateUserRequest,
  OperatorRole,
  OperatorPermissions,
  AuditExportFormat,
  AuditLogQuery
} from '../../types/auth';
import { DEFAULT_SECURITY_POLICY, OPERATOR_PERMISSION_PRESETS } from '../../types/auth';

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_DIR = path.resolve(process.cwd(), 'data');
const CREDENTIALS_FILE = path.join(DATA_DIR, 'operator_credentials.json');
const AUDIT_FILE = path.join(DATA_DIR, 'operator_audit.json');
const AUDIT_MAX_RECORDS = 10_000;
const AUDIT_ARCHIVE_THRESHOLD = 9_500;

/** PBKDF2 parameters — NIST SP 800-132 compliant */
const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha256';
const SALT_BYTES = 32;

/**
 * Independent HMAC salt for the credential block signature.
 * Separate from the main .tasc package SIGNATURE_SALT in clientSecurity.ts.
 */
const OPERATOR_CREDENTIAL_SALT = 'TASC_OPERATOR_CRED_HMAC_v2_2026';

/** Session signing secret — randomized per server start */
const SESSION_SECRET = crypto.randomBytes(32).toString('hex');

// ─── In-Memory State ──────────────────────────────────────────────────────────

interface ActiveSession extends OperatorSession {
  expiresTimestamp: number;
}

interface FailedAttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const activeSessions = new Map<string, ActiveSession>();
const failedAttempts = new Map<string, FailedAttemptRecord>();

// Session cleanup interval — remove expired sessions every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresTimestamp < now) {
      activeSessions.delete(token);
    }
  }
}, 10 * 60 * 1000);

// ─── File I/O Helpers ─────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readCredentials(): OperatorCredentialsStore | null {
  ensureDataDir();
  if (!fs.existsSync(CREDENTIALS_FILE)) return null;
  try {
    const raw = fs.readFileSync(CREDENTIALS_FILE, 'utf-8');
    return JSON.parse(raw) as OperatorCredentialsStore;
  } catch {
    return null;
  }
}

function writeCredentials(store: OperatorCredentialsStore): void {
  ensureDataDir();
  // Recompute signature before every write
  store.credentialSignature = computeCredentialSignature(store.users);
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

function readAuditLog(): OperatorAuditEvent[] {
  ensureDataDir();
  if (!fs.existsSync(AUDIT_FILE)) return [];
  try {
    const raw = fs.readFileSync(AUDIT_FILE, 'utf-8');
    return JSON.parse(raw) as OperatorAuditEvent[];
  } catch {
    return [];
  }
}

function writeAuditLog(events: OperatorAuditEvent[]): void {
  ensureDataDir();
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(events, null, 2), 'utf-8');
}

// ─── Crypto Helpers ───────────────────────────────────────────────────────────

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN,
    PBKDF2_DIGEST
  ).toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(SALT_BYTES).toString('hex');
}

function computeCredentialSignature(users: OperatorUser[]): string {
  const canonical = JSON.stringify(users);
  return crypto.createHmac('sha256', OPERATOR_CREDENTIAL_SALT).update(canonical).digest('hex');
}

function verifyCredentialSignature(users: OperatorUser[], signature: string): boolean {
  const expected = computeCredentialSignature(users);
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
}

function generateSessionToken(userId: string): string {
  const base = crypto.randomUUID();
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(`${base}:${userId}`).digest('hex').slice(0, 16);
  return `${base}.${sig}`;
}

function generateAuditId(): string {
  return `evt_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

function recordFailedAttempt(username: string, policy: OperatorSecurityPolicy): {
  locked: boolean;
  attemptsLeft: number;
  lockedUntilMs: number | null;
} {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  let record = failedAttempts.get(username);

  if (!record || (now - record.firstAttemptAt > ONE_HOUR && !record.lockedUntil)) {
    record = { count: 1, firstAttemptAt: now, lockedUntil: null };
  } else {
    record.count += 1;
  }

  const lockDurationMs = policy.lockoutDurationMinutes * 60 * 1000;

  if (record.count >= policy.maxFailedAttempts) {
    record.lockedUntil = now + lockDurationMs;
  }

  failedAttempts.set(username, record);

  const attemptsLeft = Math.max(0, policy.maxFailedAttempts - record.count);
  return {
    locked: record.lockedUntil !== null,
    attemptsLeft,
    lockedUntilMs: record.lockedUntil
  };
}

function isAccountLockedInMemory(username: string): { locked: boolean; lockedUntilMs: number | null } {
  const record = failedAttempts.get(username);
  if (!record || !record.lockedUntil) return { locked: false, lockedUntilMs: null };
  if (Date.now() > record.lockedUntil) {
    // Lockout expired
    failedAttempts.delete(username);
    return { locked: false, lockedUntilMs: null };
  }
  return { locked: true, lockedUntilMs: record.lockedUntil };
}

function clearFailedAttempts(username: string): void {
  failedAttempts.delete(username);
}

// ─── Public Service API ───────────────────────────────────────────────────────

export const operatorAuthService = {

  // ── Status ──────────────────────────────────────────────────────────────────

  getStatus(): { isInitialized: boolean; requireSetup: boolean } {
    const store = readCredentials();
    const isInitialized = store !== null && store.isInitialized && store.users.length > 0;
    return { isInitialized, requireSetup: !isInitialized };
  },

  // ── First-Time Admin Initialization ─────────────────────────────────────────

  initializeAdmin(req: CreateUserRequest): {
    success: boolean;
    error?: string;
    session?: OperatorSession;
  } {
    const existing = readCredentials();
    if (existing && existing.isInitialized && existing.users.length > 0) {
      return { success: false, error: 'System already initialized. Use normal login.' };
    }

    if (!req.username || req.username.trim().length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!req.password || req.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    const salt = generateSalt();
    const expiryDays = req.passwordExpiryDays !== undefined ? req.passwordExpiryDays : null;
    const expiresAt = expiryDays && expiryDays > 0
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const user: OperatorUser = {
      id: crypto.randomUUID(),
      username: req.username.trim().toLowerCase(),
      displayName: req.displayName || req.username.trim(),
      role: 'admin',
      securityLevel: 3,
      permissions: OPERATOR_PERMISSION_PRESETS.admin,
      passwordHash: hashPassword(req.password, salt),
      passwordSalt: salt,
      passwordExpiryDays: expiryDays,
      passwordExpiresAt: expiresAt,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: '__system__',
      lastLoginAt: null,
      lastLoginIp: null,
      failedLoginCount: 0,
      lockedUntil: null
    };

    const store: OperatorCredentialsStore = {
      version: 2,
      isInitialized: true,
      initializedAt: new Date().toISOString(),
      users: [user],
      securityPolicy: existing?.securityPolicy ?? { ...DEFAULT_SECURITY_POLICY },
      credentialSignature: '' // computed in writeCredentials
    };
    writeCredentials(store);

    operatorAuthService.appendAuditEvent({
      username: user.username,
      displayName: user.displayName,
      action: 'user_created',
      success: true,
      ip: null,
      details: {
        newUsername: user.username,
        role: user.role,
        permissionsGranted: Object.entries(user.permissions).filter(([, v]) => v).map(([k]) => k)
      }
    });

    const session = operatorAuthService.createSession(user, store.securityPolicy);
    return { success: true, session };
  },

  // ── Login ────────────────────────────────────────────────────────────────────

  login(username: string, password: string, ip: string | null): {
    success: boolean;
    session?: OperatorSession;
    error?: string;
    attemptsLeft?: number;
    lockedUntilMs?: number | null;
  } {
    const store = readCredentials();
    if (!store || !store.isInitialized || store.users.length === 0) {
      return { success: false, error: 'System not initialized. No operator users exist.' };
    }

    const normalizedUsername = username.trim().toLowerCase();

    // Check in-memory rate limiter first
    const lockStatus = isAccountLockedInMemory(normalizedUsername);
    if (lockStatus.locked) {
      return {
        success: false,
        error: 'Account temporarily locked due to too many failed attempts.',
        lockedUntilMs: lockStatus.lockedUntilMs,
        attemptsLeft: 0
      };
    }

    const user = store.users.find(u => u.username === normalizedUsername);

    // Compute hash regardless (timing-safe, prevents username enumeration)
    const testSalt = user?.passwordSalt ?? generateSalt();
    const testHash = hashPassword(password, testSalt);
    const isPasswordValid = user ? crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, 'hex'),
      Buffer.from(testHash, 'hex')
    ) : false;

    if (!user || !isPasswordValid || !user.isActive) {
      const rateResult = recordFailedAttempt(normalizedUsername, store.securityPolicy);
      operatorAuthService.appendAuditEvent({
        username: normalizedUsername,
        displayName: user?.displayName ?? normalizedUsername,
        action: rateResult.locked ? 'op_account_locked' : 'op_failed_login',
        success: false,
        ip,
        details: rateResult.locked
          ? { lockoutUntil: new Date(rateResult.lockedUntilMs!).toISOString() }
          : { attemptCount: store.securityPolicy.maxFailedAttempts - rateResult.attemptsLeft }
      });

      return {
        success: false,
        error: user && !user.isActive ? 'Account is disabled. Contact your administrator.' : 'Invalid username or password.',
        attemptsLeft: rateResult.attemptsLeft,
        lockedUntilMs: rateResult.lockedUntilMs
      };
    }

    // Check password expiration tenure
    if (user.passwordExpiresAt && new Date(user.passwordExpiresAt).getTime() < Date.now()) {
      return {
        success: false,
        error: 'Password has expired. Please contact an administrator to reset your password.',
        attemptsLeft: store.securityPolicy.maxFailedAttempts
      };
    }

    // Successful login — reset failed attempts, update lastLogin
    clearFailedAttempts(normalizedUsername);
    user.lastLoginAt = new Date().toISOString();
    user.lastLoginIp = ip;
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    writeCredentials(store);

    const session = operatorAuthService.createSession(user, store.securityPolicy);

    operatorAuthService.appendAuditEvent({
      username: user.username,
      displayName: user.displayName,
      action: 'op_login',
      success: true,
      ip,
      details: { sessionId: session.token.slice(0, 8) + '...' }
    });

    return { success: true, session };
  },

  // ── Session Management ───────────────────────────────────────────────────────

  createSession(user: OperatorUser, policy: OperatorSecurityPolicy): OperatorSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + policy.sessionTimeoutMinutes * 60 * 1000);
    const token = generateSessionToken(user.id);
    const session: ActiveSession = {
      token,
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      permissions: user.permissions,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      lastActivity: now.toISOString(),
      expiresTimestamp: expiresAt.getTime()
    };
    activeSessions.set(token, session);
    return session;
  },

  verifySession(token: string): OperatorSession | null {
    const session = activeSessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresTimestamp) {
      activeSessions.delete(token);
      return null;
    }
    // Refresh last activity
    session.lastActivity = new Date().toISOString();
    return session;
  },

  invalidateSession(token: string, ip: string | null): void {
    const session = activeSessions.get(token);
    if (session) {
      const createdMs = new Date(session.createdAt).getTime();
      const durationMinutes = (Date.now() - createdMs) / 60000;
      operatorAuthService.appendAuditEvent({
        username: session.username,
        displayName: session.displayName,
        action: 'op_logout',
        success: true,
        ip,
        details: { sessionDurationMinutes: Math.round(durationMinutes * 10) / 10 }
      });
      activeSessions.delete(token);
    }
  },

  // ── User CRUD ────────────────────────────────────────────────────────────────

  listUsers(): Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>[] {
    const store = readCredentials();
    if (!store) return [];
    return store.users.map(({ passwordHash: _h, passwordSalt: _s, ...rest }) => rest);
  },

  createUser(
    data: CreateUserRequest,
    createdBySession: OperatorSession,
    ip: string | null
  ): { success: boolean; error?: string; user?: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'> } {
    let store = readCredentials();
    if (!store) {
      store = {
        version: 2,
        isInitialized: true,
        initializedAt: new Date().toISOString(),
        users: [],
        securityPolicy: { ...DEFAULT_SECURITY_POLICY },
        credentialSignature: ''
      };
    }

    const username = data.username.trim().toLowerCase();
    if (store.users.find(u => u.username === username)) {
      return { success: false, error: `Username "${username}" already exists.` };
    }
    if (data.role === 'admin' && !data.permissions.manageUsers) {
      return { success: false, error: 'Admin role requires manageUsers permission.' };
    }

    const salt = generateSalt();
    const expiryDays = data.passwordExpiryDays !== undefined ? data.passwordExpiryDays : null;
    const expiresAt = expiryDays && expiryDays > 0
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const newUser: OperatorUser = {
      id: crypto.randomUUID(),
      username,
      displayName: data.displayName || username,
      role: data.role,
      securityLevel: data.role === 'admin' ? 3 : data.role === 'supervisor' ? 2 : 1,
      permissions: data.permissions,
      passwordHash: hashPassword(data.password, salt),
      passwordSalt: salt,
      passwordExpiryDays: expiryDays,
      passwordExpiresAt: expiresAt,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: createdBySession.username,
      lastLoginAt: null,
      lastLoginIp: null,
      failedLoginCount: 0,
      lockedUntil: null
    };

    store.users.push(newUser);
    store.isInitialized = true;
    writeCredentials(store);

    operatorAuthService.appendAuditEvent({
      username: createdBySession.username,
      displayName: createdBySession.displayName,
      action: 'user_created',
      success: true,
      ip,
      details: {
        newUsername: newUser.username,
        role: newUser.role,
        permissionsGranted: Object.entries(newUser.permissions).filter(([, v]) => v).map(([k]) => k)
      }
    });

    const { passwordHash: _h, passwordSalt: _s, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  },

  updateUser(
    userId: string,
    data: UpdateUserRequest,
    updaterSession: OperatorSession,
    ip: string | null
  ): { success: boolean; error?: string } {
    const store = readCredentials();
    if (!store) return { success: false, error: 'System not initialized.' };

    const userIdx = store.users.findIndex(u => u.id === userId);
    if (userIdx === -1) return { success: false, error: 'User not found.' };

    const user = store.users[userIdx];

    // Last-admin protection: prevent demoting or deactivating the only manageUsers admin
    if (user.permissions.manageUsers) {
      const otherAdmins = store.users.filter(u => u.id !== userId && u.permissions.manageUsers && u.isActive);
      if (otherAdmins.length === 0) {
        if (data.isActive === false) {
          return { success: false, error: 'Cannot disable the only active user with management rights. Promote another user first.' };
        }
        if (data.permissions && !data.permissions.manageUsers) {
          return { success: false, error: 'Cannot remove management rights from the only admin. Assign management rights to another user first.' };
        }
        if (data.role && data.role !== 'admin') {
          return { success: false, error: 'Cannot demote the only admin. Promote another user to admin first.' };
        }
      }
    }

    const changed: string[] = [];
    if (data.displayName !== undefined && data.displayName !== user.displayName) { user.displayName = data.displayName; changed.push('displayName'); }
    if (data.role !== undefined && data.role !== user.role) { user.role = data.role; user.securityLevel = data.role === 'admin' ? 3 : data.role === 'supervisor' ? 2 : 1; changed.push('role'); }
    if (data.permissions !== undefined) { user.permissions = data.permissions; changed.push('permissions'); }
    if (data.isActive !== undefined && data.isActive !== user.isActive) { user.isActive = data.isActive; changed.push('isActive'); }
    if (data.passwordExpiryDays !== undefined) {
      user.passwordExpiryDays = data.passwordExpiryDays;
      user.passwordExpiresAt = data.passwordExpiryDays && data.passwordExpiryDays > 0
        ? new Date(Date.now() + data.passwordExpiryDays * 24 * 60 * 60 * 1000).toISOString()
        : null;
      changed.push('passwordExpiry');
    }
    if (data.newPassword) {
      const salt = generateSalt();
      user.passwordHash = hashPassword(data.newPassword, salt);
      user.passwordSalt = salt;
      // Reset expiry calculation if tenure is active
      if (user.passwordExpiryDays && user.passwordExpiryDays > 0) {
        user.passwordExpiresAt = new Date(Date.now() + user.passwordExpiryDays * 24 * 60 * 60 * 1000).toISOString();
      }
      changed.push('password');
    }

    store.users[userIdx] = user;
    writeCredentials(store);

    operatorAuthService.appendAuditEvent({
      username: updaterSession.username,
      displayName: updaterSession.displayName,
      action: changed.includes('password') ? 'password_changed' : 'user_modified',
      success: true,
      ip,
      details: { targetUsername: user.username, fieldChanged: changed }
    });

    return { success: true };
  },

  deleteUser(
    userId: string,
    deleterSession: OperatorSession,
    ip: string | null
  ): { success: boolean; error?: string } {
    const store = readCredentials();
    if (!store) return { success: false, error: 'System not initialized.' };

    const user = store.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    // Cannot delete yourself
    if (user.id === deleterSession.userId) {
      return { success: false, error: 'Cannot delete your own account while logged in.' };
    }

    // Last admin protection
    if (user.permissions.manageUsers) {
      const remainingAdmins = store.users.filter(u => u.id !== userId && u.permissions.manageUsers && u.isActive);
      if (remainingAdmins.length === 0) {
        return { success: false, error: 'Cannot delete the only account with management rights. Create another admin first.' };
      }
    }

    store.users = store.users.filter(u => u.id !== userId);
    writeCredentials(store);

    operatorAuthService.appendAuditEvent({
      username: deleterSession.username,
      displayName: deleterSession.displayName,
      action: 'user_deleted',
      success: true,
      ip,
      details: { targetUsername: user.username }
    });

    return { success: true };
  },

  unlockUser(
    userId: string,
    adminSession: OperatorSession,
    ip: string | null
  ): { success: boolean; error?: string } {
    const store = readCredentials();
    if (!store) return { success: false, error: 'System not initialized.' };

    const user = store.users.find(u => u.id === userId);
    if (!user) return { success: false, error: 'User not found.' };

    clearFailedAttempts(user.username);
    user.failedLoginCount = 0;
    user.lockedUntil = null;
    writeCredentials(store);

    operatorAuthService.appendAuditEvent({
      username: adminSession.username,
      displayName: adminSession.displayName,
      action: 'user_unlocked',
      success: true,
      ip,
      details: { targetUsername: user.username }
    });

    return { success: true };
  },

  updatePolicy(
    policy: OperatorSecurityPolicy,
    adminSession: OperatorSession,
    ip: string | null
  ): { success: boolean; error?: string } {
    const store = readCredentials();
    if (!store) return { success: false, error: 'System not initialized.' };

    const oldPolicy = store.securityPolicy;
    store.securityPolicy = policy;
    writeCredentials(store);

    operatorAuthService.appendAuditEvent({
      username: adminSession.username,
      displayName: adminSession.displayName,
      action: 'policy_changed',
      success: true,
      ip,
      details: { policyField: 'securityPolicy', oldValue: oldPolicy, newValue: policy }
    });

    return { success: true };
  },

  getPolicy(): OperatorSecurityPolicy | null {
    const store = readCredentials();
    return store?.securityPolicy ?? null;
  },

  // ── Audit Log ────────────────────────────────────────────────────────────────

  appendAuditEvent(event: Omit<OperatorAuditEvent, 'id' | 'timestamp'>): void {
    try {
      let events = readAuditLog();

      // Rotate if approaching max
      if (events.length >= AUDIT_ARCHIVE_THRESHOLD) {
        const archiveName = `operator_audit_archive_${new Date().toISOString().slice(0, 10)}.json`;
        const archivePath = path.join(DATA_DIR, archiveName);
        const toArchive = events.slice(0, events.length - AUDIT_MAX_RECORDS / 2);
        fs.writeFileSync(archivePath, JSON.stringify(toArchive, null, 2), 'utf-8');
        events = events.slice(events.length - AUDIT_MAX_RECORDS / 2);
      }

      const fullEvent: OperatorAuditEvent = {
        id: generateAuditId(),
        timestamp: new Date().toISOString(),
        ...event
      };
      events.push(fullEvent);
      writeAuditLog(events);
    } catch (err) {
      console.error('[OperatorAuthService] Failed to write audit event:', err);
    }
  },

  queryAuditLog(query: AuditLogQuery): { events: OperatorAuditEvent[]; total: number; page: number; pageSize: number } {
    let events = readAuditLog();
    const { page = 1, pageSize = 20, from, to, username, action, success } = query;

    if (from) events = events.filter(e => e.timestamp >= from);
    if (to) events = events.filter(e => e.timestamp <= to);
    if (username) events = events.filter(e => e.username === username.toLowerCase());
    if (action) events = events.filter(e => e.action === action);
    if (success !== undefined) events = events.filter(e => e.success === success);

    // Newest first
    events = events.reverse();
    const total = events.length;
    const start = (page - 1) * pageSize;
    return { events: events.slice(start, start + pageSize), total, page, pageSize };
  },

  // ── Audit Export Formatters ──────────────────────────────────────────────────

  exportAuditLog(format: AuditExportFormat, query: AuditLogQuery, generatedBy: string): Buffer | string {
    // Get all matching events (no pagination for exports)
    let events = readAuditLog();
    const { from, to, username, action, success } = query;
    if (from) events = events.filter(e => e.timestamp >= from);
    if (to) events = events.filter(e => e.timestamp <= to);
    if (username) events = events.filter(e => e.username === username.toLowerCase());
    if (action) events = events.filter(e => e.action === action);
    if (success !== undefined) events = events.filter(e => e.success === success);
    events = events.reverse();

    if (format === 'csv') return operatorAuthService._exportCsv(events);
    if (format === 'html') return operatorAuthService._exportHtml(events, generatedBy, from, to);
    if (format === 'pdf') return operatorAuthService._exportHtml(events, generatedBy, from, to, true);
    throw new Error('Unknown export format');
  },

  _exportCsv(events: OperatorAuditEvent[]): string {
    const headers = ['Timestamp', 'Action', 'Display Name', 'Username', 'Success', 'IP Address', 'Details'];
    const rows = events.map(e => [
      e.timestamp,
      e.action,
      e.displayName,
      e.username,
      e.success ? 'Yes' : 'No',
      e.ip ?? '-',
      JSON.stringify(e.details).replace(/"/g, '""')
    ].map(cell => `"${cell}"`).join(','));
    return [headers.join(','), ...rows].join('\r\n');
  },

  _exportHtml(
    events: OperatorAuditEvent[],
    generatedBy: string,
    from?: string,
    to?: string,
    forPdf: boolean = false
  ): string {
    const dateRange = from || to ? `${from ?? 'start'} → ${to ?? 'now'}` : 'All Time';
    const genTime = new Date().toLocaleString();

    const colorMap: Record<string, string> = {
      op_login: '#22c55e', op_logout: '#22c55e', op_session_expired: '#f59e0b',
      op_failed_login: '#ef4444', op_account_locked: '#ef4444',
      mqtt_write: '#3b82f6', mqtt_write_denied: '#f59e0b',
      alarm_ack: '#a78bfa', alarm_ack_denied: '#f59e0b',
      equipment_control: '#06b6d4', equipment_control_denied: '#f59e0b',
      user_created: '#34d399', user_modified: '#34d399', user_deleted: '#f87171',
      user_unlocked: '#34d399', password_changed: '#fbbf24',
      credential_imported: '#818cf8', policy_changed: '#818cf8'
    };

    const successCounts = events.filter(e => e.success).length;
    const failCounts = events.length - successCounts;

    const rows = events.map(e => {
      const color = colorMap[e.action] ?? '#94a3b8';
      const details = JSON.stringify(e.details);
      return `
      <tr>
        <td>${new Date(e.timestamp).toLocaleString()}</td>
        <td><span class="badge" style="background:${color}20;color:${color};border:1px solid ${color}40">${e.action}</span></td>
        <td>${e.displayName}</td>
        <td><code>${e.username}</code></td>
        <td><span class="${e.success ? 'ok' : 'fail'}">${e.success ? '✅ OK' : '❌ Failed'}</span></td>
        <td>${e.ip ?? '—'}</td>
        <td class="details">${details}</td>
      </tr>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TASC IIoT Studio — Operator Audit Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; background: ${forPdf ? '#fff' : '#0f172a'}; color: ${forPdf ? '#111' : '#e2e8f0'}; font-size: 12px; }
  .header { background: linear-gradient(135deg, #1e3a5f, #0f172a); color: #fff; padding: 24px 32px; border-bottom: 2px solid #3b82f6; }
  .header h1 { font-size: 20px; font-weight: 700; letter-spacing: 0.05em; color: #60a5fa; }
  .header p { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .summary { display: flex; gap: 16px; padding: 16px 32px; background: ${forPdf ? '#f8fafc' : '#1e293b'}; border-bottom: 1px solid ${forPdf ? '#e2e8f0' : '#334155'}; flex-wrap: wrap; }
  .stat { padding: 10px 16px; border-radius: 8px; border: 1px solid ${forPdf ? '#e2e8f0' : '#334155'}; background: ${forPdf ? '#fff' : '#0f172a'}; min-width: 120px; }
  .stat .value { font-size: 22px; font-weight: 700; color: #3b82f6; }
  .stat .label { font-size: 10px; color: #64748b; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; }
  th { background: ${forPdf ? '#f1f5f9' : '#1e293b'}; color: ${forPdf ? '#475569' : '#94a3b8'}; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; padding: 8px 12px; text-align: left; border-bottom: 1px solid ${forPdf ? '#e2e8f0' : '#334155'}; position: sticky; top: 0; }
  td { padding: 7px 12px; border-bottom: 1px solid ${forPdf ? '#f1f5f9' : '#1e293b'}; vertical-align: top; }
  tr:hover td { background: ${forPdf ? '#f8fafc' : '#1e293b50'}; }
  .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; font-family: monospace; white-space: nowrap; }
  .ok { color: #22c55e; }
  .fail { color: #ef4444; }
  code { background: ${forPdf ? '#f1f5f9' : '#0f172a'}; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  .details { max-width: 220px; color: ${forPdf ? '#64748b' : '#64748b'}; font-size: 10px; word-break: break-all; }
  .footer { padding: 12px 32px; font-size: 10px; color: #64748b; border-top: 1px solid ${forPdf ? '#e2e8f0' : '#334155'}; }
  @media print { body { background: #fff; color: #111; } }
</style>
</head>
<body>
<div class="header">
  <h1>🔐 TASC IIoT Studio — Operator Audit Report</h1>
  <p>Generated: ${genTime} &nbsp;|&nbsp; By: ${generatedBy} &nbsp;|&nbsp; Period: ${dateRange} &nbsp;|&nbsp; Total Records: ${events.length}</p>
</div>
<div class="summary">
  <div class="stat"><div class="value">${events.length}</div><div class="label">Total Events</div></div>
  <div class="stat"><div class="value" style="color:#22c55e">${successCounts}</div><div class="label">Successful</div></div>
  <div class="stat"><div class="value" style="color:#ef4444">${failCounts}</div><div class="label">Failed / Denied</div></div>
  <div class="stat"><div class="value" style="color:#3b82f6">${events.filter(e => e.action === 'mqtt_write').length}</div><div class="label">MQTT Writes</div></div>
  <div class="stat"><div class="value" style="color:#a78bfa">${events.filter(e => e.action === 'alarm_ack').length}</div><div class="label">Alarm Acks</div></div>
</div>
<div style="overflow-x:auto">
<table>
  <thead><tr>
    <th>Timestamp</th><th>Event</th><th>Display Name</th><th>Username</th><th>Result</th><th>IP</th><th>Details</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
</div>
<div class="footer">TASC IIoT Studio — Operator Audit Trail &nbsp;|&nbsp; Confidential — For authorized personnel only</div>
</body></html>`;
  },

  // ── .tasc Package Export / Import ────────────────────────────────────────────

  exportForPackaging(): PackagedOperatorCredentials | null {
    const store = readCredentials();
    if (!store || !store.isInitialized) return null;
    const signature = computeCredentialSignature(store.users);
    return { store, credentialSignature: signature };
  },

  importFromPackage(
    pkg: PackagedOperatorCredentials,
    adminSession: OperatorSession,
    ip: string | null,
    sourcePkgName?: string
  ): { success: boolean; error?: string; skipped?: boolean } {
    // Verify credential signature independently
    const sigValid = verifyCredentialSignature(pkg.store.users, pkg.credentialSignature);
    if (!sigValid) {
      return { success: false, error: 'Credential block signature verification failed. Users may have been tampered with.' };
    }

    const existing = readCredentials();
    const isOverwrite = existing !== null && existing.isInitialized;

    const newStore: OperatorCredentialsStore = {
      ...pkg.store,
      credentialSignature: '' // recomputed on write
    };
    writeCredentials(newStore);

    operatorAuthService.appendAuditEvent({
      username: adminSession.username,
      displayName: adminSession.displayName,
      action: 'credential_imported',
      success: true,
      ip,
      details: { sourcePkg: sourcePkgName, userCount: pkg.store.users.length }
    });

    return { success: true, skipped: false };
  },

  verifyPackagedCredentials(pkg: PackagedOperatorCredentials): boolean {
    return verifyCredentialSignature(pkg.store.users, pkg.credentialSignature);
  }
};
