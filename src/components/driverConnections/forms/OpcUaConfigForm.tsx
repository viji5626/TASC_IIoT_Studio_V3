import React, { useState } from 'react';
import { DriverConnection } from '../../../types';

interface OpcUaConfigFormProps {
  conn: Partial<DriverConnection>;
  setField: (key: keyof DriverConnection, value: any) => void;
}

export const OpcUaConfigForm: React.FC<OpcUaConfigFormProps> = ({ conn, setField }) => {
  const [opcSectionConnection, setOpcSectionConnection] = useState(true);
  const [opcSectionAuth, setOpcSectionAuth] = useState(false);
  const [opcSectionSecurity, setOpcSectionSecurity] = useState(false);
  const [opcSectionTelemetry, setOpcSectionTelemetry] = useState(false);
  const [opcSectionTimeouts, setOpcSectionTimeouts] = useState(false);

  const [opcUaTestStatus, setOpcUaTestStatus] = useState<{
    testing: boolean;
    target: 'primary' | 'secondary' | null;
    success?: boolean;
    message?: string;
  }>({
    testing: false,
    target: null
  });

  const testOpcUaConnection = async (target: 'primary' | 'secondary') => {
    const endpoint = target === 'primary' ? conn.endpointUrl : conn.secondaryEndpointUrl;
    if (!endpoint) {
      setOpcUaTestStatus({ testing: false, target, success: false, message: 'Please enter an endpoint URL first' });
      return;
    }
    setOpcUaTestStatus({ testing: true, target });
    try {
      const res = await fetch('/api/opcua/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: endpoint,
          securityMode: conn.securityMode || 'None',
          securityPolicy: conn.securityPolicy || 'None',
          authMode: conn.authMode || 'anonymous',
          username: conn.username,
          password: conn.password,
          connectTimeoutMs: conn.connectTimeoutMs || 6000
        })
      });
      const data = await res.json();
      if (data.success) {
        setOpcUaTestStatus({ testing: false, target, success: true, message: data.message || `Connected to ${endpoint}` });
      } else {
        setOpcUaTestStatus({ testing: false, target, success: false, message: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setOpcUaTestStatus({ testing: false, target, success: false, message: err.message || 'Probe request failed' });
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {/* Test Connection Probe Feedback Banner */}
      {opcUaTestStatus.testing && (
        <div className="p-2.5 bg-sky-950/70 border border-sky-500/40 rounded-xl text-sky-200 text-xs flex items-center space-x-2 animate-pulse">
          <i className="fas fa-circle-notch fa-spin text-sky-400"></i>
          <span>Probing {opcUaTestStatus.target === 'primary' ? 'Primary' : 'Secondary'} Endpoint & Authenticating session...</span>
        </div>
      )}
      {!opcUaTestStatus.testing && opcUaTestStatus.message && (
        <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${opcUaTestStatus.success ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
          <div className="flex items-center space-x-2">
            <i className={`fas ${opcUaTestStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
            <span>{opcUaTestStatus.message}</span>
          </div>
          <button type="button" onClick={() => setOpcUaTestStatus({ testing: false, target: null })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
        </div>
      )}

      {/* 1. Connection & Redundancy Settings (Collapsible) */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setOpcSectionConnection(!opcSectionConnection)}
          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
        >
          <div className="flex items-center space-x-2">
            <i className="fas fa-network-wired text-sky-400"></i>
            <span className="uppercase tracking-wider">Connection Settings</span>
          </div>
          <i className={`fas fa-chevron-${opcSectionConnection ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
        </button>
        
        {opcSectionConnection && (
          <div className="p-3.5 space-y-3">
            {/* Primary Endpoint */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Primary Endpoint: *
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={conn.endpointUrl || ''}
                  onChange={e => setField('endpointUrl', e.target.value)}
                  placeholder="opc.tcp://127.0.0.1:4840"
                  className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => testOpcUaConnection('primary')}
                  disabled={opcUaTestStatus.testing || !conn.endpointUrl}
                  className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <i className="fas fa-bolt text-[10px]"></i>
                  <span>Test Connection</span>
                </button>
              </div>
            </div>

            {/* Secondary Redundant Endpoint */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Secondary Endpoint:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={conn.secondaryEndpointUrl || ''}
                  onChange={e => setField('secondaryEndpointUrl', e.target.value)}
                  placeholder="opc.tcp://192.168.1.11:4840"
                  className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => testOpcUaConnection('secondary')}
                  disabled={opcUaTestStatus.testing || !conn.secondaryEndpointUrl}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  <i className="fas fa-shield-alt text-[10px]"></i>
                  <span>Test Connection</span>
                </button>
              </div>
            </div>

            {/* Override Thumbprint */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                <span>Override Thumbprint:</span>
                <span className="text-[10px] text-slate-500 font-mono">X.509 Certificate</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={conn.overrideThumbprint || ''}
                  onChange={e => setField('overrideThumbprint', e.target.value)}
                  placeholder="Overrides application certificate thumbprint..."
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
                <i className="fas fa-certificate absolute right-2.5 top-2.5 text-sky-400 text-xs" title="Overrides default application certificate with another one"></i>
              </div>
              <p className="text-[10px] text-slate-400 italic mt-0.5">Note: Overrides the default application certificate with another one</p>
            </div>

            {/* Preferred Endpoint & Fallback */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Preferred Endpoint:
                </label>
                <input
                  type="text"
                  value={conn.preferredEndpoint || ''}
                  onChange={e => setField('preferredEndpoint', e.target.value)}
                  placeholder="Auto-discovered or manual endpoint"
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Fallback to:
                </label>
                <select
                  value={conn.securityFallback || 'no_security'}
                  onChange={e => setField('securityFallback', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                >
                  <option value="no_security">Fallback to no security</option>
                  <option value="max_security">Fallback to the maximum security available</option>
                </select>
              </div>
            </div>

            {/* Domain Check & Browsing Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1">
              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="disableDomainCheck"
                  checked={conn.disableDomainCheck === true}
                  onChange={e => setField('disableDomainCheck', e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="disableDomainCheck" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                  Disable Domain Check
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Browsing Mode:
                </label>
                <select
                  value={conn.browsingMode || 'browse_path'}
                  onChange={e => setField('browsingMode', e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                >
                  <option value="browse_path">Always Browse Path</option>
                  <option value="node_id">Browse by NodeId</option>
                </select>
              </div>
            </div>
            {conn.browsingMode === 'browse_path' && (
              <p className="text-[10px] text-amber-400/90 font-medium">
                <span className="font-bold">Warning:</span> "Always Browse Path" mode may cause performance issues when connecting to large OPC UA servers.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Authentication Settings (Collapsible) */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setOpcSectionAuth(!opcSectionAuth)}
          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
        >
          <div className="flex items-center space-x-2">
            <i className="fas fa-user-lock text-sky-400"></i>
            <span className="uppercase tracking-wider">Authentication Settings</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-900/60 text-sky-200 rounded">
              {conn.authMode === 'username_password' ? 'Username / Password' : conn.authMode === 'certificate' ? 'Certificate' : 'Anonymous'}
            </span>
          </div>
          <i className={`fas fa-chevron-${opcSectionAuth ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
        </button>

        {opcSectionAuth && (
          <div className="p-3.5 space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Authentication Mode: *
              </label>
              <select
                value={conn.authMode || 'anonymous'}
                onChange={e => setField('authMode', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
              >
                <option value="anonymous">Anonymous</option>
                <option value="username_password">Username and Password</option>
                <option value="certificate">Certificate</option>
              </select>
            </div>

            {conn.authMode === 'username_password' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Username:</label>
                  <input
                    type="text"
                    value={conn.username || ''}
                    onChange={e => setField('username', e.target.value)}
                    placeholder="opcuser / admin"
                    className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password:</label>
                  <input
                    type="password"
                    value={conn.password || ''}
                    onChange={e => setField('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
            )}

            {conn.authMode === 'certificate' && (
              <div className="space-y-2 pt-1">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Thumbprint:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={conn.userCertificateThumbprint || ''}
                    onChange={e => setField('userCertificateThumbprint', e.target.value)}
                    placeholder="Enter user certificate thumbprint..."
                    className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <i className="fas fa-key absolute right-2.5 top-2.5 text-slate-400 text-xs"></i>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Security & Encryption Policy (Collapsible) */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setOpcSectionSecurity(!opcSectionSecurity)}
          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
        >
          <div className="flex items-center space-x-2">
            <i className="fas fa-shield-halved text-sky-400"></i>
            <span className="uppercase tracking-wider">Security & Encryption Policy</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-900/60 text-sky-200 rounded">
              {conn.securityMode || 'None'} / {conn.securityPolicy || 'None'}
            </span>
          </div>
          <i className={`fas fa-chevron-${opcSectionSecurity ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
        </button>

        {opcSectionSecurity && (
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Message Security Mode:</label>
              <select
                value={conn.securityMode || 'None'}
                onChange={e => setField('securityMode', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
              >
                <option value="None">None (Unencrypted)</option>
                <option value="Sign">Sign (Signed Header)</option>
                <option value="SignAndEncrypt">Sign & Encrypt (Maximum Security)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Security Policy:</label>
              <select
                value={conn.securityPolicy || 'None'}
                onChange={e => setField('securityPolicy', e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono text-[11px]"
              >
                <option value="None">None</option>
                <option value="Basic256Sha256">Basic256Sha256 (Standard)</option>
                <option value="Aes128_Sha256_RsaOaep">Aes128_Sha256_RsaOaep</option>
                <option value="Aes256_Sha256_RsaPss">Aes256_Sha256_RsaPss</option>
                <option value="Basic256">Basic256 (Legacy)</option>
                <option value="Basic128Rsa15">Basic128Rsa15 (Legacy)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Other Settings (Subscription & Polling) */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setOpcSectionTelemetry(!opcSectionTelemetry)}
          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
        >
          <div className="flex items-center space-x-2">
            <i className="fas fa-sliders text-sky-400"></i>
            <span className="uppercase tracking-wider">Other Settings</span>
          </div>
          <i className={`fas fa-chevron-${opcSectionTelemetry ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
        </button>

        {opcSectionTelemetry && (
          <div className="p-3.5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Max. Queue Size:</label>
                <input
                  type="number"
                  value={conn.maxQueueSize ?? 1000}
                  onChange={e => setField('maxQueueSize', parseInt(e.target.value) || 1000)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <input
                    type="checkbox"
                    id="enableSubscription"
                    checked={conn.enableSubscription !== false}
                    onChange={e => setField('enableSubscription', e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-sky-600 bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="enableSubscription" className="text-[11px] font-semibold text-slate-300 cursor-pointer select-none">
                    Enable Subscription:
                  </label>
                </div>
                <select
                  value={conn.subscriptionMode || 'read_attributes'}
                  onChange={e => setField('subscriptionMode', e.target.value)}
                  disabled={conn.enableSubscription === false}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                >
                  <option value="read_attributes">Read Attributes</option>
                  <option value="monitor_items">Monitor Item Value Changes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Read Maximum Age: (ms)</label>
                <input
                  type="number"
                  value={conn.readMaximumAgeMs ?? 1000}
                  onChange={e => setField('readMaximumAgeMs', parseInt(e.target.value) || 1000)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Publish Interval: (ms)</label>
                <input
                  type="number"
                  value={conn.publishIntervalMs ?? 50}
                  onChange={e => setField('publishIntervalMs', parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Add a maximum of: (points)</label>
                <input
                  type="number"
                  value={conn.maxPointsPerBatch ?? 1000}
                  onChange={e => setField('maxPointsPerBatch', parseInt(e.target.value) || 1000)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Browse a maximum of: (items)</label>
                <input
                  type="number"
                  value={conn.browseMaxItemsAtATime ?? 200}
                  onChange={e => setField('browseMaxItemsAtATime', parseInt(e.target.value) || 200)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Work Period: (ms)</label>
                <input
                  type="number"
                  value={conn.workPeriodMs ?? 1000}
                  onChange={e => setField('workPeriodMs', parseInt(e.target.value) || 1000)}
                  className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="logComplianceErrors"
                  checked={conn.logComplianceErrors === true}
                  onChange={e => setField('logComplianceErrors', e.target.checked)}
                  className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="logComplianceErrors" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                  Log OPC UA Compliance Errors
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Advanced Timeout Settings (Collapsible) */}
      <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
        <button
          type="button"
          onClick={() => setOpcSectionTimeouts(!opcSectionTimeouts)}
          className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
        >
          <div className="flex items-center space-x-2">
            <i className="fas fa-clock text-sky-400"></i>
            <span className="uppercase tracking-wider">Advanced Timeout Settings</span>
          </div>
          <i className={`fas fa-chevron-${opcSectionTimeouts ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
        </button>

        {opcSectionTimeouts && (
          <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Connect Timeout (ms):</label>
              <input
                type="number"
                value={conn.connectTimeoutMs ?? 10000}
                onChange={e => setField('connectTimeoutMs', parseInt(e.target.value) || 10000)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Session Timeout (ms):</label>
              <input
                type="number"
                value={conn.sessionTimeoutMs ?? 30000}
                onChange={e => setField('sessionTimeoutMs', parseInt(e.target.value) || 30000)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Request Timeout (ms):</label>
              <input
                type="number"
                value={conn.requestTimeoutMs ?? 10000}
                onChange={e => setField('requestTimeoutMs', parseInt(e.target.value) || 10000)}
                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
