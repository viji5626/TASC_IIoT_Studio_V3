import React, { useState } from 'react';
import { BatchRecord, BatchStatus, RawMaterialLot, BatchProcessParameter } from '../../types/traceability';

interface BatchCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (newBatch: BatchRecord) => void;
}

export const BatchCreateModal: React.FC<BatchCreateModalProps> = ({
  isOpen,
  onClose,
  onSaveBatch
}) => {
  const [batchNumber, setBatchNumber] = useState<string>(`BATCH-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [workOrderNumber, setWorkOrderNumber] = useState<string>(`WO-${Math.floor(1000 + Math.random() * 9000)}-PROD`);
  const [recipeName, setRecipeName] = useState<string>('Custom Industrial Batch Formulation');
  const [recipeVersion, setRecipeVersion] = useState<string>('v1.0');
  const [lineName, setLineName] = useState<string>('Production Line #1');
  const [targetQuantity, setTargetQuantity] = useState<number>(5000);
  const [unit, setUnit] = useState<string>('Units');
  const [leadOperator, setLeadOperator] = useState<string>('Line Supervisor');
  const [supervisorName, setSupervisorName] = useState<string>('Plant QA Lead');

  // Raw Materials
  const [rawMaterials, setRawMaterials] = useState<RawMaterialLot[]>([
    {
      id: 'RM-1',
      lotNumber: 'LOT-RAW-001',
      materialCode: 'ING-BASE-01',
      materialName: 'Primary Raw Material Compound',
      supplierName: 'Industrial Supply Corp',
      supplierLotNumber: 'SUP-9921',
      inwardDate: new Date().toISOString().split('T')[0],
      expiryDate: '2028-12-31',
      quantityUsed: 500,
      unit: 'kg',
      coaAttached: true,
      qualityGrade: 'A',
      passedInspection: true
    }
  ]);

  // Process Parameters
  const [parameters, setParameters] = useState<BatchProcessParameter[]>([
    {
      id: 'PARAM-1',
      name: 'Process Temperature',
      unit: '°C',
      tagAddress: 'line1/temperature_c',
      setpoint: 65.0,
      minLimit: 60.0,
      maxLimit: 70.0,
      currentValue: 65.2,
      avgValue: 65.0,
      minValue: 64.5,
      maxValue: 65.8,
      oosViolationCount: 0,
      telemetryHistory: []
    },
    {
      id: 'PARAM-2',
      name: 'Vessel Pressure',
      unit: 'bar',
      tagAddress: 'line1/pressure_bar',
      setpoint: 2.5,
      minLimit: 2.0,
      maxLimit: 3.0,
      currentValue: 2.51,
      avgValue: 2.50,
      minValue: 2.45,
      maxValue: 2.55,
      oosViolationCount: 0,
      telemetryHistory: []
    }
  ]);

  if (!isOpen) return null;

  const handleAddRawMaterial = () => {
    const newRm: RawMaterialLot = {
      id: `RM-${Date.now()}`,
      lotNumber: `LOT-RAW-${Math.floor(100 + Math.random() * 900)}`,
      materialCode: 'ING-ADDON',
      materialName: 'Secondary Additive / Ingredient',
      supplierName: 'Chemical Vendor Ltd',
      supplierLotNumber: `VEND-${Math.floor(1000 + Math.random() * 9000)}`,
      inwardDate: new Date().toISOString().split('T')[0],
      expiryDate: '2028-12-31',
      quantityUsed: 100,
      unit: 'kg',
      coaAttached: true,
      qualityGrade: 'A',
      passedInspection: true
    };
    setRawMaterials(prev => [...prev, newRm]);
  };

  const handleRemoveRawMaterial = (id: string) => {
    setRawMaterials(prev => prev.filter(r => r.id !== id));
  };

  const handleAddParameter = () => {
    const newParam: BatchProcessParameter = {
      id: `PARAM-${Date.now()}`,
      name: 'New Monitored Parameter',
      unit: 'Units',
      tagAddress: 'line1/sensor_val',
      setpoint: 100,
      minLimit: 90,
      maxLimit: 110,
      currentValue: 100,
      avgValue: 100,
      minValue: 98,
      maxValue: 102,
      oosViolationCount: 0,
      telemetryHistory: []
    };
    setParameters(prev => [...prev, newParam]);
  };

  const handleRemoveParameter = (id: string) => {
    setParameters(prev => prev.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newBatch: BatchRecord = {
      id: `batch_${Date.now()}`,
      batchNumber,
      workOrderNumber,
      recipeName,
      recipeVersion,
      lineId: 'line_custom',
      lineName,
      status: BatchStatus.IN_PROGRESS,
      targetQuantity,
      actualQuantity: 0,
      scrapQuantity: 0,
      yieldPercentage: 100.0,
      unit,
      startTimestamp: Date.now(),
      durationMinutes: 0,
      leadOperator,
      supervisorName,
      rawMaterials,
      parameters,
      finishedSerials: [],
      auditTrail: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: Date.now(),
          action: 'Batch & Work Order Created with Custom Recipe & Tag Bindings',
          performedBy: leadOperator,
          role: 'Production Supervisor',
          signatureMeaning: 'CREATE',
          details: `Target: ${targetQuantity} ${unit}. Raw Materials: ${rawMaterials.length} lots bound. Process Tags: ${parameters.length} CPPs configured.`
        }
      ]
    };

    onSaveBatch(newBatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <i className="fas fa-plus text-sm"></i>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Create Work Order & Batch with Raw Tag Bindings</h2>
              <p className="text-[11px] text-slate-400">
                Define Recipe Parameters, Inward Material Lots & Field Sensor Tag Addresses
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          {/* General Batch Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Batch Number</label>
              <input
                type="text"
                value={batchNumber}
                onChange={e => setBatchNumber(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Work Order #</label>
              <input
                type="text"
                value={workOrderNumber}
                onChange={e => setWorkOrderNumber(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Quantity & Unit</label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  value={targetQuantity}
                  onChange={e => setTargetQuantity(Number(e.target.value))}
                  required
                  min={1}
                  className="w-2/3 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. Liters, Units"
                  required
                  className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Product Recipe Name</label>
              <input
                type="text"
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Line / Equipment Name</label>
              <input
                type="text"
                value={lineName}
                onChange={e => setLineName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Raw Material Lots Section */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <i className="fas fa-boxes-stacked text-indigo-400"></i>
                <span>Inward Raw Material Lots ({rawMaterials.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddRawMaterial}
                className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-md text-[10px] font-bold"
              >
                + Add Raw Lot
              </button>
            </div>

            <div className="space-y-2">
              {rawMaterials.map((rm, idx) => (
                <div key={rm.id} className="grid grid-cols-1 sm:grid-cols-4 gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800 items-center">
                  <div>
                    <input
                      type="text"
                      value={rm.materialName}
                      onChange={e => {
                        const val = e.target.value;
                        setRawMaterials(prev => prev.map(r => r.id === rm.id ? { ...r, materialName: val } : r));
                      }}
                      placeholder="Material Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={rm.lotNumber}
                      onChange={e => {
                        const val = e.target.value;
                        setRawMaterials(prev => prev.map(r => r.id === rm.id ? { ...r, lotNumber: val } : r));
                      }}
                      placeholder="Lot Number"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={rm.supplierName}
                      onChange={e => {
                        const val = e.target.value;
                        setRawMaterials(prev => prev.map(r => r.id === rm.id ? { ...r, supplierName: val } : r));
                      }}
                      placeholder="Supplier Name"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={rm.quantityUsed}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setRawMaterials(prev => prev.map(r => r.id === rm.id ? { ...r, quantityUsed: val } : r));
                      }}
                      placeholder="Qty"
                      className="w-20 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRawMaterial(rm.id)}
                      className="w-6 h-6 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 flex items-center justify-center text-xs"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Process Parameters & PLC Raw Tag Mappings */}
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <i className="fas fa-gauge-high text-cyan-400"></i>
                <span>Critical Process Parameters (CPPs) & PLC Tag Addresses ({parameters.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddParameter}
                className="px-2 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/40 rounded-md text-[10px] font-bold"
              >
                + Add Parameter
              </button>
            </div>

            <div className="space-y-2">
              {parameters.map(param => (
                <div key={param.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 p-2 bg-slate-900/80 rounded-lg border border-slate-800 items-center">
                  <div>
                    <label className="text-[9px] text-slate-400 block">Parameter Name</label>
                    <input
                      type="text"
                      value={param.name}
                      onChange={e => {
                        const val = e.target.value;
                        setParameters(prev => prev.map(p => p.id === param.id ? { ...p, name: val } : p));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">PLC Tag / MQTT Topic</label>
                    <input
                      type="text"
                      value={param.tagAddress || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setParameters(prev => prev.map(p => p.id === param.id ? { ...p, tagAddress: val } : p));
                      }}
                      placeholder="e.g. DB1.DBD10 / topic"
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-xs text-cyan-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Setpoint (SP) & Unit</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={param.setpoint}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setParameters(prev => prev.map(p => p.id === param.id ? { ...p, setpoint: val, currentValue: val } : p));
                        }}
                        className="w-16 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                      <input
                        type="text"
                        value={param.unit}
                        onChange={e => {
                          const val = e.target.value;
                          setParameters(prev => prev.map(p => p.id === param.id ? { ...p, unit: val } : p));
                        }}
                        className="w-12 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[9px] text-slate-400 block">Limits (LSL - USL)</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        value={param.minLimit}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setParameters(prev => prev.map(p => p.id === param.id ? { ...p, minLimit: val } : p));
                        }}
                        className="w-14 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-amber-300 font-mono"
                      />
                      <span className="text-slate-500 self-center">-</span>
                      <input
                        type="number"
                        value={param.maxLimit}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setParameters(prev => prev.map(p => p.id === param.id ? { ...p, maxLimit: val } : p));
                        }}
                        className="w-14 bg-slate-950 border border-slate-700 rounded p-1 text-xs text-rose-300 font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveParameter(param.id)}
                      className="w-6 h-6 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/40 flex items-center justify-center text-xs"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md transition-all"
            >
              Launch Work Order & Batch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
