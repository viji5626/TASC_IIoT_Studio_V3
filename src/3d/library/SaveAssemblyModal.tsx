import React, { useState } from 'react';
import { ProjectLibrary, Scada3dAssembly } from './ProjectLibrary';
import { Scada3dObject, Scada3dCameraConfig } from '../types/scene';

interface SaveAssemblyModalProps {
  isOpen: boolean;
  onClose: () => void;
  sceneObjects: Scada3dObject[];
  cameraConfig: Scada3dCameraConfig;
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const SaveAssemblyModal: React.FC<SaveAssemblyModalProps> = ({
  isOpen,
  onClose,
  sceneObjects,
  cameraConfig,
  canvasRef,
}) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!name.trim()) return;
    setSaving(true);

    // Capture thumbnail from canvas if available
    let thumbnail: string | undefined;
    if (canvasRef?.current) {
      thumbnail = ProjectLibrary.captureCanvasThumbnail(canvasRef.current);
    }

    const assembly: Scada3dAssembly = {
      assemblyId: `asm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description: desc.trim() || undefined,
      thumbnail,
      tagCount: ProjectLibrary.countTags(sceneObjects),
      objectCount: sceneObjects.length,
      sceneDescriptor: {
        objects: sceneObjects,
        environment: { backgroundColor: '#0f172a' },
        camera: cameraConfig,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    ProjectLibrary.save(assembly);
    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setName('');
      setDesc('');
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <i className="fas fa-cube-sharp text-sky-400"></i>
          </div>
          <div>
            <h2 className="text-white font-bold text-base">Save to Project Library</h2>
            <p className="text-slate-400 text-xs">{sceneObjects.length} objects · {ProjectLibrary.countTags(sceneObjects)} bindings</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-500 hover:text-white transition-colors"
          >
            <i className="fas fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Assembly Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Pump Station A"
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block uppercase tracking-wide">Description (optional)</label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={2}
              placeholder="Brief description of this 3D assembly..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              saved
                ? 'bg-emerald-500 text-white'
                : name.trim()
                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {saved ? (
              <><i className="fas fa-check"></i> Saved!</>
            ) : saving ? (
              <><i className="fas fa-spinner fa-spin"></i> Saving...</>
            ) : (
              <><i className="fas fa-floppy-disk"></i> Save to Library</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
