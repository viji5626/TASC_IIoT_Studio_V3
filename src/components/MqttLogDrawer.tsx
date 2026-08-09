import React, { useState } from 'react';
import { MqttMessageLog } from '../types';

interface MqttLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: MqttMessageLog[];
  onClear: () => void;
  onPublishTest?: (topic: string, message: string) => void;
}

const MqttLogDrawer: React.FC<MqttLogDrawerProps> = ({ 
  isOpen, 
  onClose, 
  logs, 
  onClear,
  onPublishTest
}) => {
  const [filter, setFilter] = useState('');
  const [pubTopic, setPubTopic] = useState('');
  const [pubMessage, setPubMessage] = useState('');

  if (!isOpen) return null;

  const filteredLogs = filter 
    ? logs.filter(l => l.topic.toLowerCase().includes(filter.toLowerCase()) || l.payload.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-slate-950/95 border-l border-slate-800 z-[250] flex flex-col shadow-2xl backdrop-blur-md animate-in slide-in-from-right duration-200">
      <header className="h-14 px-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <i className="fas fa-terminal text-sky-400"></i>
          <h2 className="text-sm font-bold text-white">Live MQTT Console & Stream</h2>
          <span className="bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-bold">
            {logs.length} messages
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={onClear} 
            className="p-1.5 text-slate-400 hover:text-white text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
            title="Clear logs"
          >
            Clear
          </button>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>
      </header>

      {/* Publish Test Toolbar */}
      <div className="p-4 bg-slate-900/50 border-b border-slate-800 space-y-2.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Publish Test</span>
        <div className="grid grid-cols-12 gap-2">
          <input 
            type="text"
            placeholder="Topic (e.g. sensor/temp)"
            value={pubTopic}
            onChange={(e) => setPubTopic(e.target.value)}
            className="col-span-5 bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg outline-none font-mono focus:border-sky-500"
          />
          <input 
            type="text"
            placeholder="Payload"
            value={pubMessage}
            onChange={(e) => setPubMessage(e.target.value)}
            className="col-span-5 bg-slate-950 border border-slate-800 text-xs text-white px-3 py-2 rounded-lg outline-none font-mono focus:border-sky-500"
          />
          <button 
            onClick={() => {
              if (pubTopic && onPublishTest) {
                onPublishTest(pubTopic, pubMessage);
                setPubMessage('');
              }
            }}
            className="col-span-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg py-2 transition-colors"
          >
            Send
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="p-3 bg-slate-950 border-b border-slate-800">
        <input 
          type="text"
          placeholder="Filter by topic or payload..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full bg-slate-900/80 border border-slate-800 text-xs text-white px-3.5 py-2 rounded-lg outline-none font-mono placeholder:text-slate-600 focus:border-sky-500"
        />
      </div>

      {/* Log list */}
      <div className="flex-grow overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
            <i className="fas fa-rss text-2xl opacity-30"></i>
            <span>No MQTT packet traffic recorded yet</span>
          </div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-sky-400 font-bold truncate">{log.topic}</span>
                <span className="text-[10px] text-slate-500">{log.timestamp}</span>
              </div>
              <div className="text-slate-200 bg-slate-950/80 p-2 rounded-lg break-all whitespace-pre-wrap text-[11px] border border-slate-800/50">
                {log.payload}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MqttLogDrawer;
