import { AppState, ProductEdition } from '../types';

export interface AuthorizationCheck {
  allowed: boolean;
  reason?: string;
}

export class EditionManager {
  public role: 'admin' | 'client' | 'gate' | 'community';
  public edition: ProductEdition;
  public isLockedPackage: boolean;

  constructor(
    role: 'admin' | 'client' | 'gate' | 'community' = 'gate',
    edition: ProductEdition = ProductEdition.LANDING,
    isLockedPackage: boolean = false
  ) {
    this.role = role;
    this.edition = edition;
    this.isLockedPackage = isLockedPackage;
  }

  static fromState(appState: AppState): EditionManager {
    return new EditionManager(
      appState.userRole || 'gate',
      appState.productEdition || ProductEdition.LANDING,
      !!appState.isLockedPackage
    );
  }

  public IsCommunity(): boolean {
    return this.role === 'community' || this.edition === ProductEdition.COMMUNITY;
  }

  public IsClient(): boolean {
    return this.role === 'client' || this.edition === ProductEdition.CLIENT_RUNTIME || this.isLockedPackage;
  }

  public IsAdmin(): boolean {
    return this.role === 'admin' || this.edition === ProductEdition.ENGINEERING;
  }

  // --- Capabilities ---

  public CanCreateScreen(appState: AppState): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Modifying screens is disabled.' };
    }
    if (this.IsCommunity()) {
      if (appState.dashboards.length >= 1) {
        return {
          allowed: false,
          reason: 'Community Edition Limit: Maximum 1 Screen (Dashboard) allowed per project. Upgrade to Engineering Studio for unlimited screens.'
        };
      }
    }
    return { allowed: true };
  }

  public CanDeleteScreen(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Deleting screens is disabled.' };
    }
    return { allowed: true };
  }

  public CanEditScreen(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Editing screens is disabled.' };
    }
    return { allowed: true };
  }

  public CanCreateWidget(appState: AppState, addingCount: number = 1): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Adding widgets is disabled.' };
    }
    if (this.IsCommunity()) {
      if (appState.panels.length + addingCount > 10) {
        return {
          allowed: false,
          reason: `Community Edition Limit: Maximum 10 Widgets allowed per project (currently ${appState.panels.length}). Upgrade to Engineering Studio for unlimited widgets.`
        };
      }
    }
    return { allowed: true };
  }

  public CanEditWidget(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Editing widgets is disabled.' };
    }
    return { allowed: true };
  }

  public CanDeleteWidget(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Deleting widgets is disabled.' };
    }
    return { allowed: true };
  }

  public CanCloneWidget(appState: AppState, cloneCount: number = 1): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Cloning widgets is disabled.' };
    }
    if (this.IsCommunity()) {
      if (appState.panels.length + cloneCount > 10) {
        return {
          allowed: false,
          reason: `Community Edition Limit: Cannot exceed 10 Widgets total. Upgrade to Engineering Studio for unlimited widgets.`
        };
      }
    }
    return { allowed: true };
  }

  public CanEditBroker(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. MQTT Broker configuration is locked.' };
    }
    return { allowed: true };
  }

  public CanDeleteBroker(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Deleting broker connections is disabled.' };
    }
    return { allowed: true };
  }

  public CanEditTag(): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Tag and Topic configuration is locked.' };
    }
    return { allowed: true };
  }

  public CanChangeTheme(): AuthorizationCheck {
    return { allowed: true };
  }

  public CanBackupRestore(): AuthorizationCheck {
    if (this.IsCommunity()) {
      return { allowed: false, reason: 'Community Edition: Backup and restore functionality is revoked. Upgrade to Engineering Studio for backup and restore.' };
    }
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime: Backup and restore is disabled in client mode.' };
    }
    return { allowed: true };
  }

  public CanExportProject(): AuthorizationCheck {
    if (this.IsCommunity()) {
      return { allowed: false, reason: 'Community Edition: Exporting signed deployment packages is reserved for Engineering Studio.' };
    }
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime: Package export is disabled in client mode.' };
    }
    return { allowed: true };
  }

  // Camelcase aliases
  public canCreateScreen(appState: AppState) { return this.CanCreateScreen(appState); }
  public canCreateWidget(appState: AppState, addingCount = 1) { return this.CanCreateWidget(appState, addingCount); }
  public canEditWidget() { return this.CanEditWidget(); }
  public canDeleteWidget() { return this.CanDeleteWidget(); }
  public canEditTag() { return this.CanEditTag(); }
  public canEditBroker() { return this.CanEditBroker(); }
  public canChangeTheme() { return this.CanChangeTheme(); }
  public canBackupRestore() { return this.CanBackupRestore(); }
  public canExportProject() { return this.CanExportProject(); }
}

/**
 * Sanitizes and prunes appState according to community edition limits or legacy removals.
 */
export function sanitizeAppState(state: AppState): AppState {
  let dashboards = state.dashboards || [];
  let panels = state.panels || [];

  // Remove legacy screens/widgets
  dashboards = dashboards.filter(d => d.dashboardId !== 'dash_telemetry');
  panels = panels.filter(p => 
    p.panelId !== 'panel_status' && 
    p.panelId !== 'panel_rgb' && 
    p.dashboardId !== 'dash_telemetry'
  );

  // If in community mode, prune to max 1 screen and 10 widgets
  const isCommunity = state.userRole === 'community' || state.productEdition === ProductEdition.COMMUNITY;
  if (isCommunity) {
    if (dashboards.length > 1) {
      const firstDash = dashboards.find(d => d.isHome) || dashboards[0];
      dashboards = [firstDash];
      panels = panels.filter(p => p.dashboardId === firstDash.dashboardId);
    }
    if (panels.length > 10) {
      panels = panels.slice(0, 10);
    }
  }

  return {
    ...state,
    dashboards,
    panels,
    isLocked: isCommunity ? false : state.isLocked
  };
}
