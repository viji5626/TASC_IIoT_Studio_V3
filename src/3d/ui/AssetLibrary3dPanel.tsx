import React, { useState, useMemo } from 'react';
import { ASSET_CATALOG_3D, AssetCatalogItem3D } from '../assets/AssetRegistry';

interface AssetLibrary3dPanelProps {
  onAddEquipment: (asset: AssetCatalogItem3D) => void;
}

export const AssetLibrary3dPanel: React.FC<AssetLibrary3dPanelProps> = ({
  onAddEquipment
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('all');

  // Distinct sectors list
  const sectors = useMemo(() => {
    const set = new Set<string>();
    ASSET_CATALOG_3D.forEach(a => set.add(a.sector));
    return ['all', ...Array.from(set)];
  }, []);

  const filteredAssets = useMemo(() => {
    return ASSET_CATALOG_3D.filter(asset => {
      const matchSector = selectedSector === 'all' || asset.sector === selectedSector;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        asset.name.toLowerCase().includes(q) ||
        asset.category.toLowerCase().includes(q) ||
        asset.tags.some(t => t.toLowerCase().includes(q));

      return matchSector && matchSearch;
    });
  }, [searchQuery, selectedSector]);

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
            {filteredAssets.length} / {ASSET_CATALOG_3D.length} Models
          </span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <i className="fas fa-search absolute left-2.5 top-2.5 text-slate-500 text-xs"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search pumps, valves, tanks, silos, exchangers..."
            className="w-full bg-slate-900 text-slate-200 pl-8 pr-3 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-sky-500 text-xs"
          />
        </div>

        {/* Sector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
          {sectors.map(sector => (
            <button
              key={sector}
              type="button"
              onClick={() => setSelectedSector(sector)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors ${
                selectedSector === sector
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {sector === 'all' ? 'All Sectors' : sector}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Cards Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar">
        {filteredAssets.map(asset => (
          <div
            key={asset.id}
            className="bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 p-2.5 rounded-xl transition-all flex flex-col gap-2 group hover:shadow-lg hover:shadow-sky-950/20"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-sky-950/80 border border-sky-800/60 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                  <i className={`fas ${asset.icon} text-sm`}></i>
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-200 text-xs truncate group-hover:text-sky-300 transition-colors">
                    {asset.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-mono truncate">
                      {asset.category}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {asset.defaultW}x{asset.defaultH}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Add Button */}
              <button
                type="button"
                onClick={() => onAddEquipment(asset)}
                className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shrink-0 transition-colors shadow-sm cursor-pointer"
                title="Add to 3D Scene"
              >
                <i className="fas fa-plus text-[10px]"></i>
                <span>Add</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
              {asset.description}
            </p>

            {/* Animatable Badges */}
            {asset.animatableParts && asset.animatableParts.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                {asset.animatableParts.map(part => (
                  <span
                    key={part}
                    className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono flex items-center gap-1"
                  >
                    <i className="fas fa-rotate text-[8px] text-amber-400"></i>
                    {part}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
