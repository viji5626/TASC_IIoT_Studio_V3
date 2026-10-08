import React, { useState, useEffect } from 'react';
import { triggerClickHaptic, triggerAckHaptic } from '../../utils/hapticFeedback';

export interface CarrierOption {
  id: string;
  name: string;
  region: string;
  maxChars: number;
}

export interface SmsRecipient {
  id: string;
  name: string;
  phone: string;
  carrier: string;
  enabled: boolean;
  severities?: ('critical' | 'high' | 'medium' | 'low')[];
}

export interface SmsConfig {
  enabled: boolean;
  providerType: 'carrier_gateway' | 'libresms' | 'httpsms' | 'webhook';
  minSeverity: 'CRITICAL_ONLY' | 'HIGH_AND_CRITICAL' | 'ALL';
  debounceSeconds: number;
  alarmStormThreshold: number;
  alarmStormWindowSeconds: number;
  customFromEmail?: string;
  webhookUrl?: string;
  useSecondarySmtp?: boolean;
  secondarySmtp?: {
    host: string;
    port: number;
    secure: boolean;
    authType: 'none' | 'login' | 'anonymous';
    user: string;
    password?: string;
    fromEmail?: string;
    fromName?: string;
  };
  libreSmsUrl?: string;
  recipients: SmsRecipient[];
}

