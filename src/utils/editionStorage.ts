import { AppState, ProductEdition } from '../types';
import { sanitizeAppState } from './EditionManager';

export const COMMUNITY_STATE_KEY = 'tasc_community_runtime_state';
export const COMMUNITY_SAVED_FLAG = 'tasc_community_setup_saved';

export const COMMERCIAL_STATE_KEY = 'tasc_commercial_runtime_state';
export const COMMERCIAL_SAVED_FLAG = 'tasc_commercial_setup_saved';

export const LEGACY_STATE_KEY = 'mqtt_dash_pro_state';
export const LEGACY_SAVED_FLAG = 'tasc_client_setup_saved';

export interface SavedPackageMeta {
  edition: 'community' | 'commercial' | 'engineering';
  savedAt: number;
  formattedDate: string;
  dashboardsCount: number;
  panelsCount: number;
  connectionsCount: number;
  clientName?: string;
  isSignedPackage?: boolean;
  expiresAt?: string;
}

export interface SavedPackageInfo {
  state: AppState;
  meta: SavedPackageMeta;
}

function formatDate(ts: number): string {
  try {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Recently';
  }
}

/**
 * Saves a Community Edition layout to its dedicated isolated storage slot with a Community signature.
 * Enforces Community restrictions (1 screen, max 10 widgets) before saving.
 */
export function saveCommunityState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    const sanitized = sanitizeAppState({
      ...state,
      userRole: 'community',
      productEdition: ProductEdition.COMMUNITY,
      packageOrigin: 'community',
      isLockedPackage: false
    });

    const meta: SavedPackageMeta = {
      edition: 'community',
      savedAt: Date.now(),
      formattedDate: formatDate(Date.now()),
      dashboardsCount: sanitized.dashboards.length,
      panelsCount: sanitized.panels.length,
      connectionsCount: sanitized.connections.length,
      clientName: 'Community Edition Demo',
      isSignedPackage: false
    };

    const packagePayload = {
      ...sanitized,
      packageOrigin: 'community',
      _packageMeta: meta
    };

    localStorage.setItem(COMMUNITY_STATE_KEY, JSON.stringify(packagePayload));
    localStorage.setItem(COMMUNITY_SAVED_FLAG, 'true');
  } catch (err) {
    console.error('[EditionStorage] Failed to save community state:', err);
  }
}

/**
 * Saves a Commercial / Client Runtime / Engineering setup to its dedicated isolated storage slot.
 * Guard: If the state originated from Community Edition, it safely routes to saveCommunityState.
 */
export function saveCommercialState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    // Guard: Prevent Community demo setups from ever contaminating or creating a commercial setup
    const isCommunityOrigin = 
      state.packageOrigin === 'community' ||
      state.productEdition === ProductEdition.COMMUNITY ||
      state.userRole === 'community' ||
      state.clientInfo?.clientName === 'Community Edition Save' ||
      (!state.clientInfo?.isSignedPackage && state.userRole !== 'admin');

    if (isCommunityOrigin) {
      saveCommunityState(state);
      return;
    }

    const meta: SavedPackageMeta = {
      edition: state.userRole === 'admin' ? 'engineering' : 'commercial',
      savedAt: Date.now(),
      formattedDate: formatDate(Date.now()),
      dashboardsCount: state.dashboards.length,
      panelsCount: state.panels.length,
      connectionsCount: state.connections.length,
      clientName: state.clientInfo?.clientName,
      isSignedPackage: state.clientInfo?.isSignedPackage,
      expiresAt: state.clientInfo?.expiresAt
    };

    const packagePayload = {
      ...state,
      packageOrigin: state.userRole === 'admin' ? 'engineering' : 'commercial',
      _packageMeta: meta
    };

    localStorage.setItem(COMMERCIAL_STATE_KEY, JSON.stringify(packagePayload));
    localStorage.setItem(COMMERCIAL_SAVED_FLAG, 'true');
    // Also mirror to legacy key for backwards compatibility
    localStorage.setItem(LEGACY_STATE_KEY, JSON.stringify(packagePayload));
    localStorage.setItem(LEGACY_SAVED_FLAG, 'true');
  } catch (err) {
    console.error('[EditionStorage] Failed to save commercial state:', err);
  }
}

/**
 * Retrieves the saved Community Edition package if present in browser memory.
 */
