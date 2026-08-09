import React, { useState } from 'react';
import { Panel, Dashboard } from '../types';

interface ClonePanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboards: Dashboard[];
  panels: Panel[];
  onClone: (selectedPanelIds: string[]) => void;
}

const ClonePanelModal: React.FC<ClonePanelModalProps> = ({ isOpen, onClose, dashboards, panels, onClone }) => {
  const [expandedDash, setExpandedDash] = useState<string | null>(dashboards[0]?.dashboardId || null);
  const [selected, setSelected] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="absolute inset-0 bg-black/80" onClick={onClose}></div>
      <div className="relative bg-[#121212] w-full max-w-md h-full sm:h-auto sm:max-h-[80vh] flex flex-col sm:rounded-xl overflow-hidden shadow-2xl border border-[#2a2a2a]">
        <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between bg-[#181818]">
          <div className="flex items-center space-x-2">
            <i className="fas fa-[#3b82f6] fa-clone text-amber-500"></i>
            <h2 className="text-base font-bold text-white">Clone Panels</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white"><i className="fas fa-times"></i></button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {dashboards.map(dash => {
            const dashPanels = panels.filter(p => p.dashboardId === dash.dashboardId);
            return (
              <div key={dash.dashboardId} className="border border-[#2a2a2a] rounded-lg overflow-hidden bg-[#181818]">
                <button 
                  onClick={() => setExpandedDash(expandedDash === dash.dashboardId ? null : dash.dashboardId)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center space-x-2.5">
                    <i className={`fas ${dash.icon || 'fa-table-cells-large'} text-amber-500`}></i>
                    <span className="font-semibold text-sm text-gray-200">{dash.dashboardName}</span>
                    <span className="text-xs text-gray-500">({dashPanels.length} panels)</span>
                  </div>
                  <i className={`fas fa-chevron-${expandedDash === dash.dashboardId ? 'up' : 'down'} text-gray-500 text-xs`}></i>
                </button>
                
                {expandedDash === dash.dashboardId && (
                  <div className="p-2 space-y-1 bg-black/30 border-t border-[#222]">
                    {dashPanels.length === 0 ? (
                      <div className="p-2 text-xs text-gray-500 text-center">No panels in this dashboard</div>
                    ) : (
                      dashPanels.map(panel => (
                        <div 
                          key={panel.panelId}
                          onClick={() => toggleSelect(panel.panelId)}
                          className="flex items-center justify-between p-2.5 rounded hover:bg-white/5 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center space-x-3">
                            <i className="fas fa-[#3b82f6] fa-microchip text-gray-500 text-xs"></i>
                            <span className="text-xs font-medium text-gray-300">{panel.panelName || 'Unnamed Panel'}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${selected.includes(panel.panelId) ? 'bg-amber-500 border-amber-500' : 'border-gray-600'}`}>
                            {selected.includes(panel.panelId) && <i className="fas fa-check text-[10px] text-black font-bold"></i>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-[#181818] border-t border-[#2a2a2a]">
          <button 
            disabled={selected.length === 0}
            onClick={() => onClone(selected)}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg uppercase tracking-wider text-xs disabled:opacity-50 shadow-lg transition-all"
          >
            Clone Selected ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClonePanelModal;
