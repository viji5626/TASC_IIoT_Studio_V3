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
  rs232: 'RS-232',
  usb_serial: 'USB Serial',
  tcp_custom: 'TCP Custom',
  custom: 'Custom'
};

const PROTOCOL_ICONS: Record<DriverProtocol, string> = {
  opcua: 'fa-sitemap',
  opcda: 'fa-sitemap',
  modbus_tcp: 'fa-network-wired',
  modbus_rtu: 'fa-microchip',
  rs485: 'fa-wave-square',
  rs232: 'fa-microchip',
  usb_serial: 'fa-usb',
  tcp_custom: 'fa-plug',
  custom: 'fa-puzzle-piece'
};

const emptyConn = (): Partial<DriverConnection> => ({
  connectionId: `drv_${Date.now()}`,
  connectionName: '',
  protocol: 'modbus_tcp',
  enabled: true,
  host: '127.0.0.1',
  port: 502,
  unitId: 1,
  timeout: 1000,
  sendTimeoutMs: 1000,
  recvTimeoutMs: 1000,
  sendRecvDelayMs: 0,
  frameRetryCount: 0,
  tcpSockets: 1,
  reopenSockets: true,
  zeroBasedAddressing: true,
  zeroBasedBitAddressing: true,
  byteSwap: false,
  wordSwap: false,
  dwordSwap: false,
  useSingleCoilWrite: true,
  useSingleRegisterWrite: true,
  retryInterval: 1000,
  portPath: 'COM1',
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: 'none',
  rtsToggle: false
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
  const [detectedPorts, setDetectedPorts] = useState<Array<{ port: string; name: string; description?: string }>>([]);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const scanSerialPorts = async () => {
    setIsScanningPorts(true);
    setScanError(null);
    try {
      const res = await fetch('/api/serial-ports');
      const data = await res.json();
      if (data.success && Array.isArray(data.ports)) {
        setDetectedPorts(data.ports);
      } else {
        setScanError(data.error || 'Failed to detect serial ports');
      }
    } catch (err: any) {
      setScanError(err.message || 'Network error scanning ports');
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingConn(emptyConn());
    setIsEditing(false);
    setIsFormOpen(true);
    scanSerialPorts();
  };

  const handleOpenEdit = (conn: DriverConnection) => {
    setEditingConn({ ...conn });
    setIsEditing(true);
    setIsFormOpen(true);
    if (['rs485', 'rs232', 'usb_serial', 'modbus_rtu'].includes(conn.protocol || '')) {
      scanSerialPorts();
    }
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

  const isTcpProtocol = ['modbus_tcp', 'tcp_custom'].includes(editingConn.protocol || '');
  const isSerialProtocol = ['modbus_rtu', 'rs485', 'rs232', 'usb_serial'].includes(editingConn.protocol || '');
  const isModbus = ['modbus_tcp', 'modbus_rtu'].includes(editingConn.protocol || '');

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
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <i className="fas fa-network-wired text-violet-400"></i>
              <span>Driver Connections</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage industrial hardware communication channels (OPC UA, Modbus TCP, Modbus RTU, RS-485, RS-232, Serial)</p>
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
          <p className="text-slate-500 text-xs mt-1 mb-4">Add an OPC UA, Modbus TCP, Modbus RTU, RS-485, or RS-232 connection to get started</p>
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
                  placeholder="e.g. PLC Line 1, SCADA Server, VFD Serial"
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Protocol */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Protocol</label>
                <select
                  value={editingConn.protocol || 'modbus_tcp'}
                  onChange={e => {
                    const nextProto = e.target.value as DriverProtocol;
                    setField('protocol', nextProto);
                    if (['modbus_rtu', 'rs485', 'rs232', 'usb_serial'].includes(nextProto)) {
                      scanSerialPorts();
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                  {(Object.entries(PROTOCOL_LABELS) as [DriverProtocol, string][]).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              {/* OPC UA / OPC DA fields */}
              {(editingConn.protocol === 'opcua' || editingConn.protocol === 'opcda') && (
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
              )}

              {/* Channel TCP/IP Settings (Modbus TCP, TCP Custom) */}
              {isTcpProtocol && (
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <i className="fas fa-ethernet text-[11px]"></i>
                    <span>Channel TCP/IP Settings</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">IP addr. or hostname</label>
                      <input
                        type="text"
                        value={editingConn.host || ''}
                        onChange={e => setField('host', e.target.value)}
                        placeholder="127.0.0.1 or localhost"
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">TCP port</label>
                      <input
                        type="number"
                        value={editingConn.port || 502}
                        onChange={e => setField('port', parseInt(e.target.value) || 502)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 items-center pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">TCP sockets</label>
                      <input
                        type="number"
                        value={editingConn.tcpSockets ?? 1}
                        onChange={e => setField('tcpSockets', parseInt(e.target.value) || 1)}
                        min={1} max={16}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                      <input
                        type="checkbox"
                        id="reopenSockets"
                        checked={editingConn.reopenSockets !== false}
                        onChange={e => setField('reopenSockets', e.target.checked)}
                        className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      <label htmlFor="reopenSockets" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                        Re-open socket(s) on error
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Channel Serial / RS-485 / RS-232 / USB Settings */}
              {isSerialProtocol && (
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <i className="fas fa-microchip text-[11px]"></i>
                      <span>Channel Serial (RS-485 / RS-232) Settings</span>
                    </h3>
                    <button
                      type="button"
                      onClick={scanSerialPorts}
                      disabled={isScanningPorts}
                      className="px-2.5 py-1 bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/40 text-[10px] font-bold rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50"
                      title="Scan machine for available COM ports"
                    >
                      <i className={`fas fa-rotate ${isScanningPorts ? 'animate-spin' : ''} text-[10px]`}></i>
                      <span>{isScanningPorts ? 'Scanning...' : 'Auto-Detect Ports'}</span>
                    </button>
                  </div>

                  {/* Serial Port Dropdown + Manual Entry */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Serial Port (COM Port / Device Path) *
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <select
                        value={editingConn.portPath || 'COM1'}
                        onChange={e => setField('portPath', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      >
                        {detectedPorts.length > 0 ? (
                          detectedPorts.map(p => (
                            <option key={p.port} value={p.port}>
                              {p.name && p.name !== p.port ? `${p.port} — ${p.name}` : p.port}
                            </option>
                          ))
                        ) : (
                          ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))
                        )}
                      </select>
                      <input
                        type="text"
                        value={editingConn.portPath || ''}
                        onChange={e => setField('portPath', e.target.value)}
                        placeholder="e.g. COM3, COM10, /dev/ttyUSB0"
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    {detectedPorts.length > 0 && (
                      <div className="text-[10px] text-emerald-400/80 mt-1 flex items-center space-x-1">
                        <i className="fas fa-check-circle text-[9px]"></i>
                        <span>{detectedPorts.length} COM port(s) detected: {detectedPorts.map(p => p.port).join(', ')}</span>
                      </div>
                    )}
                    {scanError && (
                      <div className="text-[10px] text-rose-400 mt-1">
                        {scanError}
                      </div>
                    )}
                  </div>

                  {/* Serial Framing: Baud Rate, Data Bits, Parity, Stop Bits */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Baud Rate *</label>
                      <select
                        value={editingConn.baudRate || 9600}
                        onChange={e => setField('baudRate', parseInt(e.target.value) || 9600)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      >
                        {[1200, 2400, 4800, 9600, 14400, 19200, 38400, 57600, 115200, 230400].map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Data Bits *</label>
                      <select
                        value={editingConn.dataBits ?? 8}
                        onChange={e => setField('dataBits', parseInt(e.target.value) || 8)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      >
                        <option value={8}>8 bits (Standard)</option>
                        <option value={7}>7 bits (ASCII)</option>
                        <option value={6}>6 bits</option>
                        <option value={5}>5 bits</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Parity *</label>
                      <select
                        value={editingConn.parity || 'none'}
                        onChange={e => setField('parity', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500"
                      >
                        <option value="none">None (N)</option>
                        <option value="even">Even (E)</option>
                        <option value="odd">Odd (O)</option>
                        <option value="mark">Mark (M)</option>
                        <option value="space">Space (S)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Stop Bits *</label>
                      <select
                        value={editingConn.stopBits ?? 1}
                        onChange={e => setField('stopBits', parseFloat(e.target.value) || 1)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      >
                        <option value={1}>1 stop bit</option>
                        <option value={1.5}>1.5 stop bits</option>
                        <option value={2}>2 stop bits</option>
                      </select>
                    </div>
                  </div>

                  {/* Flow Control & RTS Direction */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Flow Control</label>
                      <select
                        value={editingConn.flowControl || 'none'}
                        onChange={e => setField('flowControl', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500"
                      >
                        <option value="none">None (Default RS-485)</option>
                        <option value="rts/cts">RTS / CTS (Hardware)</option>
                        <option value="xon/xoff">XON / XOFF (Software)</option>
                      </select>
                    </div>
                    <div className="pt-3">
                      <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!editingConn.rtsToggle}
                          onChange={e => setField('rtsToggle', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span className="font-medium">RTS Toggle / RS-485 Auto Direction</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Modbus Settings (Modbus TCP & Modbus RTU) */}
              {isModbus && (
                <>
                  {/* Device & Unit ID Settings */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Unit / Slave ID *</label>
                      <input
                        type="number"
                        value={editingConn.unitId ?? 1}
                        onChange={e => setField('unitId', parseInt(e.target.value) || 1)}
                        min={1} max={247}
                        className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Base Scan Rate (ms)</label>
                      <input
                        type="number"
                        value={editingConn.retryInterval ?? 1000}
                        onChange={e => setField('retryInterval', parseInt(e.target.value) || 1000)}
                        min={50} max={60000} step={100}
                        className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>

                  {/* Communication Timeouts */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                    <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <i className="fas fa-stopwatch text-[11px]"></i>
                      <span>Communication Timeouts</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Send timeout (ms)</label>
                        <input
                          type="number"
                          value={editingConn.sendTimeoutMs ?? 1000}
                          onChange={e => setField('sendTimeoutMs', parseInt(e.target.value) || 1000)}
                          min={100} max={10000} step={100}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Recv timeout (ms)</label>
                        <input
                          type="number"
                          value={editingConn.recvTimeoutMs ?? 1000}
                          onChange={e => setField('recvTimeoutMs', parseInt(e.target.value) || 1000)}
                          min={100} max={10000} step={100}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Turnaround / Delay (ms)</label>
                        <input
                          type="number"
                          value={editingConn.sendRecvDelayMs ?? 0}
                          onChange={e => setField('sendRecvDelayMs', parseInt(e.target.value) || 0)}
                          min={0} max={5000} step={10}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Frame retry count</label>
                        <input
                          type="number"
                          value={editingConn.frameRetryCount ?? 0}
                          onChange={e => setField('frameRetryCount', parseInt(e.target.value) || 0)}
                          min={0} max={10}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Swap Options */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
                    <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <i className="fas fa-arrow-right-arrow-left text-[11px]"></i>
                      <span>Swap Options</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!editingConn.byteSwap}
                          onChange={e => setField('byteSwap', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span>Swap bytes inside words</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!editingConn.wordSwap}
                          onChange={e => setField('wordSwap', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span>Swap words inside dwords</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!editingConn.dwordSwap}
                          onChange={e => setField('dwordSwap', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span>Swap dwords inside 64-bit registers</span>
                      </label>
                    </div>
                  </div>

                  {/* Other Addressing & Function Settings */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-2">
                    <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <i className="fas fa-sliders text-[11px]"></i>
                      <span>Other Settings</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingConn.zeroBasedAddressing !== false}
                          onChange={e => setField('zeroBasedAddressing', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span>Use zero based register addressing (0..65535)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingConn.useSingleCoilWrite !== false}
                          onChange={e => setField('useSingleCoilWrite', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span>Use single coil write (Modbus Fnc 05)</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={editingConn.useSingleRegisterWrite !== false}
                          onChange={e => setField('useSingleRegisterWrite', e.target.checked)}
                          className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600"
                        />
                        <span>Use single register write (Modbus Fnc 06)</span>
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* Non-Modbus Serial settings (RS-485, RS-232, USB Serial) */}
              {isSerialProtocol && !isModbus && (
                <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                  <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <i className="fas fa-stopwatch text-[11px]"></i>
                    <span>Polling & Timeouts</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Base Scan Rate (ms)</label>
                      <input
                        type="number"
                        value={editingConn.retryInterval ?? 1000}
                        onChange={e => setField('retryInterval', parseInt(e.target.value) || 1000)}
                        min={50} max={60000} step={100}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Timeout (ms)</label>
                      <input
                        type="number"
                        value={editingConn.timeout ?? 1000}
                        onChange={e => setField('timeout', parseInt(e.target.value) || 1000)}
                        min={100} max={10000} step={100}
                        className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
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