export function getCommunitySavedPackage(): SavedPackageInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    const flag = localStorage.getItem(COMMUNITY_SAVED_FLAG);
    if (flag !== 'true') return null;

    const raw = localStorage.getItem(COMMUNITY_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.dashboards || !parsed.connections) return null;

    const sanitized = sanitizeAppState(parsed);
    const meta: SavedPackageMeta = parsed._packageMeta || {
      edition: 'community',
      savedAt: Date.now(),
      formattedDate: 'Saved in Browser',
      dashboardsCount: sanitized.dashboards.length,
      panelsCount: sanitized.panels.length,
      connectionsCount: sanitized.connections.length
    };

    return {
      state: {
        ...sanitized,
        packageOrigin: 'community'
      },
      meta
    };
  } catch {
    return null;
  }
}

/**
 * Retrieves the saved Commercial / Client Edition package if present in browser memory.
 * Strictly validates that the saved data is an authentic commercial / signed / engineering setup.
 * If a community-origin save was previously leaked into commercial slot, automatically purges it.
 */
export function getCommercialSavedPackage(): SavedPackageInfo | null {
  if (typeof window === 'undefined') return null;
  try {
    // Helper to test if a parsed state is authentic commercial
    const isAuthenticCommercial = (parsed: any): boolean => {
      if (!parsed || !parsed.dashboards || !parsed.connections) return false;
      if (parsed.packageOrigin === 'community') return false;
      if (parsed._packageMeta?.edition === 'community') return false;
      if (parsed.clientInfo?.clientName === 'Community Edition Save') return false;
      if (parsed.userRole === 'community') return false;
      
      // Must be signed or from engineering studio admin
      const isSigned = parsed.clientInfo?.isSignedPackage === true || parsed._packageMeta?.isSignedPackage === true;
      const isEngineering = parsed.userRole === 'admin' || parsed._packageMeta?.edition === 'engineering';
      return isSigned || isEngineering;
    };

    // 1. Check primary commercial slot
    const commercialFlag = localStorage.getItem(COMMERCIAL_SAVED_FLAG);
    const commercialRaw = localStorage.getItem(COMMERCIAL_STATE_KEY);

    if (commercialFlag === 'true' && commercialRaw) {
      const parsed = JSON.parse(commercialRaw);
      if (isAuthenticCommercial(parsed)) {
        const meta: SavedPackageMeta = parsed._packageMeta || {
          edition: parsed.userRole === 'admin' ? 'engineering' : 'commercial',
          savedAt: Date.now(),
          formattedDate: 'Saved in Browser',
          dashboardsCount: parsed.dashboards.length,
          panelsCount: parsed.panels.length,
          connectionsCount: parsed.connections.length,
          clientName: parsed.clientInfo?.clientName,
          isSignedPackage: parsed.clientInfo?.isSignedPackage
        };
        return { state: parsed, meta };
      } else {
        // Auto-heal: Purge false commercial save that was created from community edition
        localStorage.removeItem(COMMERCIAL_STATE_KEY);
        localStorage.removeItem(COMMERCIAL_SAVED_FLAG);
      }
    }

    // 2. Check legacy slot fallback (if not marked as community)
    const legacyFlag = localStorage.getItem(LEGACY_SAVED_FLAG);
    const legacyRaw = localStorage.getItem(LEGACY_STATE_KEY);
    if (legacyFlag === 'true' && legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (isAuthenticCommercial(parsed)) {
        const meta: SavedPackageMeta = {
          edition: 'commercial',
          savedAt: Date.now(),
          formattedDate: 'Legacy Setup',
          dashboardsCount: parsed.dashboards.length,
          panelsCount: parsed.panels.length,
          connectionsCount: parsed.connections.length,
          clientName: parsed.clientInfo?.clientName,
          isSignedPackage: parsed.clientInfo?.isSignedPackage
        };
        return { state: parsed, meta };
      } else {
        // Auto-heal legacy flags
        localStorage.removeItem(LEGACY_SAVED_FLAG);
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Clears the saved Community Edition package from browser storage.
 */
export function clearCommunitySavedState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(COMMUNITY_STATE_KEY);
    localStorage.removeItem(COMMUNITY_SAVED_FLAG);
  } catch {}
}

/**
 * Clears the saved Commercial Edition package from browser storage.
 */
export function clearCommercialSavedState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(COMMERCIAL_STATE_KEY);
    localStorage.removeItem(COMMERCIAL_SAVED_FLAG);
    localStorage.removeItem(LEGACY_STATE_KEY);
    localStorage.removeItem(LEGACY_SAVED_FLAG);
  } catch {}
}
