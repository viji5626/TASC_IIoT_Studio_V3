import React, { useState, useEffect } from 'react';
import { AppState, AppView, DriverConnection, DriverProtocol } from '../types';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';

import { useAppStore } from '../store/useAppStore';

interface DriverConnectionsViewProps {
  onBack?: () => void;
  appState?: AppState;
  onNavigate?: (view: AppView) => void;
  onAdd?: (conn: DriverConnection) => void;
  onUpdate?: (conn: DriverConnection) => void;
  onDelete?: (connectionId: string) => void;
}

const PROTOCOL_LABELS: Record<DriverProtocol, string> = {
  opcua: 'OPC UA',
  opcda: 'OPC DA',
  modbus_tcp: 'Modbus TCP',
  modbus_rtu: 'Modbus RTU',
  iec61850: 'IEC 61850 (MMS / GOOSE)',
  s7: 'Siemens S7 (Snap7 / S7Comm)',
  melsec: 'Mitsubishi MELSEC (SLMP / MC)',
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
  iec61850: 'fa-bolt',
  s7: 'fa-industry',
  melsec: 'fa-microchip',
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
  // Siemens S7 Defaults
  s7Model: 's7_1500',
  rack: 0,
  slot: 1,
  pduSize: 480,
  // Mitsubishi MELSEC Defaults
  melsecSeries: 'iq_f',
  melsecFrame: '3e_binary',
  networkNumber: 0,
  pcNumber: 255,
  destinationModuleIoNumber: 1023,
  destinationModuleStationNumber: 0,
  // IEC 61850 Substation Defaults
  iedName: 'IED1',
  apTitle: '1.1.1.999.1',
  aeQualifier: 12,
  mmsPort: 102,
  enableGoose: false,
  gooseInterface: 'eth0',
  gooseAppId: '0x0001',
  // OPC UA Defaults
  endpointUrl: 'opc.tcp://127.0.0.1:4840',
  secondaryEndpointUrl: '',
  overrideThumbprint: '',
  securityFallback: 'no_security',
  disableDomainCheck: false,
  browsingMode: 'browse_path',
  securityMode: 'None',
  securityPolicy: 'None',
  authMode: 'anonymous',
  username: '',
  password: '',
  userCertificateThumbprint: '',
  maxQueueSize: 1000,
  enableSubscription: true,
  subscriptionMode: 'read_attributes',
  readMaximumAgeMs: 1000,
  publishIntervalMs: 50,
  maxPointsPerBatch: 1000,
  browseMaxItemsAtATime: 200,
  workPeriodMs: 1000,
  logComplianceErrors: false,
  requestTimeoutMs: 10000,
  sessionTimeoutMs: 30000,
  connectTimeoutMs: 10000,
  // Modbus / Serial / TCP Defaults
  host: '127.0.0.1',
  port: 502,
  unitId: 1,
  timeout: 1000,
  sendTimeoutMs: 1000,
  recvTimeoutMs: 1000,
  sendRecvDelayMs: 0,
  frameRetryCount: 0,
  tcpSockets: 1,
  reopenSockets: false,
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
  onBack: onBackProp,
  appState: appStateProp,
  onNavigate: onNavigateProp,
  onAdd: onAddProp,
  onUpdate: onUpdateProp,
  onDelete: onDeleteProp
}) => {
  const store = useAppStore();
  const appState = appStateProp ?? store.appState;
  const onNavigate = onNavigateProp ?? store.setCurrentView;
  const onBack = onBackProp ?? (() => store.setCurrentView(AppView.DASHBOARD));
  const onAdd = onAddProp ?? store.handleAddDriverConnection;
  const onUpdate = onUpdateProp ?? store.handleUpdateDriverConnection;
  const onDelete = onDeleteProp ?? store.handleDeleteDriverConnection;
  const connections = appState.driverConnections || [];
  const [isDriverTourOpen, setIsDriverTourOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<Partial<DriverConnection>>(emptyConn());
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detectedPorts, setDetectedPorts] = useState<Array<{ port: string; name: string; description?: string }>>([]);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // OPC UA Collapsible Section States
  const [opcSectionConnection, setOpcSectionConnection] = useState(true);
  const [opcSectionAuth, setOpcSectionAuth] = useState(false);
  const [opcSectionSecurity, setOpcSectionSecurity] = useState(false);
  const [opcSectionTelemetry, setOpcSectionTelemetry] = useState(false);
  const [opcSectionTimeouts, setOpcSectionTimeouts] = useState(false);
  const [opcUaTestStatus, setOpcUaTestStatus] = useState<{ testing: boolean; target: 'primary' | 'secondary' | null; success?: boolean; message?: string }>({
    testing: false,
    target: null
  });

  const testOpcUaConnection = async (target: 'primary' | 'secondary') => {
    const endpoint = target === 'primary' ? editingConn.endpointUrl : editingConn.secondaryEndpointUrl;
    if (!endpoint) {
      setOpcUaTestStatus({ testing: false, target, success: false, message: 'Please enter an endpoint URL first' });
      return;
    }
    setOpcUaTestStatus({ testing: true, target });
    try {
      const res = await fetch('/api/opcua/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpointUrl: endpoint,
          securityMode: editingConn.securityMode || 'None',
          securityPolicy: editingConn.securityPolicy || 'None',
          authMode: editingConn.authMode || 'anonymous',
          username: editingConn.username,
          password: editingConn.password,
          connectTimeoutMs: editingConn.connectTimeoutMs || 6000
        })
      });
      const data = await res.json();
      if (data.success) {
        setOpcUaTestStatus({ testing: false, target, success: true, message: data.message || `Connected to ${endpoint}` });
      } else {
        setOpcUaTestStatus({ testing: false, target, success: false, message: data.error || 'Connection failed' });
      }
    } catch (err: any) {
      setOpcUaTestStatus({ testing: false, target, success: false, message: err.message || 'Probe request failed' });
    }
  };

  const [iecTestStatus, setIecTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false
  });

  const testIecConnection = async () => {
    setIecTestStatus({ testing: true });
    try {
      const res = await fetch('/api/iec61850/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConn)
      });
      const data = await res.json();
      setIecTestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to IED successfully' : '✗ Failed to connect to IED')
      });
    } catch (err: any) {
      setIecTestStatus({
        testing: false,
        success: false,
        message: err.message || 'Probe request failed'
      });
    }
  };

  const [s7TestStatus, setS7TestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false
  });

  const testS7Connection = async () => {
    setS7TestStatus({ testing: true });
    try {
      const res = await fetch('/api/s7/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConn)
      });
      const data = await res.json();
      setS7TestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to Siemens S7 PLC' : '✗ Failed to connect to Siemens S7 PLC')
      });
    } catch (err: any) {
      setS7TestStatus({
        testing: false,
        success: false,
        message: err.message || 'S7 probe request failed'
      });
    }
  };

  const [melsecTestStatus, setMelsecTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({
    testing: false
  });

  const testMelsecConnection = async () => {
    setMelsecTestStatus({ testing: true });
    try {
      const res = await fetch('/api/melsec/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingConn)
      });
      const data = await res.json();
      setMelsecTestStatus({
        testing: false,
        success: data.success,
        message: data.message || (data.success ? '✓ Connected to Mitsubishi MELSEC PLC' : '✗ Failed to connect to Mitsubishi MELSEC PLC')
      });
    } catch (err: any) {
      setMelsecTestStatus({
        testing: false,
        success: false,
        message: err.message || 'MELSEC probe request failed'
      });
    }
  };

  useEffect(() => {
    if (!isTourSuppressed('driver_connections')) {
      setIsDriverTourOpen(true);
    }
  }, []);

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
        <div data-tour="drv-header" className="flex items-center space-x-3">
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
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsDriverTourOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Launch Driver Connections Guided Tour"
          >
            <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
            <span>Tour</span>
          </button>
          <button
            type="button"
            data-tour="drv-add-btn"
            onClick={handleOpenAdd}
            className="flex items-center space-x-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            <i className="fas fa-plus text-xs"></i>
            <span>Add Connection</span>
          </button>
        </div>
      </div>

      {/* Connection List */}
      <div data-tour="drv-list">
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
      </div>

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

              {/* OPC UA / OPC DA Advanced Industrial Settings Panel */}
              {(editingConn.protocol === 'opcua' || editingConn.protocol === 'opcda') && (
                <div className="space-y-3 pt-1">
                  {/* Test Connection Probe Feedback Banner */}
                  {opcUaTestStatus.testing && (
                    <div className="p-2.5 bg-sky-950/70 border border-sky-500/40 rounded-xl text-sky-200 text-xs flex items-center space-x-2 animate-pulse">
                      <i className="fas fa-circle-notch fa-spin text-sky-400"></i>
                      <span>Probing {opcUaTestStatus.target === 'primary' ? 'Primary' : 'Secondary'} Endpoint & Authenticating session...</span>
                    </div>
                  )}
                  {!opcUaTestStatus.testing && opcUaTestStatus.message && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${opcUaTestStatus.success ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
                      <div className="flex items-center space-x-2">
                        <i className={`fas ${opcUaTestStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
                        <span>{opcUaTestStatus.message}</span>
                      </div>
                      <button type="button" onClick={() => setOpcUaTestStatus({ testing: false, target: null })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
                    </div>
                  )}

                  {/* 1. Connection & Redundancy Settings (Collapsible) */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpcSectionConnection(!opcSectionConnection)}
                      className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-network-wired text-sky-400"></i>
                        <span className="uppercase tracking-wider">Connection Settings</span>
                      </div>
                      <i className={`fas fa-chevron-${opcSectionConnection ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
                    </button>
                    
                    {opcSectionConnection && (
                      <div className="p-3.5 space-y-3">
                        {/* Primary Endpoint */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Primary Endpoint: *
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingConn.endpointUrl || ''}
                              onChange={e => setField('endpointUrl', e.target.value)}
                              placeholder="opc.tcp://127.0.0.1:4840"
                              className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => testOpcUaConnection('primary')}
                              disabled={opcUaTestStatus.testing || !editingConn.endpointUrl}
                              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                            >
                              <i className="fas fa-bolt text-[10px]"></i>
                              <span>Test Connection</span>
                            </button>
                          </div>
                        </div>

                        {/* Secondary Redundant Endpoint */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Secondary Endpoint:
                          </label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingConn.secondaryEndpointUrl || ''}
                              onChange={e => setField('secondaryEndpointUrl', e.target.value)}
                              placeholder="opc.tcp://192.168.1.11:4840"
                              className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => testOpcUaConnection('secondary')}
                              disabled={opcUaTestStatus.testing || !editingConn.secondaryEndpointUrl}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                            >
                              <i className="fas fa-shield-alt text-[10px]"></i>
                              <span>Test Connection</span>
                            </button>
                          </div>
                        </div>

                        {/* Override Thumbprint */}
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                            <span>Override Thumbprint:</span>
                            <span className="text-[10px] text-slate-500 font-mono">X.509 Certificate</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={editingConn.overrideThumbprint || ''}
                              onChange={e => setField('overrideThumbprint', e.target.value)}
                              placeholder="Overrides application certificate thumbprint..."
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                            <i className="fas fa-certificate absolute right-2.5 top-2.5 text-sky-400 text-xs" title="Overrides default application certificate with another one"></i>
                          </div>
                          <p className="text-[10px] text-slate-400 italic mt-0.5">Note: Overrides the default application certificate with another one</p>
                        </div>

                        {/* Preferred Endpoint & Fallback */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Preferred Endpoint:
                            </label>
                            <input
                              type="text"
                              value={editingConn.preferredEndpoint || ''}
                              onChange={e => setField('preferredEndpoint', e.target.value)}
                              placeholder="Auto-discovered or manual endpoint"
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Fallback to:
                            </label>
                            <select
                              value={editingConn.securityFallback || 'no_security'}
                              onChange={e => setField('securityFallback', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                            >
                              <option value="no_security">Fallback to no security</option>
                              <option value="max_security">Fallback to the maximum security available</option>
                            </select>
                          </div>
                        </div>

                        {/* Domain Check & Browsing Mode */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1">
                          <div className="flex items-center space-x-2 pt-2">
                            <input
                              type="checkbox"
                              id="disableDomainCheck"
                              checked={editingConn.disableDomainCheck === true}
                              onChange={e => setField('disableDomainCheck', e.target.checked)}
                              className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor="disableDomainCheck" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                              Disable Domain Check
                            </label>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Browsing Mode:
                            </label>
                            <select
                              value={editingConn.browsingMode || 'browse_path'}
                              onChange={e => setField('browsingMode', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                            >
                              <option value="browse_path">Always Browse Path</option>
                              <option value="node_id">Browse by NodeId</option>
                            </select>
                          </div>
                        </div>
                        {editingConn.browsingMode === 'browse_path' && (
                          <p className="text-[10px] text-amber-400/90 font-medium">
                            <span className="font-bold">Warning:</span> "Always Browse Path" mode may cause performance issues when connecting to large OPC UA servers.
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Authentication Settings (Collapsible) */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpcSectionAuth(!opcSectionAuth)}
                      className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-user-lock text-sky-400"></i>
                        <span className="uppercase tracking-wider">Authentication Settings</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-900/60 text-sky-200 rounded">
                          {editingConn.authMode === 'username_password' ? 'Username / Password' : editingConn.authMode === 'certificate' ? 'Certificate' : 'Anonymous'}
                        </span>
                      </div>
                      <i className={`fas fa-chevron-${opcSectionAuth ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
                    </button>

                    {opcSectionAuth && (
                      <div className="p-3.5 space-y-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                            Authentication Mode: *
                          </label>
                          <select
                            value={editingConn.authMode || 'anonymous'}
                            onChange={e => setField('authMode', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                          >
                            <option value="anonymous">Anonymous</option>
                            <option value="username_password">Username and Password</option>
                            <option value="certificate">Certificate</option>
                          </select>
                        </div>

                        {editingConn.authMode === 'username_password' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 animate-fade-in">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Username:</label>
                              <input
                                type="text"
                                value={editingConn.username || ''}
                                onChange={e => setField('username', e.target.value)}
                                placeholder="opcuser / admin"
                                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password:</label>
                              <input
                                type="password"
                                value={editingConn.password || ''}
                                onChange={e => setField('password', e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {editingConn.authMode === 'certificate' && (
                          <div className="space-y-2 pt-1 animate-fade-in">
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Thumbprint:</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={editingConn.userCertificateThumbprint || ''}
                                onChange={e => setField('userCertificateThumbprint', e.target.value)}
                                placeholder="Enter user certificate thumbprint..."
                                className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl pl-3 pr-8 py-2 focus:outline-none focus:border-sky-500 font-mono"
                              />
                              <i className="fas fa-key absolute right-2.5 top-2.5 text-slate-400 text-xs"></i>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 3. Security & Encryption Policy (Collapsible) */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpcSectionSecurity(!opcSectionSecurity)}
                      className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-shield-halved text-sky-400"></i>
                        <span className="uppercase tracking-wider">Security & Encryption Policy</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-sky-900/60 text-sky-200 rounded">
                          {editingConn.securityMode || 'None'} / {editingConn.securityPolicy || 'None'}
                        </span>
                      </div>
                      <i className={`fas fa-chevron-${opcSectionSecurity ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
                    </button>

                    {opcSectionSecurity && (
                      <div className="p-3.5 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Message Security Mode:</label>
                          <select
                            value={editingConn.securityMode || 'None'}
                            onChange={e => setField('securityMode', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
                          >
                            <option value="None">None (Unencrypted)</option>
                            <option value="Sign">Sign (Signed Header)</option>
                            <option value="SignAndEncrypt">Sign & Encrypt (Maximum Security)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Security Policy:</label>
                          <select
                            value={editingConn.securityPolicy || 'None'}
                            onChange={e => setField('securityPolicy', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono text-[11px]"
                          >
                            <option value="None">None</option>
                            <option value="Basic256Sha256">Basic256Sha256 (Standard)</option>
                            <option value="Aes128_Sha256_RsaOaep">Aes128_Sha256_RsaOaep</option>
                            <option value="Aes256_Sha256_RsaPss">Aes256_Sha256_RsaPss</option>
                            <option value="Basic256">Basic256 (Legacy)</option>
                            <option value="Basic128Rsa15">Basic128Rsa15 (Legacy)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Other Settings (Subscription & Polling) */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpcSectionTelemetry(!opcSectionTelemetry)}
                      className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-sliders text-sky-400"></i>
                        <span className="uppercase tracking-wider">Other Settings</span>
                      </div>
                      <i className={`fas fa-chevron-${opcSectionTelemetry ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
                    </button>

                    {opcSectionTelemetry && (
                      <div className="p-3.5 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Max. Queue Size:</label>
                            <input
                              type="number"
                              value={editingConn.maxQueueSize ?? 1000}
                              onChange={e => setField('maxQueueSize', parseInt(e.target.value) || 1000)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>

                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <input
                                type="checkbox"
                                id="enableSubscription"
                                checked={editingConn.enableSubscription !== false}
                                onChange={e => setField('enableSubscription', e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-sky-600 bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
                              />
                              <label htmlFor="enableSubscription" className="text-[11px] font-semibold text-slate-300 cursor-pointer select-none">
                                Enable Subscription:
                              </label>
                            </div>
                            <select
                              value={editingConn.subscriptionMode || 'read_attributes'}
                              onChange={e => setField('subscriptionMode', e.target.value)}
                              disabled={editingConn.enableSubscription === false}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 disabled:opacity-50"
                            >
                              <option value="read_attributes">Read Attributes</option>
                              <option value="monitor_items">Monitor Item Value Changes</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Read Maximum Age: (ms)</label>
                            <input
                              type="number"
                              value={editingConn.readMaximumAgeMs ?? 1000}
                              onChange={e => setField('readMaximumAgeMs', parseInt(e.target.value) || 1000)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Publish Interval: (ms)</label>
                            <input
                              type="number"
                              value={editingConn.publishIntervalMs ?? 50}
                              onChange={e => setField('publishIntervalMs', parseInt(e.target.value) || 50)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Add a maximum of: (points)</label>
                            <input
                              type="number"
                              value={editingConn.maxPointsPerBatch ?? 1000}
                              onChange={e => setField('maxPointsPerBatch', parseInt(e.target.value) || 1000)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Browse a maximum of: (items)</label>
                            <input
                              type="number"
                              value={editingConn.browseMaxItemsAtATime ?? 200}
                              onChange={e => setField('browseMaxItemsAtATime', parseInt(e.target.value) || 200)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Work Period: (ms)</label>
                            <input
                              type="number"
                              value={editingConn.workPeriodMs ?? 1000}
                              onChange={e => setField('workPeriodMs', parseInt(e.target.value) || 1000)}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                            />
                          </div>

                          <div className="flex items-center space-x-2 pt-4">
                            <input
                              type="checkbox"
                              id="logComplianceErrors"
                              checked={editingConn.logComplianceErrors === true}
                              onChange={e => setField('logComplianceErrors', e.target.checked)}
                              className="w-4 h-4 rounded text-sky-600 bg-slate-900 border-slate-600 focus:ring-0 cursor-pointer"
                            />
                            <label htmlFor="logComplianceErrors" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                              Log OPC UA Compliance Errors
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 5. Advanced Timeout Settings (Collapsible) */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setOpcSectionTimeouts(!opcSectionTimeouts)}
                      className="w-full px-3.5 py-2.5 bg-gradient-to-r from-sky-950/40 to-slate-900 flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 hover:bg-slate-800/60 transition-all select-none"
                    >
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-clock text-sky-400"></i>
                        <span className="uppercase tracking-wider">Advanced Timeout Settings</span>
                      </div>
                      <i className={`fas fa-chevron-${opcSectionTimeouts ? 'up' : 'down'} text-slate-400 text-[10px]`}></i>
                    </button>

                    {opcSectionTimeouts && (
                      <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Connect Timeout (ms):</label>
                          <input
                            type="number"
                            value={editingConn.connectTimeoutMs ?? 10000}
                            onChange={e => setField('connectTimeoutMs', parseInt(e.target.value) || 10000)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Session Timeout (ms):</label>
                          <input
                            type="number"
                            value={editingConn.sessionTimeoutMs ?? 30000}
                            onChange={e => setField('sessionTimeoutMs', parseInt(e.target.value) || 30000)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Request Timeout (ms):</label>
                          <input
                            type="number"
                            value={editingConn.requestTimeoutMs ?? 10000}
                            onChange={e => setField('requestTimeoutMs', parseInt(e.target.value) || 10000)}
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* IEC 61850 (MMS & GOOSE) Substation Settings Panel */}
              {editingConn.protocol === 'iec61850' && (
                <div className="space-y-3 pt-1">
                  {/* Test Connection Probe Feedback Banner */}
                  {iecTestStatus.testing && (
                    <div className="p-2.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs flex items-center space-x-2 animate-pulse">
                      <i className="fas fa-circle-notch fa-spin text-emerald-400"></i>
                      <span>Probing IED at {editingConn.host || '127.0.0.1'}:{editingConn.port || editingConn.mmsPort || 102} via MMS (Port 102)...</span>
                    </div>
                  )}
                  {!iecTestStatus.testing && iecTestStatus.message && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${iecTestStatus.success ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
                      <div className="flex items-center space-x-2">
                        <i className={`fas ${iecTestStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
                        <span>{iecTestStatus.message}</span>
                      </div>
                      <button type="button" onClick={() => setIecTestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
                    </div>
                  )}

                  {/* IED Core Communication Settings */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <i className="fas fa-bolt text-emerald-400"></i>
                        <span>IED MMS Communication</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-900/60 text-emerald-300 rounded-md border border-emerald-700/50">
                        libIEC61850 Stack
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">IED Identifier / Model Name *</label>
                        <input
                          type="text"
                          value={editingConn.iedName || ''}
                          onChange={e => setField('iedName', e.target.value)}
                          placeholder="e.g. SEL_751_FEEDER1, SIPROTEC_5"
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">MMS Port (Default: 102) *</label>
                        <input
                          type="number"
                          value={editingConn.port ?? editingConn.mmsPort ?? 102}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 102;
                            setField('port', val);
                            setField('mmsPort', val);
                          }}
                          min={1} max={65535}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">IED Host IP Address *</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingConn.host || ''}
                          onChange={e => setField('host', e.target.value)}
                          placeholder="192.168.1.100 or 127.0.0.1"
                          className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={testIecConnection}
                          disabled={iecTestStatus.testing || !editingConn.host}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                        >
                          <i className="fas fa-bolt text-[10px]"></i>
                          <span>Test IED</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">AP-Title</label>
                        <input
                          type="text"
                          value={editingConn.apTitle || '1.1.1.999.1'}
                          onChange={e => setField('apTitle', e.target.value)}
                          placeholder="1.1.1.999.1"
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">AE-Qualifier</label>
                        <input
                          type="number"
                          value={editingConn.aeQualifier ?? 12}
                          onChange={e => setField('aeQualifier', parseInt(e.target.value) || 12)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GOOSE Real-Time Subscribing */}
                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-wave-square text-emerald-400 text-xs"></i>
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">GOOSE Event Subscribing</span>
                      </div>
                      <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(editingConn.enableGoose)}
                          onChange={e => setField('enableGoose', e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-600"
                        />
                        <span className="font-semibold text-slate-300">Enable GOOSE</span>
                      </label>
                    </div>

                    {editingConn.enableGoose && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">Network Interface</label>
                          <input
                            type="text"
                            value={editingConn.gooseInterface || 'eth0'}
                            onChange={e => setField('gooseInterface', e.target.value)}
                            placeholder="eth0, enp3s0"
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-300 mb-1">AppID Filter</label>
                          <input
                            type="text"
                            value={editingConn.gooseAppId || '0x0001'}
                            onChange={e => setField('gooseAppId', e.target.value)}
                            placeholder="0x0001"
                            className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Siemens S7 (Snap7 / S7Comm) Settings Panel */}
              {editingConn.protocol === 's7' && (
                <div className="space-y-3 pt-1">
                  {/* Test Connection Probe Feedback Banner */}
                  {s7TestStatus.testing && (
                    <div className="p-2.5 bg-cyan-950/70 border border-cyan-500/40 rounded-xl text-cyan-200 text-xs flex items-center space-x-2 animate-pulse">
                      <i className="fas fa-circle-notch fa-spin text-cyan-400"></i>
                      <span>Probing Siemens S7 PLC at {editingConn.host || '127.0.0.1'}:{editingConn.port || 102} (Rack {editingConn.rack ?? 0}, Slot {editingConn.slot ?? 1})...</span>
                    </div>
                  )}
                  {!s7TestStatus.testing && s7TestStatus.message && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${s7TestStatus.success ? 'bg-cyan-950/70 border-cyan-500/40 text-cyan-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
                      <div className="flex items-center space-x-2">
                        <i className={`fas ${s7TestStatus.success ? 'fa-circle-check text-cyan-400' : 'fa-circle-xmark text-rose-400'}`}></i>
                        <span>{s7TestStatus.message}</span>
                      </div>
                      <button type="button" onClick={() => setS7TestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
                    </div>
                  )}

                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        <i className="fas fa-industry text-cyan-400"></i>
                        <span>Siemens S7Comm Parameters</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-900/60 text-cyan-300 rounded-md border border-cyan-700/50">
                        Snap7 / ISO-on-TCP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">PLC Hardware Series *</label>
                        <select
                          value={editingConn.s7Model || 's7_1500'}
                          onChange={e => {
                            const model = e.target.value as any;
                            setField('s7Model', model);
                            if (model === 's7_300' || model === 's7_400') {
                              setField('slot', 2);
                            } else {
                              setField('slot', 1);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500"
                        >
                          <option value="s7_1500">SIMATIC S7-1500 (Rack 0, Slot 1)</option>
                          <option value="s7_1200">SIMATIC S7-1200 (Rack 0, Slot 1)</option>
                          <option value="s7_300">SIMATIC S7-300 (Rack 0, Slot 2)</option>
                          <option value="s7_400">SIMATIC S7-400 (Rack 0, Slot 2)</option>
                          <option value="s7_200">SIMATIC S7-200 / Smart</option>
                          <option value="logo">Siemens LOGO! 0BA7/0BA8</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">ISO Port (Default: 102) *</label>
                        <input
                          type="number"
                          value={editingConn.port ?? 102}
                          onChange={e => setField('port', parseInt(e.target.value) || 102)}
                          min={1} max={65535}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">PLC IP Address *</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingConn.host || ''}
                          onChange={e => setField('host', e.target.value)}
                          placeholder="192.168.0.1"
                          className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={testS7Connection}
                          disabled={s7TestStatus.testing || !editingConn.host}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                        >
                          <i className="fas fa-bolt text-[10px]"></i>
                          <span>Test S7 PLC</span>
                        </button>
                      </div>
                    </div>

                    {/* Contextual Hardware Routing Fields */}
                    {editingConn.s7Model === 's7_200' ? (
                      <div className="space-y-3 pt-1">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Local TSAP (CP243-1) *</label>
                            <input
                              type="text"
                              value={editingConn.localTsap || '0x1000'}
                              onChange={e => setField('localTsap', e.target.value)}
                              placeholder="0x1000 or 10.00"
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                            <span className="text-[9px] text-slate-400 mt-0.5 block">Default: 0x1000 (01.00)</span>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Remote TSAP (PLC) *</label>
                            <input
                              type="text"
                              value={editingConn.remoteTsap || '0x1000'}
                              onChange={e => setField('remoteTsap', e.target.value)}
                              placeholder="0x1000 or 10.00"
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                            <span className="text-[9px] text-slate-400 mt-0.5 block">Default: 0x1000 (02.00)</span>
                          </div>
                        </div>
                        <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[10px] text-cyan-300/90 leading-relaxed">
                          <span className="font-bold">S7-200 V-Memory:</span> Connected via CP243-1 module. Variable Memory (V) is addressed as <code>VB100</code>, <code>VW100</code>, <code>VD100</code>, or <code>V100.0</code> and mapped directly to DB1.
                        </div>
                      </div>
                    ) : editingConn.s7Model === 'logo' ? (
                      <div className="space-y-2 pt-1">
                        <div className="p-2.5 bg-cyan-950/50 border border-cyan-700/50 rounded-xl text-[11px] text-cyan-200 leading-relaxed">
                          <div className="font-bold flex items-center space-x-1.5 text-cyan-300 mb-1">
                            <i className="fas fa-microchip text-xs"></i>
                            <span>LOGO! 0BA7 / 0BA8 Virtual DB1 Translation Active</span>
                          </div>
                          <p className="text-[10px] text-cyan-300/90">
                            You can directly enter native LOGO! Soft Comfort addresses:
                          </p>
                          <ul className="text-[10px] text-slate-300 list-disc list-inside mt-1 space-y-0.5 font-mono">
                            <li><span className="text-cyan-300 font-bold">I1..I24</span> &rarr; Digital Inputs (DB1.DBX923.0..925.7)</li>
                            <li><span className="text-cyan-300 font-bold">Q1..Q20</span> &rarr; Digital Outputs (DB1.DBX942.0..944.3)</li>
                            <li><span className="text-cyan-300 font-bold">M1..M64</span> &rarr; Internal Flags (DB1.DBX948.0..955.7)</li>
                            <li><span className="text-cyan-300 font-bold">AI1..AI8</span> &rarr; Analog Inputs (DB1.DBW926..940)</li>
                            <li><span className="text-cyan-300 font-bold">VW100 / VD100</span> &rarr; Variable Memory (DB1.DBW100 / DB1.DBD100)</li>
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Rack Number *</label>
                            <input
                              type="number"
                              value={editingConn.rack ?? 0}
                              onChange={e => setField('rack', parseInt(e.target.value) || 0)}
                              min={0} max={7}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">CPU Slot Number *</label>
                            <input
                              type="number"
                              value={editingConn.slot ?? (editingConn.s7Model === 's7_300' || editingConn.s7Model === 's7_400' ? 2 : 1)}
                              onChange={e => setField('slot', parseInt(e.target.value) || 1)}
                              min={0} max={31}
                              className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-[10px] text-cyan-300/90 leading-relaxed">
                          <span className="font-bold">TIA Portal Requirement:</span> Enable <em>"Permit access with PUT/GET communication from remote partner"</em> in CPU Protection & Security settings, and disable <em>"Optimized block access"</em> on DBs.
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Mitsubishi MELSEC (SLMP / MC Protocol) Settings Panel */}
              {editingConn.protocol === 'melsec' && (
                <div className="space-y-3 pt-1">
                  {/* Test Connection Probe Feedback Banner */}
                  {melsecTestStatus.testing && (
                    <div className="p-2.5 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-xs flex items-center space-x-2 animate-pulse">
                      <i className="fas fa-circle-notch fa-spin text-rose-400"></i>
                      <span>Probing Mitsubishi PLC at {editingConn.host || '127.0.0.1'}:{editingConn.port || 5007} (3E Binary Frame)...</span>
                    </div>
                  )}
                  {!melsecTestStatus.testing && melsecTestStatus.message && (
                    <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${melsecTestStatus.success ? 'bg-rose-950/70 border-rose-500/40 text-rose-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'}`}>
                      <div className="flex items-center space-x-2">
                        <i className={`fas ${melsecTestStatus.success ? 'fa-circle-check text-emerald-400' : 'fa-circle-xmark text-rose-400'}`}></i>
                        <span>{melsecTestStatus.message}</span>
                      </div>
                      <button type="button" onClick={() => setMelsecTestStatus({ testing: false })} className="text-slate-400 hover:text-white text-xs ml-2">✕</button>
                    </div>
                  )}

                  <div className="bg-slate-850 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center space-x-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
                        <i className="fas fa-microchip text-rose-400"></i>
                        <span>MELSEC Communication (MC Protocol)</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded-md border border-rose-700/50">
                        SLMP 3E Frame
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Controller Series *</label>
                        <select
                          value={editingConn.melsecSeries || 'iq_f'}
                          onChange={e => setField('melsecSeries', e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500"
                        >
                          <option value="iq_f">MELSEC iQ-F Series (FX5U / FX5UJ)</option>
                          <option value="iq_r">MELSEC iQ-R Series (R04, R08, R16)</option>
                          <option value="q_series">MELSEC-Q Series (Q02, Q06, Q13)</option>
                          <option value="l_series">MELSEC-L Series</option>
                          <option value="fx_series">MELSEC-FX Series (FX3U + ENET)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">Frame Type *</label>
                        <select
                          value={editingConn.melsecFrame || '3e_binary'}
                          onChange={e => setField('melsecFrame', e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
                        >
                          <option value="3e_binary">3E Binary Frame (Recommended)</option>
                          <option value="3e_ascii">3E ASCII Frame</option>
                          <option value="1e_binary">1E Binary Frame (Legacy FX)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">PLC IP Address & Port (Default: 5007) *</label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={editingConn.host || ''}
                          onChange={e => setField('host', e.target.value)}
                          placeholder="192.168.1.250"
                          className="flex-1 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
                        />
                        <input
                          type="number"
                          value={editingConn.port ?? 5007}
                          onChange={e => setField('port', parseInt(e.target.value) || 5007)}
                          min={1} max={65535}
                          className="w-24 bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-rose-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={testMelsecConnection}
                          disabled={melsecTestStatus.testing || !editingConn.host}
                          className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-sm"
                        >
                          <i className="fas fa-bolt text-[10px]"></i>
                          <span>Test PLC</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-1">Network No</label>
                        <input
                          type="number"
                          value={editingConn.networkNumber ?? 0}
                          onChange={e => setField('networkNumber', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-1">PC No</label>
                        <input
                          type="number"
                          value={editingConn.pcNumber ?? 255}
                          onChange={e => setField('pcNumber', parseInt(e.target.value) || 255)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-1">Dest Module I/O</label>
                        <input
                          type="number"
                          value={editingConn.destinationModuleIoNumber ?? 1023}
                          onChange={e => setField('destinationModuleIoNumber', parseInt(e.target.value) || 1023)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-300 mb-1">Station No</label>
                        <input
                          type="number"
                          value={editingConn.destinationModuleStationNumber ?? 0}
                          onChange={e => setField('destinationModuleStationNumber', parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-600 text-white text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-rose-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
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
                        checked={Boolean(editingConn.reopenSockets)}
                        onChange={e => setField('reopenSockets', e.target.checked)}
                        className="w-4 h-4 rounded text-violet-600 bg-slate-900 border-slate-600 focus:ring-0 focus:outline-none cursor-pointer"
                      />
                      <label htmlFor="reopenSockets" className="text-xs font-semibold text-slate-200 cursor-pointer select-none">
                        Close & Re-open socket on each poll (forces new connection)
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

      {/* Driver Connections Guided Tour Screen Overlay */}
      <CoachMarkOverlay
        tourId="driver_connections"
        isOpen={isDriverTourOpen}
        onClose={() => setIsDriverTourOpen(false)}
      />
    </div>
  );
};

export default DriverConnectionsView;
