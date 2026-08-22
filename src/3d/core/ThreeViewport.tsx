import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { ViewportEngine } from './ViewportEngine';
import { OrbitControlsManager } from '../controls/OrbitControlsManager';
import { TransformControlsManager } from '../controls/TransformControlsManager';
import { SelectionManager } from '../objects/SelectionManager';
import { Object3DManager } from '../objects/Object3DManager';
import { ScadaBindingAdapter } from '../bindings/ScadaBindingAdapter';
import { ObjectTransformData, TransformMode, CoordinateSpace } from '../types/transform';
import { CameraPresetView, CameraProjection, Scada3dObject, Scada3dScene } from '../types/scene';

export interface ThreeViewportRef {
  engine: ViewportEngine | null;
  object3DManager: Object3DManager | null;
  selectionManager: SelectionManager | null;
  transformControlsManager: TransformControlsManager | null;
  orbitControlsManager: OrbitControlsManager | null;
  scadaBindingAdapter: ScadaBindingAdapter | null;
  setMode: (mode: TransformMode) => void;
  setSpace: (space: CoordinateSpace) => void;
  setPresetView: (preset: CameraPresetView) => void;
  setProjection: (proj: CameraProjection) => void;
  frameSelected: () => void;
  frameAll: () => void;
  addObject: (data: Partial<Scada3dObject>) => void;
  loadScene: (scene: Scada3dScene) => void;
  getSceneData: () => Scada3dObject[];
}

interface ThreeViewportProps {
  initialScene?: Scada3dScene;
  latestValues?: Record<string, { val: any; time?: string }>;
  isRuntimeMode?: boolean;
  onSelectObject?: (objectData: Scada3dObject | null) => void;
  onTransformChange?: (objectData: Scada3dObject) => void;
}

