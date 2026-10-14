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
          reason: 'Community Edition (Free) allows maximum 1 HMI Screen. Upgrade to Engineering Studio for unlimited screens.'
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

  public CanAddTrendPen(currentPenCount: number): AuthorizationCheck {
    if (this.IsCommunity() && currentPenCount >= 2) {
      return {
        allowed: false,
        reason: 'Free Demo Limit: Maximum 2 Pens allowed per Trend Viewer in Community Edition. Upgrade to Engineering Studio for unlimited pens.'
      };
    }
    return { allowed: true };
  }

  public GetMaxHistorianRows(): number {
    return this.IsCommunity() ? 50 : 100000;
  }

  public CanNavigateToScreen(targetDashId: string, appState: AppState): AuthorizationCheck {
    if (this.IsCommunity()) {
      const homeDash = appState.dashboards?.find(d => d.isHome) || appState.dashboards?.[0];
      if (homeDash && targetDashId !== homeDash.dashboardId) {
        return {
          allowed: false,
          reason: 'Community Edition Limit: Multi-screen navigation is revoked. Upgrade to Engineering Studio for unlimited screens and page switching.'
        };
      }
    }
    return { allowed: true };
  }

  public CanAddDriverConnection(appState: AppState): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Adding driver connections is disabled.' };
    }
    if (this.IsCommunity()) {
      const count = (appState.driverConnections || []).length;
      if (count >= 2) {
        return {
          allowed: false,
          reason: 'Community Edition Limit: Maximum 2 Industrial Driver connections allowed. Upgrade to Engineering Studio for unlimited driver connections.'
        };
      }
    }
    return { allowed: true };
  }

  public GetMaxDriverTags(): number {
    return this.IsCommunity() ? 10 : Infinity;
  }

  public CanAddDriverTag(appState: AppState, addingCount: number = 1): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only. Adding driver tags is disabled.' };
    }
    if (this.IsCommunity()) {
      const count = (appState.driverTags || []).length;
      if (count + addingCount > 10) {
        return {
          allowed: false,
          reason: `Community Edition Limit: Maximum 10 Driver Tags allowed (currently ${count}). Upgrade to Engineering Studio for unlimited driver tags.`
        };
      }
    }
    return { allowed: true };
  }

  public CanAddReportTemplate(currentCount: number): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only.' };
    }
    if (this.IsCommunity() && currentCount >= 1) {
      return {
        allowed: false,
        reason: 'Community Edition Limit: Fair usage allows maximum 1 Report Template. Upgrade to Engineering Studio for unlimited report templates and automated schedules.'
      };
    }
    return { allowed: true };
  }

  public CanAddSqlDataSource(currentCount: number): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only.' };
    }
    if (this.IsCommunity() && currentCount >= 1) {
      return {
        allowed: false,
        reason: 'Community Edition Limit: Fair usage allows maximum 1 SQL Data Source. Upgrade to Engineering Studio for unlimited SQL connections and tables.'
      };
    }
    return { allowed: true };
  }

  public CanAddSqlManipulator(currentCount: number): AuthorizationCheck {
    if (this.IsClient()) {
      return { allowed: false, reason: 'Client Runtime is read-only.' };
    }
    if (this.IsCommunity() && currentCount >= 1) {
      return {
        allowed: false,
        reason: 'Community Edition Limit: Fair usage allows maximum 1 SQL Data Manipulator. Upgrade to Engineering Studio for unlimited procedures and DML queries.'
      };
    }
    return { allowed: true };
  }

  public CanUseSqlTableGrid(): AuthorizationCheck {
    if (this.IsCommunity()) {
      return {
        allowed: false,
        reason: 'Community Edition Limit: Database table query and TASCGrid execution is locked. Upgrade to Engineering Studio to interact with and edit table data.'
      };
    }
    return { allowed: true };
  }

  public GetMaxTrendLoggingSpanMs(): number {
    return this.IsCommunity() ? 3600000 : 2592000000; // 1 Hour max in Free Demo
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
  public canNavigateToScreen(targetDashId: string, appState: AppState) { return this.CanNavigateToScreen(targetDashId, appState); }
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
 * Sanitizes and cleans appState according to legacy removals.
 * Preserves existing project screens and widgets in storage when opening Community Edition,
 * allowing runtime enforcement to revoke navigation and gray out 10+ widgets.
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

  const isCommunity = state.userRole === 'community' || state.productEdition === ProductEdition.COMMUNITY;

  return {
    ...state,
    dashboards,
    panels,
    isLocked: isCommunity ? false : state.isLocked,
    driverConnections: (state.driverConnections || []).map(c => ({
      ...c,
      reopenSockets: c.reopenSockets === true
    })),
    driverTags: (state.driverTags || [])
  };
}
