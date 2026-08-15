/**
 * Community Edition AI Assistant Quota & Interlock Manager
 * 
 * Enforces a strict 5-prompt daily limit (24-hour rolling window) for Community Edition users.
 * Engineering Studio / Admin users enjoy unlimited AI prompts.
 */

export const COMMUNITY_AI_MAX_PROMPTS = 5;
export const COMMUNITY_AI_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 Hours in ms
export const COMMUNITY_AI_QUOTA_KEY = 'tasc_community_ai_quota_v1';
export const COMMUNITY_AI_QUOTA_EVENT = 'tasc_community_ai_quota_changed';

export interface CommunityAiQuotaRecord {
  promptTimestamps: number[];
  lastUpdated: number;
}

export interface CommunityAiQuotaStatus {
  usedCount: number;
  maxCount: number;
  remainingCount: number;
  isLocked: boolean;
  resetTimeMs: number | null;
  msUntilReset: number;
  formattedTimeUntilReset: string;
}

/**
 * Formats milliseconds remaining into human-readable duration (e.g. "23h 45m" or "14m 32s")
 */
export function formatDurationRemaining(ms: number): string {
  if (ms <= 0) return '0m 0s';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Loads and sanitizes active prompt timestamps within the rolling 24-hour window
 */
function getActiveTimestamps(): number[] {
  try {
    const raw = localStorage.getItem(COMMUNITY_AI_QUOTA_KEY);
    if (!raw) return [];
    const parsed: CommunityAiQuotaRecord = JSON.parse(raw);
    const now = Date.now();
    const cutoff = now - COMMUNITY_AI_WINDOW_MS;
    
    // Filter timestamps within the last 24 hours
    const active = (parsed.promptTimestamps || []).filter(t => typeof t === 'number' && t > cutoff && t <= now);
    active.sort((a, b) => a - b);
    
    // Auto-clean if timestamps expired
    if (active.length !== (parsed.promptTimestamps || []).length) {
      localStorage.setItem(COMMUNITY_AI_QUOTA_KEY, JSON.stringify({
        promptTimestamps: active,
        lastUpdated: now
      }));
    }
    return active;
  } catch {
    return [];
  }
}

/**
 * Retrieves the current Community Edition AI prompt quota status
 */
export function getCommunityAiQuotaStatus(): CommunityAiQuotaStatus {
  const activeTimestamps = getActiveTimestamps();
  const now = Date.now();
  const usedCount = activeTimestamps.length;
  const isLocked = usedCount >= COMMUNITY_AI_MAX_PROMPTS;
  const remainingCount = Math.max(0, COMMUNITY_AI_MAX_PROMPTS - usedCount);

  let resetTimeMs: number | null = null;
  let msUntilReset = 0;

  if (activeTimestamps.length > 0) {
    // The quota frees up 24 hours after the oldest prompt within the active window
    const oldestTimestamp = activeTimestamps[0];
    resetTimeMs = oldestTimestamp + COMMUNITY_AI_WINDOW_MS;
    msUntilReset = Math.max(0, resetTimeMs - now);
  }

  return {
    usedCount,
    maxCount: COMMUNITY_AI_MAX_PROMPTS,
    remainingCount,
    isLocked,
    resetTimeMs,
    msUntilReset,
    formattedTimeUntilReset: formatDurationRemaining(msUntilReset)
  };
}

/**
 * Records a prompt consumed in Community Edition
 * Returns the updated quota status or false if quota is exceeded
 */
export function recordCommunityPromptUsed(): { success: boolean; status: CommunityAiQuotaStatus } {
  const activeTimestamps = getActiveTimestamps();
  const now = Date.now();

  if (activeTimestamps.length >= COMMUNITY_AI_MAX_PROMPTS) {
    return {
      success: false,
      status: getCommunityAiQuotaStatus()
    };
  }

  activeTimestamps.push(now);
  activeTimestamps.sort((a, b) => a - b);

  try {
    localStorage.setItem(COMMUNITY_AI_QUOTA_KEY, JSON.stringify({
      promptTimestamps: activeTimestamps,
      lastUpdated: now
    }));

    // Broadcast change to other components/tabs
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COMMUNITY_AI_QUOTA_EVENT));
    }
  } catch (err) {
    console.error('[aiQuotaManager] Failed to persist prompt timestamp:', err);
  }

  return {
    success: true,
    status: getCommunityAiQuotaStatus()
  };
}

/**
 * Resets the community AI quota (e.g. for administrative testing)
 */
export function resetCommunityAiQuota(): void {
  try {
    localStorage.removeItem(COMMUNITY_AI_QUOTA_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(COMMUNITY_AI_QUOTA_EVENT));
    }
  } catch {}
}
