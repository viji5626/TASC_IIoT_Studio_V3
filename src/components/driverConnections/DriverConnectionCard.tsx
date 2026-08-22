import React from 'react';
import { DriverConnection } from '../../types';
import { PROTOCOL_LABELS, PROTOCOL_ICONS } from './constants';

interface DriverConnectionCardProps {
  conn: DriverConnection;
  deleteConfirmId: string | null;
  onEdit: (conn: DriverConnection) => void;
  onDeleteConfirm: (connectionId: string) => void;
  onDeleteCancel: () => void;
  onDelete: (connectionId: string) => void;
}

export const DriverConnectionCard: React.FC<DriverConnectionCardProps> = ({
  conn,
  deleteConfirmId,
  onEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete
}) => {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center justify-between hover:border-slate-600 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
          <i className={`fas ${PROTOCOL_ICONS[conn.protocol] || 'fa-plug'} text-violet-400 text-base`}></i>
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-white font-semibold text-sm">{conn.connectionName}</span>
            <span className="text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full">
              {PROTOCOL_LABELS[conn.protocol] || conn.protocol}
            </span>
            {!conn.enabled && (
              <span className="text-[10px] font-bold bg-slate-700 text-slate-400 border border-slate-600 px-2 py-0.5 rounded-full">Disabled</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            {conn.host && `${conn.host}:${conn.port}`}
            {conn.portPath && `${conn.portPath} (${conn.baudRate || 9600}-${conn.dataBits || 8}-${(conn.parity || 'none')[0].toUpperCase()}-${conn.stopBits || 1})`}
            {conn.endpointUrl && conn.endpointUrl}
            {conn.unitId !== undefined && ` · Unit ID: ${conn.unitId}`}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2 shrink-0">
        {deleteConfirmId === conn.connectionId ? (
          <div className="flex items-center space-x-2">
            <span className="text-xs text-rose-400">Delete?</span>
            <button
              onClick={() => onDelete(conn.connectionId)}
              className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs rounded-lg cursor-pointer hover:bg-rose-500/30"
            >
              Yes
            </button>
            <button
              onClick={onDeleteCancel}
              className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer hover:bg-slate-600"
            >
              No
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => onEdit(conn)}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Edit"
            >
              <i className="fas fa-pen text-xs"></i>
            </button>
            <button
              onClick={() => onDeleteConfirm(conn.connectionId)}
              className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
              title="Delete"
            >
              <i className="fas fa-trash-can text-xs"></i>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
