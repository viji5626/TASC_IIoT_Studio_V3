import React, { Suspense, lazy } from 'react';
import { AppState, AppView, Dashboard, Panel, ProductEdition } from '../types';
import DashboardMenu from './DashboardMenu';
import PinModal from './PinModal';
import AddPanelModal from './AddPanelModal';
import EditDashboardModal from './EditDashboardModal';
import ClonePanelModal from './ClonePanelModal';
import ShareConnectionModal from './ShareConnectionModal';
import ExportClientPackageModal from './ExportClientPackageModal';
import ClearAllModal from './ClearAllModal';
import AlarmModal from './AlarmModal';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { AiChatFab } from './AiChatFab';
import { AiChatDrawer } from './AiChatDrawer';
import ExitSessionModal from './ExitSessionModal';
import { ConfirmModal } from './ConfirmModal';
import { EditionManager } from '../utils/EditionManager';
import { useDeviceCapability } from '../utils/deviceDetection';

// Lazy load heavy modals to avoid upfront parsing overhead
const LazyEditPanelModal = lazy(() => import('./EditPanelModal'));
const LazyAlarmHistorianModal = lazy(() => import('./AlarmHistorianModal').then(m => ({ default: m.AlarmHistorianModal })));
const LazyFddModal = lazy(() => import('./FddPredictiveMaintenanceModal').then(m => ({ default: m.FddPredictiveMaintenanceModal })));

export interface ModalRegistryProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  userRole: 'admin' | 'client' | 'gate' | 'community';
  productEdition: ProductEdition;
  clientInfo?: { clientName: string; expiresAt?: string; isSignedPackage?: boolean };
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  isLocked: boolean;
  editionMgr: EditionManager;
  activeDashboard?: Dashboard;
  activeAlarms: any[];
  latestAlarmTriggered: any;
  latestValues: Record<string, { val: any; time: string }>;
  isDashMenuOpen: boolean;
  setIsDashMenuOpen: (val: boolean) => void;
  isPinModalOpen: boolean;
  setIsPinModalOpen: (val: boolean) => void;
  pinModalMode: 'verify' | 'set';
  pendingAction: (() => void) | null;
  setPendingAction: (val: (() => void) | null) => void;
  isAddPanelOpen: boolean;
  setIsAddPanelOpen: (val: boolean) => void;
  editingPanel: Panel | null;
  setEditingPanel: (panel: Panel | null) => void;
  editingDashboard: Dashboard | null;
  setEditingDashboard: (dash: Dashboard | null) => void;
  isCloneModalOpen: boolean;
  setIsCloneModalOpen: (val: boolean) => void;
  sharingConnection: any;
  setSharingConnection: (conn: any) => void;
  isExportClientPackageOpen: boolean;
  setIsExportClientPackageOpen: (val: boolean) => void;
  isClearAllModalOpen: boolean;
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    confirmVariant?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  };
  setConfirmModal: React.Dispatch<React.SetStateAction<any>>;
  isClientSetupSaved: boolean;
  setIsClientSetupSaved: (val: boolean) => void;
  isAlarmModalOpen: boolean;
  setIsAlarmModalOpen: (val: boolean) => void;
  isAlarmHistorianModalOpen: boolean;
  setIsAlarmHistorianModalOpen: (val: boolean) => void;
  isFddModalOpen: boolean;
  setIsFddModalOpen: (val: boolean) => void;
  isVibrateEnabled: boolean;
  setIsVibrateEnabled: (val: boolean) => void;
  isSoundEnabled: boolean;
  setIsSoundEnabled: (val: boolean) => void;
  isAutoPopupEnabled: boolean;
  setIsAutoPopupEnabled: (val: boolean) => void;
  handleAcknowledgeAlarm: (id: string) => void;
  handleAcknowledgeAllAlarms: () => void;
  isTourOpen: boolean;
  setIsTourOpen: (val: boolean) => void;
  isAiDrawerOpen: boolean;
  setIsAiDrawerOpen: (val: boolean) => void;
  isExitSessionModalOpen: boolean;
  setIsExitSessionModalOpen: (val: boolean) => void;
  handleToggleLock: () => void;
  handleAddPanelSelect: (type: any) => void;
  handleClonePanels: (panels: Panel[], targetDashId: string) => void;
  handleConfirmClearAll: () => void;
  handleSaveAndExitSession: () => void;
  handleExitSessionWithoutSave: () => void;
  setCommunityLimitNotice: (reason: string | null) => void;
}

