import React, { useState, useEffect } from 'react';
import type { SmtpServerConfig } from '../../types/reporting';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailSettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SmtpServerConfig>({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromName: 'TASC IIoT Studio',
    fromEmail: '',
    authType: 'login'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      setTestStatus(null);
    }
  }, [isOpen]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/smtp/config');
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
      }
    } catch (err: any) {
      console.error('Failed to load SMTP config:', err.message);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/smtp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus({ success: true, message: 'SMTP settings saved successfully.' });
        setTimeout(() => onClose(), 1200);
      } else {
        setTestStatus({ success: false, message: data.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setTestStatus({ success: false, message: err.message });
    }
    setIsSaving(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, testEmail })
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus({
          success: true,
          message: testEmail
            ? `Connection successful! Test email delivered to ${testEmail}.`
            : 'Connection successful! SMTP server responded OK.'
        });
      } else {
        setTestStatus({
          success: false,
          message: `Connection failed: ${data.error || 'Check host, port and credentials.'}`
        });
      }
    } catch (err: any) {
      setTestStatus({ success: false, message: `Test failed: ${err.message}` });
    }
    setIsTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden animate-fade-in">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <i className="fas fa-envelope text-sm" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Global SMTP Email Settings</h3>
              <p className="text-xs text-slate-400">Configure outbound email relay for scheduled & triggered reports</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fas fa-xmark text-sm" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
          {isLoading ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center space-x-2">
              <i className="fas fa-circle-notch fa-spin" />
              <span>Loading SMTP settings...</span>
            </div>
          ) : (
            <>
              {/* Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">SMTP Host / Server *</label>
                  <input
                    type="text"
                    value={config.host}
                    onChange={e => setConfig({ ...config, host: e.target.value })}
                    placeholder="e.g. smtp.office365.com or mail.plant.local"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Port *</label>
                  <input
                    type="number"
                    value={config.port}
                    onChange={e => setConfig({ ...config, port: Number(e.target.value) })}
                    placeholder="587"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              {/* Security & Auth Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex items-center space-x-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
                  <input
                    type="checkbox"
                    id="secureSmtp"
                    checked={config.secure}
                    onChange={e => setConfig({ ...config, secure: e.target.checked })}
                    className="w-4 h-4 rounded cursor-pointer accent-sky-500"
                  />
                  <label htmlFor="secureSmtp" className="text-xs text-slate-300 cursor-pointer">
                    Use SSL/TLS (Port 465)
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Authentication Mode</label>
                  <select
                    value={config.authType || 'login'}
                    onChange={e => setConfig({ ...config, authType: e.target.value as any })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  >
                    <option value="login">Username / Password Login</option>
                    <option value="anonymous">Anonymous (Internal Relay / No Auth)</option>
                  </select>
                </div>
              </div>

              {/* Username & Password */}
              {config.authType !== 'anonymous' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">SMTP Username</label>
                    <input
                      type="text"
                      value={config.user || ''}
                      onChange={e => setConfig({ ...config, user: e.target.value })}
                      placeholder="e.g. reports@company.com"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">SMTP Password</label>
                    <input
                      type="password"
                      value={config.password || ''}
                      onChange={e => setConfig({ ...config, password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Sender Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Sender Display Name</label>
                  <input
                    type="text"
                    value={config.fromName || ''}
                    onChange={e => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="TASC SCADA Reports"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">From Email Address</label>
                  <input
                    type="email"
                    value={config.fromEmail || ''}
                    onChange={e => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="scada-noreply@company.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Test Connection Section */}
              <div className="pt-3 border-t border-slate-800/80">
                <label className="text-xs font-bold text-slate-300 block mb-1.5 flex items-center space-x-1.5">
                  <i className="fas fa-paper-plane text-sky-400 text-xs" />
                  <span>Verify Connection & Send Test Email</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Enter recipient email (e.g. operator@company.com)"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !config.host}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 font-semibold text-xs border border-slate-700 transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {isTesting ? <i className="fas fa-circle-notch fa-spin text-xs" /> : <i className="fas fa-bolt text-xs" />}
                    <span>Test Connection</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {testStatus && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start space-x-2 animate-fade-in ${
                    testStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border-red-500/30 text-red-300'
                  }`}
                >
                  <i className={`fas ${testStatus.success ? 'fa-circle-check' : 'fa-circle-exclamation'} mt-0.5`} />
                  <span>{testStatus.message}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !config.host}
            className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
          >
            {isSaving && <i className="fas fa-circle-notch fa-spin text-xs" />}
            <span>Save SMTP Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
