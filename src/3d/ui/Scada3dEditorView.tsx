import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { ThreeViewport, ThreeViewportRef } from '../core/ThreeViewport';
import { ViewportToolbar } from './ViewportToolbar';
import { AssetLibrary3dPanel } from './AssetLibrary3dPanel';
import { SceneHierarchyTree } from './SceneHierarchyTree';
import { PropertyPanel3d } from './PropertyPanel3d';
import { InspectionModal3d } from './InspectionModal3d';
import { ScenePersistence } from '../persistence/ScenePersistence';
import { SaveAssemblyModal } from '../library/SaveAssemblyModal';
import { ProjectLibraryBrowser } from '../library/ProjectLibraryBrowser';
import { CadImportModal } from '../cad/CadImportModal';
import { Scada3dObject, Scada3dScene, CameraPresetView, CameraProjection } from '../types/scene';
import { Scada3dBinding } from '../types/bindings';
import { TransformMode, CoordinateSpace, TransformSnapConfig, ObjectTransformData } from '../types/transform';
import { AssetCatalogItem3D } from '../assets/AssetRegistry';
import { Dashboard } from '../../types';

interface Scada3dEditorViewProps {
  latestValues?: Record<string, { val: any; time?: string }>;
  dashboards?: Dashboard[];
  onNavigateTo2dDashboard?: (dashboardId: string) => void;
  userRole?: string;
}

