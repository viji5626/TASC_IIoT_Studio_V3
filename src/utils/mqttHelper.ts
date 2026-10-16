import { getBridgeWsUrl, isHostedMode } from './bridgeConfig';

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

/**
 * Parses bit extraction specifiers from a JSONPath or tag name.
 * Supports:
 * - Dot notation: "tag[0].b3", "tag.b3", "tag.bit3", "tag.bit(3)", "tag.bits[3]"
 * - Colon notation: "tag[0]:3", "tag:3", ":3"
 * - Standalone bit: "b3", "b0", "bit(3)", "bit3"
 */
export function parseBitExtractionPath(path: string): { basePath: string; bitIndex?: number } {
  if (!path) return { basePath: '' };
  const trimmed = path.trim();

  // Pattern 1: Colon notation e.g. "tag:3", "tag[0]:3", ":3"
  const colonMatch = trimmed.match(/^(.*?):([0-9]{1,2})$/);
  if (colonMatch) {
    const bitIndex = parseInt(colonMatch[2], 10);
    if (!isNaN(bitIndex) && bitIndex >= 0 && bitIndex <= 63) {
      return { basePath: colonMatch[1].trim(), bitIndex };
    }
  }

  // Pattern 2: Dot/Slash notation e.g. "tag.b3", "tag[0].b3", "tag.bit3", "tag.bit(3)", "tag.bits[3]"
  const dotBitMatch = trimmed.match(/^(.*?)(?:\.|\/)(?:b|bit|bits)(?:\(|\.|\/|\[)?([0-9]{1,2})(?:\)|\])?$/i);
  if (dotBitMatch) {
    const bitIndex = parseInt(dotBitMatch[2], 10);
    if (!isNaN(bitIndex) && bitIndex >= 0 && bitIndex <= 63) {
      return { basePath: dotBitMatch[1].trim(), bitIndex };
    }
  }

  // Pattern 3: Standalone bit selector e.g. "b3", "b0", "bit(3)", "bit3", "bits[3]"
  const standaloneMatch = trimmed.match(/^(?:b|bit|bits)(?:\(|\.|\/|\[)?([0-9]{1,2})(?:\)|\])?$/i);
  if (standaloneMatch) {
    const bitIndex = parseInt(standaloneMatch[1], 10);
    if (!isNaN(bitIndex) && bitIndex >= 0 && bitIndex <= 63) {
      return { basePath: '', bitIndex };
    }
  }

  return { basePath: trimmed };
}

/**
 * Extracts a single bit (0 or 1) from an integer number, string, or single-element array (e.g. [24]).
 * Handles 16-bit unsigned PLC registers, 32-bit DINTs, and 64-bit BigInt words.
 */
export function extractBitValue(val: any, bitIndex: number): number | undefined {
  if (val === undefined || val === null || bitIndex < 0 || bitIndex > 63) return undefined;

  let target = val;
  // If array with single item, unwrap e.g. [24] -> 24
  if (Array.isArray(target)) {
    if (target.length === 1) {
      target = target[0];
    } else if (target.length > 0 && typeof target[0] === 'number') {
      target = target[0];
    }
  } else if (typeof target === 'object' && target !== null) {
    // If object with wrapped value e.g. { val: 24 } or single property { tag: [24] }
    if ('val' in target) {
      return extractBitValue(target.val, bitIndex);
    }
    const keys = Object.keys(target);
    if (keys.length === 1) {
      const singleVal = target[keys[0]];
      if (Array.isArray(singleVal) && singleVal.length === 1) {
        target = singleVal[0];
      } else if (typeof singleVal === 'number' || typeof singleVal === 'string') {
        target = singleVal;
      }
    }
  }

  let num: number;
  if (typeof target === 'number') {
    num = target;
  } else if (typeof target === 'string') {
    const trimmed = target.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      num = parseInt(trimmed, 16);
    } else if (trimmed.startsWith('0b') || trimmed.startsWith('0B')) {
      num = parseInt(trimmed.slice(2), 2);
    } else {
      num = Number(trimmed);
    }
  } else if (typeof target === 'boolean') {
    num = target ? 1 : 0;
  } else {
    return undefined;
  }

  if (isNaN(num)) return undefined;

  try {
    const big = BigInt(Math.trunc(num));
    const unsignedBig = big < 0n ? (big & 0xFFFFFFFFFFFFFFFFn) : big;
    const bit = (unsignedBig >> BigInt(bitIndex)) & 1n;
    return Number(bit);
  } catch {
    const bit = (Math.floor(num) >>> bitIndex) & 1;
    return bit;
  }
}

