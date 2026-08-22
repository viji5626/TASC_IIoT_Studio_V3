/**
 * TASC IIoT Studio — ODVA Electronic Data Sheet (EDS) Profile Manager & Tag Generator
 *
 * Provides a UI for:
 * - Uploading / Drag-and-dropping .eds files
 * - Exploring Device Classification, Assemblies, and Parameters
 * - 1-Click conversion of EDS Assemblies & Parameters into SCADA Driver Tags
 */

import React, { useState, useRef } from 'react';
import { EdsCatalogService } from '../drivers/ethernet_ip/edsCatalogService';
import { EdsDeviceProfile, EdsParam, EdsAssembly } from '../drivers/ethernet_ip/edsParser';
import { DriverTag, DriverConnection } from '../types';

interface EdsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  connections?: DriverConnection[];
  onGenerateTags?: (tags: DriverTag[]) => void;
}

export const EdsManagerModal: React.FC<EdsManagerModalProps> = ({
  isOpen,
  onClose,
  connections = [],
  onGenerateTags
}) => {
  const catalog = EdsCatalogService.getInstance();
  const [profiles, setProfiles] = useState<EdsDeviceProfile[]>(catalog.getAllProfiles());
  const [selectedProfileId, setSelectedProfileId] = useState<string>(profiles[0]?.profileId || '');
  const [activeTab, setActiveTab] = useState<'assemblies' | 'parameters' | 'raw'>('assemblies');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConnId, setSelectedConnId] = useState<string>(
    connections.find(c => c.protocol === 'ethernet_ip')?.connectionId || connections[0]?.connectionId || ''
  );
  const [includeParams, setIncludeParams] = useState(true);
  const [includeAssemblies, setIncludeAssemblies] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const selectedProfile = profiles.find(p => p.profileId === selectedProfileId) || profiles[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const newProfile = catalog.importEdsFile(text, file.name);
        setProfiles(catalog.getAllProfiles());
        setSelectedProfileId(newProfile.profileId);
        showToast(`✓ Successfully imported ${newProfile.productName} (${newProfile.parameters.length} params, ${newProfile.assemblies.length} assemblies)`);
      } catch (err: any) {
        showToast(`✗ Failed to parse EDS file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm('Are you sure you want to remove this EDS device profile?')) {
      catalog.deleteProfile(profileId);
      const updated = catalog.getAllProfiles();
      setProfiles(updated);
      if (selectedProfileId === profileId) {
        setSelectedProfileId(updated[0]?.profileId || '');
      }
      showToast('Profile deleted from catalog');
    }
  };

  const handleGenerateTags = () => {
    if (!selectedProfile || !selectedConnId) {
      alert('Please select a target driver connection to bind these tags to.');
      return;
    }
    const tags = catalog.generateDriverTags(selectedProfile.profileId, selectedConnId, {
      includeParams,
      includeAssemblies
    });
    if (tags.length === 0) {
      alert('No tags were generated from this profile. Please check options.');
      return;
    }
    if (onGenerateTags) {
      onGenerateTags(tags);
      showToast(`✓ Generated ${tags.length} driver tags from ${selectedProfile.productName}!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const filteredParams = (selectedProfile?.parameters || []).filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.id.toString().includes(searchQuery) ||
    (p.helpString || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssemblies = (selectedProfile?.assemblies || []).filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.instanceId.toString().includes(searchQuery)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-850">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <i className="fas fa-file-invoice text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <span>ODVA Electronic Data Sheet (EDS) Catalog</span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                  CIP Device Profiles
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Import vendor EDS files to auto-generate typed CIP Driver Tags & assembly registers
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".eds,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <i className="fas fa-cloud-arrow-up"></i>
              <span>Upload .EDS</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center text-sm transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className="px-6 py-2 bg-amber-950/80 border-b border-amber-500/40 text-amber-200 text-xs flex items-center space-x-2 animate-fadeIn">
            <i className="fas fa-info-circle text-amber-400"></i>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Body Layout: 2 Columns */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Device Profiles List */}
          <div className="w-72 border-r border-slate-800 bg-slate-900/90 flex flex-col">
            <div className="p-3 border-b border-slate-800">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Device Profiles ({profiles.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {profiles.map(p => {
                const isSelected = p.profileId === selectedProfileId;
                const isBuiltin = p.profileId.startsWith('builtin_');
                return (
                  <div
                    key={p.profileId}
                    onClick={() => setSelectedProfileId(p.profileId)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                        : 'bg-slate-850/60 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold text-xs truncate pr-1">{p.productName}</div>
                      {!isBuiltin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProfile(p.profileId);
                          }}
                          className="text-slate-500 hover:text-rose-400 text-[10px] p-0.5"
                          title="Delete profile"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{p.vendorName}</div>
                    <div className="flex items-center space-x-2 mt-1 text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.2 bg-slate-800 rounded font-mono text-amber-300">
                        {p.assemblies?.length || 0} Assem
                      </span>
                      <span className="px-1.5 py-0.2 bg-slate-800 rounded font-mono text-cyan-300">
                        {p.parameters?.length || 0} Params
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Profile Inspector & Tag Generator */}
          {selectedProfile ? (
            <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
              {/* Profile Details Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-850/50">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <span>{selectedProfile.productName}</span>
                      {selectedProfile.catalogNumber && (
                        <span className="text-[11px] font-mono text-slate-400">[{selectedProfile.catalogNumber}]</span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                      <span>Vendor: <strong className="text-slate-300">{selectedProfile.vendorName} (ID {selectedProfile.vendorId})</strong></span>
                      <span>Type: <strong className="text-slate-300">{selectedProfile.deviceTypeName}</strong></span>
                      <span>Revision: <strong className="text-slate-300">v{selectedProfile.majorRevision}.{selectedProfile.minorRevision}</strong></span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setActiveTab('assemblies')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                        activeTab === 'assemblies' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Assemblies ({selectedProfile.assemblies?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('parameters')}
                      className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                        activeTab === 'parameters' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Parameters ({selectedProfile.parameters?.length || 0})
                    </button>
                  </div>
                </div>

                {/* Filter Search */}
                <div className="mt-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search assembly members or parameters..."
                    className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'assemblies' && (
                  <div className="space-y-4">
                    {filteredAssemblies.map(a => (
                      <div key={a.id} className="bg-slate-850 border border-slate-700/70 rounded-xl overflow-hidden">
                        <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                              a.type === 'input' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              a.type === 'output' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                              'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                            }`}>
                              {a.type}
                            </span>
                            <span className="text-xs font-bold text-white">{a.name}</span>
                            <span className="text-[11px] font-mono text-slate-400">(Instance {a.instanceId}, {a.sizeBytes} Bytes)</span>
                          </div>
                        </div>
                        <div className="p-2 overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-400 border-b border-slate-700/60 text-[11px]">
                                <th className="pb-1.5 pl-2">Byte.Bit</th>
                                <th className="pb-1.5">Member Name</th>
                                <th className="pb-1.5">Data Type</th>
                                <th className="pb-1.5">Bit Length</th>
                                <th className="pb-1.5">Bitmask</th>
                                <th className="pb-1.5">Description</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                              {a.members.map((m, idx) => (
                                <tr key={idx} className="hover:bg-slate-800/40">
                                  <td className="py-1 pl-2 text-amber-300">Byte {m.byteOffset}.{m.bitOffset}</td>
                                  <td className="py-1 font-sans text-white font-medium">{m.paramName}</td>
                                  <td className="py-1 text-cyan-300">{m.dataType}</td>
                                  <td className="py-1 text-slate-300">{m.bitLength} bit(s)</td>
                                  <td className="py-1 text-slate-400">0x{m.bitMask.toString(16).toUpperCase()}</td>
                                  <td className="py-1 font-sans text-slate-400 truncate max-w-xs">{m.description}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {filteredAssemblies.length === 0 && (
                      <div className="p-8 text-center text-slate-500 text-xs">No assemblies match the search query.</div>
                    )}
                  </div>
                )}

                {activeTab === 'parameters' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-slate-700/70 rounded-xl overflow-hidden">
                      <thead className="bg-slate-800 text-slate-400 text-[11px]">
                        <tr>
                          <th className="py-2 px-3">ID</th>
                          <th className="py-2 px-3">Parameter Name</th>
                          <th className="py-2 px-3">Data Type</th>
                          <th className="py-2 px-3">Default</th>
                          <th className="py-2 px-3">Min / Max</th>
                          <th className="py-2 px-3">Units</th>
                          <th className="py-2 px-3">Help / Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-[11px] bg-slate-850">
                        {filteredParams.map(p => (
                          <tr key={p.id} className="hover:bg-slate-800/50">
                            <td className="py-1.5 px-3 font-mono text-amber-300">{p.id}</td>
                            <td className="py-1.5 px-3 text-white font-medium">{p.name}</td>
                            <td className="py-1.5 px-3 font-mono text-cyan-300">{p.dataType}</td>
                            <td className="py-1.5 px-3 font-mono text-slate-300">{String(p.defaultValue)}</td>
                            <td className="py-1.5 px-3 font-mono text-slate-400">{p.min ?? '-'} / {p.max ?? '-'}</td>
                            <td className="py-1.5 px-3 text-slate-300">{p.units || '-'}</td>
                            <td className="py-1.5 px-3 text-slate-400 truncate max-w-xs">{p.helpString || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Tag Generator Footer Action Bar */}
              <div className="p-4 border-t border-slate-800 bg-slate-850 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-400 mb-0.5">Target Driver Connection:</label>
                    <select
                      value={selectedConnId}
                      onChange={e => setSelectedConnId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                    >
                      {connections.map(c => (
                        <option key={c.connectionId} value={c.connectionId}>
                          {c.connectionName} ({c.protocol.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-3 pt-3">
                    <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeAssemblies}
                        onChange={e => setIncludeAssemblies(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span>Assembly Member Tags</span>
                    </label>
                    <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeParams}
                        onChange={e => setIncludeParams(e.target.checked)}
                        className="rounded border-slate-700 text-amber-500 focus:ring-0"
                      />
                      <span>Parameter Tags</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateTags}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-lg shadow-amber-900/30 transition-all"
                >
                  <i className="fas fa-wand-magic-sparkles"></i>
                  <span>1-Click Generate Driver Tags</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              No EDS Profile selected. Upload an .eds file to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
