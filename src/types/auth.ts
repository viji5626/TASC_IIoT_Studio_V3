/**
 * TASC IIoT Studio — Operator Authentication & RBAC Types
 *
 * This module defines types for the Operator Credential System which provides
 * named user-based access control for Client Edition runtime operations.
 *
 * IMPORTANT: This system is SEPARATE from Engineering Edition access (TASC_ENGG).
 * Engineering Edition login is handled independently via clientSecurity.ts and LandingPage.tsx.
 * These types are ONLY for Client Edition runtime operator accounts.
 */

// ─── Role Definitions ────────────────────────────────────────────────────────

export type OperatorRole = 'admin' | 'supervisor' | 'operator' | 'custom';

/**
 * Maps numeric security level to role.
 * 3 = Admin (highest), 2 = Supervisor, 1 = Operator (lowest)
 */
export type OperatorSecurityLevel = 1 | 2 | 3;

// ─── Permissions ─────────────────────────────────────────────────────────────

/**
 * Granular permission flags for an operator account.
 * Every MQTT write, alarm ack, and control action checks these flags.
 */
export interface OperatorPermissions {
  /** View dashboards, telemetry data, 3D SCADA, alarms, historian trends */
  read: boolean;
  /** Publish MQTT messages, write PLC setpoints, toggle switches/buttons */
  write: boolean;
  /** Acknowledge and silence active alarms */
  ackAlarms: boolean;
  /** Start/stop equipment, trigger production recipes or batch sequences */
  controlEquipment: boolean;
  /** Generate and download PDF, CSV, and historian reports */
  exportReports: boolean;
  /** Modify MQTT broker settings, driver connections, system configuration */
  configSettings: boolean;
  /** Create, edit, disable, and delete operator accounts (Admin only) */
  manageUsers: boolean;
}

// ─── Preset Permission Templates ─────────────────────────────────────────────

export const OPERATOR_PERMISSION_PRESETS: Record<string, OperatorPermissions> = {
  admin: {
    read: true, write: true, ackAlarms: true,
    controlEquipment: true, exportReports: true,
    configSettings: true, manageUsers: true
  },
  supervisor: {
    read: true, write: true, ackAlarms: true,
    controlEquipment: true, exportReports: true,
    configSettings: false, manageUsers: false
  },
  operator: {
    read: true, write: false, ackAlarms: true,
    controlEquipment: false, exportReports: false,
    configSettings: false, manageUsers: false
  },
  readOnly: {
    read: true, write: false, ackAlarms: false,
    controlEquipment: false, exportReports: false,
    configSettings: false, manageUsers: false
  }
};

// ─── User Account ─────────────────────────────────────────────────────────────

/**
 * Persistent operator user account stored in data/operator_credentials.json.
 * Password is NEVER stored in plaintext — only PBKDF2-SHA256 hash + salt.
 */
export interface OperatorUser {
  /** UUID v4 — stable identifier */
  id: string;
  /** Unique login name (case-insensitive match on login) */
  username: string;
  /** Human-readable name shown in audit trail and UI */
  displayName: string;
  role: OperatorRole;
  securityLevel: OperatorSecurityLevel;
  permissions: OperatorPermissions;
  /** PBKDF2-SHA256 output — 64 bytes hex encoded */
  passwordHash: string;
  /** 32-byte random hex string — unique per user, never reused */
  passwordSalt: string;
  /** Password validity tenure in days. null or 0 = Never expires */
  passwordExpiryDays?: number | null;
  /** ISO timestamp when password expires. null = Never expires */
  passwordExpiresAt?: string | null;
  isActive: boolean;
  createdAt: string;        // ISO 8601
  createdBy: string;        // username of creator ('__system__' for first admin)
  lastLoginAt: string | null;
  lastLoginIp: string | null;
  /** Increments on failed login; reset on successful login */
  failedLoginCount: number;
  /** ISO timestamp — null means not locked */
  lockedUntil: string | null;
}

// ─── Credential Store ─────────────────────────────────────────────────────────

/**
 * Top-level structure persisted to data/operator_credentials.json.
 * The credentialSignature signs the users[] array independently from the
 * main .tasc package signature.
 */
export interface OperatorCredentialsStore {
  version: 2;
  isInitialized: boolean;
  initializedAt: string;   // ISO 8601 — when first admin was created
  users: OperatorUser[];
  securityPolicy: OperatorSecurityPolicy;
  /** HMAC-SHA256 over JSON.stringify(users) using OPERATOR_CREDENTIAL_SALT */
  credentialSignature: string;
}

export interface OperatorSecurityPolicy {
  /** Idle session auto-lock timeout in minutes. Default: 480 (8 hours) */
  sessionTimeoutMinutes: number;
  /** Failed attempts before account lockout. Default: 5 */
  maxFailedAttempts: number;
  /** Lockout duration in minutes. Default: 5 */
  lockoutDurationMinutes: number;
  /** Enforce min 8 chars, 1 uppercase, 1 number. Default: true */
  requireStrongPassword: boolean;
}

