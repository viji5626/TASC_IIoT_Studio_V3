import React, { useState, useEffect, useMemo } from 'react';
import {
  FddActiveFault,
  FddAsset,
  FddRule,
  FddWorkOrder,
  FddState,
  FddSeverity,
  FddAiDiagnosticReport
} from '../utils/fddTypes';
import {
  evaluateAllFddRules,
  getFddState,
  acknowledgeFddFault,
  saveFddRule,
  deleteFddRule,
  saveFddWorkOrder,
  attachFddAiReport,
  resetFddDefaults
} from '../utils/fddEngine';
import { runFddRootCauseAnalysis, queryFddNaturalLanguage } from '../utils/fddAiDiagnostics';
import { AppState } from '../types';
import { CoachMarkOverlay } from './CoachMarkOverlay';
import { isTourSuppressed } from '../utils/tourRegistry';
import { useCurrency } from '../utils/currencyManager';

interface FddPredictiveMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  appState: AppState;
}

export const FddPredictiveMaintenanceModal: React.FC<FddPredictiveMaintenanceModalProps> = ({
  isOpen,
  onClose,
  latestValues,
  appState
}) => {
  const [fddState, setFddState] = useState<FddState>(() => getFddState());
  const [isFddTourOpen, setIsFddTourOpen] = useState<boolean>(false);
  const [currency, setCurrency] = useCurrency();
  const [activeTab, setActiveTab] = useState<'active_faults' | 'asset_tree' | 'trend_overlay' | 'work_orders' | 'rule_builder'>('active_faults');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('asset_chiller_1');
  const [selectedTagKey, setSelectedTagKey] = useState<string>('Chiller.DischargeTemp');

  // AI RCA & NLP Query State
  const [analyzingFaultId, setAnalyzingFaultId] = useState<string | null>(null);
  const [activeAiReport, setActiveAiReport] = useState<FddAiDiagnosticReport | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResultMarkdown, setSearchResultMarkdown] = useState<string | null>(null);

  // Work Order Form State
  const [showNewOrderModal, setShowNewOrderModal] = useState<boolean>(false);
  const [newOrderAssetId, setNewOrderAssetId] = useState<string>('asset_chiller_1');
  const [newOrderTitle, setNewOrderTitle] = useState<string>('');
  const [newOrderPriority, setNewOrderPriority] = useState<FddSeverity>('HIGH');
  const [newOrderTechnician, setNewOrderTechnician] = useState<string>('Lead Reliability Engineer');

  // Rule Form State
  const [showRuleModal, setShowRuleModal] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<Partial<FddRule>>({
    name: '',
    assetId: 'asset_chiller_1',
    assetName: 'Chiller Unit #1 (York 450 TR)',
    category: 'chiller',
    expression: '',
    severity: 'HIGH',
    debounceSeconds: 5,
    deadband: 1,
    energyWasteKw: 15,
    costPerHour: 40,
    enabled: true,
    description: ''
  });

  // Evaluate rules periodically with live telemetry
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      const updated = evaluateAllFddRules(latestValues);
      setFddState({ ...updated });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, latestValues]);

  // Sync state on open & trigger FDD tour if not suppressed
  useEffect(() => {
    if (isOpen) {
      setFddState(getFddState());
      if (!isTourSuppressed('fdd')) {
        setIsFddTourOpen(true);
      }
    }
  }, [isOpen]);

  // Filtered Faults
  const filteredFaults = useMemo(() => {
    return fddState.activeFaults.filter(f => severityFilter === 'ALL' || f.severity === severityFilter);
  }, [fddState.activeFaults, severityFilter]);

  // Trigger AI Root Cause Analysis
  const handleRunRca = async (fault: FddActiveFault) => {
    setAnalyzingFaultId(fault.faultId);
    try {
      const report = await runFddRootCauseAnalysis(fault);
      attachFddAiReport(fault.faultId, report);
      setActiveAiReport(report);
      setFddState(getFddState());
    } catch (err) {
      console.error('RCA failed:', err);
    } finally {
      setAnalyzingFaultId(null);
    }
  };

  // Natural Language Search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const answer = queryFddNaturalLanguage(searchQuery, fddState);
    setSearchResultMarkdown(answer);
  };

  // Acknowledge Fault
  const handleAcknowledge = (faultId: string) => {
    acknowledgeFddFault(faultId, appState.userRole || 'Operator', 'Acknowledged from FDD Dashboard');
    setFddState(getFddState());
  };

  // Create Work Order
  const handleCreateWorkOrder = () => {
    if (!newOrderTitle.trim()) return;
    const asset = fddState.assets.find(a => a.assetId === newOrderAssetId) || fddState.assets[0];
    const nowMs = Date.now();
    const newOrder: FddWorkOrder = {
      orderId: `wo_${nowMs}`,
      assetId: asset.assetId,
      assetName: asset.name,
      title: newOrderTitle.trim(),
      description: `Predictive Maintenance task created via FDDWorx Manager.`,
      priority: newOrderPriority,
      status: 'SCHEDULED',
      createdIso: new Date(nowMs).toISOString(),
      dueIso: new Date(nowMs + 3 * 24 * 3600 * 1000).toISOString(),
      assignedTechnician: newOrderTechnician.trim() || 'Maintenance Technician',
      estimatedDowntimeMinutes: 45,
      checklist: [
        { id: 'c1', label: 'Safety lock-out & physical area barrier setup', completed: false },
        { id: 'c2', label: 'Inspect mechanical fittings, bearings, and lubrication', completed: false },
        { id: 'c3', label: 'Execute corrective repairs and replacement of worn components', completed: false },
        { id: 'c4', label: 'Perform post-maintenance commissioning test and baseline verification', completed: false }
      ],
      spareParts: [
        { partNumber: 'SP-FILT-01', name: 'Replacement Seal/Filter Kit', quantity: 1 }
      ]
    };
    saveFddWorkOrder(newOrder);
    setFddState(getFddState());
    setShowNewOrderModal(false);
    setNewOrderTitle('');
    setActiveTab('work_orders');
  };

  // Toggle Checklist Item
  const handleToggleChecklist = (orderId: string, checkId: string) => {
    const order = fddState.workOrders.find(w => w.orderId === orderId);
    if (!order) return;
    const updated = {
      ...order,
      checklist: order.checklist.map(c => c.id === checkId ? { ...c, completed: !c.completed } : c)
    };
    // Auto complete order if all items checked
    if (updated.checklist.every(c => c.completed)) {
      updated.status = 'COMPLETED';
      updated.completedIso = new Date().toISOString();
    } else {
      updated.status = 'IN_PROGRESS';
    }
    saveFddWorkOrder(updated);
    setFddState(getFddState());
  };

  // Save Rule
  const handleSaveRule = () => {
    if (!editingRule.name || !editingRule.expression) return;
    const asset = fddState.assets.find(a => a.assetId === editingRule.assetId) || fddState.assets[0];
    const rule: FddRule = {
      ruleId: editingRule.ruleId || `rule_${Date.now()}`,
      name: editingRule.name,
      assetId: asset.assetId,
      assetName: asset.name,
      category: asset.category,
      expression: editingRule.expression,
      severity: (editingRule.severity as FddSeverity) || 'HIGH',
      debounceSeconds: Number(editingRule.debounceSeconds) || 5,
      deadband: Number(editingRule.deadband) || 1,
      energyWasteKw: Number(editingRule.energyWasteKw) || 10,
      costPerHour: Number(editingRule.costPerHour) || 30,
      enabled: editingRule.enabled !== undefined ? editingRule.enabled : true,
      description: editingRule.description || '',
      createdIso: editingRule.createdIso || new Date().toISOString()
    };
    saveFddRule(rule);
    setFddState(getFddState());
    setShowRuleModal(false);
  };

  // Simulate Instant Mock Event for Testing
  const handleSimulateMockFault = () => {
    const nowMs = Date.now();
    const mockFault: FddActiveFault = {
      faultId: `mock_fault_${nowMs}`,
      ruleId: 'rule_chiller_overheat',
      ruleName: 'Chiller Overheat with Low Water Flow',
      assetId: 'asset_chiller_1',
      assetName: 'Chiller Unit #1 (York 450 TR)',
      category: 'chiller',
      severity: 'CRITICAL',
      triggerTimestamp: new Date(nowMs).toISOString(),
      triggerTimestampMs: nowMs,
      triggerValues: { 'Chiller.DischargeTemp': 88.4, 'Chiller.WaterFlow': 19.1 },
      durationSeconds: 180,
      energyWasteKw: 45.0,
      costPerHour: 120.0,
      totalCostImpact: 6.00,
      ackStatus: false
    };
    fddState.activeFaults.push(mockFault);
    setFddState({ ...fddState });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-7xl h-[92vh] max-h-[920px] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-md">
              <i className="fas fa-shield-halved text-white text-lg"></i>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Fault Detection & Diagnostics (FDDWorx)
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-indigo-900/60 border border-indigo-500/50 text-indigo-300 rounded-md uppercase">
                  Predictive CBM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-variable industrial fault detection, financial waste tracking, and AI-driven Root Cause Analysis.
              </p>
            </div>
          </div>

          {/* Quick Simulation, Currency Selector & Action Buttons */}
          <div className="flex items-center space-x-2.5">
            {/* Currency Selector Pill */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setCurrency('$')}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                  currency === '$'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display financial metrics in US Dollar ($)"
              >
                <span>$</span>
                <span className="text-[10px] hidden sm:inline">USD</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrency('₹')}
                className={`px-2 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center space-x-1 ${
                  currency === '₹'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Display financial metrics in Indian Rupee (₹)"
              >
                <span>₹</span>
                <span className="text-[10px] hidden sm:inline">INR</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsFddTourOpen(true)}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Launch FDD & Predictive Maintenance Guided Tour"
            >
              <i className="fas fa-wand-magic-sparkles text-indigo-400"></i>
              <span>Tour</span>
            </button>
            <button
              type="button"
              data-tour="fdd-sim-btn"
              onClick={handleSimulateMockFault}
              className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Inject simulated chiller fault to test live FDD detection & RCA"
            >
              <i className="fas fa-bolt-lightning text-amber-400"></i>
              <span>Simulate Fault</span>
            </button>
            <button
              type="button"
              onClick={resetFddDefaults}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <i className="fas fa-rotate-left"></i>
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* KPI Executive Bar */}
        <div data-tour="fdd-kpis" className="bg-slate-900/90 border-b border-slate-800/80 px-6 py-3 grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${fddState.kpis.activeCount > 0 ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-400'}`}>
              <i className="fas fa-triangle-exclamation"></i>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Active Faults</div>
              <div className="text-sm font-bold text-white">{fddState.kpis.activeCount} <span className="text-xs text-red-400 font-normal">({fddState.kpis.criticalCount} Critical)</span></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm font-mono">
              {currency}
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Financial Waste Rate</div>
              <div className="text-sm font-bold text-amber-300 font-mono">{currency}{fddState.kpis.totalCostPerHour}<span className="text-[10px] text-slate-400">/hr</span></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <i className="fas fa-plug-circle-bolt"></i>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Energy Waste</div>
              <div className="text-sm font-bold text-orange-300 font-mono">{fddState.kpis.totalEnergyWasteKw} <span className="text-[10px] text-slate-400">kW</span></div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <i className="fas fa-heart-pulse"></i>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Plant Health Index</div>
              <div className="text-sm font-bold text-sky-300 font-mono">{fddState.kpis.avgHealthIndex}%</div>
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Open Work Orders</div>
              <div className="text-sm font-bold text-indigo-300">{fddState.kpis.openWorkOrdersCount}</div>
            </div>
          </div>
        </div>

        {/* Natural Language Query Bar */}
        <div data-tour="fdd-nlp-search" className="bg-slate-950/40 px-6 py-2.5 border-b border-slate-800/80 flex items-center space-x-2">
          <i className="fas fa-sparkles text-indigo-400 text-sm"></i>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder='Ask AI in plain English (e.g. "What faults are active?", "Which asset is wasting the most energy?", "Show chiller status")...'
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            Ask AI
          </button>
        </div>

        {/* NLP Search Result Banner (if query executed) */}
        {searchResultMarkdown && (
          <div className="mx-6 mt-3 p-3.5 bg-indigo-950/40 border border-indigo-500/40 rounded-xl text-xs text-slate-200 flex items-start justify-between">
            <div className="whitespace-pre-wrap leading-relaxed flex-1">
              {searchResultMarkdown}
            </div>
            <button
              type="button"
              onClick={() => setSearchResultMarkdown(null)}
              className="text-slate-400 hover:text-white ml-3"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div data-tour="fdd-tabs" className="px-6 border-b border-slate-800 flex items-center space-x-1 shrink-0 bg-slate-950/30">
          {[
            { id: 'active_faults', label: 'Active Faults & Cost Matrix', icon: 'fa-triangle-exclamation', count: fddState.activeFaults.length },
            { id: 'asset_tree', label: 'Hierarchical Asset Tree', icon: 'fa-sitemap' },
            { id: 'trend_overlay', label: 'Fault Trend Overlay', icon: 'fa-chart-line' },
            { id: 'work_orders', label: 'Predictive Work Orders', icon: 'fa-clipboard-list', count: fddState.workOrders.length },
            { id: 'rule_builder', label: 'FDD Rule Engine Builder', icon: 'fa-code-branch', count: fddState.rules.length }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    tab.id === 'active_faults' && tab.count > 0 ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Active Faults & Financial Impact */}
        {activeTab === 'active_faults' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Severity Filter Pills */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-slate-400">Filter Severity:</span>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-400">
                Showing {filteredFaults.length} active fault(s)
              </span>
            </div>

            {filteredFaults.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <i className="fas fa-circle-check text-emerald-400 text-4xl mb-3"></i>
                <h3 className="text-sm font-bold text-white">All Monitored Equipment Healthy</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Zero multi-variable fault conditions or operating envelope breaches detected.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {filteredFaults.map((fault) => {
                  const isCrit = fault.severity === 'CRITICAL';
                  const isHigh = fault.severity === 'HIGH';
                  return (
                    <div
                      key={fault.faultId}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCrit
                          ? 'bg-red-950/30 border-red-500/50 shadow-md ring-1 ring-red-500/20'
                          : isHigh
                          ? 'bg-amber-950/30 border-amber-500/50'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center space-x-2.5">
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                              isCrit ? 'bg-red-600 text-white animate-pulse' : isHigh ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-200'
                            }`}>
                              {fault.severity}
                            </span>
                            <h4 className="text-sm font-bold text-white">{fault.ruleName}</h4>
                            <span className="text-xs text-slate-400">on <strong>{fault.assetName}</strong></span>
                          </div>
                          
                          {/* Trigger Values Pill */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {Object.entries(fault.triggerValues).map(([k, v]) => (
                              <span key={k} className="px-2 py-0.5 bg-slate-950/80 border border-slate-800 rounded-md text-[11px] font-mono text-slate-300">
                                <strong className="text-slate-400">{k}:</strong> <span className="text-amber-400 font-bold">{String(v)}</span>
                              </span>
                            ))}
                            <span className="text-[11px] text-slate-400 ml-2">
                              Duration: <strong className="text-slate-200">{Math.floor(fault.durationSeconds / 60)}m {fault.durationSeconds % 60}s</strong>
                            </span>
                          </div>
                        </div>

                        {/* Financial Waste Rate */}
                        <div className="text-right">
                          <div className="text-[10px] text-slate-400 uppercase font-semibold">Waste Rate</div>
                          <div className="text-sm font-bold text-amber-300 font-mono">
                            {currency}{fault.costPerHour}/hr
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Accumulated: <strong className="text-slate-200 font-mono">{currency}{fault.totalCostImpact}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleRunRca(fault)}
                            disabled={analyzingFaultId === fault.faultId}
                            className="px-3.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            {analyzingFaultId === fault.faultId ? (
                              <>
                                <i className="fas fa-circle-notch fa-spin text-indigo-400"></i>
                                <span>Analyzing Historian...</span>
                              </>
                            ) : (
                              <>
                                <i className="fas fa-brain text-indigo-400"></i>
                                <span>AI Root Cause Analysis (RCA)</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNewOrderAssetId(fault.assetId);
                              setNewOrderTitle(`Corrective Action: ${fault.ruleName}`);
                              setNewOrderPriority(fault.severity);
                              setShowNewOrderModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                          >
                            <i className="fas fa-clipboard-plus text-sky-400"></i>
                            <span>Create Work Order</span>
                          </button>
                        </div>

                        <div>
                          {fault.ackStatus ? (
                            <span className="text-xs text-emerald-400 flex items-center space-x-1">
                              <i className="fas fa-check-circle"></i>
                              <span>Acked by {fault.ackUser}</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAcknowledge(fault.faultId)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
                            >
                              <i className="fas fa-bell-slash"></i>
                              <span>Acknowledge</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Hierarchical Equipment Asset Tree */}
        {activeTab === 'asset_tree' && (
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fddState.assets.map((asset) => {
              const faults = fddState.activeFaults.filter(f => f.assetId === asset.assetId);
              return (
                <div
                  key={asset.assetId}
                  className="bg-slate-950/50 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {asset.category.replace('_', ' ')}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-slate-400">Health:</span>
                        <span className={`text-xs font-bold font-mono ${asset.healthIndex >= 85 ? 'text-emerald-400' : asset.healthIndex >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          {asset.healthIndex}%
                        </span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white">{asset.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{asset.location}</p>

                    {/* Primary Telemetry Bindings */}
                    <div className="mt-3 pt-2.5 border-t border-slate-850 space-y-1.5">
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Monitored Primary Tags:</div>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                        {Object.entries(asset.primaryTags).map(([tagType, tagName]) => {
                          const tagKey = typeof tagName === 'string' ? tagName : '';
                          const liveVal = tagKey ? latestValues[tagKey]?.val : undefined;
                          return (
                            <div key={tagType} className="bg-slate-900/80 p-1.5 rounded-lg border border-slate-800 flex justify-between">
                              <span className="text-slate-400 capitalize">{tagType}:</span>
                              <span className="text-sky-300 font-bold">{liveVal !== undefined ? String(liveVal) : '-'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className={`text-xs font-semibold ${faults.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      <i className={`fas ${faults.length > 0 ? 'fa-triangle-exclamation' : 'fa-circle-check'} mr-1`}></i>
                      {faults.length} Active Faults
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAssetId(asset.assetId);
                        const firstTag = Object.values(asset.primaryTags)[0];
                        if (firstTag) setSelectedTagKey(firstTag);
                        setActiveTab('trend_overlay');
                      }}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      View Trend Overlay &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 3: Embedded Fault Trend Overlay */}
        {activeTab === 'trend_overlay' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center space-x-3">
                <label className="text-xs font-semibold text-slate-300">Select Equipment:</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    const a = fddState.assets.find(as => as.assetId === e.target.value);
                    if (a && Object.values(a.primaryTags)[0]) {
                      setSelectedTagKey(Object.values(a.primaryTags)[0]!);
                    }
                  }}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                >
                  {fddState.assets.map(a => (
                    <option key={a.assetId} value={a.assetId}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400">Tag:</span>
                <span className="text-xs font-mono font-bold text-indigo-300">{selectedTagKey}</span>
              </div>
            </div>

            {/* Interactive SVG Trend Chart with Fault Overlay Marker */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 h-80 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Time-Series Telemetry with FDD Fault Trigger Overlay</span>
                <span className="text-red-400 font-semibold flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                  <span>Fault Trigger Point</span>
                </span>
              </div>

              {/* Simulated SVG Graph */}
              <div className="relative w-full h-56 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="800" y2="40" stroke="#334155" strokeDasharray="4" strokeWidth="1" />
                  <line x1="0" y1="100" x2="800" y2="100" stroke="#334155" strokeDasharray="4" strokeWidth="1" />
                  <line x1="0" y1="160" x2="800" y2="160" stroke="#334155" strokeDasharray="4" strokeWidth="1" />

                  {/* High Threshold Line */}
                  <line x1="0" y1="60" x2="800" y2="60" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5" />
                  <text x="10" y="55" fill="#ef4444" fontSize="10" fontFamily="monospace">Upper Fault Threshold (85°C)</text>

                  {/* Telemetry Curve */}
                  <path
                    d="M 0 140 Q 200 130, 400 110 T 550 55 T 800 50"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="3"
                  />

                  {/* Fault Trigger Overlay Marker */}
                  <line x1="550" y1="0" x2="550" y2="200" stroke="#ef4444" strokeWidth="2" />
                  <circle cx="550" cy="55" r="6" fill="#ef4444" className="animate-pulse" />
                  <text x="560" y="20" fill="#f87171" fontSize="10" fontWeight="bold">FAULT TRIGGERED (88.4°C)</text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>-30m</span>
                <span>-20m</span>
                <span>-10m</span>
                <span>Fault Event (Now)</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Predictive Work Orders */}
        {activeTab === 'work_orders' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Maintenance Work Order Schedule</h3>
                <p className="text-xs text-slate-400">Track and execute SOP preventive maintenance checklists.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewOrderModal(true)}
                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
              >
                <i className="fas fa-plus mr-1.5"></i>
                <span>New Work Order</span>
              </button>
            </div>

            {fddState.workOrders.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-slate-800">
                <i className="fas fa-clipboard-check text-slate-500 text-3xl mb-2"></i>
                <p className="text-xs text-slate-400">No scheduled work orders. Create one or auto-generate from an active fault.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fddState.workOrders.map((order) => (
                  <div key={order.orderId} className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          order.priority === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                        }`}>
                          {order.priority}
                        </span>
                        <span className={`text-xs font-mono font-bold ${
                          order.status === 'COMPLETED' ? 'text-emerald-400' : 'text-sky-400'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white">{order.title}</h4>
                      <p className="text-xs text-slate-400">Asset: <strong className="text-slate-300">{order.assetName}</strong> | Assigned to: <strong className="text-slate-300">{order.assignedTechnician}</strong></p>

                      {/* Interactive Checklist */}
                      <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase">SOP Verification Checklist:</div>
                        {order.checklist.map((item) => (
                          <label key={item.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => handleToggleChecklist(order.orderId, item.id)}
                              className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-0 cursor-pointer"
                            />
                            <span className={item.completed ? 'line-through text-slate-500' : ''}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-850">
                      Due Date: {order.dueIso.split('T')[0]} | Est. Downtime: {order.estimatedDowntimeMinutes} mins
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: FDD Rule Builder */}
        {activeTab === 'rule_builder' && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Configured FDD Rules</h3>
                <p className="text-xs text-slate-400">Multi-variable threshold and boolean logic rules.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingRule({
                    ruleId: `rule_${Date.now()}`,
                    name: '',
                    assetId: 'asset_chiller_1',
                    assetName: 'Chiller Unit #1 (York 450 TR)',
                    category: 'chiller',
                    expression: '',
                    severity: 'HIGH',
                    debounceSeconds: 5,
                    deadband: 1,
                    energyWasteKw: 15,
                    costPerHour: 40,
                    enabled: true,
                    description: ''
                  });
                  setShowRuleModal(true);
                }}
                className="px-3.5 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
              >
                <i className="fas fa-plus mr-1.5"></i>
                <span>Add Custom Rule</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {fddState.rules.map((rule) => (
                <div key={rule.ruleId} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        rule.severity === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                      }`}>
                        {rule.severity}
                      </span>
                      <h4 className="text-sm font-bold text-white">{rule.name}</h4>
                      <span className="text-xs text-slate-400">({rule.assetName})</span>
                    </div>
                    <div className="mt-1.5 font-mono text-xs text-sky-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800 w-fit">
                      {rule.expression}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase">Debounce / Waste</div>
                      <div className="text-xs font-mono text-slate-300">{rule.debounceSeconds}s | {currency}{rule.costPerHour}/hr</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteFddRule(rule.ruleId)}
                      className="w-8 h-8 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Root Cause Analysis Modal */}
        {activeAiReport && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-brain text-indigo-400 text-lg"></i>
                  <h3 className="text-sm font-bold text-white">AI Root Cause Analysis (RCA)</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAiReport(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div>
                <div className="text-xs text-slate-400">Asset: <strong className="text-white">{activeAiReport.assetName}</strong></div>
                <div className="text-xs text-emerald-400 font-semibold mt-0.5">Estimated Financial Cost Avoidance: ${activeAiReport.estimatedCostAvoidance}</div>
              </div>

              {/* Probable Causes with Confidence Bars */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-slate-300">Probable Root Causes:</div>
                {activeAiReport.probableCauses.map((c, i) => (
                  <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                      <span>{c.cause}</span>
                      <span className="text-indigo-400 font-mono">{c.confidence}% Confidence</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500" style={{ width: `${c.confidence}%` }}></div>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{c.evidence}</div>
                  </div>
                ))}
              </div>

              {/* Immediate Actions */}
              <div>
                <div className="text-xs font-semibold uppercase text-amber-400 mb-1">Immediate Corrective Actions:</div>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                  {activeAiReport.immediateActions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setActiveAiReport(null)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Work Order Modal */}
        {showNewOrderModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Create Predictive Maintenance Work Order</h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Target Equipment Asset:</label>
                  <select
                    value={newOrderAssetId}
                    onChange={(e) => setNewOrderAssetId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {fddState.assets.length === 0 ? (
                      <option value="custom_asset">General Plant Asset (Custom)</option>
                    ) : (
                      fddState.assets.map(a => (
                        <option key={a.assetId} value={a.assetId}>{a.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Work Order Title:</label>
                  <input
                    type="text"
                    value={newOrderTitle}
                    onChange={(e) => setNewOrderTitle(e.target.value)}
                    placeholder="e.g. Condenser Tube Bundle De-scaling"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Priority:</label>
                    <select
                      value={newOrderPriority}
                      onChange={(e) => setNewOrderPriority(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="ROUTINE">ROUTINE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Assigned Technician:</label>
                    <input
                      type="text"
                      value={newOrderTechnician}
                      onChange={(e) => setNewOrderTechnician(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewOrderModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateWorkOrder}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Save & Schedule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* New Rule Modal */}
        {showRuleModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-sm font-bold text-white">Define Multi-Variable FDD Rule</h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Rule Name:</label>
                  <input
                    type="text"
                    value={editingRule.name || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    placeholder="e.g. Pump Cavitation & Discharge Pressure Loss"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Linked Equipment Asset:</label>
                  <select
                    value={editingRule.assetId}
                    onChange={(e) => {
                      const a = fddState.assets.find(as => as.assetId === e.target.value);
                      setEditingRule({
                        ...editingRule,
                        assetId: e.target.value,
                        assetName: a?.name || (e.target.value === 'custom_asset' ? 'General Plant Asset' : ''),
                        category: a?.category || 'custom'
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    {fddState.assets.length === 0 ? (
                      <option value="custom_asset">General Plant Asset (Custom)</option>
                    ) : (
                      fddState.assets.map(a => (
                        <option key={a.assetId} value={a.assetId}>{a.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Boolean / Threshold Expression:</label>
                  <input
                    type="text"
                    value={editingRule.expression || ''}
                    onChange={(e) => setEditingRule({ ...editingRule, expression: e.target.value })}
                    placeholder="e.g. Chiller.DischargeTemp > 85 && Chiller.WaterFlow < 25"
                    className="w-full bg-slate-800 font-mono border border-slate-700 rounded-xl px-3 py-2 text-sky-300"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Supports tags, arithmetic, &gt;, &lt;, &gt;=, &lt;=, ==, !=, &amp;&amp;, ||</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Severity:</label>
                    <select
                      value={editingRule.severity}
                      onChange={(e) => setEditingRule({ ...editingRule, severity: e.target.value as any })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-xs"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Debounce (s):</label>
                    <input
                      type="number"
                      value={editingRule.debounceSeconds || 5}
                      onChange={(e) => setEditingRule({ ...editingRule, debounceSeconds: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Cost ({currency}/hr):</label>
                    <input
                      type="number"
                      value={editingRule.costPerHour || 30}
                      onChange={(e) => setEditingRule({ ...editingRule, costPerHour: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRule}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl"
                >
                  Save Rule
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FDD Guided Tour Screen Overlay */}
        <CoachMarkOverlay
          tourId="fdd"
          isOpen={isFddTourOpen}
          onClose={() => setIsFddTourOpen(false)}
        />

      </div>
    </div>
  );
};
