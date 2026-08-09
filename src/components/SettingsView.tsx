import React, { useState } from 'react';
import { AppState, MqttConnection, ProductEdition } from '../types';
import { EditionManager } from '../utils/EditionManager';
import { APP_THEMES } from '../utils/theme';

interface SettingsViewProps {
  onBack: () => void;
  connections: MqttConnection[];
  editPin?: string;
  onSavePin?: (pin: string | undefined) => void;
  onRequestSetPin?: () => void;
  appState?: AppState;
  onSelectTheme?: (themeId: string) => void;
  onClearSavedSetup?: () => void;
  onOpenBrokerSettings?: () => void;
  onOpenTopicManager?: () => void;
  onOpenTagManager?: () => void;
  userRole?: string;
  productEdition?: ProductEdition;
  onRequestClearAll?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ 
  onBack, 
  connections,
  editPin,
  onSavePin,
  onRequestSetPin,
  appState,
  onSelectTheme,
  onClearSavedSetup,
  onOpenBrokerSettings,
  onOpenTopicManager,
  onOpenTagManager,
  userRole,
  productEdition,
  onRequestClearAll
}) => {
  const [settings, setSettings] = useState({
    darkTheme: true,
    keepScreenOn: true,
    defaultConnection: connections[0]?.connectionName || 'None',
    language: 'English',
    autoReconnect: true
  });

  const [themeNotice, setThemeNotice] = useState<string | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearPassInput, setClearPassInput] = useState('');
  const [clearPassError, setClearPassError] = useState('');
  const [showDoneReturnModal, setShowDoneReturnModal] = useState(false);

  const fallbackState: AppState = appState || {
    userRole: 'gate',
    productEdition: ProductEdition.LANDING,
    dashboards: [],
    panels: [],
    connections: []
  };

  const editionMgr = EditionManager.fromState(fallbackState);
  const requiredClearPassword = fallbackState?.clearPassword || fallbackState?.clientInfo?.clearPassword;

  const handleExecuteClearSetup = () => {
    setClearPassError('');
    if (requiredClearPassword) {
      if (!clearPassInput || clearPassInput !== requiredClearPassword) {
        setClearPassError('Incorrect Security Password. Clear Setup aborted.');
        return;
      }
    }

    if (onClearSavedSetup) {
      onClearSavedSetup();
    }

    setShowClearConfirmModal(false);
    setShowDoneReturnModal(true);
  };
  const themeCheck = editionMgr.CanChangeTheme();

  const handleThemeChange = (themeId: string) => {
    const check = editionMgr.CanChangeTheme();
    if (!check.allowed) {
      setThemeNotice(check.reason || 'Client Runtime is read-only. Theme switching is disabled.');
      setTimeout(() => setThemeNotice(null), 4500);
      return;
    }
    if (onSelectTheme) {
      onSelectTheme(themeId);
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-[#0a0a0a] overflow-y-auto">
      <header className="h-16 flex items-center px-4 border-b border-[#222] bg-[#121212] shrink-0">
        <button onClick={onBack} className="p-2 mr-4 text-gray-400 hover:text-white">
          <i className="fas fa-arrow-left text-lg"></i>
        </button>
        <h1 className="text-lg font-bold text-white">App Settings</h1>
      </header>

      <div className="p-6 space-y-6 max-w-xl mx-auto w-full">
        {themeNotice && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3 flex items-center space-x-2.5 text-amber-300 text-xs font-semibold animate-in fade-in">
            <i className="fas fa-lock text-amber-400 shrink-0"></i>
            <span>{themeNotice}</span>
          </div>
        )}

        {/* Security PIN Settings */}
        {!editionMgr.IsClient() && (
          <div className="bg-[#121212] p-5 rounded-2xl border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <i className="fas fa-shield-halved text-sky-400 text-base"></i>
                <div>
                  <h3 className="text-sm font-bold text-white">Dashboard Lock Security PIN</h3>
                  <p className="text-xs text-gray-400">Protect layout editing & panel modifications with a PIN</p>
                </div>
              </div>
              {editPin ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  PIN Active
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-gray-400 px-2.5 py-1 rounded-full">
                  Unprotected
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-800">
              {editPin ? (
                <div className="flex items-center space-x-2 w-full justify-between">
                  <button
                    onClick={() => onRequestSetPin && onRequestSetPin()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5"
                  >
                    <i className="fas fa-key text-[11px]"></i>
                    <span>Change Security PIN</span>
                  </button>
                  <button
                    onClick={() => onSavePin && onSavePin(undefined)}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 border border-rose-500/30"
                  >
                    <i className="fas fa-unlock text-[11px]"></i>
                    <span>Remove Security PIN</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onRequestSetPin && onRequestSetPin()}
                  className="w-full py-2 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-xs rounded-xl transition-all border border-sky-500/40 flex items-center justify-center space-x-2"
                >
                  <i className="fas fa-plus-circle text-xs"></i>
                  <span>Set Security PIN Credential</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Central MQTT Broker Settings */}
        {!editionMgr.IsClient() && onOpenBrokerSettings && (
          <div className="bg-[#121212] p-5 rounded-2xl border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <i className="fas fa-server text-sky-400 text-base"></i>
                <div>
                  <h3 className="text-sm font-bold text-white">MQTT Broker Settings</h3>
                  <p className="text-xs text-gray-400">Configure host address, port, protocol, credentials, keep alive & session options</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenBrokerSettings}
                className="px-3.5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>Broker Settings</span>
                <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Central MQTT Topic Manager */}
        {!editionMgr.IsClient() && onOpenTopicManager && (
          <div className="bg-[#121212] p-5 rounded-2xl border border-sky-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <i className="fas fa-sitemap text-sky-400 text-base"></i>
                <div>
                  <h3 className="text-sm font-bold text-white">MQTT Topic Manager & Bulk Editor</h3>
                  <p className="text-xs text-gray-400">Scan topics, publish/subscribe classification, bulk find & replace</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTopicManager}
                className="px-3.5 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>Open Manager</span>
                <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        {/* Central MQTT Tag Manager */}
        {!editionMgr.IsClient() && onOpenTagManager && (
          <div className="bg-[#121212] p-5 rounded-2xl border border-emerald-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <i className="fas fa-tags text-emerald-400 text-base"></i>
                <div>
                  <h3 className="text-sm font-bold text-white">MQTT Tag Manager & Bulk Editor</h3>
                  <p className="text-xs text-gray-400">Central JSON path & publish pattern registry, CSV import/export, bulk editor</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenTagManager}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
              >
                <span>Open Tag Manager</span>
                <i className="fas fa-arrow-right text-[10px]"></i>
              </button>
            </div>
          </div>
        )}

        <div className="bg-[#121212] rounded-2xl border border-[#222] p-4 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 px-2">Display & Behavior</h2>

          {/* Theme Preset Selector */}
          <div className="py-3 px-2 border-b border-[#1f1f1f] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-200">Application Color Theme</span>
              </div>
              <span className="text-xs text-slate-400 font-mono capitalize">{appState?.appTheme || 'amber'}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {APP_THEMES.map((theme) => {
                const isActive = (appState?.appTheme || 'amber') === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleThemeChange(theme.id)}
                    className={`flex items-center space-x-2 p-2 rounded-xl border text-left transition-all ${
                      isActive 
                        ? 'border-amber-500/80 bg-amber-500/10 text-white' 
                        : 'border-slate-800 bg-[#161616] text-slate-300 hover:border-slate-700'
                    } cursor-pointer`}
                  >
                    <span 
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20" 
                      style={{ backgroundColor: theme.primary }}
                    ></span>
                    <span className="text-xs font-semibold truncate">{theme.name}</span>
                    {isActive && <i className="fas fa-check text-[10px] text-amber-400 ml-auto shrink-0"></i>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dark Theme */}
          <div className="flex items-center justify-between py-3 px-2 border-b border-[#1f1f1f]">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-200">Dark Theme Mode</span>
              {!themeCheck.allowed && (
                <i className="fas fa-lock text-amber-400 text-xs" title="Theme locked in Client Mode"></i>
              )}
            </div>
            <div 
              onClick={() => {
                const check = editionMgr.CanChangeTheme();
                if (!check.allowed) {
                  setThemeNotice(check.reason || 'Client Runtime is read-only. Theme switching is disabled.');
                  setTimeout(() => setThemeNotice(null), 4500);
                  return;
                }
                setSettings({...settings, darkTheme: !settings.darkTheme});
              }}
              className={`w-10 h-5 rounded-full relative transition-colors ${!themeCheck.allowed ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${settings.darkTheme ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-black transition-transform ${settings.darkTheme ? 'translate-x-5' : ''}`}></div>
            </div>
          </div>

          {/* Keep Screen On */}
          <div className="flex items-center justify-between py-3 px-2 border-b border-[#1f1f1f]">
            <span className="text-sm font-medium text-gray-200">Keep Screen Awake</span>
            <div 
              onClick={() => setSettings({...settings, keepScreenOn: !settings.keepScreenOn})}
              className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${settings.keepScreenOn ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-black transition-transform ${settings.keepScreenOn ? 'translate-x-5' : ''}`}></div>
            </div>
          </div>

          {/* Auto Reconnect */}
          <div className="flex items-center justify-between py-3 px-2 border-b border-[#1f1f1f]">
            <span className="text-sm font-medium text-gray-200">Auto Reconnect on Connection Loss</span>
            <div 
              onClick={() => setSettings({...settings, autoReconnect: !settings.autoReconnect})}
              className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${settings.autoReconnect ? 'bg-amber-500' : 'bg-gray-700'}`}
            >
              <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-black transition-transform ${settings.autoReconnect ? 'translate-x-5' : ''}`}></div>
            </div>
          </div>

          {/* Default Connection */}
          <div className="flex items-center justify-between py-3 px-2 border-b border-[#1f1f1f]">
            <span className="text-sm font-medium text-gray-200">Default Startup Connection</span>
            <select 
              value={settings.defaultConnection}
              onChange={(e) => setSettings({...settings, defaultConnection: e.target.value})}
              className="bg-[#181818] text-xs text-amber-400 font-semibold border border-[#333] rounded px-3 py-1 outline-none"
            >
              {connections.map(c => (
                <option key={c.connectionId} value={c.connectionName}>{c.connectionName}</option>
              ))}
            </select>
          </div>

          {/* Select Language */}
          <div className="flex items-center justify-between py-3 px-2">
            <span className="text-sm font-medium text-gray-200">Language</span>
            <span className="text-xs text-gray-400 font-semibold bg-[#181818] px-3 py-1 rounded border border-[#333]">
              {settings.language}
            </span>
          </div>
        </div>

        {/* Clear All Widgets & Broker Settings Section (Engineering & Community Edition) */}
        {(userRole === 'admin' || userRole === 'community' || productEdition === ProductEdition.COMMUNITY) && onRequestClearAll && (
          <div className="bg-[#121212] p-5 rounded-2xl border border-rose-500/40 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
                <i className="fas fa-trash-can text-rose-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Clear All Widgets & Broker Settings</h3>
                <p className="text-xs text-gray-400">
                  Erase all widgets ({appState?.panels?.length || 0}) and MQTT broker connections ({appState?.connections?.length || 0})
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
              Instantly wipe all dashboard controls, panels, and broker endpoints to start with a completely fresh, blank workspace in {userRole === 'community' || productEdition === ProductEdition.COMMUNITY ? 'Community Edition' : 'Engineering Studio'}.
            </p>
            <button
              type="button"
              onClick={onRequestClearAll}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition-all border border-rose-500/50 flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-rose-600/20"
            >
              <i className="fas fa-trash-can text-xs"></i>
              <span>Clear All Widgets & Broker Settings</span>
            </button>
          </div>
        )}

        {/* Clear Saved Client Setup Section */}
        {onClearSavedSetup && (
          <div className="bg-[#121212] p-5 rounded-2xl border border-rose-500/30 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <i className="fas fa-trash-can text-rose-400 text-lg"></i>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Clear Saved Setup Memory</h3>
                <p className="text-xs text-gray-400">Wipe browser-stored setup & return to Import Screen</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-2.5">
              This wipes the saved layout and connections from browser storage so you can upload a new client package or reset configurations without clearing browser cache manually.
            </p>
            <button
              type="button"
              onClick={() => {
                setClearPassInput('');
                setClearPassError('');
                setShowClearConfirmModal(true);
              }}
              className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-extrabold text-xs rounded-xl transition-all border border-rose-500/40 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <i className="fas fa-rotate-left text-xs"></i>
              <span>Clear Saved Setup & Reset App</span>
            </button>
          </div>
        )}


      </div>

      {/* Clear Setup Password Verification Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400 font-bold border-b border-slate-800 pb-3">
              <i className="fas fa-triangle-exclamation text-xl"></i>
              <span className="text-base text-white">Clear Saved Setup Memory?</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to clear the browser-saved setup memory and layout for Client Edition?
            </p>

            {requiredClearPassword ? (
              <div className="space-y-2 bg-slate-950 p-3.5 rounded-2xl border border-rose-500/30">
                <label className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Enter Clear Setup Security Password <span className="text-rose-400">*</span>
                </label>
                <input 
                  type="password"
                  autoFocus
                  placeholder="Enter security password"
                  value={clearPassInput}
                  onChange={(e) => setClearPassInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteClearSetup();
                  }}
                  className="w-full bg-slate-900 px-3 py-2 rounded-xl border border-slate-800 focus:border-amber-500 text-xs text-amber-300 outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500">A password was configured when this Client package was generated to protect memory wipe.</p>
              </div>
            ) : null}

            {clearPassError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
                <i className="fas fa-circle-exclamation text-base"></i>
                <span>{clearPassError}</span>
              </div>
            )}

            <div className="flex items-center space-x-3 pt-2 font-bold text-xs uppercase">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearSetup}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all"
              >
                Clear Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Done Return Modal */}
      {showDoneReturnModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 text-slate-100 space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto text-xl">
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Setup Memory Cleared!</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                The saved client layout and broker configurations have been wiped from browser memory. Click below to return to the Home Screen and upload a new package.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowDoneReturnModal(false);
                onBack();
              }}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-sky-500/20 cursor-pointer transition-all"
            >
              Go to Home Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