/**
 * Resolves standard nested object paths, brackets, and array indices.
 */
function resolveObjectPath(data: any, cleanPath: string): any {
  if (!cleanPath) {
    if (Array.isArray(data) && data.length === 1 && typeof data[0] !== 'object') {
      return data[0];
    }
    return typeof data === 'object' ? JSON.stringify(data) : data;
  }

  let normalizedPath = cleanPath;
  if (normalizedPath.startsWith('$.')) {
    normalizedPath = normalizedPath.substring(2);
  } else if (normalizedPath.startsWith('$')) {
    normalizedPath = normalizedPath.substring(1);
  } else if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }

  if (!normalizedPath) {
    if (Array.isArray(data) && data.length === 1 && typeof data[0] !== 'object') {
      return data[0];
    }
    return typeof data === 'object' ? JSON.stringify(data) : data;
  }

  // Convert bracket notation: e.g. ["data_shankar"][0] or .data_shankar[0] or .data_shankar[ 0 ]
  const normalized = normalizedPath
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

/**
 * Universal JSON / Bit Value Extractor.
 * Extracts values from JSON payloads via JSONPath or dot-notation, and extracts individual bits (0 or 1)
 * when a bit specifier is present (e.g. tag[0].b3, tag.b3, tag:3, tag.bit(3), b3, :3).
 */
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

  // 1. Try standard traversal on the raw path first
  const directResolved = resolveObjectPath(data, trimmed);
  const bitInfo = parseBitExtractionPath(trimmed);

  // If path does not contain a bit specifier, return standard resolved value
  if (bitInfo.bitIndex === undefined) {
    return directResolved;
  }

  // If the path literally matched a concrete property (e.g. an object property literally named "b3"),
  // return that property to maintain 100% backward compatibility
  if (directResolved !== undefined && !(typeof directResolved === 'string' && directResolved === JSON.stringify(data))) {
    return directResolved;
  }

  // 2. Otherwise evaluate the basePath and extract the designated bit (0 or 1)
  let targetVal: any = undefined;
  if (bitInfo.basePath) {
    targetVal = resolveObjectPath(data, bitInfo.basePath);
  } else {
    // Standalone bit e.g. "b3" on payload directly
    targetVal = data;
  }

  if (targetVal !== undefined) {
    const bit = extractBitValue(targetVal, bitInfo.bitIndex);
    if (bit !== undefined) return bit;
  }

  return undefined;
}

/**
 * Resolves a live tag value from latestValues map with bit extraction and JSONPath support.
 * If tagKey contains a bit suffix (e.g. "Word1.b3", "Tag:3", "$.d.VFD_START_STOP.b1") and is not found directly,
 * looks up the base tag in latestValues, checks matching panels, or extracts directly from rawPayload JSON.
 */
