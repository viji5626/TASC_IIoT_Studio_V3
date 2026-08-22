import React, { useState, useRef } from 'react';
import { GsdDeviceProfile, GsdModule } from '../types/gsd';
import { DriverConnection, DriverTag } from '../types/driver';
import { gsdCatalogService } from '../drivers/gsd/gsdCatalogService';

interface GsdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections: DriverConnection[];
  onGenerateTags: (tags: Partial<DriverTag>[]) => void;
}

export const GsdManagerModal: React.FC<GsdManagerModalProps> = ({
  isOpen,
  onClose,
  connections,
  onGenerateTags
}) => {
  const [profiles, setProfiles] = useState<GsdDeviceProfile[]>(() => gsdCatalogService.getAllProfiles());
  const [selectedProfile, setSelectedProfile] = useState<GsdDeviceProfile | null>(() => profiles[0] || null);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'profinet' | 'profibus'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedTagsCount, setSelectedTagsCount] = useState<number>(0);
  const [generatedSuccess, setGeneratedSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const filteredProfiles = profiles.filter(p => {
    if (activeTab === 'profinet' && p.standard !== 'profinet_gsdml') return false;
    if (activeTab === 'profibus' && p.standard !== 'profibus_dp') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.vendorName.toLowerCase().includes(q) ||
        p.modelName.toLowerCase().includes(q) ||
        p.fileName.toLowerCase().includes(q) ||
        (p.orderNumber && p.orderNumber.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const text = await file.text();
      const newProfile = gsdCatalogService.parseAndRegisterGsdText(text, file.name);
      setProfiles(gsdCatalogService.getAllProfiles());
      setSelectedProfile(newProfile);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to parse GSD/GSDML file');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerateTags = () => {
    if (!selectedProfile) return;
    const targetConn = connections.find(c => c.connectionId === selectedConnectionId) || connections[0];
    const generated = gsdCatalogService.generateTagsForProfile(selectedProfile, targetConn?.connectionId);
    onGenerateTags(generated);
    setSelectedTagsCount(generated.length);
    setGeneratedSuccess(true);
    setTimeout(() => setGeneratedSuccess(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-5xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <i className="fa-solid fa-microchip text-base" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
                <span>GSD & GSDML Industrial Device Catalog</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono font-normal">
                  PROFINET / PROFIBUS PNO Standard
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Import standard device description files (.xml, .gsd) and generate subslot-mapped cyclic tags with bitmasking
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <i className={`fa-solid ${isUploading ? 'fa-spinner fa-spin' : 'fa-file-arrow-up'}`} />
              <span>{isUploading ? 'Parsing XML/GSD...' : 'Import GSD/GSDML File'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml,.gsd,.gsdml,.GSD,.XML"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <i className="fa-solid fa-xmark text-sm" />
            </button>
          </div>
        </div>

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="px-4 py-2 bg-rose-500/15 border-b border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <i className="fa-solid fa-triangle-exclamation" />
              <span>{uploadError}</span>
            </div>
            <button type="button" onClick={() => setUploadError(null)} className="text-rose-400 hover:text-rose-200">
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        )}

        {/* Main Body (Split View) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Catalog List & Filter */}
          <div className="w-1/3 border-r border-slate-800 flex flex-col bg-slate-950/50">
            {/* Filter Tabs */}
            <div className="p-3 border-b border-slate-800 space-y-2">
              <div className="flex rounded-lg bg-slate-900 p-1 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 py-1 text-xs rounded font-medium transition-all ${activeTab === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  All ({profiles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profinet')}
                  className={`flex-1 py-1 text-xs rounded font-medium transition-all ${activeTab === 'profinet' ? 'bg-emerald-600/30 text-emerald-300 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  PROFINET
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('profibus')}
                  className={`flex-1 py-1 text-xs rounded font-medium transition-all ${activeTab === 'profibus' ? 'bg-purple-600/30 text-purple-300 shadow' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  PROFIBUS
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-2.5 text-slate-500 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by vendor, model, order #..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>

            {/* Profile List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {filteredProfiles.map(p => {
                const isSelected = selectedProfile?.profileId === p.profileId;
                const isPn = p.standard === 'profinet_gsdml';
                return (
                  <div
                    key={p.profileId}
                    onClick={() => setSelectedProfile(p)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all ${isSelected ? (isPn ? 'bg-emerald-500/15 border border-emerald-500/40' : 'bg-purple-500/15 border border-purple-500/40') : 'hover:bg-slate-900 border border-transparent'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-slate-200 truncate">{p.modelName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium ${isPn ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'}`}>
                        {isPn ? 'GSDML' : 'GSD'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{p.vendorName}</div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                      <span>{p.orderNumber || p.deviceIdHex || p.identNumberHex}</span>
                      <span>{p.modules.length} modules</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Selected Profile Explorer & Tag Generation */}
          {selectedProfile ? (
            <div className="flex-1 flex flex-col bg-slate-900/40 overflow-hidden">
              {/* Profile Details Header */}
              <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center space-x-2">
                      <span>{selectedProfile.modelName}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                        {selectedProfile.vendorName}
                      </span>
                    </h3>
                    <div className="text-xs text-slate-400 mt-0.5 font-mono">
                      File: {selectedProfile.fileName} | Version: {selectedProfile.schemaVersion || '1.0'}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <select
                      value={selectedConnectionId}
                      onChange={e => setSelectedConnectionId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="">-- Apply to Connection --</option>
                      {connections.map(c => (
                        <option key={c.connectionId} value={c.connectionId}>
                          {c.connectionName} ({c.protocol})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleGenerateTags}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-emerald-950 transition-all"
                    >
                      <i className="fa-solid fa-wand-magic-sparkles" />
                      <span>Generate Tags ({selectedProfile.modules.reduce((acc, m) => acc + (m.dataItems?.length || 1), 0)})</span>
                    </button>
                  </div>
                </div>

                {/* Process Image Metrics */}
                <div className="grid grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Input Bytes</div>
                    <div className="text-sm font-semibold font-mono text-emerald-400">{selectedProfile.totalInputBytes} Bytes</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Total Output Bytes</div>
                    <div className="text-sm font-semibold font-mono text-cyan-400">{selectedProfile.totalOutputBytes} Bytes</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Vendor / Device ID</div>
                    <div className="text-sm font-semibold font-mono text-slate-300">
                      {selectedProfile.vendorIdHex} / {selectedProfile.deviceIdHex || selectedProfile.identNumberHex}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-slate-400">Configured Modules</div>
                    <div className="text-sm font-semibold font-mono text-purple-400">{selectedProfile.modules.length} Slots</div>
                  </div>
                </div>

                {generatedSuccess && (
                  <div className="p-2 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in">
                    <i className="fa-solid fa-circle-check text-emerald-400" />
                    <span>Successfully generated and registered <strong>{selectedTagsCount}</strong> industrial driver tags!</span>
                  </div>
                )}
              </div>

                {/* Modules & Submodules Explorer Table */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Slot & Submodule Process Layout</span>
                  <span className="text-[11px] text-slate-500">Big-Endian Process Image Offsets</span>
                </div>

                <div className="space-y-2">
                  {selectedProfile.modules.map((mod: GsdModule, mIdx: number) => {
                    const allItems = mod.submodules.flatMap(s => s.dataItems);
                    return (
                      <div key={mIdx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                          <div className="flex items-center space-x-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                              Slot {mod.slot ?? mIdx + 1}
                            </span>
                            <span className="font-semibold text-xs text-slate-200">{mod.moduleName}</span>
                            {mod.orderNumber && (
                              <span className="text-[10px] text-slate-500 font-mono">({mod.orderNumber})</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-[11px] font-mono">
                            {mod.inputLengthBytes ? <span className="text-emerald-400">{mod.inputLengthBytes}B In</span> : null}
                            {mod.outputLengthBytes ? <span className="text-cyan-400">{mod.outputLengthBytes}B Out</span> : null}
                          </div>
                        </div>

                        {/* Data Items within module submodules */}
                        {allItems.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pt-1">
                            {allItems.map((item, dIdx) => (
                              <div
                                key={dIdx}
                                className="p-1.5 rounded bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-[11px]"
                              >
                                <div className="space-y-0.5">
                                  <div className="text-slate-300 font-medium">{item.name}</div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Offset: +{item.byteOffset}B {item.bitOffset !== undefined ? `(Bit ${item.bitOffset})` : ''}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="px-1 py-0.5 rounded bg-slate-800 text-[9px] font-mono text-slate-400 uppercase">
                                    {item.dataType}
                                  </span>
                                  <span className={`text-[9px] px-1 py-0.5 rounded uppercase font-semibold ${item.direction === 'input' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-cyan-500/20 text-cyan-300'}`}>
                                    {item.direction}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 italic">No individual sub-signals mapped. Tag will cover full slot buffer.</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a device profile from the catalog to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
