/**
 * TASC IIoT Studio — Edge Bridge Configuration & Auto-Discovery Helper
 * 
 * Enables the hosted cloud web app (app.tascautomation.com) to transparently connect
 * to the local or plant edge bridge daemon (127.0.0.1:3000 or custom IP) for:
 * - Modbus TCP (Port 502)
 * - Siemens S7 (Port 102)
 * - Mitsubishi MELSEC (SLMP / MC Protocol 3E Frame)
 * - OPC UA Hierarchical Browsing & Tag Ingestion
 * - TCP-based MQTT Brokers
 * - Local SQLite Historian & Local LLM (LM Studio / Ollama)
 */

export interface BridgeHealthStatus {
  online: boolean;
  service?: string;
  timestamp?: string;
  host: string;
}

const BRIDGE_HOST_KEY = 'tasc_bridge_host';
const DEFAULT_LOCAL_HOST = '127.0.0.1:3000';

/**
 * Checks if the current app is running in hosted cloud mode (e.g. app.tascautomation.com)
 */
export function isHostedMode(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h !== 'localhost' && h !== '127.0.0.1';
}

/**
 * Returns the active bridge host (e.g. "127.0.0.1:3000" or custom LAN IP)
 */
export function getBridgeHost(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCAL_HOST;
  if (isHostedMode()) {
    const saved = localStorage.getItem(BRIDGE_HOST_KEY);
    return saved ? saved.trim() : DEFAULT_LOCAL_HOST;
  }
  return window.location.host;
}

/**
 * Sets the active bridge host and fires a change event to re-sync all active sockets
 */
export function setBridgeHost(host: string): void {
  if (typeof window === 'undefined') return;
  const clean = host.trim().replace(/^https?:\/\//i, '').replace(/^wss?:\/\//i, '').replace(/\/+$/, '');
  const finalHost = clean || DEFAULT_LOCAL_HOST;
  localStorage.setItem(BRIDGE_HOST_KEY, finalHost);
  window.dispatchEvent(new CustomEvent('tasc-bridge-host-changed', { detail: finalHost }));
}

/**
 * Constructs a WebSocket URL for communicating with the bridge
 */
export function getBridgeWsUrl(path: string): string {
  const host = getBridgeHost();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!isHostedMode()) {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProto}//${window.location.host}${cleanPath}`;
  }

  // If host is a domain with HTTPS/WSS
  const isSecureRemote = host.startsWith('https:') || (host.includes('.') && !host.includes('localhost') && !host.includes('127.0.0.1') && !/^\d+\.\d+\.\d+\.\d+/.test(host));
  const proto = isSecureRemote ? 'wss:' : 'ws:';
  return `${proto}//${host.replace(/^https?:\/\//i, '').replace(/^wss?:\/\//i, '')}${cleanPath}`;
}

/**
 * Constructs an HTTP URL for communicating with the bridge
 */
export function getBridgeHttpUrl(path: string): string {
  const host = getBridgeHost();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!isHostedMode()) {
    return cleanPath;
  }

  const isSecureRemote = host.startsWith('https:') || (host.includes('.') && !host.includes('localhost') && !host.includes('127.0.0.1') && !/^\d+\.\d+\.\d+\.\d+/.test(host));
  const proto = isSecureRemote ? 'https:' : 'http:';
  return `${proto}//${host.replace(/^https?:\/\//i, '')}${cleanPath}`;
}

/**
 * Quick live probe to test if the Edge Bridge is reachable and healthy
 */
export async function probeBridgeHealth(timeoutMs = 1800): Promise<BridgeHealthStatus> {
  const host = getBridgeHost();
  const targetUrl = isHostedMode() ? `http://${host}/api/health` : '/api/health';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timer);

    if (res.ok) {
      const text = await res.text();
      if (!text.trim().startsWith('<')) {
        const data = JSON.parse(text);
        return {
          online: true,
          service: data.service || 'TASC Edge Bridge',
          timestamp: data.timestamp,
          host
        };
      }
    }
    return { online: false, host };
  } catch {
    clearTimeout(timer);
    return { online: false, host };
  }
}

/**
 * Triggers the global Bridge Setup & Download modal to open
 */
export function openBridgeModal(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-tasc-bridge-modal'));
  }
}