export function resolveTagValueWithBit(
  tagKey: string | undefined,
  latestValues: Record<string, any>,
  allPanels?: Array<{ panelId: string; jsonPath?: string; topic?: string; driverTagId?: string; panelName?: string }>
): any {
  if (!tagKey || !latestValues) return undefined;
  const cleanKey = String(tagKey).trim();
  if (!cleanKey) return undefined;

  // 1. Direct match in latestValues
  if (latestValues[cleanKey] !== undefined) {
    const item = latestValues[cleanKey];
    return item?.val !== undefined ? item.val : item;
  }

  // 2. Case-insensitive or tag_panel_ prefix match
  for (const [k, v] of Object.entries(latestValues)) {
    if (
      k.toLowerCase() === cleanKey.toLowerCase() ||
      k === `tag_panel_${cleanKey}` ||
      k.toLowerCase() === `tag_panel_${cleanKey.toLowerCase()}`
    ) {
      return v?.val !== undefined ? v.val : v;
    }
  }

  // 3. Match against other panels that bind to this tagKey / jsonPath
  if (allPanels && Array.isArray(allPanels)) {
    const matchingPanel = allPanels.find(p => 
      (p.jsonPath && p.jsonPath.trim() === cleanKey) ||
      (p.driverTagId && p.driverTagId.trim() === cleanKey) ||
      (p.topic && p.topic.trim() === cleanKey) ||
      (p.panelName && p.panelName.trim().toLowerCase() === cleanKey.toLowerCase())
    );
    if (matchingPanel && latestValues[matchingPanel.panelId] !== undefined) {
      const pVal = latestValues[matchingPanel.panelId]?.val !== undefined 
        ? latestValues[matchingPanel.panelId].val 
        : latestValues[matchingPanel.panelId];
      if (pVal !== undefined && pVal !== null) {
        return pVal;
      }
    }
  }

  // 4. Bit extraction fallback if tagKey has .b<N>, :<N>, or .bit(<N>)
  const bitInfo = parseBitExtractionPath(cleanKey);
  if (bitInfo.bitIndex !== undefined && bitInfo.basePath) {
    const baseClean = bitInfo.basePath.trim();
    let baseRaw: any = undefined;

    if (latestValues[baseClean] !== undefined) {
      const item = latestValues[baseClean];
      baseRaw = item?.val !== undefined ? item.val : item;
    } else {
      for (const [k, v] of Object.entries(latestValues)) {
        if (
          k.toLowerCase() === baseClean.toLowerCase() ||
          k === `tag_panel_${baseClean}` ||
          k.toLowerCase() === `tag_panel_${baseClean.toLowerCase()}`
        ) {
          baseRaw = v?.val !== undefined ? v.val : v;
          break;
        }
      }
    }

    // Check allPanels for matching basePath if not found
    if (baseRaw === undefined && allPanels && Array.isArray(allPanels)) {
      const matchingPanel = allPanels.find(p => 
        (p.jsonPath && p.jsonPath.trim() === baseClean) ||
        (p.driverTagId && p.driverTagId.trim() === baseClean) ||
        (p.topic && p.topic.trim() === baseClean)
      );
      if (matchingPanel && latestValues[matchingPanel.panelId] !== undefined) {
        baseRaw = latestValues[matchingPanel.panelId]?.val !== undefined 
          ? latestValues[matchingPanel.panelId].val 
          : latestValues[matchingPanel.panelId];
      }
    }

    if (baseRaw !== undefined) {
      return extractBitValue(baseRaw, bitInfo.bitIndex);
    }
  }

  // 5. Universal JSON / Bit extraction from rawPayload across latestValues
  if (cleanKey.startsWith('$') || cleanKey.includes('.') || cleanKey.includes('/') || cleanKey.includes('[')) {
    for (const entry of Object.values(latestValues)) {
      if (entry && typeof entry === 'object' && entry.rawPayload) {
        try {
          const extracted = getJsonValue(entry.rawPayload, cleanKey);
          if (extracted !== undefined && extracted !== null) {
            return extracted;
          }
        } catch {
          // continue
        }
      }
    }
  }

  // 6. If bit extraction path against rawPayload (e.g. $.d.VFD_START_STOP.b1)
  if (bitInfo.bitIndex !== undefined && bitInfo.basePath) {
    for (const entry of Object.values(latestValues)) {
      if (entry && typeof entry === 'object' && entry.rawPayload) {
        try {
          const baseExtracted = getJsonValue(entry.rawPayload, bitInfo.basePath);
          if (baseExtracted !== undefined && baseExtracted !== null) {
            const bit = extractBitValue(baseExtracted, bitInfo.bitIndex);
            if (bit !== undefined) return bit;
          }
        } catch {
          // continue
        }
      }
    }
  }

  return undefined;
}

