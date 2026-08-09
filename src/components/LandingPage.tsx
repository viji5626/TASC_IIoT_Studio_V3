import React, { useState, useRef } from 'react';
import { AppState, ProductEdition } from '../types';
import { verifyClientPackage, DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD } from '../utils/clientSecurity';
import AppLogo from './AppLogo';

interface LandingPageProps {
  appState: AppState;
  onSelectCommunityMode: () => void;
  onLoginAdmin: () => void;
  onImportClientPackage: (packageState: AppState, clientName: string, expiresAt?: string, preferredWorkstationMode?: 'hmi' | 'grid') => void;
  onLoadSavedClientSetup?: () => void;
  hasSavedClientSetup?: boolean;
  accentColor?: string;
}

const LandingPage: React.FC<LandingPageProps> = ({
  appState,
  onSelectCommunityMode,
  onLoginAdmin,
  onImportClientPackage,
  onLoadSavedClientSetup,
  hasSavedClientSetup,
  accentColor = '#0ea5e9'
}) => {
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [importError, setImportError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSavedInBrowser = typeof window !== 'undefined' && localStorage.getItem('tasc_client_setup_saved') === 'true' && !!localStorage.getItem('mqtt_dash_pro_state');
  const savedSetupAvailable = !!(hasSavedClientSetup || isSavedInBrowser);

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const isUserValid = adminUsername.trim() === DEFAULT_ADMIN_USERNAME;
    const isPassValid = adminPassword === DEFAULT_ADMIN_PASSWORD || (appState.editPin && adminPassword === appState.editPin);

    if (isUserValid && isPassValid) {
      setShowAdminPinModal(false);
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
        const clientName = verification.clientName || file.name.replace(/\.(json|tasc)$/i, '');
        const newAppState: AppState = {
          ...appState,
          connections: verification.packageData.connections,
          dashboards: verification.packageData.dashboards,
          panels: verification.packageData.panels,
          userRole: 'client',
          productEdition: ProductEdition.CLIENT_RUNTIME,
          isLockedPackage: true,
          clearPassword: verification.clearPassword,
          clientInfo: {
            clientName,
            generatedAt: verification.generatedAt,
            expiresAt: verification.expiresAt,
            clearPassword: verification.clearPassword,
            isSignedPackage: verification.isSignedPackage,
            fileName: file.name
          }
        };

        onImportClientPackage(newAppState, clientName, verification.expiresAt, verification.preferredWorkstationMode);
      }
    } catch {
      setImportError('Invalid project file format. Unable to parse payload.');
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
    <div className="w-full min-h-screen h-screen overflow-y-auto bg-[#060a12] text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative select-none font-sans">
      
      {/* Background Industrial Lighting Glows */}
      <div 
        className="absolute w-[600px] h-[600px] rounded-full blur-[160px] opacity-15 pointer-events-none -top-32 -left-32 transition-colors duration-500"
        style={{ backgroundColor: accentColor }}
      />
      <div 
        className="absolute w-[500px] h-[500px] rounded-full blur-[140px] opacity-10 pointer-events-none -bottom-32 -right-32"
        style={{ backgroundColor: '#6366f1' }}
      />

      {/* Top Header Branding */}
      <header className="max-w-7xl mx-auto w-full flex items-center justify-between py-4 relative z-10 border-b border-slate-800/80 pb-6 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="p-2.5 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-xl flex items-center justify-center">
            <AppLogo size="md" accentColor={accentColor} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                TASC IIoT Studio
              </h1>
              <span className="text-[10px] uppercase tracking-widest font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded-md">
                v2.4 Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Industrial HMI & IoT Telemetry Platform
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-3 text-xs text-slate-400">
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-[11px]">System Ready</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full py-6 sm:py-10 relative z-10 space-y-8 shrink-0">
        
        {/* Title Section */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400 bg-sky-500/10 px-3.5 py-1 rounded-full border border-sky-500/20 inline-block">
            Select Software Execution Mode
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Industrial Automation & HMI Runtime Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Choose your application mode below to begin. Build custom HMI screens in Community Mode, load pre-configured client runtime packages, or enter Engineering Studio.
          </p>
        </div>

        {/* 3 Large Product Edition Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* OPTION 1: COMMUNITY EDITION */}
          <div className="bg-slate-900/80 hover:bg-slate-900/95 border border-slate-800/90 hover:border-emerald-500/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-emerald-500/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
            
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-xl shadow-inner">
                  <i className="fas fa-cube"></i>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full">
                  Free • Self-Serve
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Community Edition
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  For learning, testing, and building small personal MQTT HMI dashboards.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-emerald-400 mt-0.5 shrink-0"></i>
                  <span>Connect to custom MQTT broker</span>
                </div>
                <div className="flex items-start space-x-2.5 text-emerald-300 font-medium">
                  <i className="fas fa-unlock text-emerald-400 mt-0.5 shrink-0"></i>
                  <span><strong>Unlocked Grid Studio & HMI Canvas</strong></span>
                </div>
                <div className="flex items-start space-x-2.5 text-amber-300 font-medium">
                  <i className="fas fa-circle-exclamation text-amber-400 mt-0.5 shrink-0"></i>
                  <span><strong>Limit: Max 1 Screen</strong> (Single Dashboard)</span>
                </div>
                <div className="flex items-start space-x-2.5 text-amber-300 font-medium">
                  <i className="fas fa-circle-exclamation text-amber-400 mt-0.5 shrink-0"></i>
                  <span><strong>Limit: Max 10 Widgets</strong> (10 Panels max)</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-400">
                  <i className="fas fa-lock text-slate-500 mt-0.5 shrink-0"></i>
                  <span>Full Editing Unlocked • Backup/Restore Revoked</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-auto">
              <button
                type="button"
                onClick={onSelectCommunityMode}
                className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Start Community Edition</span>
                <i className="fas fa-arrow-right text-xs"></i>
              </button>
            </div>
          </div>

          {/* OPTION 2: CLIENT EDITION */}
          <div className="bg-slate-900/80 hover:bg-slate-900/95 border border-sky-500/40 hover:border-sky-400 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-sky-500/10 group relative overflow-hidden ring-1 ring-sky-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-bl-full pointer-events-none group-hover:bg-sky-500/15 transition-all" />
            
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center text-xl shadow-inner">
                  <i className="fas fa-file-shield"></i>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-sky-500/15 text-sky-300 border border-sky-500/30 px-3 py-1 rounded-full">
                  Operator Runtime
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                  Client Edition
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  For clients loading engineered <code className="text-sky-300 font-mono">.tasc</code> or <code className="text-sky-300 font-mono">.json</code> HMI packages.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-sky-400 mt-0.5 shrink-0"></i>
                  <span>Auto-loads Brokers, Dashboards & Tags</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-sky-400 mt-0.5 shrink-0"></i>
                  <span>Operate setpoints, sliders, switches & trends</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-sky-400 mt-0.5 shrink-0"></i>
                  <span>Rearrange & resize grid layouts freely</span>
                </div>
                <div className="flex items-start space-x-2.5 text-sky-300 font-semibold">
                  <i className="fas fa-shield-halved text-sky-400 mt-0.5 shrink-0"></i>
                  <span>Operator Mode (Broker endpoints & topics locked)</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-400">
                  <i className="fas fa-key text-sky-400 mt-0.5 shrink-0"></i>
                  <span>SHA-256 HMAC integrity verification</span>
                </div>
              </div>
            </div>

            {savedSetupAvailable ? (
              <div className="pt-6 mt-auto space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onLoadSavedClientSetup) {
                      onLoadSavedClientSetup();
                    } else {
                      setShowImportModal(true);
                    }
                  }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-sky-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <i className="fas fa-floppy-disk text-sm"></i>
                  <span>Load Client Edition (Saved Setup)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="w-full py-1.5 px-3 text-sky-400 hover:text-sky-300 font-semibold text-[11px] flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <i className="fas fa-cloud-arrow-up text-xs"></i>
                  <span>Upload New Package (.tasc / .json)</span>
                </button>
              </div>
            ) : (
              <div className="pt-8 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowImportModal(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-sky-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <i className="fas fa-cloud-arrow-up text-sm"></i>
                  <span>Load Client Edition (.tasc / .json)</span>
                </button>
              </div>
            )}
          </div>

          {/* OPTION 3: ADMIN / ENGINEERING STUDIO */}
          <div className="bg-slate-900/80 hover:bg-slate-900/95 border border-slate-800/90 hover:border-amber-500/50 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-amber-500/10 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-all" />
            
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-xl shadow-inner">
                  <i className="fas fa-user-gear"></i>
                </div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-amber-500/15 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full">
                  Full Engineering
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Engineering Studio
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Reserved for TASC automation engineers to design & deploy systems.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-800/80 text-xs">
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-amber-400 mt-0.5 shrink-0"></i>
                  <span>Unlimited Screens & Unlimited Widgets</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-amber-400 mt-0.5 shrink-0"></i>
                  <span>Full Broker, Tag & Topic configuration</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-amber-400 mt-0.5 shrink-0"></i>
                  <span>Widget script & pattern payload binding</span>
                </div>
                <div className="flex items-start space-x-2.5 text-slate-300">
                  <i className="fas fa-check text-amber-400 mt-0.5 shrink-0"></i>
                  <span>Export signed <code className="text-amber-300 font-mono">.tasc</code> packages</span>
                </div>
                <div className="flex items-start space-x-2.5 text-amber-300 font-medium">
                  <i className="fas fa-lock text-amber-400 mt-0.5 shrink-0"></i>
                  <span>Protected with Master PIN authentication</span>
                </div>
              </div>
            </div>

            <div className="pt-8 mt-auto">
              <button
                type="button"
                onClick={() => setShowAdminPinModal(true)}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <i className="fas fa-key text-xs"></i>
                <span>Admin Login</span>
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto w-full pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 relative z-10">
        <div className="flex items-center space-x-3">
          <span>TASC IIoT Studio • Industrial HMI Runtime v2.4</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-slate-600">Enterprise Edition Ready</span>
          <span className="text-slate-600">•</span>
          <span>© 2026 TASC Automation Systems</span>
        </div>
      </footer>

      {/* IMPORT PROJECT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto p-6 sm:p-8 space-y-6 shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3 text-sky-400">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-lg">
                  <i className="fas fa-file-shield"></i>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Load Client Edition Package</h3>
                  <p className="text-xs text-slate-400">Select or drop a signed <code className="text-sky-300 font-mono">.tasc</code> or <code className="text-sky-300 font-mono">.json</code> file</p>
                </div>
              </div>
              <button 
                onClick={() => { setShowImportModal(false); setImportError(''); }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            {savedSetupAvailable && (
              <div className="bg-sky-500/10 border border-sky-500/30 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2.5 text-sky-300">
                  <i className="fas fa-floppy-disk text-base text-sky-400 shrink-0"></i>
                  <div>
                    <span className="font-bold block text-white">Saved Setup Found in Browser</span>
                    <span className="text-[11px] text-slate-400">Loads saved client project directly without re-uploading.</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    if (onLoadSavedClientSetup) onLoadSavedClientSetup();
                  }}
                  className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
                >
                  Load Saved Setup
                </button>
              </div>
            )}

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-sky-400 bg-sky-500/10 scale-102'
                  : 'border-slate-800 bg-slate-950/60 hover:border-sky-500/50 hover:bg-slate-950/90'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".tasc,.json"
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
                  {isVerifying ? 'Verifying HMAC Signature...' : 'Click or Drag Project Package File'}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Supports <code className="text-sky-400 font-mono">.tasc</code> and <code className="text-sky-400 font-mono">.json</code> signed deployment packages
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
                  <i className="fas fa-circle-exclamation text-sm"></i>
                  <span>Validation Error</span>
                </div>
                <p className="leading-relaxed">{importError}</p>
              </div>
            )}

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center space-x-2">
              <i className="fas fa-shield-halved text-sky-400 text-sm shrink-0"></i>
              <span>Client runtime mode prevents modification of broker addresses, topics, or engineering settings.</span>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN LOGIN MODAL */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto my-auto p-6 sm:p-8 space-y-5 shadow-2xl relative text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5 text-amber-400 font-bold">
                <i className="fas fa-user-shield text-lg"></i>
                <span className="text-sm text-white">Engineering Studio Login</span>
              </div>
              <button 
                onClick={() => { setShowAdminPinModal(false); setAdminError(''); setAdminPassword(''); }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-400">Engineering Credentials Required</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Enter your credentials to access Engineering Studio, modify broker endpoints, configure tag bindings, and generate client packages.
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
                <span>Unlock Engineering Studio</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;