export const ModalRegistry: React.FC<ModalRegistryProps> = React.memo(({
  appState,
  setAppState,
  userRole,
  productEdition,
  clientInfo,
  currentView,
  setCurrentView,
  isLocked,
  editionMgr,
  activeDashboard,
  activeAlarms,
  latestAlarmTriggered,
  latestValues,
  isDashMenuOpen,
  setIsDashMenuOpen,
  isPinModalOpen,
  setIsPinModalOpen,
  pinModalMode,
  pendingAction,
  setPendingAction,
  isAddPanelOpen,
  setIsAddPanelOpen,
  editingPanel,
  setEditingPanel,
  editingDashboard,
  setEditingDashboard,
  isCloneModalOpen,
  setIsCloneModalOpen,
  sharingConnection,
  setSharingConnection,
  isExportClientPackageOpen,
  setIsExportClientPackageOpen,
  isClearAllModalOpen,
  confirmModal,
  setConfirmModal,
  isClientSetupSaved,
  setIsClientSetupSaved,
  isAlarmModalOpen,
  setIsAlarmModalOpen,
  isAlarmHistorianModalOpen,
  setIsAlarmHistorianModalOpen,
  isFddModalOpen,
  setIsFddModalOpen,
  isVibrateEnabled,
  setIsVibrateEnabled,
  isSoundEnabled,
  setIsSoundEnabled,
  isAutoPopupEnabled,
  setIsAutoPopupEnabled,
  handleAcknowledgeAlarm,
  handleAcknowledgeAllAlarms,
  isTourOpen,
  setIsTourOpen,
  isAiDrawerOpen,
  setIsAiDrawerOpen,
  isExitSessionModalOpen,
  setIsExitSessionModalOpen,
  handleToggleLock,
  handleAddPanelSelect,
  handleClonePanels,
  handleConfirmClearAll,
  handleSaveAndExitSession,
  handleExitSessionWithoutSave,
  setCommunityLimitNotice
}) => {
  const { isDesktop } = useDeviceCapability();

  const isCommunity = userRole === 'community' || productEdition === ProductEdition.COMMUNITY;
  const isClient = userRole === 'client' || productEdition === ProductEdition.CLIENT_RUNTIME;

  return (
    <>
      {/* 3-Dot Dashboard Menu */}
      <DashboardMenu 
        isOpen={isDashMenuOpen} 
        onClose={() => setIsDashMenuOpen(false)} 
        isLocked={isLocked}
        hasPin={!!appState.editPin}
        onToggleLock={handleToggleLock}
        onAddDashboard={() => {
          const check = editionMgr.CanCreateScreen(appState);
          if (!check.allowed) {
            if (check.reason) {
              setCommunityLimitNotice(check.reason);
              setTimeout(() => setCommunityLimitNotice(null), 5000);
            }
            return;
          }
          setCurrentView(AppView.ADD_DASHBOARD);
        }}
      />

      {/* Security PIN Modal */}
      <PinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingAction(null);
        }}
        mode={pinModalMode}
        correctPin={appState.editPin}
        onSuccess={(newPin) => {
          if (pinModalMode === 'set') {
            setAppState(prev => ({ ...prev, editPin: newPin }));
            setIsPinModalOpen(false);
          } else {
            setIsPinModalOpen(false);
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }
        }}
      />

      {/* Add Panel Type Selection Modal */}
      <AddPanelModal 
        isOpen={isAddPanelOpen}
        onClose={() => setIsAddPanelOpen(false)}
        onSelect={handleAddPanelSelect}
      />

      {/* Edit Panel Modal (Lazy loaded on open) */}
      {editingPanel && (
        <Suspense fallback={<div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center text-sky-400 font-bold text-sm">Loading Panel Editor...</div>}>
          <LazyEditPanelModal 
            panel={editingPanel}
            isOpen={!!editingPanel}
            onClose={() => setEditingPanel(null)}
          />
        </Suspense>
      )}

      {/* Edit Dashboard Screen Modal */}
      {editingDashboard && (
        <EditDashboardModal
          dashboard={editingDashboard}
          onCancel={() => setEditingDashboard(null)}
          onSave={(updatedDash) => {
            setAppState(prev => {
              let updatedDashboards = prev.dashboards.map(d => {
                if (d.dashboardId === updatedDash.dashboardId) {
                  return updatedDash;
                }
                if (updatedDash.isHome) {
                  return { ...d, isHome: false };
                }
                return d;
              });

              if (!updatedDashboards.some(d => d.isHome) && updatedDashboards.length > 0) {
                updatedDashboards[0] = { ...updatedDashboards[0], isHome: true };
              }

              return { ...prev, dashboards: updatedDashboards };
            });
            setEditingDashboard(null);
          }}
        />
      )}

      {/* Clone Panel Modal */}
      <ClonePanelModal 
        isOpen={isCloneModalOpen}
        onClose={() => setIsCloneModalOpen(false)}
        dashboards={appState.dashboards}
        panels={appState.panels}
        onClone={handleClonePanels}
      />

      {/* Share / Export Connection Modal */}
      {sharingConnection && (
        <ShareConnectionModal 
          connection={sharingConnection}
          dashboards={appState.dashboards.filter(d => d.connectionId === sharingConnection.connectionId)}
          panels={appState.panels.filter(p => appState.dashboards.filter(d => d.connectionId === sharingConnection.connectionId).some(d => d.dashboardId === p.dashboardId))}
          onClose={() => setSharingConnection(null)}
        />
      )}

      {/* Export Client Runtime Package Modal */}
      <ExportClientPackageModal
        isOpen={isExportClientPackageOpen}
        onClose={() => setIsExportClientPackageOpen(false)}
        appState={appState}
      />

      {/* Factory Clear All Modal */}
      <ClearAllModal
        isOpen={isClearAllModalOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirmClearAll={handleConfirmClearAll}
        widgetCount={appState.panels.length}
        connectionCount={appState.connections.length}
        dashboardCount={appState.dashboards.length}
        editionName={isCommunity ? 'Community Edition' : 'Engineering Studio'}
      />

      {/* Mandatory Client Edition Save Setup Modal */}
      {!isClientSetupSaved && isClient && (
        <div className="fixed inset-0 z-[500] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-sky-500/40 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center text-2xl mx-auto shadow-inner">
              <i className="fas fa-floppy-disk"></i>
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-white">Save Setup for Future Operation</h3>
              <p className="text-xs text-slate-400">Client Edition Browser Local Storage</p>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 text-center space-y-2">
              <p className="text-sm font-extrabold text-sky-300">
                Please save the setup for future operation
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Saving this HMI layout and MQTT connection setup will store it securely in your browser memory so it automatically loads every time you open this app.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                try {
                  localStorage.setItem('tasc_client_setup_saved', 'true');
                  localStorage.setItem('mqtt_dash_pro_state', JSON.stringify(appState));
                } catch {}
                setIsClientSetupSaved(true);
              }}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-sky-500/25 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <i className="fas fa-check-circle text-base"></i>
              <span>Save Setup to Browser Memory</span>
            </button>
          </div>
        </div>
      )}

      {/* Global Live Alarm Modal */}
      <AlarmModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        activeAlarms={activeAlarms}
        onAcknowledgeAlarm={handleAcknowledgeAlarm}
        onAcknowledgeAll={handleAcknowledgeAllAlarms}
        isVibrateEnabled={isVibrateEnabled}
        onToggleVibrate={() => setIsVibrateEnabled(!isVibrateEnabled)}
        isSoundEnabled={isSoundEnabled}
        onToggleSound={() => setIsSoundEnabled(!isSoundEnabled)}
        isAutoPopupEnabled={isAutoPopupEnabled}
        onToggleAutoPopup={() => setIsAutoPopupEnabled(!isAutoPopupEnabled)}
        latestAlarmTriggered={latestAlarmTriggered}
        onOpenHistorian={() => {
          setIsAlarmModalOpen(false);
          setIsAlarmHistorianModalOpen(true);
        }}
      />

      {/* Industrial Alarm Historian (Lazy Loaded) */}
      {isAlarmHistorianModalOpen && (
        <Suspense fallback={null}>
          <LazyAlarmHistorianModal
            isOpen={isAlarmHistorianModalOpen}
            onClose={() => setIsAlarmHistorianModalOpen(false)}
            dashboardId={activeDashboard?.dashboardId}
            onAcknowledgeAlarm={handleAcknowledgeAlarm}
            onOpenLiveAlarms={() => {
              setIsAlarmHistorianModalOpen(false);
              setIsAlarmModalOpen(true);
            }}
            isCommunity={isCommunity}
          />
        </Suspense>
      )}

      {/* TASC FDD Fault Detection & CBM (Desktop Exclusive, Lazy Loaded) */}
      {isDesktop && isFddModalOpen && (
        <Suspense fallback={null}>
          <LazyFddModal
            isOpen={isFddModalOpen}
            onClose={() => setIsFddModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Interactive CoachMark / Product Tour Overlay */}
      <CoachMarkOverlay
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigate={setCurrentView}
        onOpenFdd={() => setIsFddModalOpen(true)}
        onOpenAlarms={() => setIsAlarmModalOpen(true)}
        onOpenHistorian={() => setIsAlarmHistorianModalOpen(true)}
      />

      {/* AI Copilot Floating Action Button */}
      {!isClient && (currentView === AppView.DASHBOARD || currentView === AppView.WEB_HMI) && (
        <AiChatFab onClick={() => setIsAiDrawerOpen(true)} />
      )}

      {/* AI Copilot Slide-in Drawer */}
      {!isClient && (
        <AiChatDrawer
          isOpen={isAiDrawerOpen}
          onClose={() => setIsAiDrawerOpen(false)}
          latestValues={latestValues}
          appState={appState}
          activeAlarms={activeAlarms}
          onOpenFullAssistant={() => {
            setIsAiDrawerOpen(false);
            setCurrentView(AppView.AI_ASSISTANT);
          }}
        />
      )}

      {/* Session Exit Confirmation Modal */}
      <ExitSessionModal
        isOpen={isExitSessionModalOpen}
        onClose={() => setIsExitSessionModalOpen(false)}
        onSaveAndExit={handleSaveAndExitSession}
        onExitWithoutSave={handleExitSessionWithoutSave}
        isCommunitySave={
          appState.packageOrigin === 'community' ||
          isCommunity ||
          appState.clientInfo?.clientName === 'Community Edition Save' ||
          (!appState.clientInfo?.isSignedPackage && userRole !== 'admin')
        }
        editionName={
          isCommunity
            ? 'Community Edition'
            : appState.packageOrigin === 'community' || appState.clientInfo?.clientName === 'Community Edition Save'
            ? 'Client Edition (Community Demo Save)'
            : isClient
            ? 'Client Edition'
            : 'Engineering Studio'
        }
      />

      {/* Global Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        confirmVariant={confirmModal.confirmVariant}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
});

ModalRegistry.displayName = 'ModalRegistry';
export default ModalRegistry;
