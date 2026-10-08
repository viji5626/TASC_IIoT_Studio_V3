import React, { useState, useEffect } from 'react';
import { triggerClickHaptic, triggerAckHaptic } from '../../utils/hapticFeedback';

export interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  severities?: ('critical' | 'high' | 'medium' | 'low')[];
}

export interface EmailAlertConfig {
  enabled: boolean;
  minSeverity: 'CRITICAL_ONLY' | 'HIGH_AND_CRITICAL' | 'ALL';
  debounceSeconds: number;
  alarmStormThreshold: number;
  alarmStormWindowSeconds: number;
  smtp: {
    host: string;
    port: number;
    secure?: boolean;
    user?: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
    authType?: 'login' | 'anonymous';
  };
  recipients: EmailRecipient[];
}

interface EmailAlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmailAlertConfigModal: React.FC<EmailAlertConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<EmailAlertConfig>({
    enabled: true,
    minSeverity: 'HIGH_AND_CRITICAL',
    debounceSeconds: 120,
    alarmStormThreshold: 5,
    alarmStormWindowSeconds: 60,
    smtp: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      authType: 'login',
      user: '',
      password: '',
      fromEmail: '',
      fromName: 'TASC Alarm Alerts'
    },
    recipients: []
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New recipient form state
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [phonebookError, setPhonebookError] = useState<string | null>(null);

  // Test Email state
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch('/api/alarms/email/config')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.config) {
          setConfig(data.config);
          if (data.config.recipients && data.config.recipients.length > 0) {
            setTestEmail(data.config.recipients[0].email);
          }
        }
      })
      .catch(err => {
        console.error('Failed to load email alert config:', err);
        setErrorMsg('Failed to fetch existing email alert configuration.');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/alarms/email/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('Alarm Email Alert settings saved successfully!');
        if (data.config) setConfig(data.config);
        triggerAckHaptic();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to save email settings');
      }
    } catch (err: any) {
      setErrorMsg(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipientName.trim() || !newRecipientEmail.trim()) {
      setPhonebookError('Please enter both an operator name and email address.');
      setTimeout(() => setPhonebookError(null), 4000);
      return;
    }

    if (!newRecipientEmail.includes('@') || !newRecipientEmail.includes('.')) {
      setPhonebookError('Please enter a valid email address (e.g. engineer@plant.com).');
      setTimeout(() => setPhonebookError(null), 4000);
      return;
    }

    const newRec: EmailRecipient = {
      id: `rec_email_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newRecipientName.trim(),
      email: newRecipientEmail.trim(),
      enabled: true,
      severities: ['critical', 'high']
    };

    setConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, newRec]
    }));

    setNewRecipientName('');
    setNewRecipientEmail('');
    setPhonebookError(null);
    triggerClickHaptic();
  };

  const handleRemoveRecipient = (id: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.filter(r => r.id !== id)
    }));
    triggerClickHaptic();
  };

  const handleToggleRecipient = (id: string) => {
    setConfig(prev => ({
      ...prev,
      recipients: prev.recipients.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
    }));
    triggerClickHaptic();
  };

  const handleSendTestEmail = async (target: string) => {
    if (!target.trim() || !target.includes('@')) {
      setTestResult({ success: false, message: 'Please enter a valid email address for testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/alarms/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: target.trim() })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: `✓ Test alert delivered successfully to ${target} (SMTP OK)`
        });
        triggerAckHaptic();
      } else {
        setTestResult({
          success: false,
          message: `✕ Delivery Failed: ${data.error || 'SMTP delivery failed'}`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `✕ Network Error: ${err.message}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f141d] border-2 border-rose-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col w-full max-w-4xl max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-rose-950/80 to-slate-950 px-5 py-3.5 border-b border-rose-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <i className="fas fa-envelope-open-text text-sm"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Alarm Email Alert Gateway
                </h2>
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  Secondary Server SMTP
                </span>
              </div>
              <p className="text-xs text-rose-200/70">
                Dispatches real-time HTML alarm alerts to operators and maintenance teams via dedicated SMTP.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-200 text-sm">
          
          {/* Status Banners */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <i className="fas fa-circle-check text-sm"></i>
              <span>{saveSuccessMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
              <div className="flex items-center space-x-2">
                <i className="fas fa-circle-exclamation text-sm shrink-0"></i>
                <span>{errorMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMsg(null)}
                className="text-rose-400 hover:text-white ml-2 p-1 rounded transition-colors cursor-pointer"
              >
                <i className="fas fa-xmark text-xs"></i>
              </button>
            </div>
          )}

          {/* Section 1: Master Enable & Global Policy */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-semibold text-white">Enable Automated Email Alerts</span>
                <p className="text-xs text-slate-400">
                  When enabled, active alarms matching severity criteria will immediately dispatch formatted HTML emails to registered plant engineers.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => {
                    triggerClickHaptic();
                    setConfig(prev => ({ ...prev, enabled: e.target.checked }));
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">
                  Minimum Severity Threshold
                </label>
                <select
                  value={config.minSeverity}
                  onChange={e => setConfig(prev => ({ ...prev, minSeverity: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="CRITICAL_ONLY">Critical Only (HH / LL / Trips)</option>
                  <option value="HIGH_AND_CRITICAL">High & Critical (Standard Recommended)</option>
                  <option value="ALL">All Alarms (Including Minor Warnings)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">
                  Per-Alarm Debounce Window (sec)
                </label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={config.debounceSeconds}
                  onChange={e => setConfig(prev => ({ ...prev, debounceSeconds: Number(e.target.value) || 120 }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
                  placeholder="120"
                />
                <span className="text-[10px] text-slate-500">Suppresses inbox spamming during rapid sensor flutter</span>
              </div>
            </div>
          </div>

          {/* Section 2: Dedicated Secondary SMTP Server Configuration */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-semibold text-white flex items-center space-x-2">
                  <i className="fas fa-server text-rose-400 text-xs"></i>
                  <span>Dedicated Secondary SMTP Server</span>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                    Alert Isolation
                  </span>
                </span>
                <p className="text-xs text-slate-400">
                  Sends via your isolated alerting account {config.smtp.user ? (<code className="text-rose-300 font-mono">({config.smtp.user})</code>) : '(e.g. alerts@company.com)'} to guarantee high-priority alarm delivery.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={config.smtp.host}
                  onChange={e => setConfig(prev => ({ ...prev, smtp: { ...prev.smtp, host: e.target.value } }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Port</label>
                <input
                  type="number"
                  value={config.smtp.port}
                  onChange={e => setConfig(prev => ({ ...prev, smtp: { ...prev.smtp, port: Number(e.target.value) || 587 } }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  placeholder="587"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Username / Email</label>
                <input
                  type="text"
                  value={config.smtp.user || ''}
                  onChange={e => setConfig(prev => ({ ...prev, smtp: { ...prev.smtp, user: e.target.value } }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  placeholder="alerts@company.com"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">App Password</label>
                <input
                  type="password"
                  value={config.smtp.password || ''}
                  onChange={e => setConfig(prev => ({ ...prev, smtp: { ...prev.smtp, password: e.target.value } }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">From Name</label>
                <input
                  type="text"
                  value={config.smtp.fromName || 'TASC Alarm Alerts'}
                  onChange={e => setConfig(prev => ({ ...prev, smtp: { ...prev.smtp, fromName: e.target.value } }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                  placeholder="TASC Alarm Alerts"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">From Email Address</label>
                <input
                  type="text"
                  value={config.smtp.fromEmail || ''}
                  onChange={e => setConfig(prev => ({ ...prev, smtp: { ...prev.smtp, fromEmail: e.target.value } }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                  placeholder="alerts@company.com"
                />
              </div>
            </div>

            {/* Quick Gmail App Password Instructions Callout */}
            <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-rose-300 flex items-center space-x-1.5">
                  <i className="fas fa-lightbulb text-amber-400"></i>
                  <span>Gmail SMTP Setup Tip (16-Character App Password)</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Refer to Manual Ch 14</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Never enter your regular Google login password. Enable <strong>2-Step Verification</strong> on your alerting Google Account (<code className="text-rose-300 font-mono">myaccount.google.com/security</code>), search for <strong>App Passwords</strong>, generate a 16-character code for <em>TASC Alarm Alerts</em>, and paste it here.
              </p>
            </div>
          </div>

          {/* Section 3: Operator Email Directory */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Operator Email Directory</h3>
                <p className="text-xs text-slate-400">
                  Manage on-call engineers and managers who receive instant alarm dispatch emails.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                {config.recipients.length} Recipient{config.recipients.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* In-place validation message right at the Add Recipient location */}
            {phonebookError && (
              <div className="p-2.5 bg-rose-500/15 border border-rose-500/40 rounded-lg text-rose-300 text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-circle-exclamation text-rose-400 text-xs shrink-0"></i>
                  <span>{phonebookError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPhonebookError(null)}
                  className="text-rose-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                  title="Dismiss"
                >
                  <i className="fas fa-xmark text-xs"></i>
                </button>
              </div>
            )}

            {/* Add Recipient Row */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="block text-[11px] text-slate-400 mb-1">Operator / Engineer Name</label>
                <input
                  type="text"
                  value={newRecipientName}
                  onChange={e => {
                    setNewRecipientName(e.target.value);
                    if (phonebookError) setPhonebookError(null);
                  }}
                  placeholder="e.g. Shift Lead / Plant Engineer"
                  className={`w-full bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors ${
                    phonebookError && !newRecipientName.trim()
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-700 focus:border-rose-500'
                  }`}
                />
              </div>

              <div className="sm:col-span-5">
                <label className="block text-[11px] text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newRecipientEmail}
                  onChange={e => {
                    setNewRecipientEmail(e.target.value);
                    if (phonebookError) setPhonebookError(null);
                  }}
                  placeholder="e.g. operator@company.com"
                  className={`w-full bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none transition-colors ${
                    phonebookError && !newRecipientEmail.trim()
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-700 focus:border-rose-500'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center justify-center space-x-1 transition-all cursor-pointer shadow"
                >
                  <i className="fas fa-user-plus text-[11px]"></i>
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Recipients List Table */}
            {config.recipients.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No email recipients configured yet. Add an on-duty engineer above to receive real-time alarm emails.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email Address</th>
                      <th className="py-2 px-3">Severities</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {config.recipients.map(r => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleRecipient(r.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                              r.enabled
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {r.enabled ? 'ACTIVE' : 'MUTED'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-sans font-medium text-white">{r.name}</td>
                        <td className="py-2.5 px-3 text-rose-300">{r.email}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded">
                            CRITICAL / HIGH
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSendTestEmail(r.email)}
                              disabled={isTesting}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-sky-300 rounded text-[11px] transition-colors flex items-center space-x-1 cursor-pointer"
                              title="Send test email alert to this operator"
                            >
                              <i className="fas fa-paper-plane text-[10px]"></i>
                              <span>Test</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipient(r.id)}
                              className="w-7 h-7 bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete recipient"
                            >
                              <i className="fas fa-trash text-[11px]"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 4: Live Email Verification */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">Live Email Gateway Verification</span>
                <p className="text-xs text-slate-400">
                  Verify secondary SMTP reachability and test mailbox delivery without triggering plant alarms.
                </p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                Rate-limited: Max 5 tests / 5 min
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Enter test email address..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-rose-500 focus:outline-none w-full"
              />
              <button
                type="button"
                onClick={() => handleSendTestEmail(testEmail)}
                disabled={isTesting || !testEmail.trim()}
                className="w-full sm:w-auto bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs py-2 px-5 rounded-lg flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
              >
                {isTesting ? (
                  <>
                    <i className="fas fa-spinner fa-spin text-xs"></i>
                    <span>Sending Alert...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane text-xs"></i>
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center space-x-2 animate-in fade-in ${
                  testResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
                }`}
              >
                <i className={`fas ${testResult.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-rose-400'} text-sm`}></i>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3.5 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            <i className="fas fa-lock text-slate-600 text-[11px]"></i>
            <span>Secondary SMTP active. Standard TLS/STARTTLS encrypted connection (Port 587).</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer shadow-lg shadow-rose-950/50 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin text-xs"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-floppy-disk text-xs"></i>
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
