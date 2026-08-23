import { ConcurrencyCheckResult, NetbirdPeer, NetbirdVpnConfig } from '../../types/vpn';

/**
 * Standard SOP Error message required by Industrial Security Policy
 */
export const CONCURRENT_SESSION_BLOCKED_MESSAGE = 
  'Access Denied: Account already in use on another station. Please log out there first.';

/**
 * Retrieves or generates an ephemeral Station Session ID for the current browser session.
 * Kept in memory / sessionStorage to identify the local tab against peer list metadata.
 */
let memorySessionId: string | null = null;

export function getStationSessionId(): string {
  if (!memorySessionId) {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem('tasc_vpn_station_session_id');
      if (stored) {
        memorySessionId = stored;
      } else {
        memorySessionId = `station-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        window.sessionStorage.setItem('tasc_vpn_station_session_id', memorySessionId);
      }
    } else {
      memorySessionId = `station-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }
  return memorySessionId;
}

/**
 * Validates whether the peer represents a Headless Industrial Gateway (e.g., Raspberry Pi 3)
 * rather than an interactive human browser station.
 */
export function isGatewayPeer(peer: NetbirdPeer, gatewayTargetIp?: string): boolean {
  // Check 1: Explicit metadata or OS type
  const osType = (peer.os || '').toLowerCase();
  const name = (peer.name || '').toLowerCase();
  const ip = peer.ip || '';

  if (gatewayTargetIp && (ip === gatewayTargetIp || name.includes(gatewayTargetIp.toLowerCase()))) {
    return true;
  }

  // Check 2: Headless Linux gateways typically have OS = "linux" and names like "rpi", "gateway", "plant-gw"
  if (peer.extra?.is_gateway === true) return true;
  if (osType === 'linux' && (name.includes('gateway') || name.includes('rpi') || name.includes('pi') || name.includes('scada-gw'))) {
    return true;
  }

  // If OS is explicitly Linux or Darwin/Windows service daemon without browser user-agent tag
  if (osType === 'linux' && !name.includes('browser')) {
    return true;
  }

  return false;
}

/**
 * Single-Device SOP Concurrency Enforcer
 * 
 * Step 1: Query NetBird Management API endpoint (/api/peers) with Read-Only PAT.
 * Step 2: Filter peers belonging to the target customer's NetBird Group ID.
 * Step 3: Discriminate headless Gateway nodes from active Browser Client stations.
 * Step 4: If any other online browser session is detected, block connection immediately.
 * 
 * @param config - The NetBird VPN configuration containing the token, group ID, etc.
 * @returns ConcurrencyCheckResult indicating whether connection is allowed.
 */
export async function verifySingleStationConcurrency(
  config: NetbirdVpnConfig
): Promise<ConcurrencyCheckResult> {
  const managementApiUrl = (config.managementApiUrl || 'https://api.netbird.io').replace(/\/+$/, '');
  const currentSessionId = config.stationSessionId || getStationSessionId();
  const checkedAt = new Date().toISOString();

  if (!config.personalAccessToken) {
    throw new Error('NetBird Read-Only Personal Access Token (PAT) is required for concurrency validation.');
  }

  if (!config.groupId) {
    throw new Error('NetBird Group ID is required to isolate customer station peers.');
  }

  const endpoint = `${managementApiUrl}/api/peers`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second safety timeout

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Token ${config.personalAccessToken.trim()}`,
        'Accept': 'application/json',
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`NetBird Management API returned HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    const allPeers: NetbirdPeer[] = await response.json();

    if (!Array.isArray(allPeers)) {
      throw new Error('Invalid peer list response received from NetBird Management API.');
    }

    // Filter Step: Only inspect peers belonging to the target customer Group ID
    const targetGroup = config.groupId.trim();
    const groupPeers = allPeers.filter(peer => {
      if (!peer.groups || !Array.isArray(peer.groups)) return true; // fallback if groups array not provided
      return peer.groups.includes(targetGroup) || peer.groups.some(g => g.toLowerCase() === targetGroup.toLowerCase());
    });

    const activeBrowserPeers: NetbirdPeer[] = [];
    const gatewayPeers: NetbirdPeer[] = [];
    let conflictingPeer: NetbirdPeer | undefined;

    for (const peer of groupPeers) {
      const isGateway = isGatewayPeer(peer, config.gatewayTargetIp);

      if (isGateway) {
        gatewayPeers.push(peer);
      } else {
        // It is an interactive / browser client station
        // Check if the peer is actively connected
        const isOnline = peer.connected === true;

        if (isOnline) {
          // If the peer is online, check if it is NOT our current browser session
          const isCurrentSession = 
            peer.extra?.station_session_id === currentSessionId ||
            (peer.name && peer.name.includes(currentSessionId));

          if (!isCurrentSession) {
            activeBrowserPeers.push(peer);
            conflictingPeer = peer;
          }
        }
      }
    }

    // SOP Enforcement Decision:
    // If any active browser peer exists on another station, BLOCK access
    if (activeBrowserPeers.length > 0) {
      return {
        allowed: false,
        message: CONCURRENT_SESSION_BLOCKED_MESSAGE,
        activeBrowserPeers,
        gatewayPeers,
        conflictingPeer,
        checkedAt
      };
    }

    return {
      allowed: true,
      message: 'Single-station concurrency check passed. No conflicting browser stations online.',
      activeBrowserPeers: [],
      gatewayPeers,
      checkedAt
    };

  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('NetBird Management API timed out while checking single-station concurrency.');
    }
    throw err;
  }
}