export const Scada3dEditorView: React.FC<Scada3dEditorViewProps> = ({
  latestValues = {},
  dashboards = [],
  onNavigateTo2dDashboard,
  userRole = 'admin'
}) => {
  const viewportRef = useRef<ThreeViewportRef>(null);

  // Active scene state
  const [currentScene, setCurrentScene] = useState<Scada3dScene>(() => {
    const scenes = ScenePersistence.loadAllScenes();
    return scenes[0] || ScenePersistence.createDefaultDemoScene();
  });
  const [sceneObjects, setSceneObjects] = useState<Scada3dObject[]>(() => currentScene.objects || []);

  // Selection & Transform State
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [selectedSubPartId, setSelectedSubPartId] = useState<string | null>(null);
  const [selectedObjectData, setSelectedObjectData] = useState<Scada3dObject | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [coordSpace, setCoordSpace] = useState<CoordinateSpace>('world');
  const [snapConfig, setSnapConfig] = useState<TransformSnapConfig>({
    enabled: false,
    translation: 0.5,
    rotationDeg: 15,
    scale: 0.1
  });

  // Camera & Environment
  const [projection, setProjection] = useState<CameraProjection>('perspective');
  const [gridVisible, setGridVisible] = useState(true);
  const [axisVisible, setAxisVisible] = useState(true);

  // Runtime Mode & Left Dock Tab
  const [isRuntimeMode, setIsRuntimeMode] = useState(false);
  const [leftDockTab, setLeftDockTab] = useState<'assets' | 'hierarchy'>('assets');
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);

  // Library & CAD modals
  const [isSaveToLibraryOpen, setIsSaveToLibraryOpen] = useState(false);
  const [isLibraryBrowserOpen, setIsLibraryBrowserOpen] = useState(false);
  const [isCadImportOpen, setIsCadImportOpen] = useState(false);

  // Simulated Telemetry for demo when real PLC tags are offline
  const [simulatedValues, setSimulatedValues] = useState<Record<string, { val: any }>>({});

  // Dynamic preview callback for in-editor testing
  const handlePreviewDynamic = useCallback((equipmentId: string, binding: Scada3dBinding, testVal: any) => {
    if (!viewportRef.current?.object3DManager || !viewportRef.current?.scadaBindingAdapter) return;
    const threeObj = viewportRef.current.object3DManager.getThreeObjectByScadaId(equipmentId);
    if (!threeObj) return;

    viewportRef.current.scadaBindingAdapter.applyBindingToThreeObject(
      equipmentId,
      threeObj,
      binding,
      testVal,
      0.033
    );
  }, []);

  // Simulation loop when in runtime mode
  useEffect(() => {
    if (!isRuntimeMode) return;

    let angle = 0;
    const interval = setInterval(() => {
      angle += 0.08;
      const level = Math.round(50 + 35 * Math.sin(angle));
      // Dynamic Speed modulated by continuous sinewave (ranges between 400 RPM and 2600 RPM)
      const sinewaveVal = Math.round(1500 + 1100 * Math.sin(angle * 1.5));
      const speed = sinewaveVal;
      const pos = Math.round(45 + 40 * Math.sin(angle * 0.8));
      // 0 - 100% Sinewave for Fan RPM & Damper Opening
      const fanSpeedPct = Math.max(0, Math.min(100, Math.round(50 + 50 * Math.sin(angle * 1.0))));

      setSimulatedValues({
        'plant/pumps/pump101': { val: { running: true, speed } },
        'plant/tanks/tank101': { val: { level } },
        'plant/valves/valve101': { val: { position: pos } },
        'plant/fans/fan101': { val: { running: true, speed: fanSpeedPct } },
        'plant/fans/speed': { val: fanSpeedPct },
        'plant/pumps/speed': { val: fanSpeedPct },
        'plant/fans/box_wall_exhaust': { val: { speed: fanSpeedPct, position: fanSpeedPct, running: true } },
        'simulator/sinewave': { val: fanSpeedPct },
        'sinewave': { val: fanSpeedPct },
        'speed': { val: fanSpeedPct },
        'fan_speed': { val: fanSpeedPct },
        'dampers': { val: fanSpeedPct }
      });
    }, 50);

    return () => clearInterval(interval);
  }, [isRuntimeMode]);

  // Merge real latestValues with simulation fallback
  const effectiveTelemetry = { ...simulatedValues, ...latestValues };

  // Sync selectedObjectData when selection changes
  useEffect(() => {
    if (selectedObjectId) {
      const found = sceneObjects.find(o => o.id === selectedObjectId);
      setSelectedObjectData(found || null);
      if (isRuntimeMode) setIsInspectionOpen(true);
    } else {
      setSelectedObjectData(null);
      setIsInspectionOpen(false);
    }
  }, [selectedObjectId, sceneObjects, isRuntimeMode]);

  // Save Scene
  const handleSaveScene = useCallback(() => {
    if (!viewportRef.current) return;
    const updatedObjects = viewportRef.current.getSceneData();
    const updatedScene: Scada3dScene = {
      ...currentScene,
      objects: updatedObjects,
      updatedAt: Date.now()
    };
    ScenePersistence.saveScene(updatedScene);
    setCurrentScene(updatedScene);
    setSceneObjects(updatedObjects);
  }, [currentScene]);

  // Add Equipment from Library
  const handleAddEquipment = (asset: AssetCatalogItem3D) => {
    if (!viewportRef.current) return;
    const newId = `${asset.category.split(' ')[0].toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newObj: Partial<Scada3dObject> = {
      id: newId,
      name: `${asset.name} ${newId}`,
      assetId: asset.id,
      assetType: asset.assetType,
      symbolId: asset.symbolId,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 }
      },
      materialPreset: 'painted_steel_blue',
      equipmentDescription: asset.description
    };

    viewportRef.current.addObject(newObj);
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    setSelectedObjectId(newId);
    const addedObj = updated.find(o => o.id === newId) || null;
    setSelectedObjectData(addedObj);
  };

  // Delete Object
  const handleDeleteObject = (id: string) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.removeObject(id);
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
      viewportRef.current.selectionManager?.select(null);
    }
  };

  // Toggle Visibility
  const handleToggleVisibility = (id: string, visible: boolean) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, { visible });
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
  };

  // Toggle Lock
  const handleToggleLock = (id: string, locked: boolean) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, { locked });
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
  };

  // Rename Object
  const handleRenameObject = (id: string, newName: string) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, { name: newName });
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
  };

  // Update Numeric Transform from Property Panel
  const handleUpdateTransform = (id: string, transform: ObjectTransformData) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateTransform(id, transform);
    viewportRef.current.selectionManager?.updateSelectionBox();
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
  };

  // Update Metadata from Property Panel
  const handleUpdateObjectData = (id: string, updates: Partial<Scada3dObject>) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, updates);
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
  };

  // Transform Toolbar Controls Handlers
  const handleSetMode = (mode: TransformMode) => {
    setTransformMode(mode);
    viewportRef.current?.setMode(mode);
  };

  const handleSetSpace = (space: CoordinateSpace) => {
    setCoordSpace(space);
    viewportRef.current?.setSpace(space);
  };

  const handleSetSnap = (config: Partial<TransformSnapConfig>) => {
    const updated = { ...snapConfig, ...config };
    setSnapConfig(updated);
    viewportRef.current?.transformControlsManager?.setSnapConfig(updated);
  };

  const handleSetPresetView = (preset: CameraPresetView) => {
    viewportRef.current?.setPresetView(preset);
  };

  const handleSetProjection = (proj: CameraProjection) => {
    setProjection(proj);
    viewportRef.current?.setProjection(proj);
  };

  const [delete3dModalConfig, setDelete3dModalConfig] = useState<{
    isOpen: boolean;
    objectId: string;
    objectName: string;
  }>({
    isOpen: false,
    objectId: '',
    objectName: ''
  });

  // Global Delete Key listener for 3D Viewport
  useEffect(() => {
    const handle3dKeyDown = (e: KeyboardEvent) => {
      if (isRuntimeMode) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || (target as any).isContentEditable)) {
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault();
          const targetObj = sceneObjects.find(o => o.id === selectedObjectId);
          setDelete3dModalConfig({
            isOpen: true,
            objectId: selectedObjectId,
            objectName: targetObj?.name || selectedObjectId
          });
        }
      }
    };
    window.addEventListener('keydown', handle3dKeyDown);
    return () => window.removeEventListener('keydown', handle3dKeyDown);
  }, [isRuntimeMode, selectedObjectId, sceneObjects]);

  const availableDashboardsList = dashboards.map(d => ({
    id: d.dashboardId,
    name: d.dashboardName
  }));

  // Add CAD Object to Scene from Importer
  const handlePlaceCadOnCanvas = (importedGroup: THREE.Group, metadata: { name: string; assetId: string; scale: number }) => {
    if (!viewportRef.current?.object3DManager) return;
    const newId = `CAD-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const newObj: Scada3dObject = {
      id: newId,
      name: metadata.name,
      assetId: metadata.assetId,
      assetType: 'parametric',
      symbolId: metadata.assetId,
      parentId: null,
      childrenIds: [],
      isGroup: false,
      locked: false,
      visible: true,
      transform: {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: metadata.scale, y: metadata.scale, z: metadata.scale }
      },
      materialPreset: 'painted_steel_blue',
      bindings: [],
      equipmentDescription: `Imported 3D CAD Model: ${metadata.name}`
    };

    const threeObj = viewportRef.current.object3DManager.addObject(newObj, importedGroup);
    if (viewportRef.current.selectionManager && threeObj) {
      viewportRef.current.selectionManager.select(threeObj);
    }
    setSelectedObjectId(newId);
    setSelectedObjectData(newObj);
    setSceneObjects(viewportRef.current.getSceneData());
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 1. Top Viewport Toolbar */}
      <ViewportToolbar
        mode={transformMode}
        onSetMode={handleSetMode}
        space={coordSpace}
        onSetSpace={handleSetSpace}
        snapConfig={snapConfig}
        onSetSnapConfig={handleSetSnap}
        projection={projection}
        onSetProjection={handleSetProjection}
        onSetPresetView={handleSetPresetView}
        onFrameSelected={() => viewportRef.current?.frameSelected()}
        onFrameAll={() => viewportRef.current?.frameAll()}
        isRuntimeMode={isRuntimeMode}
        onToggleRuntimeMode={() => setIsRuntimeMode(!isRuntimeMode)}
        onSaveScene={handleSaveScene}
        onSaveToLibrary={() => setIsSaveToLibraryOpen(true)}
        onOpenLibrary={() => setIsLibraryBrowserOpen(true)}
        onImportCad={() => setIsCadImportOpen(true)}
        gridVisible={gridVisible}
        onToggleGrid={() => {
          setGridVisible(!gridVisible);
          if (viewportRef.current?.engine) {
            viewportRef.current.engine.setupEnvironment({
              ...currentScene.environment,
              gridVisible: !gridVisible
            });
          }
        }}
        axisVisible={axisVisible}
        onToggleAxis={() => {
          setAxisVisible(!axisVisible);
          if (viewportRef.current?.engine) {
            viewportRef.current.engine.setupEnvironment({
              ...currentScene.environment,
              axisHelperVisible: !axisVisible
            });
          }
        }}
        hasSelectedObject={!!selectedObjectId}
      />

      {/* 2. Main Work Area (Left Dock + Center 3D Viewport + Right Property Inspector) */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Dock (Asset Library & Scene Hierarchy) */}
        {!isRuntimeMode && (
          <div className="w-76 bg-slate-900 border-r border-slate-800 flex flex-col min-h-0 z-10 shrink-0">
            {/* Dock Tab Switcher */}
            <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1 gap-1">
              <button
                type="button"
                onClick={() => setLeftDockTab('assets')}
                className={`flex-1 py-1.5 rounded text-center font-bold text-xs transition-colors ${
                  leftDockTab === 'assets'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fas fa-cubes mr-1.5"></i>
                Asset Library
              </button>

              <button
                type="button"
                onClick={() => setLeftDockTab('hierarchy')}
                className={`flex-1 py-1.5 rounded text-center font-bold text-xs transition-colors ${
                  leftDockTab === 'hierarchy'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <i className="fas fa-sitemap mr-1.5"></i>
                Hierarchy
              </button>
            </div>

            {/* Dock Content */}
            {leftDockTab === 'assets' ? (
              <AssetLibrary3dPanel onAddEquipment={handleAddEquipment} />
            ) : (
              <SceneHierarchyTree
                objects={sceneObjects}
                selectedId={selectedObjectId}
                selectedSubPartId={selectedSubPartId}
                onSelectObject={(id, subPartId) => {
                  setSelectedObjectId(id);
                  setSelectedSubPartId(subPartId || null);
                  if (viewportRef.current?.object3DManager && viewportRef.current?.selectionManager) {
                    const threeObj = id ? viewportRef.current.object3DManager.getThreeObjectByScadaId(id) : null;
                    viewportRef.current.selectionManager.select(threeObj || null);
                  }
                }}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onDeleteObject={handleDeleteObject}
                onRenameObject={handleRenameObject}
              />
            )}
          </div>
        )}

        {/* Center: Dedicated Three.js WebGL Viewport */}
        <div className="flex-1 relative min-w-0 min-h-0">
          <ThreeViewport
            ref={viewportRef}
            initialScene={currentScene}
            latestValues={effectiveTelemetry}
            isRuntimeMode={isRuntimeMode}
            onSelectObject={data => {
              setSelectedObjectId(data ? data.id : null);
              setSelectedSubPartId(null);
              setSelectedObjectData(data);
            }}
            onTransformChange={data => {
              const updated = sceneObjects.map(o => (o.id === data.id ? data : o));
              setSceneObjects(updated);
              setSelectedObjectData(data);
            }}
          />

          {/* Floating Runtime Equipment Inspection Card */}
          {isRuntimeMode && isInspectionOpen && selectedObjectData && (
            <InspectionModal3d
              object={selectedObjectData}
              onClose={() => {
                setIsInspectionOpen(false);
                setSelectedObjectId(null);
                setSelectedSubPartId(null);
                viewportRef.current?.selectionManager?.select(null);
              }}
              onJumpTo2dScreen={onNavigateTo2dDashboard}
              latestValues={effectiveTelemetry}
            />
          )}
        </div>

        {/* Right Dock: Numeric Property Panel & SCADA Binding Inspector */}
        {!isRuntimeMode && (
          <PropertyPanel3d
            selectedObject={selectedObjectData}
            selectedSubPartId={selectedSubPartId}
            onSelectSubPart={setSelectedSubPartId}
            onUpdateTransform={handleUpdateTransform}
            onUpdateObjectData={handleUpdateObjectData}
            onPreviewDynamic={handlePreviewDynamic}
            availableDashboards={availableDashboardsList}
          />
        )}
      </div>

      {/* Save to Project Library modal */}
      <SaveAssemblyModal
        isOpen={isSaveToLibraryOpen}
        onClose={() => setIsSaveToLibraryOpen(false)}
        sceneObjects={viewportRef.current ? viewportRef.current.getSceneData() : sceneObjects}
        cameraConfig={viewportRef.current?.engine ? viewportRef.current.engine.cameraManager.getConfig() : currentScene.camera}
        canvasRef={viewportRef.current?.engine ? { current: viewportRef.current.engine.renderer.domElement } : undefined}
      />

      {/* Project Library Browser modal */}
      <ProjectLibraryBrowser
        isOpen={isLibraryBrowserOpen}
        onClose={() => setIsLibraryBrowserOpen(false)}
        onImport={(assembly) => {
          if (viewportRef.current?.engine) {
            viewportRef.current.engine.loadScene(assembly.sceneDescriptor);
            setSceneObjects(assembly.sceneDescriptor.objects || []);
          }
          setIsLibraryBrowserOpen(false);
        }}
      />

      {/* CAD / 3D Model Importer Modal */}
      {viewportRef.current?.engine && (
        <CadImportModal
          isOpen={isCadImportOpen}
          onClose={() => setIsCadImportOpen(false)}
          onPlaceOnCanvas={handlePlaceCadOnCanvas}
          materialManager={viewportRef.current.engine.materialManager}
        />
      )}

      {/* 3D Object Delete Confirmation Modal */}
      {delete3dModalConfig.isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={() => setDelete3dModalConfig({ isOpen: false, objectId: '', objectName: '' })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setDelete3dModalConfig({ isOpen: false, objectId: '', objectName: '' });
            if (e.key === 'Enter') {
              handleDeleteObject(delete3dModalConfig.objectId);
              setDelete3dModalConfig({ isOpen: false, objectId: '', objectName: '' });
            }
          }}
          tabIndex={-1}
        >
          <div 
            className="bg-[#0f172a] border border-rose-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <i className="fas fa-trash-can text-lg"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white tracking-wide">
                  Delete 3D Object?
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Are you sure you want to delete <span className="text-rose-400 font-semibold">"{delete3dModalConfig.objectName}"</span> from the 3D scene?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDelete3dModalConfig({ isOpen: false, objectId: '', objectName: '' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  handleDeleteObject(delete3dModalConfig.objectId);
                  setDelete3dModalConfig({ isOpen: false, objectId: '', objectName: '' });
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <i className="fas fa-trash-can text-xs"></i>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
