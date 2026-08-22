import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CadImporter, CadImportResult } from './CadImporter';
import { MaterialManager } from '../core/MaterialManager';

interface CadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaceOnCanvas: (importedGroup: THREE.Group, metadata: { name: string; assetId: string; scale: number }) => void;
  onSaveToLibrary?: (importedGroup: THREE.Group, metadata: { name: string; assetId: string; scale: number }) => void;
  materialManager: MaterialManager;
}

export const CadImportModal: React.FC<CadImportModalProps> = ({
  isOpen,
  onClose,
  onPlaceOnCanvas,
  onSaveToLibrary,
  materialManager
}) => {
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<CadImportResult | null>(null);

  // Configuration States
  const [equipmentName, setEquipmentName] = useState('');
  const [scaleMode, setScaleMode] = useState<'auto' | 'mm' | 'inches' | '1to1' | 'custom'>('auto');
  const [customScale, setCustomScale] = useState(1.0);
  const [selectedMaterial, setSelectedMaterial] = useState('original');
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(0);

  // Preview Canvas Refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const previewRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const previewSceneRef = useRef<THREE.Scene | null>(null);
  const previewCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const previewControlsRef = useRef<OrbitControls | null>(null);
  const previewObjGroupRef = useRef<THREE.Group | null>(null);
  const animFrameRef = useRef<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importerRef = useRef(new CadImporter(materialManager));

  // Initialize preview 3D scene
  useEffect(() => {
    if (!isOpen || !previewContainerRef.current) return;

    const width = previewContainerRef.current.clientWidth || 380;
    const height = previewContainerRef.current.clientHeight || 280;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d16');
    previewSceneRef.current = scene;

    // Grid & lighting
    const grid = new THREE.GridHelper(10, 10, '#0284c7', '#1e293b');
    grid.position.y = -0.01;
    scene.add(grid);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xfff8ed, 1.2);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.6);
    dirLight2.position.set(-5, 6, -5);
    scene.add(dirLight2);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4, 3, 4);
    previewCameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    previewContainerRef.current.innerHTML = '';
    previewContainerRef.current.appendChild(renderer.domElement);
    previewRendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    previewControlsRef.current = controls;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      renderer.dispose();
      if (previewContainerRef.current) previewContainerRef.current.innerHTML = '';
    };
  }, [isOpen]);

  // Update 3D Preview when import result, scale, rotation, or material changes
  useEffect(() => {
    if (!previewSceneRef.current || !importResult) return;

    // Remove old preview group
    if (previewObjGroupRef.current) {
      previewSceneRef.current.remove(previewObjGroupRef.current);
    }

    const cloned = importResult.group.clone(true);
    previewObjGroupRef.current = cloned;

    // Apply scaling
    let activeScale = importResult.suggestedScale;
    if (scaleMode === 'mm') activeScale = 0.001;
    else if (scaleMode === 'inches') activeScale = 0.0254;
    else if (scaleMode === '1to1') activeScale = 1.0;
    else if (scaleMode === 'custom') activeScale = customScale;

    cloned.scale.set(activeScale, activeScale, activeScale);
    cloned.rotation.set(
      THREE.MathUtils.degToRad(rotX),
      THREE.MathUtils.degToRad(rotY),
      THREE.MathUtils.degToRad(rotZ)
    );

    // Apply material preset if selected
    if (selectedMaterial !== 'original') {
      importerRef.current.applyMaterialPreset(cloned, selectedMaterial);
    }

    previewSceneRef.current.add(cloned);

    // Frame camera on imported object
    const box = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z, 0.5);
    if (previewCameraRef.current && previewControlsRef.current) {
      previewCameraRef.current.position.set(center.x + maxDim * 1.8, center.y + maxDim * 1.2, center.z + maxDim * 1.8);
      previewControlsRef.current.target.copy(center);
      previewControlsRef.current.update();
    }
  }, [importResult, scaleMode, customScale, selectedMaterial, rotX, rotY, rotZ]);

  // Handle CAD File Parsing
  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await importerRef.current.loadCadFile(file);
      setImportResult(result);
      setEquipmentName(file.name.replace(/\.[^/.]+$/, '').replace(/[_.-]/g, ' '));
      setCustomScale(result.suggestedScale);
      setScaleMode('auto');
    } catch (err: any) {
      console.error('[CadImportModal] Failed to load CAD file:', err);
      setErrorMsg(err.message || 'Failed to parse CAD file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  // Place on canvas handler
  const handleConfirmPlace = () => {
    if (!importResult) return;

    let activeScale = importResult.suggestedScale;
    if (scaleMode === 'mm') activeScale = 0.001;
    else if (scaleMode === 'inches') activeScale = 0.0254;
    else if (scaleMode === '1to1') activeScale = 1.0;
    else if (scaleMode === 'custom') activeScale = customScale;

    const finalGroup = importResult.group.clone(true);
    finalGroup.scale.set(activeScale, activeScale, activeScale);
    finalGroup.rotation.set(
      THREE.MathUtils.degToRad(rotX),
      THREE.MathUtils.degToRad(rotY),
      THREE.MathUtils.degToRad(rotZ)
    );

    if (selectedMaterial !== 'original') {
      importerRef.current.applyMaterialPreset(finalGroup, selectedMaterial);
    }

    const cleanAssetId = `cad.${importResult.format}.${equipmentName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    onPlaceOnCanvas(finalGroup, {
      name: equipmentName || importResult.fileName,
      assetId: cleanAssetId,
      scale: activeScale
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <i className="fas fa-file-import text-lg"></i>
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Import 3D CAD Equipment Model
                <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/30">
                  Universal CAD Loader
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Directly import STEP-converted STL, OBJ, GLTF/GLB, Collada (DAE), and JSON models into 3D SCADA.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <i className="fas fa-xmark text-sm"></i>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: File Dropzone & 3D Preview */}
          <div className="flex flex-col gap-4">
            {!importResult ? (
              <div
                onDragOver={e => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[300px] ${
                  isDraggingFile
                    ? 'border-violet-400 bg-violet-500/10'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".stl,.obj,.glb,.gltf,.dae,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-2xl mb-3 shadow-inner">
                  {loading ? (
                    <i className="fas fa-circle-notch fa-spin text-violet-400"></i>
                  ) : (
                    <i className="fas fa-cloud-arrow-up text-violet-400"></i>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white mb-1">
                  {loading ? 'Parsing 3D CAD Geometry...' : 'Drop 3D CAD File here or Browse'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  Supports SolidWorks/Inventor/AutoCAD exports: <b>.STL, .OBJ, .GLB, .GLTF, .DAE, .JSON</b>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">.STL</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">.OBJ</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">.GLB / .GLTF</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700 font-mono">.DAE</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <i className="fas fa-eye text-sky-400"></i> 3D Model Interactive Preview
                  </span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                  >
                    Change File
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.obj,.glb,.gltf,.dae,.json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
                <div
                  ref={previewContainerRef}
                  className="w-full h-[260px] rounded-xl overflow-hidden border border-slate-800 bg-[#090d16] shadow-inner relative"
                >
                  <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800 pointer-events-none">
                    Left Drag to Orbit • Right Drag to Pan • Scroll to Zoom
                  </div>
                </div>

                {/* Model Stats Bar */}
                <div className="grid grid-cols-3 gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Format:</span>
                    <span className="font-bold text-violet-300 uppercase">{importResult.format}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Triangles:</span>
                    <span className="font-bold text-emerald-300">{importResult.triangleCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Dimensions (m):</span>
                    <span className="font-bold text-sky-300">
                      {importResult.originalBounds.width} × {importResult.originalBounds.height} × {importResult.originalBounds.depth}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-start gap-2">
                <i className="fas fa-triangle-exclamation text-red-400 mt-0.5"></i>
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* Right Column: Scaling, Material & Placement Settings */}
          <div className="flex flex-col gap-4">
            {/* Equipment Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Equipment Name & Tag</label>
              <input
                type="text"
                value={equipmentName}
                onChange={e => setEquipmentName(e.target.value)}
                placeholder="e.g. Chemical Reactor Unit 4"
                className="w-full bg-slate-950 border border-slate-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            {/* Scaling / Unit Normalization */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                CAD Scale & Unit Normalization
              </label>
              <div className="grid grid-cols-2 gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => setScaleMode('auto')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                    scaleMode === 'auto'
                      ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-bold">Auto-Fit (2.5m)</span>
                  <span className="text-[10px] text-slate-400">Fits plant equipment size</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScaleMode('mm')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                    scaleMode === 'mm'
                      ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-bold">Millimeters to Meters</span>
                  <span className="text-[10px] text-slate-400">Scale factor × 0.001</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScaleMode('inches')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                    scaleMode === 'inches'
                      ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-bold">Inches to Meters</span>
                  <span className="text-[10px] text-slate-400">Scale factor × 0.0254</span>
                </button>

                <button
                  type="button"
                  onClick={() => setScaleMode('1to1')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition-all ${
                    scaleMode === '1to1'
                      ? 'bg-violet-600/30 border-violet-500 text-violet-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block font-bold">1:1 Native Scale</span>
                  <span className="text-[10px] text-slate-400">Unmodified model scale</span>
                </button>
              </div>

              {scaleMode === 'custom' && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">Custom Multiplier:</span>
                  <input
                    type="number"
                    step="0.001"
                    value={customScale}
                    onChange={e => setCustomScale(parseFloat(e.target.value) || 1)}
                    className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  />
                </div>
              )}
            </div>

            {/* Coordinate Axis Orientation Fix */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Orientation Fix (Rotate CAD Axes)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRotX(prev => (prev + 90) % 360)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                >
                  Rotate X +90° ({rotX}°)
                </button>
                <button
                  type="button"
                  onClick={() => setRotY(prev => (prev + 90) % 360)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                >
                  Rotate Y +90° ({rotY}°)
                </button>
                <button
                  type="button"
                  onClick={() => setRotZ(prev => (prev + 90) % 360)}
                  className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                >
                  Rotate Z +90° ({rotZ}°)
                </button>
                <button
                  type="button"
                  onClick={() => { setRotX(0); setRotY(0); setRotZ(0); }}
                  className="px-2 py-1 text-xs text-slate-500 hover:text-slate-300 ml-auto"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Industrial PBR Material Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Industrial PBR Material
              </label>
              <select
                value={selectedMaterial}
                onChange={e => setSelectedMaterial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 focus:border-violet-500 rounded-lg px-3 py-2 text-xs text-white outline-none"
              >
                <option value="original">Keep CAD Original / Exported Material</option>
                <option value="painted_steel_blue">Painted Machine Blue (Industrial)</option>
                <option value="stainless_steel">Stainless Steel 316L (Polished)</option>
                <option value="carbon_steel">Schedule 40 Carbon Steel (Matte)</option>
                <option value="cast_iron">Heavy Cast Iron (Equipment Body)</option>
                <option value="galvanized_zinc">Galvanized Zinc (Sheet Metal & Ducts)</option>
                <option value="safety_yellow">OSHA Safety Yellow</option>
                <option value="hazard_orange">Safety Orange (Actuators)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            {importResult ? (
              <span className="text-emerald-400 flex items-center gap-1.5">
                <i className="fas fa-check-circle"></i> Ready to instantiate on 3D canvas
              </span>
            ) : (
              <span>Select or drop a 3D CAD model file to begin.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!importResult}
              onClick={handleConfirmPlace}
              className={`px-5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
                importResult
                  ? 'bg-violet-600 hover:bg-violet-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-600 cursor-not-allowed'
              }`}
            >
              <i className="fas fa-plus"></i>
              <span>Place on 3D Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
