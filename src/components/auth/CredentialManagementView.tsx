/**
 * TASC IIoT Studio — Credential Management View
 *
 * Full-screen view accessible via the "Credential" sidebar menu item in both:
 *   1. Engineering Studio (Engineering Edition)
 *   2. Client Runtime (Client Edition)
 *
 * Three tabs:
 *   1. Users       — CRUD for operator accounts with Security Levels & Password Expiration
 *   2. Audit Log   — Paginated event history with filters + CSV/HTML/PDF export
 *   3. Security    — Session timeout, lockout policy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useOperatorAuth } from '../../store/OperatorAuthContext';
import type {
  OperatorUser,
  OperatorRole,
  OperatorPermissions,
  OperatorAuditEvent,
  OperatorSecurityPolicy,
  CreateUserRequest,
  AuditLogQuery,
  AuditExportFormat
} from '../../types/auth';
import { OPERATOR_PERMISSION_PRESETS } from '../../types/auth';

type Tab = 'users' | 'audit' | 'policy';

// ─── Role presets for display & selection ─────────────────────────────────────
const ROLE_DEFINITIONS: {
  value: OperatorRole;
  label: string;
  level: number;
  description: string;
  color: string;
  icon: string;
}[] = [
  {
    value: 'admin',
    label: 'Administrator',
    level: 3,
    description: 'Level 3 — Full control: equipment, setpoints, user management, and system configuration.',
    color: '#f59e0b',
    icon: 'fa-shield-halved'
  },
  {
    value: 'supervisor',
    label: 'Supervisor',
    level: 2,
    description: 'Level 2 — Equipment control, write setpoints, acknowledge alarms, and export reports.',
    color: '#3b82f6',
    icon: 'fa-user-tie'
  },
  {
    value: 'operator',
    label: 'Operator',
    level: 1,
    description: 'Level 1 — Telemetry monitoring, write setpoints, and acknowledge active alarms.',
    color: '#22c55e',
    icon: 'fa-hard-hat'
  },
  {
    value: 'custom',
    label: 'Custom Role',
    level: 1,
    description: 'Custom Level — Tailor individual granular permissions per workstation requirements.',
    color: '#a78bfa',
    icon: 'fa-sliders'
  }
];

const PERMISSION_KEYS: (keyof OperatorPermissions)[] = [
  'read', 'write', 'ackAlarms', 'controlEquipment', 'exportReports', 'configSettings', 'manageUsers'
];

const PERMISSION_METADATA: Record<keyof OperatorPermissions, { label: string; desc: string; icon: string }> = {
  read: { label: 'Read & Telemetry View', desc: 'View dashboards, 3D SCADA, tags & trends', icon: 'fa-eye' },
  write: { label: 'Write / Publish MQTT', desc: 'Publish MQTT commands and PLC setpoints', icon: 'fa-pen-to-square' },
  ackAlarms: { label: 'Acknowledge Alarms', desc: 'Acknowledge, silence and clear plant alarms', icon: 'fa-bell' },
  controlEquipment: { label: 'Equipment Control', desc: 'Start/Stop motors, pumps, and recipes', icon: 'fa-bolt' },
  exportReports: { label: 'Export Reports', desc: 'Download PDF, CSV, and AI analytics reports', icon: 'fa-chart-pie' },
  configSettings: { label: 'Configure Settings', desc: 'Modify drivers, brokers, and network setup', icon: 'fa-gear' },
  manageUsers: { label: 'Manage User Accounts', desc: 'Create, modify, disable & unlock users', icon: 'fa-users' }
};

const PASSWORD_TENURE_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: 'Never Expires (Permanent)' },
  { value: 30, label: '30 Days (1 Month)' },
  { value: 60, label: '60 Days (2 Months)' },
  { value: 90, label: '90 Days (Quarterly)' },
  { value: 180, label: '180 Days (6 Months)' },
  { value: 365, label: '365 Days (1 Year)' },
  { value: -1, label: 'Custom Days...' }
];

const AUDIT_ACTION_OPTIONS = [
  { value: '', label: 'All Events' },
  { value: 'op_login', label: 'Login' },
  { value: 'op_logout', label: 'Logout' },
  { value: 'op_failed_login', label: 'Failed Login' },
  { value: 'op_account_locked', label: 'Account Locked' },
  { value: 'mqtt_write', label: 'MQTT Write' },
  { value: 'mqtt_write_denied', label: 'Write Denied' },
  { value: 'alarm_ack', label: 'Alarm Ack' },
  { value: 'alarm_ack_denied', label: 'Alarm Ack Denied' },
  { value: 'user_created', label: 'User Created' },
  { value: 'user_modified', label: 'User Modified' },
  { value: 'user_deleted', label: 'User Deleted' },
  { value: 'password_changed', label: 'Password Changed' },
  { value: 'credential_imported', label: 'Credential Import' },
  { value: 'policy_changed', label: 'Policy Changed' }
];

const ACTION_COLOR: Record<string, string> = {
  op_login: '#22c55e', op_logout: '#22c55e', op_session_expired: '#f59e0b',
  op_failed_login: '#ef4444', op_account_locked: '#ef4444',
  mqtt_write: '#3b82f6', mqtt_write_denied: '#f59e0b',
  alarm_ack: '#a78bfa', alarm_ack_denied: '#f59e0b',
  equipment_control: '#06b6d4', equipment_control_denied: '#f59e0b',
  user_created: '#34d399', user_modified: '#34d399', user_deleted: '#f87171',
  user_unlocked: '#34d399', password_changed: '#fbbf24',
  credential_imported: '#818cf8', policy_changed: '#818cf8'
};

// ─── Shared Styles ────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 23, 42, 0.75)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '20px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px',
  background: 'rgba(30, 41, 59, 0.8)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '8px', color: '#f8fafc',
  fontSize: '13px', boxSizing: 'border-box',
  outline: 'none', transition: 'border-color 0.15s'
};

const btnPrimary: React.CSSProperties = {
  padding: '9px 18px',
  background: 'linear-gradient(135deg, #0284c7, #6366f1)',
  border: 'none', borderRadius: '8px',
  color: '#fff', fontSize: '12px', fontWeight: 700,
  cursor: 'pointer', transition: 'all 0.15s',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)'
};

const btnDanger: React.CSSProperties = {
  padding: '6px 12px',
  background: 'rgba(239,68,68,0.15)',
  border: '1px solid rgba(239,68,68,0.4)',
  borderRadius: '6px', color: '#fca5a5',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer'
};

const btnSecondary: React.CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: '6px', color: '#cbd5e1',
  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s'
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const CredentialManagementView: React.FC = () => {
  const auth = useOperatorAuth();
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: '#090d16', color: '#e2e8f0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 28px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(10px)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #0284c7, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', color: '#fff', boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)'
          }}>
            <i className="fas fa-shield-halved" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              Credential & User Management
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Create operator accounts, configure security levels, assign granular permissions & password expiry tenure
            </p>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {auth.currentOperator ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ color: '#64748b', fontSize: '11px' }}>Operator:</span>
                <span style={{ color: '#f8fafc', fontSize: '12px', fontWeight: 600 }}>{auth.currentOperator.displayName}</span>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                  background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)',
                  textTransform: 'uppercase'
                }}>{auth.currentOperator.role} (L{auth.currentOperator.securityLevel ?? 1})</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(2, 132, 199, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
                <i className="fas fa-gear text-sky-400" />
                <span style={{ color: '#38bdf8', fontSize: '11px', fontWeight: 700 }}>ENGINEERING STUDIO MODE</span>
                <span style={{ color: '#94a3b8', fontSize: '11px' }}>Full administrative provisioning</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '16px' }}>
          {[
            { key: 'users' as Tab, label: 'User Accounts', icon: 'fa-users', show: true },
            { key: 'audit' as Tab, label: 'Audit Log & History', icon: 'fa-clipboard-list', show: true },
            { key: 'policy' as Tab, label: 'Security & Lockout Policy', icon: 'fa-shield-halved', show: true }
          ].filter(t => t.show).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '7px 18px', borderRadius: '7px',
                border: 'none', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: tab === t.key ? 'linear-gradient(135deg, #0284c7, #6366f1)' : 'rgba(255,255,255,0.04)',
                color: tab === t.key ? '#fff' : '#94a3b8',
                boxShadow: tab === t.key ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none'
              }}
            >
              <i className={`fas ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        {tab === 'users' && <UsersTab auth={auth} />}
        {tab === 'audit' && <AuditTab auth={auth} />}
        {tab === 'policy' && <PolicyTab auth={auth} />}
      </div>
    </div>
  );
};

// ─── Users Tab ────────────────────────────────────────────────────────────────

const UsersTab: React.FC<{ auth: ReturnType<typeof useOperatorAuth> }> = ({ auth }) => {
  const [users, setUsers] = useState<Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<Omit<OperatorUser, 'passwordHash' | 'passwordSalt'> | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const list = await auth.listUsers();
      setUsers(list || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const showFeedback = (type: 'ok' | 'err', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleUnlock = async (user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>) => {
    const res = await auth.unlockUser(user.id);
    if (res.success) { showFeedback('ok', `${user.displayName} unlocked.`); loadUsers(); }
    else showFeedback('err', res.error ?? 'Failed to unlock.');
  };

  const handleDelete = async (user: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'>) => {
    if (!window.confirm(`Permanently delete account "${user.displayName}" (@${user.username})? This cannot be undone.`)) return;
    const res = await auth.deleteUser(user.id);
    if (res.success) { showFeedback('ok', `${user.displayName} deleted.`); loadUsers(); }
    else showFeedback('err', res.error ?? 'Failed to delete.');
  };

  const canManage = auth.hasPermission('manageUsers');

  return (
    <div style={{ maxWidth: '1100px' }}>
      {feedback && (
        <div style={{
          marginBottom: '16px', padding: '12px 18px', borderRadius: '8px',
          background: feedback.type === 'ok' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
          border: `1px solid ${feedback.type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: feedback.type === 'ok' ? '#86efac' : '#fca5a5',
          fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {feedback.type === 'ok' ? '✅' : '❌'} {feedback.msg}
        </div>
      )}

      {/* Actions bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', color: '#f8fafc', fontWeight: 700 }}>
            Registered Operator Accounts ({users.length})
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
            {users.length === 0
              ? 'No users currently exist. Click "+ Create User" to add the first administrator or operator.'
              : 'Configured credentials for Client Runtime access'}
          </p>
        </div>
        {canManage && (
          <button style={btnPrimary} onClick={() => { setShowCreateForm(true); setEditingUser(null); }}>
            <span>+</span> Create New User
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {(showCreateForm || editingUser) && (
        <UserForm
          existing={editingUser}
          auth={auth}
          onClose={() => { setShowCreateForm(false); setEditingUser(null); }}
          onSaved={() => { setShowCreateForm(false); setEditingUser(null); loadUsers(); }}
          onFeedback={showFeedback}
        />
      )}

      {/* Users list or Empty State */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '60px' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
          Loading operator accounts...
        </div>
      ) : users.length === 0 ? (
        <div style={{
          ...cardStyle,
          textAlign: 'center', padding: '60px 20px',
          border: '2px dashed rgba(255,255,255,0.12)',
          background: 'rgba(15, 23, 42, 0.4)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>👥</div>
          <h3 style={{ margin: '0 0 8px', color: '#f8fafc', fontSize: '16px' }}>No Operator Users Configured</h3>
          <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: '13px', maxWidth: '480px', marginInline: 'auto' }}>
            The credential database is currently empty. You can provision your first <strong>Administrator (Level 3)</strong> or <strong>Operator</strong> account right now with custom password tenure and granular permissions.
          </p>
          <button style={btnPrimary} onClick={() => { setShowCreateForm(true); setEditingUser(null); }}>
            + Create First Operator User
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {users.map(user => {
            const roleDef = ROLE_DEFINITIONS.find(r => r.value === user.role) || ROLE_DEFINITIONS[3];
            const isSelf = user.id === auth.currentOperator?.id;

            // Password Expiry tenure status calculation
            let expiryBadge = null;
            if (user.passwordExpiresAt) {
              const expiresMs = new Date(user.passwordExpiresAt).getTime();
              const daysLeft = Math.ceil((expiresMs - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 0) {
                expiryBadge = (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}>
                    ⚠️ Password Expired ({new Date(user.passwordExpiresAt).toLocaleDateString()})
                  </span>
                );
              } else if (daysLeft <= 7) {
                expiryBadge = (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                    background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}>
                    ⏳ Expires in {daysLeft} days ({new Date(user.passwordExpiresAt).toLocaleDateString()})
                  </span>
                );
              } else {
                expiryBadge = (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                    background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)'
                  }}>
                    ⏳ Validity: {daysLeft} days left ({new Date(user.passwordExpiresAt).toLocaleDateString()})
                  </span>
                );
              }
            } else {
              expiryBadge = (
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500,
                  background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.2)'
                }}>
                  ♾️ Password: Never Expires
                </span>
              );
            }

            return (
              <div key={user.id} style={{
                ...cardStyle,
                display: 'flex', alignItems: 'flex-start', gap: '16px',
                opacity: user.isActive ? 1 : 0.6
              }}>
                {/* Avatar / Role Icon */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                  background: `${roleDef.color}20`,
                  border: `1px solid ${roleDef.color}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', fontWeight: 700, color: roleDef.color
                }}>
                  <i className={`fas ${roleDef.icon}`} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#f8fafc', fontWeight: 700, fontSize: '14px' }}>{user.displayName}</span>
                    <code style={{ color: '#94a3b8', fontSize: '11px', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>@{user.username}</code>

                    <span style={{
                      padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                      background: `${roleDef.color}20`, color: roleDef.color,
                      border: `1px solid ${roleDef.color}40`, textTransform: 'uppercase'
                    }}>
                      {roleDef.label} (Level {user.securityLevel ?? roleDef.level})
                    </span>

                    {expiryBadge}

                    {!user.isActive && <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>DISABLED</span>}
                    {isSelf && <span style={{ color: '#22c55e', fontSize: '11px', fontWeight: 700 }}>ACTIVE SESSION</span>}
                  </div>

                  {/* Permissions Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' }}>
                    {PERMISSION_KEYS.map(k => {
                      const granted = user.permissions[k];
                      const meta = PERMISSION_METADATA[k];
                      return (
                        <span key={k} style={{
                          fontSize: '11px', padding: '2px 7px', borderRadius: '4px',
                          background: granted ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.02)',
                          color: granted ? '#e2e8f0' : '#475569',
                          border: `1px solid ${granted ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255,255,255,0.04)'}`,
                          opacity: granted ? 1 : 0.5,
                          display: 'inline-flex', alignItems: 'center', gap: '5px'
                        }}>
                          <i className={`fas ${meta.icon}`} style={{ color: granted ? '#38bdf8' : '#64748b', fontSize: '10px' }} />
                          <span>{meta.label}</span>
                          <i className={`fas ${granted ? 'fa-check text-emerald-400' : 'fa-xmark text-slate-500'}`} style={{ fontSize: '9px' }} />
                        </span>
                      );
                    })}
                  </div>

                  <div style={{ color: '#64748b', fontSize: '11px', marginTop: '8px' }}>
                    Last login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never logged in'}
                    {user.createdBy && ` · Created by: ${user.createdBy}`}
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    {user.lockedUntil && new Date(user.lockedUntil) > new Date() && (
                      <button style={{ ...btnSecondary, color: '#fbbf24', borderColor: 'rgba(245,158,11,0.4)' }} onClick={() => handleUnlock(user)}>
                        🔓 Unlock
                      </button>
                    )}
                    <button style={btnSecondary} onClick={() => { setEditingUser(user); setShowCreateForm(false); }}>
                      ✏️ Edit
                    </button>
                    {!isSelf && (
                      <button style={btnDanger} onClick={() => handleDelete(user)} title="Delete user">
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── User Form (Create / Edit) ────────────────────────────────────────────────

const UserForm: React.FC<{
  existing: Omit<OperatorUser, 'passwordHash' | 'passwordSalt'> | null;
  auth: ReturnType<typeof useOperatorAuth>;
  onClose: () => void;
  onSaved: () => void;
  onFeedback: (type: 'ok' | 'err', msg: string) => void;
}> = ({ existing, auth, onClose, onSaved, onFeedback }) => {
  const isEdit = existing !== null;
  const [username, setUsername] = useState(existing?.username ?? '');
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '');
  const [role, setRole] = useState<OperatorRole>(existing?.role ?? 'operator');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);

  // Password Tenure State
  const initialExpiryDays = existing?.passwordExpiryDays !== undefined ? (existing.passwordExpiryDays ?? 0) : 0;
  const isKnownPreset = PASSWORD_TENURE_PRESETS.some(p => p.value === initialExpiryDays);
  const [tenurePreset, setTenurePreset] = useState<number>(isKnownPreset ? initialExpiryDays : -1);
  const [customDays, setCustomDays] = useState<number>(!isKnownPreset && initialExpiryDays > 0 ? initialExpiryDays : 90);

  const [permissions, setPermissions] = useState<OperatorPermissions>(
    existing?.permissions ?? OPERATOR_PERMISSION_PRESETS.operator
  );
  const [loading, setLoading] = useState(false);

  // Apply preset when role changes
  const applyRolePreset = (r: OperatorRole) => {
    setRole(r);
    const preset = OPERATOR_PERMISSION_PRESETS[r as keyof typeof OPERATOR_PERMISSION_PRESETS];
    if (preset) {
      setPermissions({ ...preset });
    }
  };

  const handleTogglePermission = (perm: keyof OperatorPermissions) => {
    setPermissions(prev => {
      const next = { ...prev, [perm]: !prev[perm] };
      // If permissions now deviate from current role preset, set role to custom
      const currentPreset = OPERATOR_PERMISSION_PRESETS[role as keyof typeof OPERATOR_PERMISSION_PRESETS];
      if (currentPreset && role !== 'custom') {
        const matches = (Object.keys(currentPreset) as (keyof OperatorPermissions)[]).every(
          k => currentPreset[k] === next[k]
        );
        if (!matches) setRole('custom');
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const finalExpiryDays = tenurePreset === 0 ? null : tenurePreset === -1 ? Number(customDays) || null : tenurePreset;

    let res: { success: boolean; error?: string };
    if (isEdit) {
      res = await auth.updateUser(existing!.id, {
        displayName: displayName.trim() || username.trim(),
        role,
        permissions,
        isActive,
        passwordExpiryDays: finalExpiryDays,
        ...(password ? { newPassword: password } : {})
      });
    } else {
      if (!username.trim() || username.trim().length < 3) {
        onFeedback('err', 'Username must be at least 3 characters.');
        setLoading(false);
        return;
      }
      if (!password || password.length < 8) {
        onFeedback('err', 'Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      res = await auth.createUser({
        username: username.trim(),
        displayName: displayName.trim() || username.trim(),
        password,
        role,
        permissions,
        passwordExpiryDays: finalExpiryDays
      });
    }

    setLoading(false);
    if (res.success) {
      onFeedback('ok', isEdit ? `Account "${displayName || username}" updated.` : `Account "${username}" created successfully.`);
      onSaved();
    } else {
      onFeedback('err', res.error ?? 'Operation failed.');
    }
  };

  return (
    <div style={{
      ...cardStyle,
      marginBottom: '24px',
      border: '1px solid rgba(2, 132, 199, 0.4)',
      background: 'rgba(15, 23, 42, 0.95)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '16px', fontWeight: 700 }}>
            {isEdit ? `✏️ Edit Operator: ${existing?.displayName}` : '+ Create New Operator Account'}
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
            Set security level, granular control permissions, and password expiry tenure
          </p>
        </div>
        <button style={btnSecondary} onClick={onClose}>✕ Close</button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '18px' }}>
          <div>
            <label style={labelStyle}>USERNAME *</label>
            <input
              style={inputStyle}
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={isEdit}
              placeholder="e.g. op_line1"
              required
            />
          </div>
          <div>
            <label style={labelStyle}>DISPLAY NAME</label>
            <input
              style={inputStyle}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="e.g. John Doe (Plant Operator)"
            />
          </div>
          <div>
            <label style={labelStyle}>
              {isEdit ? 'CHANGE PASSWORD (leave blank to keep)' : 'INITIAL PASSWORD *'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                style={{ ...inputStyle, paddingRight: '40px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={isEdit ? 'Leave blank to retain current' : 'Min 8 characters'}
                required={!isEdit}
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: '#94a3b8', fontSize: '13px' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Password Expiration Tenure Selection */}
        <div style={{
          marginBottom: '20px', padding: '14px 16px', borderRadius: '8px',
          background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)'
        }}>
          <label style={{ ...labelStyle, color: '#38bdf8' }}>⏳ PASSWORD EXPIRATION TENURE</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', alignItems: 'center' }}>
            <div>
              <select
                value={tenurePreset}
                onChange={e => setTenurePreset(Number(e.target.value))}
                style={{ ...inputStyle, cursor: 'pointer', background: 'rgba(15, 23, 42, 0.9)' }}
              >
                {PASSWORD_TENURE_PRESETS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {tenurePreset === -1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={e => setCustomDays(Math.max(1, Number(e.target.value)))}
                  style={{ ...inputStyle, width: '100px' }}
                  placeholder="Days"
                />
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Days until password expires</span>
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#64748b' }}>
              {tenurePreset === 0
                ? 'Password will never expire automatically.'
                : `User must change password after ${tenurePreset === -1 ? customDays : tenurePreset} days.`}
            </div>
          </div>
        </div>

        {/* Role & Security Level Cards */}
        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>SECURITY LEVEL & ROLE PRESET</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {ROLE_DEFINITIONS.map(r => {
              const isSelected = role === r.value;
              return (
                <div
                  key={r.value}
                  onClick={() => applyRolePreset(r.value)}
                  style={{
                    padding: '12px 14px', borderRadius: '8px', cursor: 'pointer',
                    background: isSelected ? `${r.color}18` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? r.color : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className={`fas ${r.icon}`} style={{ color: r.color, fontSize: '13px' }} />
                      <span style={{ fontWeight: 700, fontSize: '13px', color: isSelected ? '#f8fafc' : '#cbd5e1' }}>
                        {r.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px',
                      background: `${r.color}25`, color: r.color
                    }}>
                      Level {r.level}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.3 }}>
                    {r.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Granular Permissions Checkboxes */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ ...labelStyle, margin: 0 }}>GRANULAR PERMISSION ASSIGNMENTS (TICK TO GRANT)</label>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Check/uncheck to customize access</span>
          </div>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '8px'
          }}>
            {PERMISSION_KEYS.map(perm => {
              const checked = permissions[perm];
              const meta = PERMISSION_METADATA[perm];
              return (
                <label
                  key={perm}
                  onClick={() => handleTogglePermission(perm)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    background: checked ? 'rgba(2, 132, 199, 0.12)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${checked ? 'rgba(2, 132, 199, 0.35)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {}} // handled by container onClick
                    style={{ marginTop: '2px', accentColor: '#0284c7' }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: checked ? '#f8fafc' : '#94a3b8', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className={`fas ${meta.icon}`} style={{ color: checked ? '#38bdf8' : '#64748b', fontSize: '11px' }} />
                      <span>{meta.label}</span>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11px', marginTop: '1px' }}>
                      {meta.desc}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {isEdit && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#22c55e' }}
              />
              <div>
                <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600 }}>Account Enabled</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Uncheck to temporarily suspend user login without deleting history</div>
              </div>
            </label>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={loading} style={{ ...btnPrimary, flex: 1, padding: '12px', justifyContent: 'center' }}>
            {loading ? '⏳ Saving Account...' : isEdit ? '💾 Save Account Changes' : '✓ Create Operator Account'}
          </button>
          <button type="button" onClick={onClose} style={btnSecondary}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const AuditTab: React.FC<{ auth: ReturnType<typeof useOperatorAuth> }> = ({ auth }) => {
  const [events, setEvents] = useState<OperatorAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const pageSize = 25;

  // Filters
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const buildQuery = useCallback((): AuditLogQuery => ({
    page, pageSize,
    from: filterFrom || undefined,
    to: filterTo ? filterTo + 'T23:59:59Z' : undefined,
    username: filterUser || undefined,
    action: filterAction as any || undefined
  }), [page, pageSize, filterFrom, filterTo, filterUser, filterAction]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auth.getAuditLog(buildQuery());
      setEvents(res.events || []);
      setTotal(res.total || 0);
    } catch {
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [auth, buildQuery]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const handleExport = (format: AuditExportFormat) => {
    auth.downloadAuditExport(format, {
      from: filterFrom || undefined,
      to: filterTo ? filterTo + 'T23:59:59Z' : undefined,
      username: filterUser || undefined,
      action: filterAction as any || undefined
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* Filters + Export */}
      <div style={{ ...cardStyle, marginBottom: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>FROM DATE</label>
            <input type="date" style={inputStyle} value={filterFrom} onChange={e => { setFilterFrom(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={labelStyle}>TO DATE</label>
            <input type="date" style={inputStyle} value={filterTo} onChange={e => { setFilterTo(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={labelStyle}>USERNAME</label>
            <input style={inputStyle} placeholder="Filter user..." value={filterUser} onChange={e => { setFilterUser(e.target.value); setPage(1); }} />
          </div>
          <div>
            <label style={labelStyle}>EVENT TYPE</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
              {AUDIT_ACTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ color: '#64748b', fontSize: '12px' }}>{total} logged event{total !== 1 ? 's' : ''} found</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ ...btnSecondary, fontSize: '11px' }} onClick={() => handleExport('csv')}>⬇️ Export CSV</button>
            <button style={{ ...btnSecondary, fontSize: '11px' }} onClick={() => handleExport('html')}>🌐 Export HTML</button>
            <button style={{ ...btnSecondary, fontSize: '11px' }} onClick={() => handleExport('pdf')}>🖨️ Export PDF</button>
          </div>
        </div>
      </div>

      {/* Events table */}
      {loading ? (
        <div style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Loading audit log...</div>
      ) : events.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: 'center', color: '#64748b', padding: '40px' }}>No audit events found.</div>
      ) : (
        <>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                  {['Timestamp', 'Event', 'User', 'Result', 'IP', 'Details'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', color: '#64748b', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((ev, i) => {
                  const color = ACTION_COLOR[ev.action] ?? '#94a3b8';
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '9px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                        {new Date(ev.timestamp).toLocaleString()}
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: `${color}18`, color, border: `1px solid ${color}35` }}>
                          {ev.action}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ color: '#e2e8f0', fontWeight: 600 }}>{ev.displayName}</div>
                        <div style={{ color: '#475569', fontSize: '10px' }}>@{ev.username}</div>
                      </td>
                      <td style={{ padding: '9px 14px' }}>
                        <span style={{ color: ev.success ? '#22c55e' : '#ef4444', fontSize: '11px', fontWeight: 700 }}>
                          {ev.success ? '✅' : '❌'}
                        </span>
                      </td>
                      <td style={{ padding: '9px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '10px' }}>
                        {ev.ip ?? '—'}
                      </td>
                      <td style={{ padding: '9px 14px', color: '#475569', fontSize: '10px', maxWidth: '240px', wordBreak: 'break-all' }}>
                        {JSON.stringify(ev.details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
              <button style={btnSecondary} disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</button>
              <span style={{ color: '#64748b', fontSize: '12px' }}>Page {page} of {totalPages}</span>
              <button style={btnSecondary} disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── Policy Tab ───────────────────────────────────────────────────────────────

const PolicyTab: React.FC<{ auth: ReturnType<typeof useOperatorAuth> }> = ({ auth }) => {
  const [sessionTimeout, setSessionTimeout] = useState(480);
  const [maxFailed, setMaxFailed] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(5);
  const [requireStrong, setRequireStrong] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const policy: OperatorSecurityPolicy = {
      sessionTimeoutMinutes: sessionTimeout,
      maxFailedAttempts: maxFailed,
      lockoutDurationMinutes: lockoutDuration,
      requireStrongPassword: requireStrong
    };
    const res = await auth.updatePolicy(policy);
    setLoading(false);
    setFeedback(res.success ? { type: 'ok', msg: 'Security policy saved.' } : { type: 'err', msg: res.error ?? 'Failed to save.' });
    setTimeout(() => setFeedback(null), 3000);
  };

  return (
    <div style={{ maxWidth: '540px' }}>
      {feedback && (
        <div style={{
          marginBottom: '20px', padding: '10px 16px', borderRadius: '8px',
          background: feedback.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.type === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          color: feedback.type === 'ok' ? '#86efac' : '#fca5a5',
          fontSize: '12px'
        }}>{feedback.type === 'ok' ? '✅' : '❌'} {feedback.msg}</div>
      )}

      <form onSubmit={handleSave} style={cardStyle}>
        <h3 style={{ margin: '0 0 4px', color: '#f8fafc', fontSize: '15px', fontWeight: 700 }}>⚙️ Global Security Policy</h3>
        <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '12px' }}>Lockout thresholds and runtime session timeout</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <PolicyField
            label="Runtime Session Timeout"
            hint="Auto-logout after operator inactivity (minutes)"
            value={sessionTimeout}
            onChange={setSessionTimeout}
            min={5} max={1440} suffix="min"
          />
          <PolicyField
            label="Max Failed Login Attempts"
            hint="Account locks after this many consecutive failed attempts"
            value={maxFailed}
            onChange={setMaxFailed}
            min={2} max={20}
          />
          <PolicyField
            label="Lockout Duration"
            hint="How long locked accounts remain locked before auto-unlocking"
            value={lockoutDuration}
            onChange={setLockoutDuration}
            min={1} max={60} suffix="min"
          />

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox" checked={requireStrong}
                onChange={e => setRequireStrong(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
              />
              <div>
                <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600 }}>Require Strong Passwords</div>
                <div style={{ color: '#64748b', fontSize: '11px' }}>Enforce minimum 8 characters with numbers/symbols</div>
              </div>
            </label>
          </div>
        </div>

        <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: '24px', width: '100%', padding: '11px', justifyContent: 'center' }}>
          {loading ? '⏳ Saving...' : '💾 Save Security Policy'}
        </button>
      </form>
    </div>
  );
};

const PolicyField: React.FC<{
  label: string; hint: string; value: number;
  onChange: (v: number) => void; min: number; max: number; suffix?: string;
}> = ({ label, hint, value, onChange, min, max, suffix }) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
      <div>
        <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 600 }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '11px' }}>{hint}</div>
      </div>
      <span style={{ color: '#38bdf8', fontSize: '15px', fontWeight: 700 }}>
        {value}{suffix && <span style={{ fontSize: '11px', color: '#64748b' }}> {suffix}</span>}
      </span>
    </div>
    <input
      type="range" min={min} max={max} value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ width: '100%', accentColor: '#0284c7' }}
    />
    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '10px' }}>
      <span>{min}{suffix && ` ${suffix}`}</span>
      <span>{max}{suffix && ` ${suffix}`}</span>
    </div>
  </div>
);

// Shared label style
const labelStyle: React.CSSProperties = {
  display: 'block', color: '#94a3b8', fontSize: '11px',
  fontWeight: 700, letterSpacing: '0.05em', marginBottom: '6px'
};
