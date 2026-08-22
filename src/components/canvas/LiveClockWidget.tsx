import React, { useState, useEffect } from 'react';
import { Panel } from '../../types';

interface LiveClockWidgetProps {
  panel: Panel;
}

export const LiveClockWidget: React.FC<LiveClockWidgetProps> = ({ panel }) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      if (panel.clockFormat === '12h') {
        setTimeStr(now.toLocaleTimeString('en-US', { hour12: true }));
        setDateStr(now.toLocaleDateString());
      } else if (panel.clockFormat === '24h') {
        setTimeStr(now.toLocaleTimeString('en-US', { hour12: false }));
        setDateStr('');
      } else if (panel.clockFormat === 'time_only') {
        setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        setDateStr('');
      } else {
        // default full
        setTimeStr(now.toLocaleTimeString());
        setDateStr(now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }));
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [panel.clockFormat]);

  const textColor = panel.textColor || '#38bdf8';
  const bgColor = panel.bgColor || '#0f172a';
  const borderColor = panel.borderColor || '#0ea5e9';

  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center p-2 rounded-xl transition-all select-none overflow-hidden"
      style={{
        backgroundColor: bgColor,
        borderColor: borderColor,
        borderWidth: panel.borderWidth ?? 1,
        borderStyle: 'solid',
        opacity: panel.opacity ?? 1
      }}
    >
      <div className="flex items-center space-x-2">
        <i className="fas fa-clock text-xs opacity-70" style={{ color: textColor }}></i>
        <span
          className="font-mono font-bold tracking-wider text-center"
          style={{
            color: textColor,
            fontSize: `${panel.fontSize || 18}px`
          }}
        >
          {timeStr}
        </span>
      </div>
      {dateStr && (
        <span
          className="text-[11px] font-sans opacity-75 text-center mt-0.5"
          style={{ color: textColor }}
        >
          {dateStr}
        </span>
      )}
    </div>
  );
};
