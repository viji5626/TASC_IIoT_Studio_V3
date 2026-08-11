import React, { useState } from 'react';
import { AppState, AppView, DriverConnection, DriverProtocol } from '../types';

interface DriverConnectionsViewProps {
  onBack?: () => void;
  appState: AppState;
  onNavigate?: (view: AppView) => void;
  onAdd: (conn: DriverConnection) => void;
  onUpdate: (conn: DriverConnection) => void;
  onDelete: (connectionId: string) => void;
}

const PROTOCOL_LABELS: Record<DriverProtocol, string> = {
  opcua: 'OPC UA',
  opcda: 'OPC DA',
  modbus_tcp: 'Modbus TCP',
  modbus_rtu: 'Modbus RTU',
  rs485: 'RS-485',
  usb_serial: 'USB Serial',
  tcp_custom: 'TCP Custom',
  custom: 'Custom'
};

const PROTOCOL_ICONS: Record<DriverProtocol, string> = {
  opcua: 'fa-sitemap',
  opcda: 'fa-sitemap',
  modbus_tcp: 'fa-network-wired',
  modbus_rtu: 'fa-wave-square',
  rs485: 'fa-wave-square',
  usb_serial: 'fa-usb',
  tcp_custom: 'fa-plug',
  custom: 'fa-puzzle-piece'
};

const emptyConn = (): Partial<DriverConnection> => ({
  connectionId: `drv_${Date.now()}`,
  connectionName: '',
  protocol: 'modbus_tcp',
  enabled: true,
  host: '',
  port: 502,
  unitId: 1,
  timeout: 3000,
  retryInterval: 5000,
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1
});

