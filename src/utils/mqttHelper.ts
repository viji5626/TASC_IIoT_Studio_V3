export function mqttWildcardMatch(pattern: string, topic: string): boolean {
  if (!pattern || !topic) return false;
  if (pattern === '#' || pattern === '+') return true;
  
  const patternParts = pattern.trim().split('/');
  const topicParts = topic.trim().split('/');
  
  for (let i = 0; i < patternParts.length; i++) {
    const p = patternParts[i];
    if (p === '#') return true;
    if (p === '+') {
      if (i >= topicParts.length) return false;
      continue;
    }
    if (i >= topicParts.length || p !== topicParts[i]) return false;
  }
  
  return patternParts.length === topicParts.length;
}

function findKeyRecursive(obj: any, targetKey: string): any {
  if (obj === null || typeof obj !== 'object') return undefined;
  if (targetKey in obj) return obj[targetKey];
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    if (typeof val === 'object' && val !== null) {
      const found = findKeyRecursive(val, targetKey);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function getJsonValue(payload: any, path: string): any {
  if (payload === undefined || payload === null) return undefined;
  
  let data = payload;
  if (typeof data === 'string') {
    const trimmedPayload = data.trim();
    if ((trimmedPayload.startsWith('{') && trimmedPayload.endsWith('}')) ||
        (trimmedPayload.startsWith('[') && trimmedPayload.endsWith(']'))) {
      try {
        data = JSON.parse(trimmedPayload);
      } catch {
        // preserve original string if parse fails
      }
    }
  }

  if (data === undefined || data === null) return undefined;

  const trimmed = (path || '').trim();
  if (!trimmed) {
    if (Array.isArray(data) && data.length === 1 && typeof data[0] !== 'object') {
      return data[0];
    }
    return typeof data === 'object' ? JSON.stringify(data) : data;
  }

  // Clean JSONPath prefix ($. or $ or /)
  let cleanPath = trimmed;
  if (cleanPath.startsWith('$.')) {
    cleanPath = cleanPath.substring(2);
  } else if (cleanPath.startsWith('$')) {
    cleanPath = cleanPath.substring(1);
  } else if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }

  if (!cleanPath) {
    if (Array.isArray(data) && data.length === 1 && typeof data[0] !== 'object') {
      return data[0];
    }
    return typeof data === 'object' ? JSON.stringify(data) : data;
  }

  // Convert bracket notation: e.g. ["data_shankar"][0] or .data_shankar[0] or .data_shankar[ 0 ]
  const normalized = cleanPath
    .replace(/\[\s*['"]?([^'"\]]+)['"]?\s*\]/g, '.$1')
    .replace(/\//g, '.');

  const parts = normalized.split('.').map(p => p.trim()).filter(Boolean);
  let current: any = data;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;

    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (!isNaN(idx) && idx >= 0 && idx < current.length) {
        current = current[idx];
      } else if (part in current) {
        current = (current as any)[part];
      } else {
        const found = findKeyRecursive(current, part);
        if (found !== undefined) {
          current = found;
        } else {
          return undefined;
        }
      }
    } else if (typeof current === 'object') {
      if (part in current) {
        current = current[part];
      } else {
        const found = findKeyRecursive(current, part);
        if (found !== undefined) {
          current = found;
        } else {
          return undefined;
        }
      }
    } else {
      return undefined;
    }
  }

  if (Array.isArray(current)) {
    if (current.length === 1 && typeof current[0] !== 'object') {
      return current[0];
    }
    return JSON.stringify(current);
  }

  if (current !== null && typeof current === 'object') {
    return JSON.stringify(current);
  }

  return current;
}

