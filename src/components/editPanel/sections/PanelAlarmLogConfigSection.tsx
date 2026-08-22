import React from 'react';

interface PanelAlarmLogConfigSectionProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export const PanelAlarmLogConfigSection: React.FC<PanelAlarmLogConfigSectionProps> = ({
  formData,
  setFormData,
  handleChange
}) => {
  return (
    <div className="space-y-4 pt-3 border-t border-[#262626] bg-[#121824] p-4 rounded-xl border border-indigo-500/30">
      <div className="flex items-center justify-between">
        <label className="text-xs text-indigo-400 font-bold uppercase tracking-wider flex items-center space-x-2">
          <i className="fas fa-history text-xs text-indigo-400"></i>
          <span>Alarm Historian Element Configuration</span>
        </label>
        <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded font-mono border border-indigo-500/20">
          Live & Historian Log
        </span>
      </div>
      <p className="text-[11px] text-slate-300 leading-relaxed">
        Configure default display view mode, window scroll behavior, and optimized paging system for this Alarm Historian element.
      </p>

      {/* Display Mode Selector */}
      <div>
        <label className="text-xs text-slate-200 font-bold block mb-1">
          Default Display View Mode (Live vs Historian)
        </label>
        <select
          name="alarmViewMode"
          value={formData.alarmViewMode || 'live'}
          onChange={handleChange}
          className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-bold focus:border-indigo-400 focus:outline-none"
        >
          <option value="live">🔴 Live Active Monitor (Active Unack & Active Ack Only)</option>
          <option value="historian">📜 Full Historical Alarm Log (All Active & Resolved Events)</option>
        </select>
        <span className="text-[10px] text-slate-400 block mt-1">
          Operators can also toggle between Live and Historian modes dynamically on the element view.
        </span>
      </div>

      {/* Page Size & Max Display Rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div>
          <label className="text-xs text-slate-200 font-bold block mb-1">
            Rows Per Page (Paging System)
          </label>
          <select
            name="pageSize"
            value={formData.pageSize ?? 5}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, pageSize: Number(e.target.value) }))}
            className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-indigo-400 focus:outline-none"
          >
            <option value={3}>3 rows per page</option>
            <option value={5}>5 rows per page (Default)</option>
            <option value={10}>10 rows per page</option>
            <option value={15}>15 rows per page</option>
            <option value={25}>25 rows per page</option>
          </select>
          <span className="text-[10px] text-slate-400 block mt-1">
            Paging optimizes rendering performance for fast, responsive UI scrolling.
          </span>
        </div>

        <div>
          <label className="text-xs text-slate-200 font-bold block mb-1">
            Maximum Total Display Limit
          </label>
          <select
            name="maxDisplayRows"
            value={formData.maxDisplayRows ?? 100}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, maxDisplayRows: Number(e.target.value) }))}
            className="w-full bg-slate-900 text-white rounded-lg p-2.5 text-xs border border-slate-700 font-mono focus:border-indigo-400 focus:outline-none"
          >
            <option value={25}>Latest 25 Events</option>
            <option value={50}>Latest 50 Events</option>
            <option value={100}>Latest 100 Events (Default)</option>
            <option value={250}>Latest 250 Events</option>
            <option value={500}>Latest 500 Events</option>
          </select>
          <span className="text-[10px] text-slate-400 block mt-1">
            Maximum total historical entries fetched for this element.
          </span>
        </div>
      </div>
    </div>
  );
};
