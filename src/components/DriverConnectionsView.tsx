import React, { useState, useEffect } from 'react';
import { AppState, AppView, DriverConnection, DriverProtocol } from '../types';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';
import { useAppStore } from '../store/useAppStore';

import { createEmptyDriverConnection } from './driverConnections/constants';
import { DriverConnectionList } from './driverConnections/DriverConnectionList';
import { DriverBaseForm } from './driverConnections/forms/DriverBaseForm';
import { OpcUaConfigForm } from './driverConnections/forms/OpcUaConfigForm';
import { Iec61850ConfigForm } from './driverConnections/forms/Iec61850ConfigForm';
import { SiemensS7ConfigForm } from './driverConnections/forms/SiemensS7ConfigForm';
import { MelsecConfigForm } from './driverConnections/forms/MelsecConfigForm';
import { ModbusConfigForm } from './driverConnections/forms/ModbusConfigForm';
import { SerialConfigForm } from './driverConnections/forms/SerialConfigForm';
import { EthernetIpConfigForm } from './driverConnections/forms/EthernetIpConfigForm';
import { ProfinetConfigForm } from './driverConnections/forms/ProfinetConfigForm';
import { ProfibusConfigForm } from './driverConnections/forms/ProfibusConfigForm';
import { EdsManagerModal } from './EdsManagerModal';
import { GsdManagerModal } from './GsdManagerModal';

