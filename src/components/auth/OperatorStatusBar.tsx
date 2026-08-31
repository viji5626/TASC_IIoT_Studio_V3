/**
 * TASC IIoT Studio — Operator Status Bar
 *
 * Compact session indicator shown in the top navigation bar (Client Edition only).
 * Displays: current operator name, role badge, session timer, and logout button.
 * Clicking the operator name navigates to the Credential Management View.
 *
 * Renders null in Engineering Edition (userRole === 'admin').
 */

import React, { useState, useEffect } from 'react';
import { useOperatorAuth } from '../../store/OperatorAuthContext';
import { useAppContext } from '../../store/AppContext';
import { AppView } from '../../types';

const ROLE_COLORS: Record<string, string> = {
  admin: '#f59e0b',
  supervisor: '#3b82f6',
  operator: '#22c55e',
  custom: '#a78bfa'
};

export const OperatorStatusBar: React.FC = () => {
  const { currentOperator, isAuthenticated, logout, sessionExpiresAt, sessionTimeoutMinutes } = useOperatorAuth();
  const { userRole, setCurrentView } = useAppContext();
  const [timeRemaining, setTimeRemaining] = useState('');

  // Don't render in Engineering Edition
  if (userRole === 'admin') return null;
  if (!isAuthenticated || !currentOperator) return null;

  // Session countdown
  useEffect(() => {
    if (!sessionExpiresAt) return;
    const update = () => {
      const diff = new Date(sessionExpiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeRemaining('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setTimeRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30000); // refresh every 30s
    return () => clearInterval(id);
  }, [sessionExpiresAt]);

  const roleColor = ROLE_COLORS[currentOperator.role] ?? '#94a3b8';
  const isExpiringSoon = sessionExpiresAt && (new Date(sessionExpiresAt).getTime() - Date.now()) < 15 * 60 * 1000;

  const handleLogout = async () => {
    if (window.confirm(`Log out "${currentOperator.displayName}"?`)) {
      await logout();
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '4px 10px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      cursor: 'default'
    }}>
      {/* Operator Avatar */}
      <div style={{
        width: '28px', height: '28px', borderRadius: '8px',
        background: `${roleColor}20`,
        border: `1px solid ${roleColor}60`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '13px', flexShrink: 0
      }}>
        {currentOperator.displayName.charAt(0).toUpperCase()}
      </div>

      {/* Name + Role */}
      <div
        style={{ cursor: 'pointer' }}
        onClick={() => setCurrentView(AppView.CREDENTIALS)}
        title="Open Credential Management"
      >
        <div style={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600, lineHeight: 1.2 }}>
          {currentOperator.displayName}
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px'
        }}>
          <span style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em',
            color: roleColor, textTransform: 'uppercase'
          }}>
            {currentOperator.role}
          </span>
        </div>
      </div>

      {/* Session timer */}
      {timeRemaining && (
        <div style={{
          padding: '2px 7px', borderRadius: '5px',
          background: isExpiringSoon ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
          border: `1px solid ${isExpiringSoon ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.08)'}`,
          color: isExpiringSoon ? '#fca5a5' : '#64748b',
          fontSize: '10px', fontWeight: 600,
          title: 'Session time remaining'
        }}>
          ⏱ {timeRemaining}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        title="Log out"
        style={{
          background: 'none', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '6px', color: '#f87171', cursor: 'pointer',
          padding: '3px 7px', fontSize: '11px', fontWeight: 600,
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
      >
        ↩ Out
      </button>
    </div>
  );
};
