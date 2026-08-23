import React, { useState, useMemo, useEffect } from 'react';
import { ASSET_CATALOG_3D, AssetCatalogItem3D } from '../assets/AssetRegistry';
import { Ai3dAssetService, Ai3dAssetDefinition } from '../../services/Ai3dAssetService';

interface AssetLibrary3dPanelProps {
  onAddEquipment: (asset: AssetCatalogItem3D) => void;
}

export const AssetLibrary3dPanel: React.FC<AssetLibrary3dPanelProps> = ({
  onAddEquipment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');
  const [aiAssets, setAiAssets] = useState<Ai3dAssetDefinition[]>(() => Ai3dAssetService.loadAssets());

  // Listen for real-time AI asset creation and deletion
  useEffect(() => {
    const handleUpdate = () => {
      setAiAssets(Ai3dAssetService.loadAssets());
    };
    window.addEventListener('tasc_ai_3d_assets_updated', handleUpdate);
    return () => window.removeEventListener('tasc_ai_3d_assets_updated', handleUpdate);
  }, []);

  // Map AI Assets into standard 3D Catalog items
  const aiCatalogItems: AssetCatalogItem3D[] = useMemo(() => {
    return aiAssets.map(a => ({
      id: a.id,
      name: a.name,
      sector: 'AI Generated Assets',
      category: a.category,
      tags: a.tags || ['ai', 'custom'],
      assetType: 'parametric',
      description: a.description,
      defaultW: a.dimensions.width,
      defaultH: a.dimensions.height,
      defaultD: a.dimensions.depth,
      animatableParts: a.telemetryHooks.map(h => `${h.displayName} (${h.channelType})`),
      icon: a.icon || 'fa-cubes'
    }));
  }, [aiAssets]);

  // Combined asset catalog
  const allAssets = useMemo(() => {
    return [...aiCatalogItems, ...ASSET_CATALOG_3D];
  }, [aiCatalogItems]);

  // Distinct sectors list
  const sectors = useMemo(() => {
    const set = new Set<string>();
    ASSET_CATALOG_3D.forEach(a => set.add(a.sector));
    return ['all', '🤖 AI Assets', ...Array.from(set)];
  }, []);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      let matchSector = true;
      if (selectedSector === '🤖 AI Assets') {
        matchSector = asset.sector === 'AI Generated Assets';
      } else if (selectedSector !== 'all') {
        matchSector = asset.sector === selectedSector;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q) ||
        asset.tags.some(t => t.toLowerCase().includes(q));

      return matchSector && matchSearch;
    });
  }, [allAssets, searchQuery, selectedSector]);

  const handleDeleteAiAsset = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this AI-generated 3D equipment model from your library?')) {
      Ai3dAssetService.deleteAsset(id);
    }
  };

  return (
    <div 
      className="flex-1 flex flex-col min-h-0 bg-slate-900 text-xs select-none"
      onPointerDown={e => e.stopPropagation()}
    >
      {/* Header & Search */}
      <div className="p-3 bg-slate-950/90 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between font-bold text-slate-200">
          <div className="flex items-center gap-1.5">
            <i className="fas fa-cubes text-sky-400 text-xs"></i>
            <span>3D Equipment Library</span>
          </div>
          <span className="text-[10px] bg-slate-800 text-sky-400 px-2 py-0.5 rounded-full font-mono">
            {filteredAssets.length} / {allAssets.length} Models
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <i className="fas fa-search absolute left-2.5 top-2.5 text-slate-500 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pumps, extruders, bioreactors, tanks..."
            className="w-full bg-slate-900 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs"
          />
        </div>

        {/* Sector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {sectors.map(sector => {
            const isAiTab = sector === '🤖 AI Assets';
            const count = isAiTab ? aiAssets.length : undefined;
            return (
              <button
                key={sector}
                type="button"
                onClick={() => setSelectedSector(sector)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedSector === sector
                    ? isAiTab 
                      ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-md shadow-purple-950/50' 
                      : 'bg-sky-600 text-white shadow-sm'
                    : isAiTab
                      ? 'bg-purple-950/50 border border-purple-800/60 text-purple-300 hover:bg-purple-900/60'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{sector === 'all' ? 'All Sectors' : sector}</span>
                {count !== undefined && (
                  <span className="bg-purple-500/30 text-purple-200 px-1.5 py-0.2 rounded-full text-[9px] font-mono">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <i className="fas fa-box-open text-2xl mb-2 block opacity-40"></i>
            <p>No 3D equipment found.</p>
            {selectedSector === '🤖 AI Assets' && (
              <p className="text-[11px] text-purple-400 mt-1">
                Ask the AI Copilot to generate any custom 3D asset!
              </p>
            )}
          </div>
        ) : (
          filteredAssets.map(asset => {
            const isAi = asset.sector === 'AI Generated Assets';
            return (
              <div
                key={asset.id}
                className={`border p-2.5 rounded-xl transition-all flex flex-col gap-2 group hover:shadow-lg ${
                  isAi
                    ? 'bg-slate-950/90 border-purple-500/40 hover:border-purple-400 hover:shadow-purple-950/20'
                    : 'bg-slate-950/70 border-slate-800 hover:border-sky-500/50 hover:shadow-sky-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-inner ${
                      isAi
                        ? 'bg-purple-950/80 border-purple-700/60 text-purple-400'
                        : 'bg-sky-950/80 border-sky-800/60 text-sky-400'
                    }`}>
                      <i className={`fas ${asset.icon} text-sm`}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isAi && (
                          <span className="text-[8px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.2 rounded border border-purple-500/30 uppercase tracking-wider">
                            AI Generated
                          </span>
                        )}
                        <h4 className="font-bold text-slate-200 text-xs truncate group-hover:text-sky-300 transition-colors">
                          {asset.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono truncate">
                          {asset.category}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {asset.defaultW}x{asset.defaultH}x{asset.defaultD}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {isAi && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteAiAsset(e, asset.id)}
                        className="p-1.5 hover:bg-red-950/60 text-slate-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Delete AI Asset"
                      >
                        <i className="fas fa-trash text-[10px]"></i>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddEquipment(asset)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 transition-all shadow-sm cursor-pointer ${
                        isAi
                          ? 'bg-gradient-to-r from-purple-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white shadow-purple-950/40'
                          : 'bg-sky-600 hover:bg-sky-500 text-white'
                      }`}
                      title="Add to 3D Scene"
                    >
                      <i className="fas fa-plus text-[10px]"></i>
                      <span>Add</span>
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                  {asset.description}
                </p>

                {/* Animatable Badges / Telemetry Hooks */}
                {asset.animatableParts && asset.animatableParts.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    {asset.animatableParts.map(part => (
                      <span
                        key={part}
                        className={`text-[9px] border px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                          isAi
                            ? 'bg-purple-950/40 border-purple-800/40 text-purple-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <i className={`fas fa-bolt text-[8px] ${isAi ? 'text-purple-400' : 'text-amber-400'}`}></i>
                        {part}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