export const DEFAULT_SECURITY_POLICY: OperatorSecurityPolicy = {
  sessionTimeoutMinutes: 480,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 5,
  requireStrongPassword: true
};

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Active operator session. Held server-side in an in-memory Map.
 * Token is stored client-side in sessionStorage only (never localStorage).
 */
export interface OperatorSession {
  /** UUID v4 + HMAC-SHA256 signed token */
  token: string;
  userId: string;
  username: string;
  displayName: string;
  role: OperatorRole;
  permissions: OperatorPermissions;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}

// ─── Audit Trail ─────────────────────────────────────────────────────────────

/**
 * All action types that are recorded in data/operator_audit.json.
 * The audit log is append-only and server-enforced — clients cannot tamper with it.
 */
export type OperatorAuditAction =
  // Session events
  | 'op_login'
  | 'op_logout'
  | 'op_session_expired'
  | 'op_failed_login'
  | 'op_account_locked'
  // Write operations (the core industrial audit trail)
  | 'mqtt_write'
  | 'mqtt_write_denied'
  | 'alarm_ack'
  | 'alarm_ack_denied'
  | 'equipment_control'
  | 'equipment_control_denied'
  // User management
  | 'user_created'
  | 'user_modified'
  | 'user_deleted'
  | 'user_unlocked'
  | 'password_changed'
  // System
  | 'credential_imported'
  | 'policy_changed';

/**
 * Single audit log entry. Written to data/operator_audit.json by the backend only.
 * details field carries action-specific context (topic, payload, alarmId, etc.)
 */
export interface OperatorAuditEvent {
  /** Short unique ID: "evt_<timestamp>_<4hex>" */
  id: string;
  timestamp: string;           // ISO 8601
  username: string;
  displayName: string;
  action: OperatorAuditAction;
  success: boolean;
  /** Express req.socket.remoteAddress — shows originating workstation */
  ip: string | null;
  details: OperatorAuditDetails;
}

/** Detail shapes vary by action. Use a discriminated union pattern at runtime. */
export type OperatorAuditDetails =
  | { topic: string; payload: string | number; widgetName?: string; dashboardName?: string }         // mqtt_write
  | { topic: string; payload: string | number; permissionMissing: string; widgetName?: string }      // mqtt_write_denied
  | { alarmId: string; alarmMessage: string; panelName?: string }                                    // alarm_ack
  | { alarmId: string; alarmMessage: string; permissionMissing: string }                             // alarm_ack_denied
  | { action: string; targetWidget?: string; value?: string | number }                               // equipment_control
  | { sessionId?: string }                                                                            // op_login / op_logout
  | { attemptCount: number }                                                                          // op_failed_login
  | { lockoutUntil: string }                                                                          // op_account_locked
  | { sessionDurationMinutes: number }                                                                // op_logout
  | { newUsername: string; role: OperatorRole; permissionsGranted: string[] }                        // user_created
  | { targetUsername: string; fieldChanged: string[]; previousValues?: Record<string, any> }         // user_modified
  | { targetUsername: string }                                                                        // user_deleted / user_unlocked
  | { sourcePkg?: string; userCount: number }                                                         // credential_imported
  | { policyField: string; oldValue: any; newValue: any }                                            // policy_changed
  | Record<string, any>;                                                                              // fallback

// ─── API Request/Response Shapes ─────────────────────────────────────────────

export interface InitAdminRequest {
  username: string;
  displayName: string;
  password: string;
  passwordExpiryDays?: number | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>;
  expiresAt: string;
  sessionTimeoutMinutes: number;
}

export interface CreateUserRequest {
  username: string;
  displayName: string;
  password: string;
  role: OperatorRole;
  permissions: OperatorPermissions;
  passwordExpiryDays?: number | null;
}

export interface UpdateUserRequest {
  displayName?: string;
  role?: OperatorRole;
  permissions?: OperatorPermissions;
  isActive?: boolean;
  newPassword?: string;
  passwordExpiryDays?: number | null;
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  from?: string;          // ISO date filter start
  to?: string;            // ISO date filter end
  username?: string;      // filter by specific user
  action?: OperatorAuditAction;
  success?: boolean;
}

export type AuditExportFormat = 'csv' | 'html' | 'pdf';

// ─── Export Block (for .tasc packaging) ──────────────────────────────────────

/**
 * The credential block embedded inside a .tasc / .json export package.
 * Has its OWN independent signature — separate from main package signature.
 * If credentialSignature fails verification → skip import, warn user, do NOT
 * reject the rest of the package.
 */
export interface PackagedOperatorCredentials {
  store: OperatorCredentialsStore;
  /** Independent HMAC-SHA256 using OPERATOR_CREDENTIAL_SALT constant */
  credentialSignature: string;
}
