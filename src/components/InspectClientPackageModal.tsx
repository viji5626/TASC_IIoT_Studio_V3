import React, { useState, useRef } from 'react';
import { verifyClientPackage } from '../utils/clientSecurity';

interface InspectClientPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InspectClientPackageModal: React.FC<InspectClientPackageModalProps> = ({
  isOpen,
  onClose
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [packageDetails, setPackageDetails] = useState<{
    clientName: string;
    notes?: string;
    generatedAt?: string;
    expiresAt?: string;
    clearPassword?: string;
    preferredWorkstationMode?: 'hmi' | 'grid';
    isSignedPackage?: boolean;
    connectionsCount: number;
    dashboardsCount: number;
    panelsCount: number;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processFile = async (f: File) => {
    if (!f) return;
    setFile(f);
    setIsVerifying(true);
    setErrorMsg(null);
    setPackageDetails(null);

    try {
      const text = await f.text();
      const parsed = JSON.parse(text);
      const res = await verifyClientPackage(parsed);

      if (!res.isValid) {
        setErrorMsg(res.error || 'Failed to verify package integrity.');
        setIsVerifying(false);
        return;
      }

      setPackageDetails({
        clientName: res.clientName || f.name.replace(/\.(json|tasc)$/i, ''),
        notes: res.notes || parsed.notes,
        generatedAt: res.generatedAt || parsed.generatedAt,
        expiresAt: res.expiresAt || parsed.expiresAt,
        clearPassword: res.clearPassword || parsed.clearPassword,
        preferredWorkstationMode: res.preferredWorkstationMode || parsed.preferredWorkstationMode || 'hmi',
        isSignedPackage: res.isSignedPackage,
        connectionsCount: res.packageData?.connections?.length || 0,
        dashboardsCount: res.packageData?.dashboards?.length || 0,
        panelsCount: res.packageData?.panels?.length || 0
      });
    } catch {
      setErrorMsg('Invalid file format. Unable to parse JSON or .tasc file.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5 text-amber-400 font-bold">
            <i className="fas fa-microscope text-lg"></i>
            <span className="text-sm text-white">Inspect Client Distribution Package (.tasc / .json)</span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <i className="fas fa-times text-base"></i>
          </button>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Select or drop a client distribution package file to review its metadata, license expiry date, HMAC signature status, and retrieved clear setup security password.
        </p>

        {/* File Selector */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-amber-500/80 bg-slate-950 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2 group"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto text-xl group-hover:scale-110 transition-transform">
            <i className="fas fa-file-import"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-200">
              {file ? file.name : 'Click to select .tasc or .json package file'}
            </p>
            <p className="text-[10px] text-slate-500">Supports .tasc and .json formats</p>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".tasc,.json" 
            className="hidden" 
          />
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center space-x-2 py-4 text-xs text-amber-400 font-semibold">
            <i className="fas fa-circle-notch animate-spin text-base"></i>
            <span>Verifying package cryptographic HMAC signature...</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3.5 rounded-xl text-xs space-y-1">
            <div className="flex items-center space-x-2 font-bold">
              <i className="fas fa-triangle-exclamation text-base"></i>
              <span>Verification Failed</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">{errorMsg}</p>
          </div>
        )}

        {packageDetails && (
          <div className="space-y-4 bg-slate-950 p-4 rounded-2xl border border-slate-800 animate-in fade-in zoom-in duration-150">
            {/* Signature Status Badge */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Signature Status</span>
              {packageDetails.isSignedPackage ? (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-mono font-extrabold px-3 py-1 rounded-full flex items-center space-x-1.5">
                  <i className="fas fa-check-circle"></i>
                  <span>Valid SHA-256 HMAC Signature</span>
                </span>
              ) : (
                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] uppercase font-mono font-extrabold px-3 py-1 rounded-full flex items-center space-x-1.5">
                  <i className="fas fa-info-circle"></i>
                  <span>Unsigned / Legacy Backup</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Client / Facility</span>
                <span className="font-semibold text-white">{packageDetails.clientName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Preferred View Mode</span>
                <span className="font-semibold text-sky-400 uppercase">{packageDetails.preferredWorkstationMode} Mode</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Generated At</span>
                <span className="font-mono text-slate-300 text-[11px]">
                  {packageDetails.generatedAt ? new Date(packageDetails.generatedAt).toLocaleString() : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">License Expiry</span>
                <span className={`font-mono text-[11px] font-bold ${packageDetails.expiresAt ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {packageDetails.expiresAt ? packageDetails.expiresAt : 'Lifetime (No Expiration)'}
                </span>
              </div>
            </div>

            {/* Clear Password Field Display */}
            <div className="bg-slate-900/90 p-3.5 rounded-xl border border-amber-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <i className="fas fa-key"></i>
                  <span>Clear Setup Security Password</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-bold text-slate-400 hover:text-white underline cursor-pointer"
                >
                  {showPassword ? 'Hide Password' : 'Reveal Password'}
                </button>
              </div>
              {packageDetails.clearPassword ? (
                <div className="flex items-center justify-between">
                  <code className="text-xs font-mono font-extrabold text-amber-300 tracking-wider">
                    {showPassword ? packageDetails.clearPassword : '••••••••••••'}
                  </code>
                  <button
                    onClick={() => {
                      if (packageDetails.clearPassword) {
                        navigator.clipboard.writeText(packageDetails.clearPassword);
                        alert('Clear password copied to clipboard!');
                      }
                    }}
                    className="text-[10px] bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 px-2.5 py-1 rounded-lg border border-amber-500/30 font-semibold cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No clear password configured for this package.</p>
              )}
            </div>

            {packageDetails.notes && (
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Deployment Notes</span>
                <p className="text-slate-300 text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                  {packageDetails.notes}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
              <span>Brokers: <strong className="text-white">{packageDetails.connectionsCount}</strong></span>
              <span>Dashboards: <strong className="text-white">{packageDetails.dashboardsCount}</strong></span>
              <span>HMI Panels: <strong className="text-white">{packageDetails.panelsCount}</strong></span>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase rounded-xl"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

export default InspectClientPackageModal;