export function formatBrokerWebSocketUrl(conn: { brokerAddress: string; port: number; protocol?: string; useBackendBridge?: boolean }): string {
  let rawAddress = (conn.brokerAddress || 'broker.emqx.io').trim();
  const rawProtocol = (conn.protocol || '').toLowerCase();
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHosted = isHostedMode();
  const userPort = Number(conn.port) || 0;

  // 1. Only route via local backend TCP bridge proxy if EXPLICITLY requested, NOT hosted in cloud, and NOT over HTTPS
  if (conn.useBackendBridge && !isHosted && !isSecure) {
    let cleanAddress = rawAddress.replace(/^(wss?|https?|tcp|mqtt):\/\//i, '').replace(/\/+$/, '');
    let host = cleanAddress;
    let port = userPort || 1883;
    if (cleanAddress.includes(':')) {
      const parts = cleanAddress.split(':');
      host = parts[0];
      port = parseInt(parts[1], 10) || port;
    }
    if (typeof window !== 'undefined') {
      return getBridgeWsUrl(`/api/mqtt-bridge?target=mqtt://${host}:${port}`);
    }
  }

  // 2. Parse raw address into host, port, and path cleanly
  let parsedHost = rawAddress;
  let parsedPort = userPort;
  let parsedPath = '/mqtt';
  const explicitWss = rawAddress.startsWith('wss://') || rawProtocol.includes('ssl') || rawProtocol.includes('wss');

  try {
    let urlStrToParse = rawAddress;
    if (!/^[a-zA-Z]+:\/\//.test(urlStrToParse)) {
      urlStrToParse = `http://${urlStrToParse}`;
    } else {
      urlStrToParse = urlStrToParse
        .replace(/^wss:\/\//i, 'https://')
        .replace(/^(ws|tcp|mqtt):\/\//i, 'http://');
    }

    const parsed = new URL(urlStrToParse);
    parsedHost = parsed.hostname;
    if (parsed.port) {
      parsedPort = parseInt(parsed.port, 10);
    }
    if (parsed.pathname && parsed.pathname !== '/') {
      parsedPath = parsed.pathname;
    }
  } catch {
    let clean = rawAddress.replace(/^(wss?|https?|tcp|mqtt):\/\//i, '').replace(/\/+$/, '');
    if (clean.includes('/')) {
      const slashIdx = clean.indexOf('/');
      parsedPath = clean.substring(slashIdx);
      clean = clean.substring(0, slashIdx);
    }
    if (clean.includes(':')) {
      const parts = clean.split(':');
      parsedHost = parts[0];
      parsedPort = parseInt(parts[1], 10) || parsedPort;
    } else {
      parsedHost = clean;
    }
  }

  if (!parsedHost) {
    parsedHost = 'broker.emqx.io';
  }

  // 3. Resolve appropriate WebSocket port for direct internet broker pub/sub
  let finalPort = parsedPort;
  const isEmqx = parsedHost.includes('emqx.io');
  const isHive = parsedHost.includes('hivemq.com');
  const isMosq = parsedHost.includes('mosquitto.org');

  if (isSecure) {
    // Hosted on HTTPS (e.g. app.tascautomation.com):
    // Browsers strictly forbid unencrypted ws:// (Mixed Content). All WebSockets MUST use wss://.
    if (isEmqx) {
      // EMQX WSS TLS port is 8084 (8083 is plaintext and fails TLS handshake)
      if (!finalPort || finalPort === 1883 || finalPort === 8883 || finalPort === 8083) {
        finalPort = 8084;
      }
    } else if (isHive) {
      // HiveMQ WSS TLS port is 8884 (8000 is plaintext and fails TLS handshake)
      if (!finalPort || finalPort === 1883 || finalPort === 8883 || finalPort === 8000) {
        finalPort = 8884;
      }
    } else if (isMosq) {
      // Mosquitto WSS TLS port is 8081 (8080 is plaintext and fails TLS handshake)
      if (!finalPort || finalPort === 1883 || finalPort === 8883 || finalPort === 8080) {
        finalPort = 8081;
      }
    } else {
      // Custom / internet broker on HTTPS:
      // Browsers cannot connect to raw TCP port 1883/8883; default to standard WSS port 8084 or 443
      if (!finalPort || finalPort === 1883 || finalPort === 8883) {
        finalPort = 8084;
      } else if (finalPort === 8083) {
        // Common configuration oversight: 8083 is plaintext WS; upgrade to 8084 for WSS
        finalPort = 8084;
      }
    }
  } else {
    // Running on HTTP / local:
    if (explicitWss) {
      if (isEmqx && (!finalPort || finalPort === 1883 || finalPort === 8883 || finalPort === 8083)) finalPort = 8084;
      else if (isHive && (!finalPort || finalPort === 1883 || finalPort === 8883 || finalPort === 8000)) finalPort = 8884;
      else if (isMosq && (!finalPort || finalPort === 1883 || finalPort === 8883 || finalPort === 8080)) finalPort = 8081;
      else if (!finalPort || finalPort === 1883 || finalPort === 8883) finalPort = 8084;
    } else {
      if (isEmqx && (!finalPort || finalPort === 1883 || finalPort === 8883)) finalPort = 8083;
      else if (isHive && (!finalPort || finalPort === 1883 || finalPort === 8883)) finalPort = 8000;
      else if (isMosq && (!finalPort || finalPort === 1883 || finalPort === 8883)) finalPort = 8080;
      else if (!finalPort || finalPort === 1883 || finalPort === 8883) finalPort = 8083;
    }
  }

  const scheme = (isSecure || explicitWss) ? 'wss://' : 'ws://';
  const cleanPath = parsedPath.startsWith('/') ? parsedPath : `/${parsedPath}`;
  const portStr = finalPort ? `:${finalPort}` : '';

  return `${scheme}${parsedHost}${portStr}${cleanPath}`;
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


