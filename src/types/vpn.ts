/**
 * NetBird WebAssembly (WASM) VPN & Network Security Types
 */

export type VpnConnectionState =
  | 'idle'
  | 'checking_concurrency'
  | 'blocked_concurrent_session'
  | 'connecting'
  | 'connected'
  | 'disconnecting'
  | 'error';

export interface NetbirdPeer {
  id: string;
  name: string;
  ip: string;
  connected: boolean;
  last_seen: string;
  os: string;
  version?: string;
  groups?: string[];
  user_id?: string;
  ui_version?: string;
  extra?: {
    is_gateway?: boolean;
    station_session_id?: string;
  };
}

export interface NetbirdVpnConfig {
  /** Read-Only Personal Access Token used to query https://api.netbird.io/api/peers */
  personalAccessToken: string;
  /** NetBird Setup Key / Ephemeral Join Key */
  setupKey: string;
  /** Customer / Tenant Group ID */
  groupId: string;
  /** NetBird Management API endpoint (defaults to https://api.netbird.io) */
  managementApiUrl?: string;
  /** Gateway identifier or private IP (e.g. Raspberry Pi 3 at 192.168.1.34 or 100.x.x.x) */
  gatewayTargetIp?: string;
  /** Ephemeral station session ID generated for the current browser session */
  stationSessionId?: string;
  /** Custom station name for UI identification */
  stationName?: string;
}

export interface ConcurrencyCheckResult {
  allowed: boolean;
  message: string;
  activeBrowserPeers: NetbirdPeer[];
  gatewayPeers: NetbirdPeer[];
  conflictingPeer?: NetbirdPeer;
  checkedAt: string;
}

export interface VpnDiagnosticMetrics {
  connectedSince?: string;
  gatewayLatencyMs?: number;
  lastPingTime?: string;
  bytesReceived?: number;
  bytesSent?: number;
  activeTunnelIp?: string;
  activePeersCount?: number;
}

export interface VpnClientState {
  state: VpnConnectionState;
  config: NetbirdVpnConfig;
  concurrencyResult: ConcurrencyCheckResult | null;
  metrics: VpnDiagnosticMetrics;
  lastError: string | null;
  isBlockedByConcurrency: boolean;
}
