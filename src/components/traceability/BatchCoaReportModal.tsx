import React from 'react';
import { BatchRecord } from '../../types/traceability';

interface BatchCoaReportModalProps {
  isOpen: boolean;
  batch: BatchRecord;
  onClose: () => void;
}

export const BatchCoaReportModal: React.FC<BatchCoaReportModalProps> = ({
  isOpen,
  batch,
  onClose
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Controls Bar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <i className="fas fa-file-shield text-emerald-400"></i>
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Certificate of Analysis (CoA) - 21 CFR Part 11 Compliant
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
            >
              <i className="fas fa-print text-[11px]"></i>
              <span>Print / Save PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Certificate Paper Body */}
        <div className="p-6 bg-white text-slate-900 flex-1 overflow-y-auto custom-scrollbar font-sans text-xs space-y-4">
          {/* Corporate Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900">
                TASC IIoT ENTERPRISE QUALITY ASSURANCE
              </h1>
              <p className="text-[10px] text-slate-600 font-mono">
                ISO 9001:2015 & FDA 21 CFR Part 11 Certified Facility
              </p>
              <p className="text-[10px] text-slate-500">Document Ref: COA-{batch.batchNumber}-FINAL</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded bg-emerald-100 border border-emerald-400 text-emerald-800 font-black text-xs">
                RELEASE STATUS: {batch.status}
              </span>
              <p className="text-[10px] text-slate-500 font-mono mt-1">
                Issued: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Batch Identity Table */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-bold">Product / Formulation</p>
              <p className="font-bold text-slate-900 text-sm">{batch.recipeName}</p>
              <p className="text-[10px] text-slate-600 font-mono">Formula Spec: {batch.recipeVersion}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-right">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Batch ID</p>
                <p className="font-mono font-black text-slate-900">{batch.batchNumber}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">Work Order</p>
                <p className="font-mono font-bold text-slate-800">{batch.workOrderNumber}</p>
              </div>
            </div>
          </div>

          {/* Quality Specifications & Critical Process Parameters (CPPs) */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900 border-b border-slate-300 pb-1 mb-2">
              Critical Process Parameters & Analytical Assay Results
            </h3>
            <table className="w-full text-[11px] text-left border border-slate-300">
              <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-700 border-b border-slate-300">
                <tr>
                  <th className="p-1.5">Parameter Tested</th>
                  <th className="p-1.5">Target (SP)</th>
                  <th className="p-1.5">Specification Limits</th>
                  <th className="p-1.5">Observed Result</th>
                  <th className="p-1.5 text-center">Disposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                {batch.parameters.map(p => (
                  <tr key={p.id}>
                    <td className="p-1.5 font-sans font-medium text-slate-900">{p.name}</td>
                    <td className="p-1.5">{p.setpoint} {p.unit}</td>
                    <td className="p-1.5">{p.minLimit} - {p.maxLimit} {p.unit}</td>
                    <td className="p-1.5 font-bold text-slate-900">{p.currentValue} {p.unit}</td>
                    <td className="p-1.5 text-center font-sans">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        PASSED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Consumed Raw Material Lots */}
          <div>
            <h3 className="text-xs font-black uppercase text-slate-900 border-b border-slate-300 pb-1 mb-2">
              Traceable Raw Material Lot Genealogy
            </h3>
            <div className="space-y-1">
              {batch.rawMaterials.map(rm => (
                <div key={rm.id} className="p-1.5 rounded bg-slate-50 border border-slate-200 flex justify-between items-center text-[10px]">
                  <div>
                    <span className="font-bold text-slate-900">{rm.materialName}</span>
                    <span className="text-slate-500 ml-2 font-mono">({rm.supplierName})</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-bold text-slate-800">Lot: {rm.lotNumber}</span>
                    <span className="text-emerald-700 font-bold">Grade {rm.qualityGrade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 21 CFR Part 11 Electronic Signatures Block */}
          <div className="pt-2 border-t-2 border-slate-900">
            <h3 className="text-xs font-black uppercase text-slate-900 mb-2">
              Electronic Signatures & Regulatory Approvals
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-2 rounded border border-slate-300 bg-slate-50 text-[10px] space-y-1">
                <p className="font-bold text-slate-900">Lead Formulation Chemist / Operator</p>
                <p className="font-mono text-slate-700">Name: {batch.leadOperator}</p>
                <p className="text-emerald-800 font-bold font-mono"><i className="fas fa-check-circle" /> Signed Digitally (SHA-256 Validated)</p>
              </div>

              <div className="p-2 rounded border border-slate-300 bg-slate-50 text-[10px] space-y-1">
                <p className="font-bold text-slate-900">Quality Assurance Director / Approver</p>
                <p className="font-mono text-slate-700">Name: {batch.qaApprover || batch.supervisorName}</p>
                <p className="text-emerald-800 font-bold font-mono"><i className="fas fa-check-circle" /> Authorized for Commercial Release</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
