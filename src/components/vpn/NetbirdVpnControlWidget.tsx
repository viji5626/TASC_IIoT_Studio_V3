import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Server, 
  Lock, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Key, 
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useNetbirdVpn } from '../../hooks/useNetbirdVpn';
import { NetbirdVpnConfig } from '../../types/vpn';
import { CONCURRENT_SESSION_BLOCKED_MESSAGE } from '../../services/vpn/concurrencyGuard';

interface NetbirdVpnControlWidgetProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export const NetbirdVpnControlWidget: React.FC<NetbirdVpnControlWidgetProps> = ({ 
  onClose, 
  isOpen = true 
}) => {
  const { 
    state, 
    config, 
    concurrencyResult, 
    metrics, 
    lastError, 
    isBlockedByConcurrency, 
    connect, 
    disconnect 
  } = useNetbirdVpn();

  // Local form configuration state
  const [formData, setFormData] = useState<NetbirdVpnConfig>({
    personalAccessToken: config?.personalAccessToken || '',
    setupKey: config?.setupKey || '',
    groupId: config?.groupId || '',
    managementApiUrl: config?.managementApiUrl || 'https://api.netbird.io',
    gatewayTargetIp: config?.gatewayTargetIp || '192.168.1.34',
    stationName: config?.stationName || ''
  });

  const [showConfig, setShowConfig] = useState<boolean>(!config?.personalAccessToken);
  const [showPeersList, setShowPeersList] = useState<boolean>(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const isBusy = state === 'checking_concurrency' || state === 'connecting' || state === 'disconnecting';
  const isConnected = state === 'connected';

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.personalAccessToken) {
      setLocalError('Please provide a NetBird Read-Only Personal Access Token (PAT).');
      return;
    }
    if (!formData.groupId) {
      setLocalError('Please specify the NetBird Group ID for your customer/tenant.');
      return;
    }

    try {
      await connect(formData);
      setShowConfig(false);
    } catch (err: any) {
      // Concurrency blocker or connection error handled in store
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (err: any) {
      setLocalError(err.message);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl shadow-2xl w-full max-w-2xl text-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              isConnected 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : isBlockedByConcurrency 
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
            }`}>
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-white">NetBird Industrial P2P VPN</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                  WASM TUNNEL
                </span>
              </div>
              <p className="text-xs text-slate-400">Zero-infrastructure plant-floor connectivity with single-station SOP enforcement</p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* High-Visibility Alert when Blocked by Concurrency Rule */}
          {isBlockedByConcurrency && (
            <div className="p-4 bg-rose-950/80 border-2 border-rose-500 rounded-xl flex items-start gap-3 shadow-lg shadow-rose-950/50 animate-pulse">
              <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-bold text-rose-200 text-sm tracking-wide">SINGLE-STATION SOP CONFLICT</h4>
                <p className="text-sm font-medium text-rose-100">{CONCURRENT_SESSION_BLOCKED_MESSAGE}</p>
                {concurrencyResult?.conflictingPeer && (
                  <p className="text-xs text-rose-300 font-mono mt-1">
                    Active Station: {concurrencyResult.conflictingPeer.name} ({concurrencyResult.conflictingPeer.ip}) • Last Seen: {new Date(concurrencyResult.conflictingPeer.last_seen).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Generic Error Notice */}
          {lastError && !isBlockedByConcurrency && (
            <div className="p-3 bg-red-950/50 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-200 text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{lastError}</span>
            </div>
          )}

          {localError && (
            <div className="p-3 bg-amber-950/50 border border-amber-500/50 rounded-xl flex items-center gap-3 text-amber-200 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>{localError}</span>
            </div>
          )}

          {/* VPN Status Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Status Pill Card */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col justify-between">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tunnel Status</div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse' :
                  isBusy ? 'bg-amber-400 animate-ping' :
                  isBlockedByConcurrency ? 'bg-rose-500' : 'bg-slate-500'
                }`} />
                <span className="font-semibold text-sm capitalize">
                  {state === 'checking_concurrency' ? 'Verifying SOP...' :
                   state === 'blocked_concurrent_session' ? 'Blocked (In Use)' :
                   state}
                </span>
              </div>
            </div>

            {/* Target Gateway Card */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col justify-between">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Field Gateway</span>
                <Server className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-2">
                <div className="font-mono text-sm font-semibold text-cyan-300">
                  {formData.gatewayTargetIp || '192.168.1.34'}
                </div>
                <div className="text-[11px] text-slate-400">Raspberry Pi 3 (Linux)</div>
              </div>
            </div>

            {/* Latency & Encryption */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col justify-between">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Latency / Crypto</span>
                <Activity className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-semibold text-sm text-white">
                  {metrics.gatewayLatencyMs !== undefined ? `${metrics.gatewayLatencyMs} ms` : (isConnected ? 'Active' : 'Offline')}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">WireGuard/WASM</span>
              </div>
            </div>

          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                disabled={isBusy}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-900/30 disabled:opacity-50"
              >
                <WifiOff className="w-4 h-4" />
                <span>Disconnect & Wipe Session Keys</span>
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isBusy}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/30 disabled:opacity-50"
              >
                {isBusy ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{state === 'checking_concurrency' ? 'Checking Single-Device SOP...' : 'Establishing WASM Tunnel...'}</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>Connect to Field Network</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium rounded-xl flex items-center gap-2 transition-colors"
            >
              <Key className="w-4 h-4 text-cyan-400" />
              <span>Config</span>
              {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Configuration Form Accordion */}
          {showConfig && (
            <form onSubmit={handleConnect} className="p-4 bg-slate-800/40 border border-slate-700/80 rounded-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <span>NetBird API & Authentication Parameters</span>
                </div>
                <span className="text-[11px] text-slate-400">Stored in transient memory</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Read-Only PAT */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>NetBird Personal Access Token (PAT) <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-slate-400">Read-Only for /api/peers query</span>
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. nb_pat_xxxx_xxxx"
                    value={formData.personalAccessToken}
                    onChange={(e) => setFormData({ ...formData, personalAccessToken: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    disabled={isConnected || isBusy}
                  />
                </div>

                {/* Group ID */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Target Group ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. plant-floor-1"
                    value={formData.groupId}
                    onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    disabled={isConnected || isBusy}
                  />
                </div>

                {/* Setup Key */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    NetBird Setup Key (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="e.g. 5D813F93-..."
                    value={formData.setupKey}
                    onChange={(e) => setFormData({ ...formData, setupKey: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    disabled={isConnected || isBusy}
                  />
                </div>

                {/* Target Gateway IP */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Raspberry Pi Gateway IP
                  </label>
                  <input
                    type="text"
                    placeholder="192.168.1.34"
                    value={formData.gatewayTargetIp}
                    onChange={(e) => setFormData({ ...formData, gatewayTargetIp: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Station Name */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Station Identifier
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Operator-Console-01"
                    value={formData.stationName}
                    onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

              </div>
            </form>
          )}

          {/* Active Peers Diagnostics Accordion */}
          {concurrencyResult && (
            <div className="border border-slate-700/80 rounded-xl overflow-hidden bg-slate-800/20">
              <button
                type="button"
                onClick={() => setShowPeersList(!showPeersList)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-slate-300 bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Peer Diagnostics ({concurrencyResult.gatewayPeers.length} Gateway(s) detected)</span>
                </div>
                {showPeersList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPeersList && (
                <div className="p-3 space-y-2 text-xs">
                  {concurrencyResult.gatewayPeers.map(gw => (
                    <div key={gw.id} className="p-2 bg-slate-900/60 border border-slate-700/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <span className="font-semibold text-white">{gw.name}</span>
                          <span className="text-slate-400 font-mono text-[11px] ml-2">({gw.ip})</span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/50 rounded">
                        Gateway Node
                      </span>
                    </div>
                  ))}

                  {concurrencyResult.activeBrowserPeers.map(peer => (
                    <div key={peer.id} className="p-2 bg-rose-950/40 border border-rose-700/50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <div>
                          <span className="font-semibold text-white">{peer.name}</span>
                          <span className="text-rose-300 font-mono text-[11px] ml-2">({peer.ip})</span>
                        </div>
                      </div>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-700/50 rounded">
                        Concurrent Browser
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer / SOP Security Notice */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Encrypted WebAssembly (WireGuard) • Zero Cloud Overhead</span>
          </div>
          <span className="font-mono text-slate-500">TASC Network Security Layer</span>
        </div>

      </div>
    </div>,
    document.body
  );
};