interface SmsAlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmsAlertConfigModal: React.FC<SmsAlertConfigModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<SmsConfig>({
    enabled: false,
    providerType: 'libresms',
    minSeverity: 'HIGH_AND_CRITICAL',
    debounceSeconds: 180,
    alarmStormThreshold: 5,
    alarmStormWindowSeconds: 60,
    customFromEmail: '',
    useSecondarySmtp: false,
    libreSmsUrl: 'http://192.168.1.50:8686',
    recipients: []
  });

  const [carriers, setCarriers] = useState<CarrierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // LibreSMS health check state
  const [libreSmsStatus, setLibreSmsStatus] = useState<{ checked: boolean; success: boolean; message: string } | null>(null);
  const [isCheckingLibreSms, setIsCheckingLibreSms] = useState(false);

  // New recipient draft form
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newRecipientPhone, setNewRecipientPhone] = useState('');
  const [newRecipientCarrier, setNewRecipientCarrier] = useState('verizon');
  const [phonebookError, setPhonebookError] = useState<string | null>(null);

  // Test SMS state
  const [testPhone, setTestPhone] = useState('');
  const [testCarrier, setTestCarrier] = useState('verizon');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCheckLibreSms = async () => {
    setIsCheckingLibreSms(true);
    setLibreSmsStatus(null);
    try {
      const res = await fetch('/api/sms/libresms/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: config.libreSmsUrl || 'http://192.168.1.50:8686' })
      });
      const data = await res.json();
      setLibreSmsStatus({
        checked: true,
        success: data.success,
        message: data.message || (data.success ? 'Gateway Online' : 'Gateway Offline')
      });
      if (data.success) triggerAckHaptic();
    } catch (err: any) {
      setLibreSmsStatus({
        checked: true,
        success: false,
        message: `Connection error: ${err.message}`
      });
    } finally {
      setIsCheckingLibreSms(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMsg(null);
    setTestResult(null);

    Promise.all([
      fetch('/api/sms/carriers').then(r => r.json()),
      fetch('/api/sms/config').then(r => r.json())
    ])
      .then(([carrierData, configData]) => {
        if (carrierData.success && carrierData.carriers) {
          setCarriers(carrierData.carriers);
          if (carrierData.carriers.length > 0) {
            setNewRecipientCarrier(carrierData.carriers[0].id);
            setTestCarrier(carrierData.carriers[0].id);
          }
        }
        if (configData.success && configData.config) {
          setConfig(configData.config);
          if (configData.config.recipients?.length > 0) {
            setTestPhone(configData.config.recipients[0].phone);
            setTestCarrier(configData.config.recipients[0].carrier);
          }
        }
      })
      .catch(err => {
        setErrorMsg(`Failed to load SMS settings: ${err.message}`);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/sms/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-operator-user': 'Admin'
        },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccessMsg('✓ SMS Alert settings and recipient phonebook saved successfully!');
        triggerAckHaptic();
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      } else {
        setErrorMsg(data.error || 'Failed to save SMS settings');
      }
    } catch (err: any) {
      setErrorMsg(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddRecipient = () => {
    if (!newRecipientName.trim() || !newRecipientPhone.trim()) {
      setPhonebookError('Please enter both an operator name and phone number.');
      setTimeout(() => setPhonebookError(null), 4000);
      return;
    }

    const newRec: SmsRecipient = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newRecipientName.trim(),
      phone: newRecipientPhone.trim(),
      carrier: newRecipientCarrier,
      enabled: true,
      severities: ['critical', 'high']
    };

    setConfig(prev => ({
      ...prev,
      recipients: [...prev.recipients, newRec]
    }));

    setNewRecipientName('');
    setNewRecipientPhone('');
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

  const handleSendTestSms = async (targetPhone: string, targetCarrier: string) => {
    if (!targetPhone.trim()) {
      setTestResult({ success: false, message: 'Please enter a valid phone number for testing.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/sms/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-operator-user': 'Admin'
        },
        body: JSON.stringify({
          phone: targetPhone.trim(),
          carrier: config.providerType === 'libresms' ? 'libresms' : targetCarrier,
          message: `[TASC TEST] Verification SMS via gateway at ${new Date().toLocaleTimeString()}. Reply not required.`,
          libreSmsUrl: config.libreSmsUrl
        })
      });

      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: (data.provider === 'libresms' || config.providerType === 'libresms')
            ? `✓ Dispatched to Android Phone (LibreSMS): Delivered via local SIM to ${targetPhone}`
            : `✓ Dispatched to Carrier Gateway (SMTP OK): ${data.gatewayEmail}`
        });
        triggerAckHaptic();
      } else {
        setTestResult({
          success: false,
          message: `✕ Dispatch Failed: ${data.error || 'Unknown carrier gateway error'}`
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

  // Group carriers by region
  const groupedCarriers = carriers.reduce((acc, c) => {
    acc[c.region] = acc[c.region] || [];
    acc[c.region].push(c);
    return acc;
  }, {} as Record<string, CarrierOption[]>);

  return (
    <div className="fixed inset-0 z-[450] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f172a] border border-sky-500/40 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-sky-950/60 to-slate-950 px-6 py-4 border-b border-sky-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/50 flex items-center justify-center text-sky-400 shadow-lg shadow-sky-500/10">
              <i className="fas fa-comment-sms text-lg"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Alarm SMS Alert Gateway
                </h2>
                <span className="bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                  100% Free Telecom Gateways
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Dispatches real-time SMS alerts to mobile phones via carrier Email-to-SMS gateways (Zero subscription fees)
              </p>
            </div>
          </div>
          <button
            type="button"
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
                title="Dismiss"
              >
                <i className="fas fa-xmark text-xs"></i>
              </button>
            </div>
          )}

          {/* Section 1: Master Enable & Global Policy */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="font-semibold text-white">Enable Automated SMS Alerts</span>
                <p className="text-xs text-slate-400">
                  When enabled, active alarms matching severity criteria will immediately dispatch text messages to enabled operators.
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
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">
                  Minimum Severity Threshold
                </label>
                <select
                  value={config.minSeverity}
                  onChange={e => setConfig(prev => ({ ...prev, minSeverity: e.target.value as any }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                >
                  <option value="CRITICAL_ONLY">Critical Only (HH / LL / Trips)</option>
                  <option value="HIGH_AND_CRITICAL">High & Critical (Standard)</option>
                  <option value="ALL">All Alarms (Including Warnings)</option>
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
                  onChange={e => setConfig(prev => ({ ...prev, debounceSeconds: Number(e.target.value) || 180 }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  placeholder="180"
                />
                <span className="text-[10px] text-slate-500">Suppresses rapid sensor chattering</span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-medium mb-1">
                  Alarm Storm Cap (alarms / 60s)
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={config.alarmStormThreshold}
                  onChange={e => setConfig(prev => ({ ...prev, alarmStormThreshold: Number(e.target.value) || 5 }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  placeholder="5"
                />
                <span className="text-[10px] text-slate-500">Sends 1 summary text if exceeded</span>
              </div>
            </div>

            {/* Gateway Architecture Selector */}
            <div className="pt-2">
              <label className="block text-xs text-slate-400 font-medium mb-2">
                SMS Delivery Architecture
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerClickHaptic();
                    setConfig(prev => ({ ...prev, providerType: 'libresms' }));
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.providerType === 'libresms'
                      ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white flex items-center space-x-1.5">
                      <i className="fas fa-mobile-screen-button text-sky-400"></i>
                      <span>LibreSMS (Local Android Phone)</span>
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                      India & Offline
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Uses an Android phone with your Airtel SIM on local Wi-Fi. 100% offline, zero cloud accounts, bypasses TRAI DLT.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerClickHaptic();
                    setConfig(prev => ({ ...prev, providerType: 'carrier_gateway' }));
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    config.providerType === 'carrier_gateway'
                      ? 'bg-sky-500/15 border-sky-500/60 ring-1 ring-sky-500/40'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-white flex items-center space-x-1.5">
                      <i className="fas fa-tower-cell text-sky-400"></i>
                      <span>Carrier Email-to-SMS Gateway</span>
                    </span>
                    <span className="bg-sky-500/20 text-sky-300 text-[10px] font-mono px-1.5 py-0.5 rounded">
                      US / Canada
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sends via SMTP to carrier domains (e.g. @vtext.com). Free in North America; blocked by TRAI in India.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Section: LibreSMS Local Android Gateway Configuration */}
          {config.providerType === 'libresms' && (
            <div className="bg-slate-900/60 border border-sky-500/30 rounded-xl p-5 space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="font-semibold text-white flex items-center space-x-2">
                    <i className="fas fa-wifi text-emerald-400 text-xs"></i>
                    <span>LibreSMS Local Android Phone Gateway</span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                      Zero Cloud / 100% LAN
                    </span>
                  </span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Connect any Android phone (with your Airtel SIM) to the same Wi-Fi as the SCADA server. No internet required.
                  </p>
                </div>
              </div>

              {/* Step-by-Step Setup Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-sky-400">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center text-[10px]">1</span>
                    <span>Install Offline APK</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Install <span className="font-mono text-slate-300">com.libresms.app-Signed.apk</span> on any Android phone with your Airtel SIM.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-emerald-400">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
                    <span>Connect & Start</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Connect phone to factory Wi-Fi, open app, grant SMS permission, and tap <span className="text-emerald-300 font-semibold">Start Gateway</span>.
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-amber-400">
                    <span className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px]">3</span>
                    <span>Enter Phone's Local IP</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Copy the IP displayed on phone screen (e.g. <span className="font-mono text-amber-300">http://192.168.1.50:8686</span>) into the field below.
                  </p>
                </div>
              </div>

              {/* Phone Local IP Input & Health Check */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-8">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-slate-300 font-medium">
                      Android Phone Gateway IP Address
                    </label>
                    <span className="text-[10px] text-sky-400 font-mono">
                      Local Wi-Fi OR Tailscale IP supported
                    </span>
                  </div>
                  <input
                    type="text"
                    value={config.libreSmsUrl || ''}
                    onChange={e => setConfig(prev => ({ ...prev, libreSmsUrl: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                    placeholder="http://192.168.1.50:8686 or http://100.x.y.z:8686"
                  />
                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400 mt-1">
                    <span><strong>Primary (Local Wi-Fi):</strong> <code className="text-sky-300 bg-slate-900 px-1 py-0.5 rounded">http://192.168.1.50:8686</code></span>
                    <span>•</span>
                    <span><strong>Fallback (Tailscale VPN):</strong> <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">http://100.x.y.z:8686</code></span>
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={handleCheckLibreSms}
                    disabled={isCheckingLibreSms}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs py-2 px-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all cursor-pointer border border-slate-700"
                  >
                    {isCheckingLibreSms ? (
                      <i className="fas fa-spinner fa-spin text-xs"></i>
                    ) : (
                      <i className="fas fa-satellite-dish text-xs text-emerald-400"></i>
                    )}
                    <span>{isCheckingLibreSms ? 'Pinging...' : 'Ping Phone / Check Status'}</span>
                  </button>
                </div>
              </div>

              {libreSmsStatus && (
                <div className={`p-3 rounded-xl text-xs flex items-center space-x-2 animate-in fade-in ${
                  libreSmsStatus.success
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
                }`}>
                  <i className={`fas ${libreSmsStatus.success ? 'fa-circle-check' : 'fa-circle-xmark'} text-sm`}></i>
                  <span>{libreSmsStatus.message}</span>
                </div>
              )}

              {/* Standalone APK & Google Drive Direct Download */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                    <i className="fas fa-shield-halved text-sky-400"></i>
                    <span>LibreSMS Android Gateway App Download:</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Direct Cloud &amp; Offline Storage
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <a
                    href="https://drive.google.com/file/d/1O1qoeARBUMTE4LGmgenPBPbvWl6QdbSW/view?usp=sharing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition-all shadow cursor-pointer"
                  >
                    <i className="fab fa-google-drive text-sm"></i>
                    <span>Download APK (Google Drive)</span>
                    <i className="fas fa-arrow-up-right-from-square text-[10px] ml-1"></i>
                  </a>

                  <div className="text-[11px] text-slate-400">
                    <span>Or install offline from: </span>
                    <code className="text-sky-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono text-[10px]">
                      sms_gateway/libresms/com.libresms.app-Signed.apk
                    </code>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-900">
                  <p>• <strong>System Tip:</strong> Keep <em>Google Messages</em> as your phone's default SMS app so incoming alarms ring normally and display as conversation bubbles.</p>
                  <p>• <strong>Battery Tip:</strong> Set LibreSMS battery optimization to <em>Unrestricted</em> in Android Settings so alarms send even when screen is locked.</p>
                </div>
              </div>
            </div>
          )}

          {/* Section: Dedicated Alerting / Secondary SMTP (Shown for Carrier Gateway) */}
          {config.providerType === 'carrier_gateway' && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="font-semibold text-white flex items-center space-x-2">
                    <i className="fas fa-envelope-circle-check text-sky-400 text-xs"></i>
                    <span>Dedicated Secondary SMTP (Alert Isolation)</span>
                    <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </span>
                  <p className="text-xs text-slate-400">
                    Route SMS dispatches through a dedicated Gmail/alerting SMTP to prevent carrier rate-limiting on your primary company email.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(config.useSecondarySmtp)}
                    onChange={e => {
                      triggerClickHaptic();
                      const enabled = e.target.checked;
                      setConfig(prev => ({
                        ...prev,
                        useSecondarySmtp: enabled,
                        secondarySmtp: prev.secondarySmtp || {
                          host: 'smtp.gmail.com',
                          port: 587,
                          secure: false,
                          authType: 'login',
                          user: '',
                          password: '',
                          fromEmail: '',
                          fromName: 'TASC Alarm Alerts'
                        }
                      }));
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                </label>
              </div>

              {config.useSecondarySmtp && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 animate-in fade-in">
                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">SMTP Server Host</label>
                    <input
                      type="text"
                      value={config.secondarySmtp?.host || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        secondarySmtp: { ...prev.secondarySmtp!, host: e.target.value }
                      }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                      placeholder="smtp.gmail.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">Port</label>
                    <input
                      type="number"
                      value={config.secondarySmtp?.port || 587}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        secondarySmtp: { ...prev.secondarySmtp!, port: Number(e.target.value) || 587 }
                      }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                      placeholder="587"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">Username / Email</label>
                    <input
                      type="text"
                      value={config.secondarySmtp?.user || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        secondarySmtp: { ...prev.secondarySmtp!, user: e.target.value }
                      }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                      placeholder="alerts@company.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">App Password</label>
                    <input
                      type="password"
                      value={config.secondarySmtp?.password || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        secondarySmtp: { ...prev.secondarySmtp!, password: e.target.value }
                      }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                      placeholder="••••••••••••••••"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">From Name</label>
                    <input
                      type="text"
                      value={config.secondarySmtp?.fromName || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        secondarySmtp: { ...prev.secondarySmtp!, fromName: e.target.value }
                      }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                      placeholder="TASC Alarm Alerts"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 font-medium mb-1">Sender Email</label>
                    <input
                      type="text"
                      value={config.secondarySmtp?.fromEmail || ''}
                      onChange={e => setConfig(prev => ({
                        ...prev,
                        secondarySmtp: { ...prev.secondarySmtp!, fromEmail: e.target.value }
                      }))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none font-mono"
                      placeholder="alerts@company.com"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Recipient Phonebook */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Operator Phonebook</h3>
                <p className="text-xs text-slate-400">
                  Manage on-call plant operators and mobile numbers receiving instantaneous SMS alerts.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">
                {config.recipients.length} Recipient{config.recipients.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Regulatory Notice or LibreSMS Active Badge */}
            {config.providerType === 'libresms' ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start space-x-2.5">
                <i className="fas fa-circle-check text-emerald-400 mt-0.5 shrink-0"></i>
                <div>
                  <span className="font-semibold text-emerald-200">Local Android SIM Delivery Active:</span>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Alarms are sent directly via the connected Android phone's active SIM card. This bypasses telecom carrier email domain restrictions. All local cellular numbers supported.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start space-x-2.5">
                <i className="fas fa-triangle-exclamation text-amber-400 mt-0.5 shrink-0"></i>
                <div>
                  <span className="font-semibold text-amber-200">Notice for India (TRAI DLT Mandates):</span>
                  <p className="text-[11px] text-amber-300/80 mt-0.5">
                    Indian telecom carriers (Airtel, Jio, BSNL, Vi) decommissioned open public Email-to-SMS domains under anti-spam regulations (incoming emails to @airtelmail.com or @bsnl.in bounce with 550 User not found). For India, switch delivery architecture to <strong className="text-amber-200">LibreSMS (Local Android Phone)</strong> above.
                  </p>
                </div>
              </div>
            )}

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
              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">Operator Name</label>
                <input
                  type="text"
                  value={newRecipientName}
                  onChange={e => {
                    setNewRecipientName(e.target.value);
                    if (phonebookError) setPhonebookError(null);
                  }}
                  placeholder="e.g. Plant Lead"
                  className={`w-full bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-white focus:outline-none transition-colors ${
                    phonebookError && !newRecipientName.trim()
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] text-slate-400 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newRecipientPhone}
                  onChange={e => {
                    setNewRecipientPhone(e.target.value);
                    if (phonebookError) setPhonebookError(null);
                  }}
                  placeholder={config.providerType === 'libresms' ? "e.g. +91 98XXXXXXXX" : "e.g. +1 555-0100"}
                  className={`w-full bg-slate-900 border rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none transition-colors ${
                    phonebookError && !newRecipientPhone.trim()
                      ? 'border-rose-500/80 focus:border-rose-500'
                      : 'border-slate-700 focus:border-sky-500'
                  }`}
                />
              </div>

              <div className={config.providerType === 'libresms' ? 'sm:col-span-4' : 'sm:col-span-4'}>
                <label className="block text-[11px] text-slate-400 mb-1">
                  {config.providerType === 'libresms' ? 'Delivery Mode' : 'Telecom Carrier'}
                </label>
                {config.providerType === 'libresms' ? (
                  <div className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-emerald-400 font-mono flex items-center space-x-2">
                    <i className="fas fa-sim-card text-xs"></i>
                    <span>Local Android SIM (Direct Cellular SMS)</span>
                  </div>
                ) : (
                  <select
                    value={newRecipientCarrier}
                    onChange={e => setNewRecipientCarrier(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
                  >
                    {Object.entries(groupedCarriers).map(([region, list]) => (
                      <optgroup key={region} label={region}>
                        {(list as CarrierOption[]).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )}
              </div>

              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs py-1.5 px-3 rounded flex items-center justify-center space-x-1 transition-all cursor-pointer shadow"
                >
                  <i className="fas fa-user-plus text-[11px]"></i>
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Recipients List Table */}
            {config.recipients.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                No recipients configured yet. Add your first on-duty operator above to start receiving SMS alerts.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">{config.providerType === 'libresms' ? 'Transport' : 'Carrier'}</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {config.recipients.map(r => {
                      const carrierObj = carriers.find(c => c.id === r.carrier);
                      return (
                        <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2 px-3">
                            <button
                              type="button"
                              onClick={() => handleToggleRecipient(r.id)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono transition-all cursor-pointer ${r.enabled
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                                }`}
                            >
                              {r.enabled ? 'ACTIVE' : 'MUTED'}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-medium text-white">{r.name}</td>
                          <td className="py-2 px-3 font-mono text-slate-300">{r.phone}</td>
                          <td className="py-2 px-3 text-slate-300">
                            {config.providerType === 'libresms' ? (
                              <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded text-[11px] font-mono flex items-center space-x-1 w-fit">
                                <i className="fas fa-mobile-screen-button text-[10px]"></i>
                                <span>Android SIM</span>
                              </span>
                            ) : (
                              <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-[11px]">
                                {carrierObj?.name || r.carrier}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleSendTestSms(r.phone, r.carrier)}
                              disabled={isTesting}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 rounded text-[11px] font-medium transition-all cursor-pointer border border-slate-700 inline-flex items-center space-x-1"
                              title="Send instantaneous test SMS to this operator"
                            >
                              <i className="fas fa-paper-plane text-[10px]"></i>
                              <span>Test</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveRecipient(r.id)}
                              className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded text-[11px] transition-all cursor-pointer border border-rose-500/30"
                              title="Remove from phonebook"
                            >
                              <i className="fas fa-trash-can text-[10px]"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Live Test SMS Sandbox */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">Live SMS Gateway Verification</h3>
                <p className="text-xs text-slate-400">
                  {config.providerType === 'libresms'
                    ? 'Verify local Android phone reachability and test cellular SMS delivery without triggering plant alarms.'
                    : 'Verify carrier gateway reachability and test mobile delivery without triggering plant alarms.'}
                </p>
              </div>
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                Rate-limited: Max 5 tests / 5 min
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className={config.providerType === 'libresms' ? 'sm:col-span-8' : 'sm:col-span-5'}>
                <input
                  type="text"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder={config.providerType === 'libresms' ? "Enter mobile number (e.g. +91 98XXXXXXXX)" : "Enter phone number (e.g. +1 555-0100)"}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              {config.providerType === 'carrier_gateway' && (
                <div className="sm:col-span-4">
                  <select
                    value={testCarrier}
                    onChange={e => setTestCarrier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                  >
                    {Object.entries(groupedCarriers).map(([region, list]) => (
                      <optgroup key={region} label={region}>
                        {(list as CarrierOption[]).map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              )}

              <div className={config.providerType === 'libresms' ? 'sm:col-span-4' : 'sm:col-span-3'}>
                <button
                  type="button"
                  onClick={() => handleSendTestSms(testPhone, testCarrier)}
                  disabled={isTesting}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold text-xs py-2 px-3 rounded flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow"
                >
                  {isTesting ? (
                    <>
                      <i className="fas fa-spinner fa-spin text-xs"></i>
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <>
                      <i className="fas fa-paper-plane text-xs"></i>
                      <span>{config.providerType === 'libresms' ? 'Send Test via LibreSMS' : 'Send Test SMS'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-xs font-mono flex items-center space-x-2 border animate-in fade-in ${testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                  }`}
              >
                <i className={`fas ${testResult.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Uses configured SMTP transport. Standard telecom text limits apply (160 characters).
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-lg shadow-sky-500/20 flex items-center space-x-2"
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

export default SmsAlertConfigModal;
