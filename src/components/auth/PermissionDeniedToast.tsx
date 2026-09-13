/**
 * TASC IIoT Studio — Permission Denied Toast
 *
 * Shown as a non-blocking overlay notification when an operator attempts
 * an action they do not have permission for.
 *
 * Triggered by CustomEvents:
 *   - 'op_permission_denied' → { detail: { permission, username } }
 *   - 'op_login_required'   → (no detail)
 *
 * Stacks up to 3 toasts; auto-dismisses after 4 seconds.
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Toast {
  id: number;
  type: 'denied' | 'login_required';
  permission?: string;
  username?: string;
}

let toastId = 0;

export const PermissionDeniedToast: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-2), { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    const onDenied = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      addToast({ type: 'denied', permission: detail.permission, username: detail.username });
    };
    const onLoginRequired = () => {
      addToast({ type: 'login_required' });
    };

    window.addEventListener('op_permission_denied', onDenied);
    window.addEventListener('op_login_required', onLoginRequired);
    return () => {
      window.removeEventListener('op_permission_denied', onDenied);
      window.removeEventListener('op_login_required', onLoginRequired);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const PERMISSION_LABELS: Record<string, string> = {
    write: 'Write / Publish MQTT',
    ackAlarms: 'Acknowledge Alarms',
    controlEquipment: 'Equipment Control',
    exportReports: 'Export Reports',
    configSettings: 'Configure Settings',
    manageUsers: 'Manage Users'
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            padding: '14px 18px',
            background: 'rgba(15,22,40,0.97)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderLeft: '4px solid #ef4444',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            minWidth: '280px', maxWidth: '360px',
            animation: 'slideInToast 0.2s ease-out',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            pointerEvents: 'all'
          }}
        >
          <div style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>
            {toast.type === 'denied' ? <i className="fas fa-ban text-rose-500" /> : <i className="fas fa-lock text-amber-500" />}
          </div>
          <div>
            <div style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 700, marginBottom: '3px' }}>
              {toast.type === 'denied' ? 'Permission Denied' : 'Login Required'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '11px', lineHeight: 1.5 }}>
              {toast.type === 'denied'
                ? <>
                    {toast.username && <><strong style={{ color: '#cbd5e1' }}>{toast.username}</strong> · </>}
                    Missing: <strong style={{ color: '#fbbf24' }}>
                      {PERMISSION_LABELS[toast.permission ?? ''] ?? toast.permission}
                    </strong>
                  </>
                : 'Please log in to perform this action.'
              }
            </div>
          </div>
        </div>
      ))}
      <style>{`
        @keyframes slideInToast {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};
