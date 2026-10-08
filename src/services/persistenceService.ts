import { AppState } from '../types';
import { sanitizeAppState } from '../utils/EditionManager';

export const STORAGE_KEY = 'mqtt_dash_pro_state';
export const CLIENT_SETUP_SAVED_KEY = 'tasc_client_setup_saved';

/**
 * Loads and sanitizes persisted AppState from browser localStorage.
 * Returns null if no valid state is found.
 */
export function loadPersistedState(): AppState | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.connections && parsed.dashboards && parsed.panels) {
        return sanitizeAppState(parsed);
      }
    }
  } catch (err) {
    console.warn('[PersistenceService] Failed to load persisted state:', err);
  }
  return null;
}

let deployTimeout: any = null;
let lastDeployedJson: string = '';

function deployToCore(state: AppState) {
  if (deployTimeout) {
    clearTimeout(deployTimeout);
  }
  deployTimeout = setTimeout(() => {
    // Only send tags and connections to save bandwidth
    const payload = {
      tags: (state as any).tags || (state as any).driverTags || {},
      connections: (state as any).connections || (state as any).driverConnections || {}
    };
    
    const payloadJson = JSON.stringify(payload);
    if (payloadJson === lastDeployedJson) {
      return; // Skip redundant deployment
    }
    lastDeployedJson = payloadJson;

    fetch('/api/project/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payloadJson
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.success) {
        console.log('[PersistenceService] Successfully synced config to core engine:', data.message);
      } else {
        console.warn('[PersistenceService] Failed to sync config to core engine:', data);
      }
    })
    .catch(err => {
      console.warn('[PersistenceService] Network error syncing config to core:', err.message);
    });
  }, 5000); // 5 seconds debounce
}

/**
 * Saves current AppState into browser localStorage.
 */
export function savePersistedState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    deployToCore(state);
  } catch (err) {
    console.error('[PersistenceService] Failed to save state to localStorage:', err);
  }
}

/**
 * Marks client setup as saved in localStorage.
 */
export function markClientSetupSaved(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CLIENT_SETUP_SAVED_KEY, 'true');
  } catch {}
}

/**
 * Checks if client setup is saved in localStorage.
 */
export function isClientSetupSaved(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(CLIENT_SETUP_SAVED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Clears the client setup saved marker from localStorage.
 */
export function clearClientSetupSaved(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CLIENT_SETUP_SAVED_KEY);
  } catch {}
}