export function formatBrokerWebSocketUrl(conn: { brokerAddress: string; port: number; protocol?: string; useBackendBridge?: boolean }): string {
  let rawAddress = (conn.brokerAddress || 'test.mosquitto.org').trim();
  const rawProtocol = (conn.protocol || '').toLowerCase();
  
  const isTcpProtocol = rawProtocol === 'mqtt' || rawProtocol === 'tcp' || rawAddress.startsWith('mqtt://') || rawAddress.startsWith('tcp://');
  
  let cleanAddress = rawAddress.replace(/^(wss?|https?|tcp|mqtt):\/\//i, '').replace(/\/+$/, '');
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const userPort = Number(conn.port) || 1883;

  let host = cleanAddress;
  let port = userPort;
  if (cleanAddress.includes(':')) {
    const parts = cleanAddress.split(':');
    host = parts[0];
    port = parseInt(parts[1], 10) || userPort;
  }

  // If TCP protocol or backend bridge requested, route via backend WS-to-TCP proxy
  if (isTcpProtocol || conn.useBackendBridge) {
    if (typeof window !== 'undefined') {
      const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      const bridgeHost = window.location.host;
      return `${wsScheme}${bridgeHost}/api/mqtt-bridge?target=mqtt://${host}:${port}`;
    }
  }

  // Map known public brokers or fallback
  let wsPort = port;
  if (host.includes('test.mosquitto.org')) {
    if (port === 1883 || port === 8883) {
      wsPort = isSecure ? 8081 : 8080;
    }
  } else if (host.includes('emqx.io')) {
    if (port === 1883 || port === 8883) {
      wsPort = isSecure ? 8084 : 8083;
    }
  } else if (host.includes('hivemq.com')) {
    if (port === 1883 || port === 8883) {
      wsPort = isSecure ? 8884 : 8000;
    }
  } else if (port === 1883) {
    if (typeof window !== 'undefined' && (rawProtocol.includes('tcp') || rawProtocol.includes('mqtt') || !rawProtocol.includes('ws'))) {
      const wsScheme = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
      const bridgeHost = window.location.host;
      return `${wsScheme}${bridgeHost}/api/mqtt-bridge?target=mqtt://${host}:${port}`;
    }
    wsPort = isSecure ? 8081 : 8083;
  }

  const scheme = isSecure ? 'wss://' : (rawProtocol.includes('ssl') || rawProtocol.includes('wss') ? 'wss://' : 'ws://');
  
  return `${scheme}${host}:${wsPort}/mqtt`;
}

export function formatPublishPayload(
  rawPayload: string | number | boolean,
  panel: {
    publishPattern?: string;
    jsonPath?: string;
    isJSONPayload?: boolean;
    panelName?: string;
  },
  context?: {
    clientId?: string;
    connectionName?: string;
    dashboardName?: string;
  }
): string {
  let pattern = (panel.publishPattern || '').trim();

  // Smart Fallback: If user entered template containing <payload> in jsonPath field
  if (!pattern && panel.jsonPath && panel.jsonPath.includes('<payload>')) {
    pattern = panel.jsonPath.trim();
  }

  if (!pattern) {
    return String(rawPayload);
  }

  const payloadStr = String(rawPayload);
  const nowISO = new Date().toISOString();

  let result = pattern
    .replace(/<payload>/gi, payloadStr)
    .replace(/\{payload\}/gi, payloadStr)
    .replace(/<timestamp>/gi, nowISO)
    .replace(/<client-id>/gi, context?.clientId || 'client')
    .replace(/<connection>/gi, context?.connectionName || '')
    .replace(/<dashboard>/gi, context?.dashboardName || '')
    .replace(/<panel>/gi, panel.panelName || '');

  return result;
}

export function getNormalizedOptions(panel: { optionItems?: { label: string; value: string }[]; options?: string[] }): { label: string; value: string }[] {
  if (panel.optionItems && panel.optionItems.length > 0) {
    return panel.optionItems;
  }
  if (panel.options && panel.options.length > 0) {
    return panel.options.map(opt => {
      if (typeof opt === 'string' && opt.includes(':')) {
        const parts = opt.split(':');
        return { label: parts[0].trim(), value: parts.slice(1).join(':').trim() };
      }
      return { label: String(opt), value: String(opt) };
    });
  }
  return [
    { label: 'Selection 1', value: '20' },
    { label: 'Selection 2', value: '40' },
    { label: 'Selection 3', value: '60' },
    { label: 'Selection 4', value: '80' },
  ];
}


