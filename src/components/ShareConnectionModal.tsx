import React, { useState } from 'react';
import { MqttConnection, Dashboard, Panel } from '../types';

interface ShareConnectionModalProps {
  connection: MqttConnection;
  dashboards: Dashboard[];
  panels: Panel[];
  onClose: () => void;
}

const ShareConnectionModal: React.FC<ShareConnectionModalProps> = ({
  connection,
  dashboards,
  panels,
  onClose
}) => {
  const [copied, setCopied] = useState(false);

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    connection,
    dashboards,
    panels
  };

  const jsonString = JSON.stringify(exportData, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${connection.connectionName.toLowerCase().replace(/\s+/g, '_')}_config.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 w-full max-w-xl rounded-3xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <header className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center text-base">
              <i className="fas fa-share-nodes"></i>
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Share Connection Configuration</h1>
              <p className="text-xs text-slate-400">{connection.connectionName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <i className="fas fa-times text-base"></i>
          </button>
        </header>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>JSON Payload ({dashboards.length} dashboards, {panels.length} panels)</span>
            <span className="font-mono text-sky-400">{connection.brokerAddress}:{connection.port}</span>
          </div>

          <div className="relative">
            <pre className="w-full max-h-72 overflow-y-auto bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-sky-300 font-mono leading-relaxed select-all">
              {jsonString}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="p-4 px-6 border-t border-slate-800 bg-slate-950/80 flex justify-between items-center space-x-3">
          <button 
            onClick={handleDownload}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center space-x-2 transition-colors"
          >
            <i className="fas fa-download text-sky-400"></i>
            <span>Download JSON</span>
          </button>

          <div className="flex items-center space-x-2">
            <button 
              onClick={handleCopy}
              className={`px-4 py-2.5 font-bold text-xs rounded-xl flex items-center space-x-2 transition-all shadow-md ${
                copied 
                  ? 'bg-emerald-500 text-slate-950' 
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20'
              }`}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              <span>{copied ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ShareConnectionModal;