interface DriverConnectionsViewProps {
  onBack?: () => void;
  appState?: AppState;
  onNavigate?: (view: AppView) => void;
  onAdd?: (conn: DriverConnection) => void;
  onUpdate?: (conn: DriverConnection) => void;
  onDelete?: (connectionId: string) => void;
}

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
  const [isEdsModalOpen, setIsEdsModalOpen] = useState(false);
  const [isGsdModalOpen, setIsGsdModalOpen] = useState(false);
  const [editingConn, setEditingConn] = useState<Partial<DriverConnection>>(createEmptyDriverConnection());
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [detectedPorts, setDetectedPorts] = useState<Array<{ port: string; name: string; description?: string }>>([]);
  const [isScanningPorts, setIsScanningPorts] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTourSuppressed('driver_connections')) {
      setIsDriverTourOpen(true);
    }
  }, []);

  const scanSerialPorts = async () => {
    setIsScanningPorts(true);
    setScanError(null);
    try {
      const res = await fetch('/api/serial/ports');
      const data = await res.json();
      if (data.success && Array.isArray(data.ports)) {
        setDetectedPorts(data.ports);
      } else {
        setScanError('Failed to enumerate COM / TTY ports');
      }
    } catch (err: any) {
      setScanError(err.message || 'Error communicating with serial backend service');
    } finally {
      setIsScanningPorts(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingConn(createEmptyDriverConnection());
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (conn: DriverConnection) => {
    setEditingConn({ ...conn });
    setIsEditing(true);
    setIsFormOpen(true);
    if (['modbus_rtu', 'rs485', 'rs232', 'usb_serial'].includes(conn.protocol || '')) {
      scanSerialPorts();
    }
  };

  const handleSave = () => {
    if (!editingConn.connectionName?.trim()) {
      alert('Connection Name is required');
      return;
    }
    const conn = editingConn as DriverConnection;
    if (isEditing) {
      onUpdate(conn);
    } else {
      onAdd(conn);
    }
    setIsFormOpen(false);
  };

  const handleDelete = (connectionId: string) => {
    onDelete(connectionId);
    setDeleteConfirmId(null);
  };

  const setField = (key: keyof DriverConnection, value: any) => {
    setEditingConn(prev => ({ ...prev, [key]: value }));
  };

  const isSerialProtocol = ['modbus_rtu', 'rs485', 'rs232', 'usb_serial'].includes(editingConn.protocol || '');
  const isTcpProtocol = ['modbus_tcp', 'tcp_custom', 'custom'].includes(editingConn.protocol || '');
  const isModbus = ['modbus_tcp', 'modbus_rtu'].includes(editingConn.protocol || '');

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Back to Dashboard"
          >
            <i className="fas fa-arrow-left text-lg"></i>
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>Driver Connections</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                {connections.length} configured
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Manage industrial hardware communication channels (PROFINET, PROFIBUS, EtherNet/IP, OPC UA, Modbus TCP/RTU, S7, MELSEC, IEC 61850)</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setIsGsdModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Open GSD & GSDML Device Profile Catalog (PROFINET / PROFIBUS)"
          >
            <i className="fas fa-microchip text-emerald-400"></i>
            <span>GSD Catalog</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEdsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Open ODVA EDS Device Profile Catalog"
          >
            <i className="fas fa-file-invoice text-amber-400"></i>
            <span>EDS Catalog</span>
          </button>
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
        <DriverConnectionList
          connections={connections}
          deleteConfirmId={deleteConfirmId}
          onOpenAdd={handleOpenAdd}
          onOpenEdit={handleOpenEdit}
          onDeleteConfirm={setDeleteConfirmId}
          onDeleteCancel={() => setDeleteConfirmId(null)}
          onDelete={handleDelete}
        />
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
              <DriverBaseForm
                conn={editingConn}
                setField={setField}
                onProtocolChange={(nextProto: DriverProtocol) => {
                  if (['modbus_rtu', 'rs485', 'rs232', 'usb_serial'].includes(nextProto)) {
                    scanSerialPorts();
                  }
                }}
              />

              {/* Protocol-Specific Forms */}
              {editingConn.protocol === 'profinet' && (
                <ProfinetConfigForm
                  conn={editingConn}
                  setField={setField}
                  onOpenGsdManager={() => setIsGsdModalOpen(true)}
                />
              )}

              {editingConn.protocol === 'profibus' && (
                <ProfibusConfigForm
                  conn={editingConn}
                  setField={setField}
                  onOpenGsdManager={() => setIsGsdModalOpen(true)}
                />
              )}

              {editingConn.protocol === 'ethernet_ip' && (
                <EthernetIpConfigForm
                  conn={editingConn}
                  setField={setField}
                  onOpenEdsManager={() => setIsEdsModalOpen(true)}
                />
              )}

              {(editingConn.protocol === 'opcua' || editingConn.protocol === 'opcda') && (
                <OpcUaConfigForm conn={editingConn} setField={setField} />
              )}

              {editingConn.protocol === 'iec61850' && (
                <Iec61850ConfigForm conn={editingConn} setField={setField} />
              )}

              {editingConn.protocol === 's7' && (
                <SiemensS7ConfigForm conn={editingConn} setField={setField} />
              )}

              {editingConn.protocol === 'melsec' && (
                <MelsecConfigForm conn={editingConn} setField={setField} />
              )}

              {(isTcpProtocol || isModbus) && (
                <ModbusConfigForm
                  conn={editingConn}
                  setField={setField}
                  isTcpProtocol={isTcpProtocol}
                  isModbus={isModbus}
                />
              )}

              {isSerialProtocol && (
                <SerialConfigForm
                  conn={editingConn}
                  setField={setField}
                  detectedPorts={detectedPorts}
                  isScanningPorts={isScanningPorts}
                  scanError={scanError}
                  scanSerialPorts={scanSerialPorts}
                  isModbus={isModbus}
                />
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
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-lg shadow-violet-600/30"
              >
                {isEditing ? 'Save Changes' : 'Create Connection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GSD / GSDML Device Profile Catalog Modal */}
      <GsdManagerModal
        isOpen={isGsdModalOpen}
        onClose={() => setIsGsdModalOpen(false)}
        connections={connections}
        onGenerateTags={(tags) => {
          tags.forEach(t => store.handleAddDriverTag(t));
        }}
      />

      {/* EDS Device Profile Catalog Modal */}
      <EdsManagerModal
        isOpen={isEdsModalOpen}
        onClose={() => setIsEdsModalOpen(false)}
        connections={connections}
        onGenerateTags={(tags) => {
          tags.forEach(t => store.handleAddDriverTag(t));
        }}
      />

      {/* Driver Connections Guided Tour Coach Marks */}
      <CoachMarkOverlay
        tourId="driver_connections"
        isOpen={isDriverTourOpen}
        onClose={() => setIsDriverTourOpen(false)}
        onComplete={() => setIsDriverTourOpen(false)}
      />
    </div>
  );
};

export default DriverConnectionsView;
