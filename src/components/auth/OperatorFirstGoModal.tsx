/**
 * TASC IIoT Studio — Operator First-Boot Modal
 *
 * Shown ONCE when Client Edition loads and no operator credential file exists.
 * Forces creation of the initial Admin account before anything else is accessible.
 * Cannot be dismissed or skipped.
 */

import React, { useState } from 'react';
import { useOperatorAuth } from '../../store/OperatorAuthContext';

export const OperatorFirstGoModal: React.FC = () => {
  const { initAdmin } = useOperatorAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validatePassword = (p: string): string | null => {
    if (p.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(p)) return 'Password must contain at least one uppercase letter.';
    if (!/[0-9]/.test(p)) return 'Password must contain at least one number.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    const passErr = validatePassword(password);
    if (passErr) { setError(passErr); return; }

    setLoading(true);
    const result = await initAdmin(username.trim(), displayName.trim() || username.trim(), password);
    setLoading(false);
    if (!result.success) setError(result.error ?? 'Failed to create admin account.');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(135deg, #0a0f1e 0%, #0f1f3d 50%, #071222 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      {/* Animated background circles */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${300 + i * 80}px`, height: `${300 + i * 80}px`,
            borderRadius: '50%',
            border: '1px solid rgba(59,130,246,0.1)',
            top: `${10 + i * 5}%`, left: `${5 + i * 5}%`,
            animation: `pulse ${3 + i}s ease-in-out infinite alternate`
          }} />
        ))}
      </div>

      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(15,25,50,0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(59,130,246,0.3)',
        borderRadius: '16px',
        padding: '40px',
        width: '100%', maxWidth: '440px',
        boxShadow: '0 25px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
            marginBottom: '16px', fontSize: '28px'
          }}>🔐</div>
          <h1 style={{ color: '#f0f4ff', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>
            Welcome to TASC IIoT Studio
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
            First-time setup: Create your Administrator account to secure this Client Edition.
          </p>
          <div style={{
            marginTop: '12px', padding: '8px 14px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '8px', color: '#fca5a5', fontSize: '11px'
          }}>
            ⚠️ This Admin account controls all user access. Store your password securely.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
              USERNAME *
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="e.g. scada_admin"
              autoComplete="username"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
              DISPLAY NAME
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Full name (shown in audit trail)"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
              PASSWORD *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: '#94a3b8', fontSize: '13px' }} />
              </button>
            </div>
            {/* Strength indicator */}
            <div style={{ marginTop: '6px', display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4].map(level => (
                <div key={level} style={{
                  flex: 1, height: '3px', borderRadius: '2px',
                  background: getStrengthLevel(password) >= level
                    ? level <= 1 ? '#ef4444' : level <= 2 ? '#f59e0b' : level <= 3 ? '#22c55e' : '#3b82f6'
                    : 'rgba(255,255,255,0.1)'
                }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '6px', fontWeight: 600 }}>
              CONFIRM PASSWORD *
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              autoComplete="new-password"
              style={{
                ...inputStyle,
                borderColor: confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.6)' : undefined
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: '16px', padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', color: '#fca5a5', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <i className="fas fa-circle-exclamation text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !username || !password || !confirmPassword}
            style={{
              width: '100%', padding: '12px',
              background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              border: 'none', borderRadius: '9px',
              color: '#fff', fontSize: '14px', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" />
                <span>Creating Admin Account...</span>
              </>
            ) : (
              <>
                <i className="fas fa-key" />
                <span>Create Admin Account & Enter</span>
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#334155', fontSize: '11px', marginTop: '20px' }}>
          TASC IIoT Studio Client Edition · Operator Credential System v2
        </p>
      </div>

      <style>{`
        @keyframes pulse { from { opacity: 0.3; transform: scale(1); } to { opacity: 0.6; transform: scale(1.05); } }
        input:focus { outline: none; border-color: rgba(59,130,246,0.8) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      `}</style>
    </div>
  );
};

function getStrengthLevel(p: string): number {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: '#e2e8f0',
  fontSize: '13px', boxSizing: 'border-box',
  transition: 'border-color 0.2s'
};
