/**
 * TASC IIoT Studio — Operator Login Modal
 *
 * Shown when Client Edition is initialized but no operator session is active.
 * Also triggered by 'op_login_required' CustomEvent when a write action
 * is attempted without a valid session.
 *
 * Shows account locked countdown when rate limiter engages.
 * Cannot be dismissed (blocks the app) until a valid login occurs.
 */

import React, { useState, useEffect } from 'react';
import { useOperatorAuth } from '../../store/OperatorAuthContext';
import { useAppContext } from '../../store/AppContext';


interface Props {
  /** If true, shown as a re-auth dialog (session expired) rather than fresh login */
  isReauth?: boolean;
}

export const OperatorLoginModal: React.FC<Props> = ({ isReauth = false }) => {
  const { login } = useOperatorAuth();
  const { handleClearClientSavedSetup } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Countdown timer for account lockout
  useEffect(() => {
    if (!lockedUntil) return;
    const update = () => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) { setLockedUntil(null); setLockCountdown(0); return; }
      setLockCountdown(remaining);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && Date.now() < lockedUntil) return;
    setError('');
    setLoading(true);

    const result = await login(username.trim(), password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Login failed.');
      if (result.attemptsLeft !== undefined) setAttemptsLeft(result.attemptsLeft);
      if (result.lockedUntilMs) setLockedUntil(result.lockedUntilMs);
    }
  };

  const isLocked = lockedUntil !== null && Date.now() < lockedUntil;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: 'rgba(7,14,30,0.96)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Segoe UI', system-ui, sans-serif"
    }}>
      <div style={{
        background: 'rgba(15,25,50,0.95)',
        border: '1px solid rgba(59,130,246,0.25)',
        borderRadius: '16px', padding: '36px',
        width: '100%', maxWidth: '380px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>
            {isReauth ? <i className="fas fa-rotate-right" /> : <i className="fas fa-lock" />}
          </div>
          <h2 style={{ color: '#f0f4ff', fontSize: '20px', fontWeight: 700, margin: '0 0 6px' }}>
            {isReauth ? 'Session Expired — Re-authenticate' : 'Operator Login'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>
            {isReauth
              ? 'Your session has expired. Please log in again to continue.'
              : 'Enter your operator credentials to access the system.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.08em' }}>
              USERNAME
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoComplete="username"
              disabled={isLocked}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.08em' }}>
              PASSWORD
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={isLocked}
                style={{ ...inputStyle, paddingRight: '44px' }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: '#94a3b8', fontSize: '13px' }} />
              </button>
            </div>
          </div>

          {/* Lockout banner */}
          {isLocked && (
            <div style={{
              marginBottom: '14px', padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: '8px', color: '#fca5a5', fontSize: '12px', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <i className="fas fa-lock" />
              <span>Account locked. Try again in <strong>{lockCountdown}s</strong></span>
            </div>
          )}

          {/* Error / attempts left */}
          {error && !isLocked && (
            <div style={{
              marginBottom: '14px', padding: '10px 14px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', color: '#fca5a5', fontSize: '12px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <i className="fas fa-circle-exclamation text-rose-400" />
              <div>
                <span>{error}</span>
                {attemptsLeft !== null && attemptsLeft > 0 && (
                  <div style={{ marginTop: '4px', color: '#f87171' }}>
                    {attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining before lockout
                  </div>
                )}
              </div>
            </div>
          )}


          <button
            type="submit"
            disabled={loading || isLocked || !username || !password}
            style={{
              width: '100%', padding: '12px',
              background: isLocked
                ? 'rgba(100,116,139,0.3)'
                : 'linear-gradient(135deg, #1d4ed8, #7c3aed)',
              border: 'none', borderRadius: '9px',
              color: '#fff', fontSize: '14px', fontWeight: 700,
              cursor: isLocked || loading ? 'not-allowed' : 'pointer',
              boxShadow: isLocked ? 'none' : '0 4px 16px rgba(59,130,246,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin" />
                <span>Authenticating...</span>
              </>
            ) : isLocked ? (
              <>
                <i className="fas fa-lock" />
                <span>Locked ({lockCountdown}s)</span>
              </>
            ) : (
              <>
                <i className="fas fa-arrow-right-to-bracket" />
                <span>Sign In & Authenticate</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleClearClientSavedSetup()}
            disabled={loading}
            style={{
              width: '100%', padding: '12px', marginTop: '12px',
              background: 'transparent',
              border: '1px solid rgba(148,163,184,0.3)', borderRadius: '9px',
              color: '#94a3b8', fontSize: '13px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.6)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseOut={e => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = 'rgba(148,163,184,0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <i className="fas fa-arrow-left" />
            <span>Cancel & Return to Main Menu</span>
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: '11px', marginTop: '20px' }}>
          Contact your administrator if you cannot log in.
        </p>
      </div>

      <style>{`
        input:focus { outline: none; border-color: rgba(59,130,246,0.8) !important; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
      `}</style>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px', color: '#e2e8f0',
  fontSize: '13px', boxSizing: 'border-box',
  transition: 'border-color 0.2s'
};