const DriverConnectionsView: React.FC<DriverConnectionsViewProps> = ({
  onBack,
  appState,
  onNavigate,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const connections = appState.driverConnections || [];
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<Partial<DriverConnection>>(emptyConn());
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenAdd = () => {
    setEditingConn(emptyConn());
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (conn: DriverConnection) => {
    setEditingConn({ ...conn });
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!editingConn.connectionName?.trim()) {
      alert('Connection name is required.');
      return;
    }
    const conn = editingConn as DriverConnection;
    if (isEditing) {
      onUpdate(conn);
    } else {
      onAdd(conn);
    }
    setIsFormOpen(false);
    setEditingConn(emptyConn());
  };

  const handleDelete = (connectionId: string) => {
    onDelete(connectionId);
    setDeleteConfirmId(null);
  };

  const setField = (key: keyof DriverConnection, value: any) => {
    setEditingConn(prev => ({ ...prev, [key]: value }));
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate(AppView.DASHBOARD);
    }
  };

  return (
    <div className="flex-grow overflow-y-auto p-6 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all cursor-pointer flex items-center space-x-2 shrink-0 active:scale-95"
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-sm"></i>
            <span className="text-xs font-bold">Back</span>
          </button>
          <i className="fas fa-plug-circle-bolt text-violet-400 text-xl"></i>
          <div>
            <h1 className="text-xl font-bold text-white">Driver Connections</h1>
            <p className="text-sm text-slate-400">Manage industrial protocol connections</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center space-x-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
        >
          <i className="fas fa-plus text-xs"></i>
          <span>Add Connection</span>
        </button>
      </div>

      {/* Connection List */}
      {connections.length === 0 ? (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-10 text-center">
          <i className="fas fa-plug-circle-bolt text-4xl text-violet-400/30 mb-3 block"></i>
          <p className="text-slate-400 font-medium">No driver connections configured</p>
          <p className="text-slate-500 text-xs mt-1 mb-4">Add an OPC UA, Modbus TCP, or serial connection to get started</p>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            + Add First Connection
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {connections.map(conn => (
            <div key={conn.connectionId} className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <i className={`fas ${PROTOCOL_ICONS[conn.protocol]} text-violet-400 text-base`}></i>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-semibold text-sm">{conn.connectionName}</span>
                    <span className="text-[10px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full">
                      {PROTOCOL_LABELS[conn.protocol]}
                    </span>
                    {!conn.enabled && (
                      <span className="text-[10px] font-bold bg-slate-700 text-slate-400 border border-slate-600 px-2 py-0.5 rounded-full">Disabled</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {conn.host && `${conn.host}:${conn.port}`}
                    {conn.portPath && conn.portPath}
                    {conn.endpointUrl && conn.endpointUrl}
                    {conn.unitId !== undefined && ` · Unit ID: ${conn.unitId}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {deleteConfirmId === conn.connectionId ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-rose-400">Delete?</span>
                    <button onClick={() => handleDelete(conn.connectionId)} className="px-2 py-1 bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs rounded-lg cursor-pointer">Yes</button>
                    <button onClick={() => setDeleteConfirmId(null)} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer">No</button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => handleOpenEdit(conn)}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      title="Edit"
                    >
                      <i className="fas fa-pen text-xs"></i>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(conn.connectionId)}
                      className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                      title="Delete"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">{isEditing ? 'Edit Driver Connection' : 'Add Driver Connection'}</h2>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Connection Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Connection Name *</label>
                <input
                  type="text"
                  value={editingConn.connectionName || ''}
                  onChange={e => setField('connectionName', e.target.value)}
                  placeholder="e.g. PLC Line 1, SCADA Server"
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Protocol</label>
                <select
                  value={editingConn.protocol || 'modbus_tcp'}
                  onChange={e => setField('protocol', e.target.value as DriverProtocol)}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                  {(Object.entries(PROTOCOL_LABELS) as [DriverProtocol, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* TCP / Modbus TCP / OPC UA fields */}
              {['modbus_tcp', 'modbus_rtu', 'tcp_custom', 'opcua', 'opcda'].includes(editingConn.protocol || '') && (
                <>
                  {editingConn.protocol === 'opcua' || editingConn.protocol === 'opcda' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Endpoint URL</label>
                      <input
                        type="text"
                        value={editingConn.endpointUrl || ''}
                        onChange={e => setField('endpointUrl', e.target.value)}
                        placeholder="opc.tcp://192.168.1.10:4840"
                        className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Host / IP Address</label>
                        <input
                          type="text"
                          value={editingConn.host || ''}
                          onChange={e => setField('host', e.target.value)}
                          placeholder="192.168.1.10"
                          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Port</label>
                        <input
                          type="number"
                          value={editingConn.port || 502}
                          onChange={e => setField('port', parseInt(e.target.value) || 502)}
                          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  )}
                  {['modbus_tcp', 'modbus_rtu'].includes(editingConn.protocol || '') && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Unit / Slave ID</label>
                        <input
                          type="number"
                          value={editingConn.unitId ?? 1}
                          onChange={e => setField('unitId', parseInt(e.target.value) || 1)}
                          min={1} max={247}
                          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Response Timeout (ms)</label>
                        <input
                          type="number"
                          value={editingConn.timeout ?? 2000}
                          onChange={e => setField('timeout', parseInt(e.target.value) || 2000)}
                          min={100} max={30000} step={100}
                          placeholder="2000"
                          className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Serial / RS-485 / USB fields */}
              {['rs485', 'usb_serial', 'modbus_rtu'].includes(editingConn.protocol || '') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Serial Port</label>
                    <input
                      type="text"
                      value={editingConn.portPath || ''}
                      onChange={e => setField('portPath', e.target.value)}
                      placeholder="COM3 or /dev/ttyUSB0"
                      className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Baud Rate</label>
                      <select
                        value={editingConn.baudRate || 9600}
                        onChange={e => setField('baudRate', parseInt(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                      >
                        {[1200,2400,4800,9600,19200,38400,57600,115200].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Parity</label>
                      <select
                        value={editingConn.parity || 'none'}
                        onChange={e => setField('parity', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                      >
                        <option value="none">None</option>
                        <option value="even">Even</option>
                        <option value="odd">Odd</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Enabled toggle */}
              <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
                <span className="text-sm text-slate-300 font-medium">Connection Enabled</span>
                <button
                  type="button"
                  onClick={() => setField('enabled', !editingConn.enabled)}
                  className={`w-11 h-6 rounded-full transition-all relative cursor-pointer ${editingConn.enabled ? 'bg-violet-600' : 'bg-slate-600'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${editingConn.enabled ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
              >
                {isEditing ? 'Save Changes' : 'Add Connection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverConnectionsView;
