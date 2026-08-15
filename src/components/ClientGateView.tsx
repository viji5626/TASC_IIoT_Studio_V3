import React, { useState, useRef } from 'react';
import { AppState } from '../types';
import { verifyClientPackage, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } from '../utils/clientSecurity';
import { getCommercialSavedPackage, getCommunitySavedPackage } from '../utils/editionStorage';
import AppLogo from './AppLogo';

interface ClientGateViewProps {
  appState: AppState;
  onLoginAdmin: () => void;
  onImportClientPackage: (packageState: AppState, clientName: string, expiresAt?: string) => void;
  onLoadSavedClientSetup?: () => void;
  hasSavedClientSetup?: boolean;
  onExploreDemo?: () => void;
  accentColor?: string;
}

const ClientGateView: React.FC<ClientGateViewProps> = ({
  appState,
  onLoginAdmin,
  onImportClientPackage,
  onLoadSavedClientSetup,
  hasSavedClientSetup,
  onExploreDemo,
  accentColor = '#0ea5e9'
}) => {
  const [activeTab, setActiveTab] = useState<'client' | 'admin'>('client');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [importError, setImportError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const isUserValid = adminUsername.trim() === DEFAULT_ADMIN_USERNAME;
    const isPassValid = adminPassword === DEFAULT_ADMIN_PASSWORD || (appState.editPin && adminPassword === appState.editPin);

    if (isUserValid && isPassValid) {
      onLoginAdmin();
    } else {
      setAdminError('Invalid credentials. Please verify username and password.');
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    setIsVerifying(true);
    setImportError('');

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const verification = await verifyClientPackage(parsed);

      if (!verification.isValid) {
        setImportError(verification.error || 'Failed to verify package integrity.');
        setIsVerifying(false);
        return;
      }

      if (verification.packageData) {
        const clientName = verification.clientName || file.name.replace(/\.json$/i, '');
        const newAppState: AppState = {
          ...appState,
          connections: verification.packageData.connections,
          dashboards: verification.packageData.dashboards,
          panels: verification.packageData.panels,
          userRole: 'client',
          isLockedPackage: true,
          clientInfo: {
            clientName,
            generatedAt: verification.generatedAt,
            expiresAt: verification.expiresAt,
            isSignedPackage: verification.isSignedPackage
          }
        };

        onImportClientPackage(newAppState, clientName, verification.expiresAt);
      }
    } catch {
      setImportError('Invalid JSON file format. Unable to parse payload.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background ambient lighting glow */}
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-20 pointer-events-none -top-24 -left-24 transition-colors duration-500"
        style={{ backgroundColor: accentColor }}
      />
      <div 
        className="absolute w-[400px] h-[400px] rounded-full blur-[120px] opacity-15 pointer-events-none -bottom-20 -right-20"
        style={{ backgroundColor: accentColor }}
      />

      {/* Center Container Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 shadow-inner">
            <AppLogo size="lg" accentColor={accentColor} />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight pt-1">
            TASC IIoT Studio
          </h1>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Enterprise Client Access Gate • Client Edition & Admin Configuration
          </p>
        </div>

        {/* Tab Toggle Bar */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800/80">
          <button
            type="button"
            onClick={() => setActiveTab('client')}
            className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'client'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-file-import text-sm"></i>
            <span>Client Edition</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('admin')}
            className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <i className="fas fa-user-shield text-sm"></i>
            <span>Admin Login</span>
          </button>
        </div>

        {/* TAB 1: CLIENT EDITION */}
        {activeTab === 'client' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {(() => {
              const commPkg = getCommercialSavedPackage();
              const hasComm = !!commPkg;
              if (!hasComm) return null;
              return (
                <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-4 space-y-2 text-center">
                  <div className="flex items-center justify-center space-x-2 text-sky-400 font-bold text-xs">
                    <i className="fas fa-floppy-disk text-sm"></i>
                    <span>Saved Commercial Setup Available</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {commPkg ? `${commPkg.meta.dashboardsCount} Screens • ${commPkg.meta.panelsCount} Widgets saved in browser memory.` : 'You have a previously saved setup in your browser memory.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onLoadSavedClientSetup) onLoadSavedClientSetup();
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Load Project From Browser Memory
                  </button>
                </div>
              );
            })()}

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2.5 text-sky-400 font-semibold text-xs">
                <i className="fas fa-shield-halved text-sm"></i>
                <span>Client Edition (Operator Mode)</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Upload your assigned <code className="text-sky-300 font-mono">.json</code> package provided by your administrator. 
                Broker connections and topic tags are pre-configured in Read-Only mode. You can interact with controls and customize grid layouts for your display.
              </p>
            </div>

            {/* Drag & Drop / File Input Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-sky-400 bg-sky-500/10 scale-102'
                  : 'border-slate-800 bg-slate-950/40 hover:border-sky-500/50 hover:bg-slate-950/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center text-2xl shadow-inner">
                {isVerifying ? (
                  <i className="fas fa-circle-notch animate-spin text-sky-400"></i>
                ) : (
                  <i className="fas fa-cloud-arrow-up"></i>
                )}
              </div>

              <div>
                <span className="text-sm font-bold text-white block">
                  {isVerifying ? 'Verifying HMAC Signature...' : 'Click or Drag Client JSON Package Here'}
                </span>
                <span className="text-[11px] text-slate-400 block mt-1">
                  Supports signed <code className="text-sky-400 font-mono">client_package.json</code> files
                </span>
              </div>

              <button
                type="button"
                className="mt-2 px-5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all"
              >
                Browse Files
              </button>
            </div>

            {importError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl text-xs space-y-1 animate-in zoom-in-95">
                <div className="flex items-center space-x-2 font-bold text-rose-400">
                  <i className="fas fa-[#ef4444] fa-circle-exclamation text-sm"></i>
                  <span>Validation Error</span>
                </div>
                <p className="leading-relaxed">{importError}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ADMIN LOGIN */}
        {activeTab === 'admin' && (
          <form onSubmit={handleAdminSubmit} className="space-y-4 animate-in fade-in duration-150">
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-400 font-semibold text-xs">
                  <i className="fas fa-key text-sm"></i>
                  <span>Master Administrator Login</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your Admin credentials to edit brokers, change topics/tags, manage dashboards, and generate signed client packages.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => { setAdminUsername(e.target.value); setAdminError(''); }}
                  placeholder="Enter Username"
                  className="w-full bg-slate-950 text-white font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-amber-500 outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => { setAdminPassword(e.target.value); setAdminError(''); }}
                  placeholder="Enter Password"
                  className="w-full bg-slate-950 text-amber-400 font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-amber-500 outline-none"
                />
              </div>
            </div>

            {adminError && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl text-center font-medium animate-in shake">
                <i className="fas fa-circle-exclamation mr-1.5"></i>
                {adminError}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center space-x-2 mt-2 cursor-pointer"
            >
              <i className="fas fa-right-to-bracket text-sm"></i>
              <span>Unlock Admin Mode</span>
            </button>
          </form>
        )}

        {/* Footer Quick Action */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>TASC MQTT Security v2.4</span>
          {onExploreDemo && (
            <button
              type="button"
              onClick={onExploreDemo}
              className="text-sky-400 hover:text-sky-300 font-semibold underline decoration-sky-400/30"
            >
              Launch Demo Viewer
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default ClientGateView;
