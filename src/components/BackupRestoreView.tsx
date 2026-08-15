import React, { useState, useRef } from 'react';
import { AppState } from '../types';
import InspectClientPackageModal from './InspectClientPackageModal';

interface BackupRestoreViewProps {
  onBack: () => void;
  appState?: AppState;
  onRestoreState?: (state: AppState) => void;
  onRequestExportClientPackage?: () => void;
  userRole?: 'admin' | 'client' | 'gate' | 'community';
}

const BackupRestoreView: React.FC<BackupRestoreViewProps> = ({ 
  onBack, 
  appState, 
  onRestoreState,
  onRequestExportClientPackage,
  userRole
}) => {
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExcludeDialog, setShowExcludeDialog] = useState(false);
  const [showInspectModal, setShowInspectModal] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCommunity = userRole === 'community';

  const handleExportBackup = (excludeSecrets = false) => {
    if (isCommunity) {
      alert('Community Edition: Backup export functionality is revoked. Upgrade to Engineering Studio for backup capabilities.');
      return;
    }
    if (!appState) return;
    
    let exportedConnections = appState.connections;
    if (excludeSecrets) {
      exportedConnections = appState.connections.map(c => ({
        ...c,
        username: '',
        password: '',
        brokerAddress: ''
      }));
    }

    const exportData = {
      version: '2.4.0',
      exportedAt: new Date().toISOString(),
      connections: exportedConnections,
      dashboards: appState.dashboards,
      panels: appState.panels
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mqtt_dash_pro_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setShowExcludeDialog(false);
    setRestoreSuccessMsg('Backup JSON configuration exported successfully!');
    setTimeout(() => setRestoreSuccessMsg(null), 3000);
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isCommunity) {
      alert('Community Edition: Backup restore functionality is revoked. Upgrade to Engineering Studio for restore capabilities.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.connections && parsed.dashboards && parsed.panels && onRestoreState) {
          onRestoreState({
            connections: parsed.connections,
            dashboards: parsed.dashboards,
            panels: parsed.panels
          });
          setRestoreSuccessMsg(`Successfully restored ${parsed.connections.length} connections, ${parsed.dashboards.length} dashboards, and ${parsed.panels.length} panels!`);
          setTimeout(() => setRestoreSuccessMsg(null), 4000);
        } else {
          alert('Invalid backup JSON schema. Make sure the file contains connections, dashboards, and panels.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-grow flex flex-col bg-[#0a0a0a] overflow-y-auto">
      <header className="h-16 flex items-center px-4 border-b border-[#222] bg-[#121212] shrink-0">
        <button onClick={onBack} className="p-2 mr-4 text-gray-400 hover:text-white">
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-lg font-bold text-white">Backup & Restore</h1>
      </header>

      <div className="p-6 space-y-6 max-w-xl mx-auto w-full">
        {restoreSuccessMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in zoom-in duration-150">
            <i className="fas fa-circle-check text-lg"></i>
            <span>{restoreSuccessMsg}</span>
          </div>
        )}

        {/* Community Edition Lock Banner */}
        {isCommunity && (
          <div className="bg-amber-500/10 rounded-2xl p-5 border border-amber-500/30 space-y-2.5 text-amber-300 animate-in fade-in duration-200">
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <i className="fas fa-lock text-xl"></i>
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">Backup & Restore Locked</h2>
                <span className="text-[11px] font-bold text-amber-400">
                  Unlock with Engineering Edition or Client Package
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Backup export, project state restoration, and distribution package features are locked in Community Edition. Switch to Engineering Studio or Client Package to unlock full Backup & Restore capabilities.
            </p>
          </div>
        )}

        {/* Warning & Cross-Device Portability Card */}
        <div className="bg-[#121212] rounded-2xl p-6 border border-[#262626] space-y-4">
          <div className="flex items-center space-x-3 text-sky-400">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <i className="fas fa-laptop-mobile text-xl"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Cross-Device Portability & Local Historian</h2>
              <span className="text-[11px] text-emerald-400 font-semibold">Zero Data Redundancy Guarantee</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Backup exports your entire SCADA architecture (MQTT connections, driver tags, dashboards, and panel configurations) into a portable JSON file.
            Historian database records reside strictly in each device's local IndexedDB. If you setup everything on your PC/Laptop (5-Year Historian) and import the backup onto a Mobile device, the mobile device will automatically adapt its local logging to safe mobile parameters (≤ 30 Days) without cross-device redundancy.
          </p>
        </div>

        {/* Client Package Section */}
        {onRequestExportClientPackage && (
          <div className={`bg-[#121212] rounded-2xl p-5 border space-y-3 ${isCommunity ? 'border-amber-500/30 opacity-80' : 'border-sky-500/30'}`}>
            <div className="flex items-center space-x-3 text-sky-400">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${isCommunity ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/20'}`}>
                <i className={`fas ${isCommunity ? 'fa-lock' : 'fa-file-shield'} text-lg`}></i>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-white">Client Distribution Package</h2>
                  {isCommunity && (
                    <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded">
                      Locked
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">
                  {isCommunity ? 'Unlock with Engineering Edition or Client Package' : 'Export SHA-256 signed JSON for client deployment (Read-Only Mode)'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button 
                onClick={() => {
                  if (isCommunity) {
                    alert('🔒 Client Package Export is locked in Community Edition. Unlock with Engineering Edition or Client Package.');
                    return;
                  }
                  onRequestExportClientPackage();
                }}
                className="w-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isCommunity && <i className="fas fa-lock text-slate-950 text-xs"></i>}
                <i className="fas fa-file-export text-sm"></i>
                <span>Export Client Package</span>
              </button>
              <button 
                onClick={() => setShowInspectModal(true)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <i className="fas fa-microscope text-sm"></i>
                <span>Inspect Package (.tasc)</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              if (isCommunity) {
                alert('🔒 Export Backup is locked in Community Edition. Unlock with Engineering Edition or Client Package.');
                return;
              }
              setShowExcludeDialog(true);
            }}
            className={`py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              isCommunity 
                ? 'bg-slate-900 text-amber-400/90 border border-amber-500/30 hover:bg-slate-800' 
                : 'bg-amber-500 hover:bg-amber-400 text-black active:scale-95'
            }`}
          >
            {isCommunity && <i className="fas fa-lock text-amber-400 text-xs"></i>}
            <i className="fas fa-download text-sm"></i>
            <span>Export Backup</span>
          </button>

          <button 
            onClick={() => {
              if (isCommunity) {
                alert('🔒 Restore Backup is locked in Community Edition. Unlock with Engineering Edition or Client Package.');
                return;
              }
              fileInputRef.current?.click();
            }}
            className={`py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              isCommunity 
                ? 'bg-slate-900 text-amber-400/90 border border-amber-500/30 hover:bg-slate-800' 
                : 'bg-[#181818] hover:bg-[#222] border border-[#333] text-white active:scale-95'
            }`}
          >
            {isCommunity && <i className="fas fa-lock text-amber-400 text-xs"></i>}
            <i className="fas fa-upload text-sm text-amber-500"></i>
            <span>Restore Backup</span>
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileRestore} 
            accept=".json" 
            className="hidden" 
          />
        </div>

        <button 
          onClick={() => {
            if (isCommunity) {
              alert('🔒 Share Config Payload is locked in Community Edition. Unlock with Engineering Edition or Client Package.');
              return;
            }
            setShowShareModal(true);
          }}
          className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center space-x-3 border transition-all cursor-pointer ${
            isCommunity 
              ? 'bg-slate-900 text-amber-400/90 border-amber-500/30 hover:bg-slate-800' 
              : 'bg-[#121212] hover:bg-[#181818] text-white border-[#262626] active:scale-95'
          }`}
        >
          {isCommunity && <i className="fas fa-lock text-amber-400 text-xs"></i>}
          <i className="fas fa-share-nodes text-blue-400 text-sm"></i>
          <span>Share Config Payload</span>
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] w-full max-w-md rounded-2xl border border-[#2a2a2a] p-6 space-y-4 animate-in zoom-in duration-150">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <i className="fas fa-share-nodes text-amber-500"></i>
              <span>Exported Configuration String</span>
            </h3>
            <textarea 
              readOnly
              value={JSON.stringify(appState, null, 2)}
              className="w-full h-48 bg-[#0a0a0a] border border-[#333] font-mono text-[11px] text-emerald-400 p-3 rounded-xl outline-none"
            />
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(appState, null, 2));
                  alert('Configuration copied to clipboard!');
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase rounded-lg"
              >
                Copy Config
              </button>
              <button 
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 bg-[#222] text-gray-300 hover:text-white font-bold text-xs uppercase rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exclude Dialog */}
      {showExcludeDialog && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] w-full max-w-sm rounded-2xl border border-[#2a2a2a] p-6 space-y-4 animate-in zoom-in duration-150">
            <h3 className="text-base font-bold text-white">Exclude Sensitive Data?</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Would you like to strip out broker passwords and authentication tokens from the exported JSON file?
            </p>
            <div className="flex justify-end space-x-3 pt-2 font-bold text-xs uppercase">
              <button onClick={() => handleExportBackup(true)} className="px-4 py-2 bg-[#222] text-amber-400 hover:bg-[#2a2a2a] rounded-lg">Strip Secrets</button>
              <button onClick={() => handleExportBackup(false)} className="px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 rounded-lg">Export Full Config</button>
            </div>
          </div>
        </div>
      )}
      {/* Inspect Client Package Modal */}
      <InspectClientPackageModal 
        isOpen={showInspectModal} 
        onClose={() => setShowInspectModal(false)} 
      />
    </div>
  );
};

export default BackupRestoreView;