export const ThreeViewport = forwardRef<ThreeViewportRef, ThreeViewportProps>(({
  initialScene,
  latestValues = {},
  isRuntimeMode = false,
  onSelectObject,
  onTransformChange
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const engineRef = useRef<ViewportEngine | null>(null);
  const orbitRef = useRef<OrbitControlsManager | null>(null);
  const transformRef = useRef<TransformControlsManager | null>(null);
  const selectionRef = useRef<SelectionManager | null>(null);
  const objectManagerRef = useRef<Object3DManager | null>(null);
  const bindingAdapterRef = useRef<ScadaBindingAdapter | null>(null);

  // Mutable telemetry ref to avoid React re-renders
  const latestValuesRef = useRef(latestValues);
  useEffect(() => {
    latestValuesRef.current = latestValues;
  }, [latestValues]);

  // Keep latest callbacks in refs
  const onSelectObjectRef = useRef(onSelectObject);
  useEffect(() => { onSelectObjectRef.current = onSelectObject; }, [onSelectObject]);

  const onTransformChangeRef = useRef(onTransformChange);
  useEffect(() => { onTransformChangeRef.current = onTransformChange; }, [onTransformChange]);

  // Initialize Three.js Engine and Subsystems
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Core Engine
    const engine = new ViewportEngine(container);
    engineRef.current = engine;

    // 2. Camera Orbit Controls
    const orbitControls = new OrbitControlsManager(
      engine.cameraManager.activeCamera,
      engine.renderer.domElement,
      engine.cameraManager.target
    );
    orbitRef.current = orbitControls;

    // 3. 3-Axis Transform Controls Gizmo
    const transformControls = new TransformControlsManager(
      engine.cameraManager.activeCamera,
      engine.renderer.domElement,
      engine.scene
    );
    transformRef.current = transformControls;

    // 4. Object Selection Manager
    const selectionManager = new SelectionManager(
      engine.cameraManager.activeCamera,
      engine.scene,
      engine.renderer.domElement,
      transformControls
    );
    selectionRef.current = selectionManager;

    // 5. Equipment Object Manager
    const objectManager = new Object3DManager(engine.scene, engine.materialManager);
    objectManagerRef.current = objectManager;

    // 6. SCADA Telemetry Binding Adapter
    const bindingAdapter = new ScadaBindingAdapter();
    bindingAdapter.setLatestValuesRef(latestValuesRef);
    bindingAdapterRef.current = bindingAdapter;

    // Deconflict OrbitControls and TransformControls
    transformControls.onDraggingChange(isDragging => {
      orbitControls.setEnabled(!isDragging);
    });

    // Handle Transform Changes from Gizmo Dragging
    transformControls.onTransformChange((transform: ObjectTransformData) => {
      const attached = transformControls.getAttachedObject();
      if (attached) {
        const scadaId = objectManager.getScadaIdFromThreeObject(attached);
        if (scadaId) {
          objectManager.updateTransform(scadaId, transform);
          selectionManager.updateSelectionBox();
          const data = objectManager.getObjectData(scadaId);
          if (data && onTransformChangeRef.current) {
            onTransformChangeRef.current(data);
          }
        }
      }
    });

    // Handle Selection
    selectionManager.onSelect(threeObj => {
      if (threeObj) {
        const scadaId = objectManager.getScadaIdFromThreeObject(threeObj);
        const data = scadaId ? objectManager.getObjectData(scadaId) : null;
        if (onSelectObjectRef.current) onSelectObjectRef.current(data || null);
      } else {
        if (onSelectObjectRef.current) onSelectObjectRef.current(null);
      }
    });

    // Register high-frequency render loop tick
    const unregisterTick = engine.registerRenderTick(delta => {
      orbitControls.update();
      if (objectManagerRef.current && bindingAdapterRef.current) {
        const allData = objectManagerRef.current.getAllObjectsData();
        bindingAdapterRef.current.tick(
          allData,
          id => objectManagerRef.current?.getThreeObjectByScadaId(id),
          delta
        );
      }
    });

    // Load initial scene if provided
    if (initialScene) {
      if (initialScene.environment) engine.setupEnvironment(initialScene.environment);
      if (initialScene.camera) engine.cameraManager.applyConfig(initialScene.camera);
      if (initialScene.objects) objectManager.syncFromSceneData(initialScene.objects);
      orbitControls.sync(engine.cameraManager.activeCamera, engine.cameraManager.target);
    }

    // ResizeObserver for responsive layout updates
    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(container);

    // Initial resize trigger to guarantee full canvas rendering
    requestAnimationFrame(() => {
      engine.resize();
    });
    const tId = setTimeout(() => {
      engine.resize();
    }, 120);

    return () => {
      clearTimeout(tId);
      unregisterTick();
      resizeObserver.disconnect();
      selectionManager.dispose();
      transformControls.dispose();
      orbitControls.dispose();
      objectManager.dispose();
      engine.dispose();
    };
  }, []);

  // Update Runtime Mode behavior
  useEffect(() => {
    if (transformRef.current) {
      if (isRuntimeMode) {
        transformRef.current.detach();
      }
    }
  }, [isRuntimeMode]);

  // Expose Imperative API
  useImperativeHandle(ref, () => ({
    engine: engineRef.current,
    object3DManager: objectManagerRef.current,
    selectionManager: selectionRef.current,
    transformControlsManager: transformRef.current,
    orbitControlsManager: orbitRef.current,
    scadaBindingAdapter: bindingAdapterRef.current,

    setMode: (mode: TransformMode) => {
      if (transformRef.current) transformRef.current.setMode(mode);
    },
    setSpace: (space: CoordinateSpace) => {
      if (transformRef.current) transformRef.current.setSpace(space);
    },
    setPresetView: (preset: CameraPresetView) => {
      if (engineRef.current && orbitRef.current) {
        engineRef.current.cameraManager.setPresetView(preset);
        orbitRef.current.sync(engineRef.current.cameraManager.activeCamera, engineRef.current.cameraManager.target);
        if (transformRef.current) {
          transformRef.current.updateCamera(engineRef.current.cameraManager.activeCamera);
        }
        if (selectionRef.current) {
          selectionRef.current.updateCamera(engineRef.current.cameraManager.activeCamera);
        }
      }
    },
    setProjection: (proj: CameraProjection) => {
      if (engineRef.current && orbitRef.current && transformRef.current && selectionRef.current) {
        const newCam = engineRef.current.cameraManager.setProjection(proj);
        orbitRef.current.sync(newCam, engineRef.current.cameraManager.target);
        transformRef.current.updateCamera(newCam);
        selectionRef.current.updateCamera(newCam);
      }
    },
    frameSelected: () => {
      if (engineRef.current && selectionRef.current && orbitRef.current) {
        const selected = selectionRef.current.getSelectedObject();
        if (selected) {
          engineRef.current.cameraManager.frameObject(selected);
          orbitRef.current.sync(engineRef.current.cameraManager.activeCamera, engineRef.current.cameraManager.target);
        }
      }
    },
    frameAll: () => {
      if (engineRef.current && orbitRef.current) {
        engineRef.current.cameraManager.frameAll(engineRef.current.scene);
        orbitRef.current.sync(engineRef.current.cameraManager.activeCamera, engineRef.current.cameraManager.target);
      }
    },
    addObject: (data: Partial<Scada3dObject>) => {
      if (objectManagerRef.current && selectionRef.current) {
        const threeObj = objectManagerRef.current.addObject(data);
        threeObj.updateMatrixWorld(true);
        selectionRef.current.select(threeObj);
        if (engineRef.current) {
          engineRef.current.resize();
        }
      }
    },
    loadScene: (scene: Scada3dScene) => {
      if (engineRef.current && objectManagerRef.current && orbitRef.current) {
        if (scene.environment) engineRef.current.setupEnvironment(scene.environment);
        if (scene.camera) engineRef.current.cameraManager.applyConfig(scene.camera);
        if (scene.objects) objectManagerRef.current.syncFromSceneData(scene.objects);
        orbitRef.current.sync(engineRef.current.cameraManager.activeCamera, engineRef.current.cameraManager.target);
      }
    },
    getSceneData: () => {
      return objectManagerRef.current ? objectManagerRef.current.getAllObjectsData() : [];
    }
  }));

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full min-w-0 min-h-0 overflow-hidden select-none touch-none bg-slate-950 block"
      style={{ outline: 'none', width: '100%', height: '100%' }}
    />
  );
});

ThreeViewport.displayName = 'ThreeViewport';
