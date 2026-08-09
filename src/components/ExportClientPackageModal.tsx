import React, { useState } from 'react';
import { AppState } from '../types';
import { generateClientPackage } from '../utils/clientSecurity';

interface ExportClientPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  appState: AppState;
}

const ExportClientPackageModal: React.FC<ExportClientPackageModalProps> = ({
  isOpen,
  onClose,
  appState
}) => {
  const [clientName, setClientName] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [clearPassword, setClearPassword] = useState('');
  const [showClearPass, setShowClearPass] = useState(false);
  const [fileFormat, setFileFormat] = useState<'tasc' | 'json'>('tasc');
  const [preferredView, setPreferredView] = useState<'hmi' | 'grid'>('hmi');
  const [isGenerating, setIsGenerating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setIsGenerating(true);
    setSuccessMsg(null);

    try {
      const packageData = {
        connections: appState.connections,
        dashboards: appState.dashboards,
        panels: appState.panels
      };

      const signedPackage = await generateClientPackage(
        packageData,
        clientName,
        notes,
        expiresAt,
        preferredView,
        clearPassword
      );

      const jsonString = JSON.stringify(signedPackage, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const safeName = clientName.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
      const ext = fileFormat === 'tasc' ? 'tasc' : 'json';
      a.download = `client_package_${safeName}_${Date.now()}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg(`Signed package (.${ext}) for "${clientName}" exported successfully!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 2500);
    } catch {
      alert('Error generating signed client package.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto my-auto shadow-2xl p-6 text-slate-100 space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5 text-sky-400 font-bold">
            <i className="fas fa-file-shield text-lg"></i>
            <span className="text-sm text-white">Export Client Edition Package (.tasc / .json)</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Generates a cryptographically signed file containing active broker connections, dashboards, and MQTT topics. 
          When loaded, it opens in <strong className="text-sky-300">Client Edition (Operator Mode)</strong> with broker endpoints & topics locked.
        </p>

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-xl text-xs font-semibold flex items-center space-x-2">
            <i className="fas fa-circle-check text-base"></i>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Default Client View Interface Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredView('hmi')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  preferredView === 'hmi'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-desktop text-amber-400"></i>
                <span>Web HMI Canvas</span>
              </button>
              <button
                type="button"
                onClick={() => setPreferredView('grid')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  preferredView === 'grid'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300 shadow-lg'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-table-cells text-sky-400"></i>
                <span>IIoT Grid Dashboard</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Export File Extension Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFileFormat('tasc')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  fileFormat === 'tasc'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-file-contract"></i>
                <span>.tasc (Package)</span>
              </button>
              <button
                type="button"
                onClick={() => setFileFormat('json')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center space-x-2 ${
                  fileFormat === 'json'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <i className="fas fa-file-code"></i>
                <span>.json (Standard)</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Client / Facility Name <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              required
              placeholder="e.g. Acme Corp Factory #1"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              License Expiration Date (Optional)
            </label>
            <input 
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 text-xs text-sky-300 outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Clear Setup Security Password (Optional)
            </label>
            <div className="relative">
              <input 
                type={showClearPass ? "text" : "password"}
                placeholder="Password required to clear client memory"
                value={clearPassword}
                onChange={(e) => setClearPassword(e.target.value)}
                className="w-full bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-800 focus:border-sky-500 text-xs text-amber-300 outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowClearPass(!showClearPass)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                title={showClearPass ? "Hide Password" : "Show Password"}
              >
                <i className={`fas ${showClearPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">If set, operators in Client Edition must enter this password to clear setup memory in App Settings.</p>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Package Notes / Deployment ID (Optional)
            </label>
            <textarea 
              rows={2}
              placeholder="e.g. Contract #4928 • Plant HVAC Telemetry"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 focus:border-sky-500 text-xs text-slate-300 outline-none"
            />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center space-x-2">
            <i className="fas fa-lock text-amber-400 text-sm shrink-0"></i>
            <span>Payload includes SHA-256 HMAC signature. If modified manually, the package signature invalidates.</span>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGenerating || !clientName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-sky-500/20 transition-all flex items-center justify-center space-x-1.5"
            >
              {isGenerating ? (
                <i className="fas fa-circle-notch animate-spin"></i>
              ) : (
                <>
                  <i className="fas fa-download"></i>
                  <span>Export Signed JSON</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExportClientPackageModal;
