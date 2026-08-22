import React from 'react';
import { DriverConnection } from '../../types';
import { DriverConnectionCard } from './DriverConnectionCard';

interface DriverConnectionListProps {
  connections: DriverConnection[];
  deleteConfirmId: string | null;
  onOpenAdd: () => void;
  onOpenEdit: (conn: DriverConnection) => void;
  onDeleteConfirm: (connectionId: string) => void;
  onDeleteCancel: () => void;
  onDelete: (connectionId: string) => void;
}

export const DriverConnectionList: React.FC<DriverConnectionListProps> = ({
  connections,
  deleteConfirmId,
  onOpenAdd,
  onOpenEdit,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete
}) => {
  if (connections.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center">
        <i className="fas fa-plug-circle-bolt text-4xl text-violet-400/30 mb-3 block"></i>
        <p className="text-slate-400 font-medium">No driver connections configured</p>
        <p className="text-slate-500 text-xs mt-1 mb-4">Add an OPC UA, Modbus TCP, Modbus RTU, RS-485, or RS-232 connection to get started</p>
        <button
          type="button"
          onClick={onOpenAdd}
          className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-sm font-semibold rounded-xl transition-all cursor-pointer"
        >
          + Add First Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map(conn => (
        <DriverConnectionCard
          key={conn.connectionId}
          conn={conn}
          deleteConfirmId={deleteConfirmId}
          onEdit={onOpenEdit}
          onDeleteConfirm={onDeleteConfirm}
          onDeleteCancel={onDeleteCancel}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
