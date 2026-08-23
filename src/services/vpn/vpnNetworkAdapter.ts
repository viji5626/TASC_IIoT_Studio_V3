import { netbirdVpnClient } from './netbirdClient';

/**
 * Checks whether the destination hostname or IP belongs to an industrial private subnet:
 * - 192.168.0.0/16
 * - 10.0.0.0/8
 * - 172.16.0.0/12
 * - 100.64.0.0/10 (CGNAT / NetBird Overlay IPs)
 * - .local / .lan domains
 */
export function isPrivateSubnetAddress(urlString: string): boolean {
  try {
    const url = new URL(urlString.startsWith('http') ? urlString : `http://${urlString}`);
    const host = url.hostname;

    // IPv4 private ranges
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
    if (/^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/.test(host)) return true; // NetBird WireGuard range
    if (host.endsWith('.local') || host.endsWith('.lan') || host.endsWith('.internal')) return true;

    return false;
  } catch {
    return false;
  }
}

/**
 * Universal VPN Fetch Wrapper
 * 
 * Transparently wraps HTTP fetch calls:
 * - If the target address is in a private factory subnet (e.g. 192.168.1.34) and the NetBird VPN
 *   is connected, the request is directed through the encrypted WASM P2P WireGuard tunnel (vpn.fetch()).
 * - Otherwise (public cloud endpoints or when VPN is disconnected), it falls back to standard browser fetch.
 * 
 * @example
 * ```ts
 * import { vpnFetch } from '../services/vpn/vpnNetworkAdapter';
 * 
 * // Communicates directly with the remote Raspberry Pi / PLC over the encrypted tunnel!
 * const res = await vpnFetch('http://192.168.1.34/api/modbus/holding_registers?addr=40001&count=8');
 * const data = await res.json();
 * ```
 */
export async function vpnFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  const urlString = typeof input === 'string' 
    ? input 
    : (input instanceof Request ? input.url : input.toString());

  const state = netbirdVpnClient.getSnapshot();

  // If VPN is active and targeting a private subnet, route via WASM WireGuard Tunnel
  if (state.state === 'connected' && isPrivateSubnetAddress(urlString)) {
    console.debug(`[VpnFetch] Routing request to private industrial target ${urlString} via NetBird WASM tunnel.`);
    return netbirdVpnClient.fetch(input, init);
  }

  // Fallback to standard browser fetch
  return window.fetch(input, init);
}
