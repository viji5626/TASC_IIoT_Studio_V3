import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
import { Ai3dAssetService } from '../../services/Ai3dAssetService';

interface Scada3dEditorViewProps {
  onBack?: () => void;
  latestValues?: Record<string, { val: any; time?: string }>;
  dashboards?: Dashboard[];
  onNavigateTo2dDashboard?: (dashboardId: string) => void;
  userRole?: string;
}

export const Scada3dEditorView: React.FC<Scada3dEditorViewProps> = ({
  onBack,
  latestValues = {},
  dashboards = [],
  onNavigateTo2dDashboard,
  userRole = 'admin'
}) => {
  const viewportRef = useRef<ThreeViewportRef>(null);

  // Unsaved Changes Tracking & Exit Prompt State
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState<boolean>(false);

  // Active scene state
  const [currentScene, setCurrentScene] = useState<Scada3dScene>(() => {
    const activeId = ScenePersistence.getActiveSceneId();
    const scenes = ScenePersistence.loadAllScenes();
    return scenes.find(s => s.id === activeId) || scenes[0] || ScenePersistence.createDefaultDemoScene();
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

  // Delete modal state
  const [delete3dModalConfig, setDelete3dModalConfig] = useState<{
    isOpen: boolean;
    objectId: string;
    objectName: string;
  }>({
    isOpen: false,
    objectId: '',
    objectName: ''
  });

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

  // Initialize and pre-compile custom AI 3D assets on mount
  useEffect(() => {
    Ai3dAssetService.initializeRegistry();
  }, []);

  // Warn user on browser refresh/close if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // History Stack for Undo / Redo in 3D Scene Editor
  const historyRef = useRef<Scada3dObject[][]>([currentScene.objects || []]);
  const historyIndexRef = useRef<number>(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Push new state snapshot to 3D undo history
  const pushHistoryState = useCallback((newObjects: Scada3dObject[]) => {
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    currentHistory.push(JSON.parse(JSON.stringify(newObjects)));
    if (currentHistory.length > 50) currentHistory.shift();
    historyRef.current = currentHistory;
    historyIndexRef.current = currentHistory.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
    setSceneObjects(newObjects);
    setHasUnsavedChanges(true);
  }, []);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prevObjects: Scada3dObject[] = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));

      if (viewportRef.current?.object3DManager) {
        viewportRef.current.object3DManager.syncFromSceneData(prevObjects);
        // Re-attach selection if previous object still exists
        if (selectedObjectId) {
          const matchingThree = viewportRef.current.object3DManager.getThreeObjectByScadaId(selectedObjectId);
          viewportRef.current.selectionManager?.select(matchingThree || null);
          const found = prevObjects.find(o => o.id === selectedObjectId);
          setSelectedObjectData(found || null);
          if (!found) setSelectedObjectId(null);
        }
      }

      setSceneObjects(prevObjects);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      setHasUnsavedChanges(true);
    }
  }, [selectedObjectId]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const nextObjects: Scada3dObject[] = JSON.parse(JSON.stringify(historyRef.current[historyIndexRef.current]));

      if (viewportRef.current?.object3DManager) {
        viewportRef.current.object3DManager.syncFromSceneData(nextObjects);
        // Re-attach selection if object exists
        if (selectedObjectId) {
          const matchingThree = viewportRef.current.object3DManager.getThreeObjectByScadaId(selectedObjectId);
          viewportRef.current.selectionManager?.select(matchingThree || null);
          const found = nextObjects.find(o => o.id === selectedObjectId);
          setSelectedObjectData(found || null);
          if (!found) setSelectedObjectId(null);
        }
      }

      setSceneObjects(nextObjects);
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
      setHasUnsavedChanges(true);
    }
  }, [selectedObjectId]);

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
    setHasUnsavedChanges(false);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 2500);
  }, [currentScene]);

  // Back Navigation & Unsaved Exit Logic
  const handleBackRequest = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitConfirmModal(true);
    } else {
      if (onBack) {
        onBack();
      } else if (onNavigateTo2dDashboard && dashboards.length > 0) {
        onNavigateTo2dDashboard(dashboards[0].dashboardId);
      }
    }
  }, [hasUnsavedChanges, onBack, onNavigateTo2dDashboard, dashboards]);

  const handleSaveAndExit = useCallback(() => {
    handleSaveScene();
    setShowExitConfirmModal(false);
    if (onBack) {
      onBack();
    } else if (onNavigateTo2dDashboard && dashboards.length > 0) {
      onNavigateTo2dDashboard(dashboards[0].dashboardId);
    }
  }, [handleSaveScene, onBack, onNavigateTo2dDashboard, dashboards]);

  const handleDiscardAndExit = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowExitConfirmModal(false);
    if (onBack) {
      onBack();
    } else if (onNavigateTo2dDashboard && dashboards.length > 0) {
      onNavigateTo2dDashboard(dashboards[0].dashboardId);
    }
  }, [onBack, onNavigateTo2dDashboard, dashboards]);

  const handleCancelExit = useCallback(() => {
    setShowExitConfirmModal(false);
  }, []);

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
    pushHistoryState(updated);
    setSelectedObjectId(newId);
    const addedObj = updated.find(o => o.id === newId) || null;
    setSelectedObjectData(addedObj);
  };

  // Delete Object
  const handleDeleteObject = useCallback((id: string) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.removeObject(id);
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
    if (selectedObjectId === id) {
      setSelectedObjectId(null);
      viewportRef.current.selectionManager?.select(null);
    }
  }, [selectedObjectId, pushHistoryState]);

  // Duplicate Object (Ctrl+D)
  const handleDuplicateObject = useCallback((id: string) => {
    if (!viewportRef.current?.object3DManager) return;
    const source = sceneObjects.find(o => o.id === id);
    if (!source) return;

    const newId = `${source.assetId.split('.').pop()?.toUpperCase() || 'EQUIP'}-${Math.floor(100 + Math.random() * 900)}`;
    const cloned: Scada3dObject = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `${source.name} (Copy)`,
      transform: {
        ...source.transform,
        position: {
          x: source.transform.position.x + 1.5,
          y: source.transform.position.y,
          z: source.transform.position.z + 1.5
        }
      }
    };

    viewportRef.current.addObject(cloned);
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
    setSelectedObjectId(newId);
    const addedObj = updated.find(o => o.id === newId) || null;
    setSelectedObjectData(addedObj);
  }, [sceneObjects, pushHistoryState]);

  // Toggle Visibility
  const handleToggleVisibility = (id: string, visible: boolean) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, { visible });
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
  };

  // Toggle Lock
  const handleToggleLock = (id: string, locked: boolean) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, { locked });
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
  };

  // Rename Object
  const handleRenameObject = (id: string, newName: string) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, { name: newName });
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
  };

  // Update Numeric Transform from Property Panel
  const handleUpdateTransform = (id: string, transform: ObjectTransformData) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateTransform(id, transform);
    viewportRef.current.selectionManager?.updateSelectionBox();
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
  };

  // Update Metadata from Property Panel
  const handleUpdateObjectData = (id: string, updates: Partial<Scada3dObject>) => {
    if (!viewportRef.current?.object3DManager) return;
    viewportRef.current.object3DManager.updateObjectData(id, updates);
    const updated = viewportRef.current.getSceneData();
    setSceneObjects(updated);
    pushHistoryState(updated);
  };

  // Transform Toolbar Controls Handlers
  const handleSetMode = useCallback((mode: TransformMode) => {
    setTransformMode(mode);
    viewportRef.current?.setMode(mode);
  }, []);

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

  // Global Keyboard Shortcut Listener for Undo, Redo, Delete, Duplicate, and Tool Switching
  useEffect(() => {
    const handleShortcut = (e: KeyboardEvent) => {
      if (isRuntimeMode) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          (target as any).isContentEditable)
      ) {
        return;
      }

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (isCtrlOrCmd) {
        if ((e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' || e.key === 'Z') && e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          if (selectedObjectId) {
            handleDuplicateObject(selectedObjectId);
          }
        } else if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleSaveScene();
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace' || e.code === 'Delete' || e.code === 'Backspace') {
        if (selectedObjectId) {
          e.preventDefault();
          handleDeleteObject(selectedObjectId);
        }
      } else if (e.key === 'q' || e.key === 'Q') {
        e.preventDefault();
        handleSetMode('select');
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        handleSetMode('translate');
      } else if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        handleSetMode('rotate');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleSetMode('scale');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (selectedObjectId) {
          viewportRef.current?.frameSelected();
        } else {
          viewportRef.current?.frameAll();
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [
    isRuntimeMode,
    handleUndo,
    handleRedo,
    selectedObjectId,
    handleDeleteObject,
    handleDuplicateObject,
    handleSaveScene,
    handleSetMode
  ]);

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
    const updated = viewportRef.current.getSceneData();
    pushHistoryState(updated);
    if (viewportRef.current.selectionManager && threeObj) {
      viewportRef.current.selectionManager.select(threeObj);
    }
    setSelectedObjectId(newId);
    setSelectedObjectData(newObj);
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* 1. Top Viewport Toolbar */}
      <ViewportToolbar
        onBack={handleBackRequest}
        hasUnsavedChanges={hasUnsavedChanges}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
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
              setHasUnsavedChanges(true);
            }}
            onTransformEnd={data => {
              if (viewportRef.current) {
                const updated = viewportRef.current.getSceneData();
                pushHistoryState(updated);
              }
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
            setHasUnsavedChanges(true);
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

      {/* Save Success Floating Toast */}
      {saveSuccessToast && (
        <div className="fixed top-16 right-6 z-[120] bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md flex items-center space-x-2.5 animate-in slide-in-from-top-2 duration-200">
          <i className="fas fa-circle-check text-emerald-400 text-base"></i>
          <div className="text-xs font-bold">3D SCADA Scene Saved Successfully</div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal before Exiting 3D Studio */}
      {showExitConfirmModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={handleCancelExit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleCancelExit();
          }}
          tabIndex={-1}
        >
          <div 
            className="bg-[#0f172a] border border-amber-500/50 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 relative text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <i className="fas fa-triangle-exclamation text-lg animate-bounce"></i>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-white tracking-wide flex items-center space-x-2">
                  <span>Unsaved Changes in 3D Scene</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  You have unsaved changes in your 3D SCADA scene. Would you like to save your current working layout before returning to the dashboard?
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center space-x-2 text-slate-300 font-medium">
                <i className="fas fa-circle-info text-sky-400 text-[10px]"></i>
                <span>Exiting without saving will discard newly positioned equipment.</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleCancelExit}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer text-center"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={handleDiscardAndExit}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <i className="fas fa-trash-can text-xs"></i>
                <span>Discard & Exit</span>
              </button>
              <button
                type="button"
                autoFocus
                onClick={handleSaveAndExit}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <i className="fas fa-floppy-disk text-xs"></i>
                <span>Save & Exit</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
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
