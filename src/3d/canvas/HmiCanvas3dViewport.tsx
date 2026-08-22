/**
 * HmiCanvas3dViewport.tsx — v3
 *
 * Comprehensive fixes:
 * 1. Object Rendering: Synchronizes 3D objects with Object3DManager without corrupted
 *    materials, and auto-calculates bounding box to frame the equipment nicely.
 * 2. Lighting: Multi-directional balanced lighting ensures all equipment materials shine.
 * 3. Transparent Runtime Canvas: Complete elimination of all chrome, backgrounds, and
 *    borders in runtime mode.
 * 4. Responsive OrbitControls: Target automatically set to object center.
 */

import React, { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { ProjectLibrary, Scada3dAssembly } from "../library/ProjectLibrary";
import { ScadaBindingAdapter } from "../bindings/ScadaBindingAdapter";
import { Object3DManager } from "../objects/Object3DManager";
import { MaterialManager } from "../core/MaterialManager";
import { Panel } from "../../types";

interface HmiCanvas3dViewportProps {
  panel: Panel;
  latestValues: Record<string, { val: any; time?: string }>;
  isRuntimeMode: boolean;
  isSelected?: boolean;
}

const CAM_PRESETS: Record<string, [number, number, number]> = {
  isometric: [7, 7, 7],
  top: [0, 14, 0.001],
  front: [0, 3, 12],
  side: [12, 3, 0],
  custom: [7, 7, 7],
};

export const HmiCanvas3dViewport: React.FC<HmiCanvas3dViewportProps> = ({
  panel,
  latestValues,
  isRuntimeMode,
  isSelected = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const objManagerRef = useRef<Object3DManager | null>(null);
  const bindingAdapterRef = useRef<ScadaBindingAdapter | null>(null);
  const rafRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const isMountedRef = useRef(false);

  // Mutable telemetry ref — updated every render without triggering re-renders
  const latestValuesRef = useRef(latestValues);
  const isRuntimeModeRef = useRef(isRuntimeMode);
  const showGridRef = useRef(panel.canvas3dShowGrid !== false);
  const showAxesRef = useRef(panel.canvas3dShowAxes !== false);

  useEffect(() => { latestValuesRef.current = latestValues; }, [latestValues]);

  // React to runtime mode changes after mount
  useEffect(() => {
    isRuntimeModeRef.current = isRuntimeMode;
    if (gridRef.current) gridRef.current.visible = !isRuntimeMode && showGridRef.current;
    if (axesRef.current) axesRef.current.visible = !isRuntimeMode && showAxesRef.current;
    if (orbitRef.current) orbitRef.current.enabled = !isRuntimeMode;
  }, [isRuntimeMode]);

  useEffect(() => {
    showGridRef.current = panel.canvas3dShowGrid !== false;
    showAxesRef.current = panel.canvas3dShowAxes !== false;
    if (gridRef.current) gridRef.current.visible = !isRuntimeModeRef.current && showGridRef.current;
    if (axesRef.current) axesRef.current.visible = !isRuntimeModeRef.current && showAxesRef.current;
  }, [panel.canvas3dShowGrid, panel.canvas3dShowAxes]);

  // Helper to frame all loaded objects in the camera view
  const autoFrameObjects = useCallback((scene: THREE.Scene, camera: THREE.PerspectiveCamera, orbit: OrbitControls | null) => {
    const box = new THREE.Box3();
    let hasMeshes = false;
    scene.traverse(child => {
      if (child instanceof THREE.Mesh && !child.name.startsWith('__SCADA_') && !child.name.includes('Grid') && !child.name.includes('Axes')) {
        box.expandByObject(child);
        hasMeshes = true;
      }
    });

    if (hasMeshes && !box.isEmpty()) {
      const center = new THREE.Vector3();
      const sphere = new THREE.Sphere();
      box.getCenter(center);
      box.getBoundingSphere(sphere);

      const dist = Math.max(sphere.radius * 2.8, 6);
      camera.position.set(center.x + dist * 0.7, center.y + dist * 0.6, center.z + dist * 0.7);
      camera.lookAt(center);
      if (orbit) {
        orbit.target.copy(center);
        orbit.update();
      }
    }
  }, []);

  // Load assembly via Object3DManager and auto-frame view
  const loadAssembly = useCallback((assembly: Scada3dAssembly) => {
    if (!objManagerRef.current || !sceneRef.current || !cameraRef.current) return;
    objManagerRef.current.syncFromSceneData(assembly.sceneDescriptor.objects);
    autoFrameObjects(sceneRef.current, cameraRef.current, orbitRef.current);
  }, [autoFrameObjects]);

  // Mount-once Three.js setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container || isMountedRef.current) return;
    isMountedRef.current = true;

    // alpha:true renderer + setClearColor(0,0) = fully transparent canvas
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth || 400, container.clientHeight || 320);
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const aspect = (container.clientWidth || 400) / Math.max(container.clientHeight || 320, 1);
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 500);
    const preset = CAM_PRESETS[panel.canvas3dCameraPreset || "isometric"];
    camera.position.set(...preset);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Omnidirectional balanced lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const dir1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dir1.position.set(10, 15, 10);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x93c5fd, 0.7);
    dir2.position.set(-10, 10, -10);
    scene.add(dir2);
    const dir3 = new THREE.DirectionalLight(0xffedd5, 0.5);
    dir3.position.set(-10, -5, 10);
    scene.add(dir3);

    // Grid & Axes (editor only)
    const grid = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
    grid.visible = !isRuntimeModeRef.current && showGridRef.current;
    scene.add(grid);
    gridRef.current = grid;

    const axes = new THREE.AxesHelper(2.5);
    axes.visible = !isRuntimeModeRef.current && showAxesRef.current;
    scene.add(axes);
    axesRef.current = axes;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.08;
    orbit.maxPolarAngle = Math.PI / 1.7;
    orbit.enabled = !isRuntimeModeRef.current;
    orbitRef.current = orbit;

    const matMgr = new MaterialManager();
    const objMgr = new Object3DManager(scene, matMgr);
    objManagerRef.current = objMgr;

    const adapter = new ScadaBindingAdapter();
    adapter.setLatestValuesRef(latestValuesRef);
    bindingAdapterRef.current = adapter;

    // Load assembly if already set on the panel
    if (panel.canvas3dAssemblyId) {
      const asm = ProjectLibrary.getById(panel.canvas3dAssemblyId);
      if (asm) {
        objMgr.syncFromSceneData(asm.sceneDescriptor.objects);
        autoFrameObjects(scene, camera, orbit);
      }
    }

    // RAF loop
    const tick = () => {
      if (!isMountedRef.current) return;
      rafRef.current = requestAnimationFrame(tick);
      const delta = clockRef.current.getDelta();
      orbit.update();
      const objectsData = objMgr.getAllObjectsData();
      if (objectsData.length > 0) {
        adapter.tick(objectsData, (id: string) => objMgr.getThreeObjectByScadaId(id), delta);
      }
      renderer.render(scene, camera);
    };
    tick();

    const ro = new ResizeObserver(() => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      rendererRef.current.setSize(w, h);
      cameraRef.current.aspect = w / Math.max(h, 1);
      cameraRef.current.updateProjectionMatrix();
    });
    ro.observe(container);

    return () => {
      isMountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      orbit.dispose();
      objMgr.dispose();
      matMgr.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to assembly ID change without full remount
  const prevAssemblyId = useRef<string | undefined>();
  useEffect(() => {
    if (panel.canvas3dAssemblyId === prevAssemblyId.current) return;
    prevAssemblyId.current = panel.canvas3dAssemblyId;
    if (!panel.canvas3dAssemblyId) {
      objManagerRef.current?.clear();
      return;
    }
    const asm = ProjectLibrary.getById(panel.canvas3dAssemblyId);
    if (asm) loadAssembly(asm);
  }, [panel.canvas3dAssemblyId, loadAssembly]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Editor chrome — auto-hidden in runtime */}
      {!isRuntimeMode && (
        <>
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{ border: "1.5px dashed rgba(56,189,248,0.55)" }}
          />
          <div className="absolute top-0 left-0 z-10 px-2 py-0.5 bg-sky-950/85 border-b border-r border-sky-500/30 rounded-br-lg pointer-events-none select-none">
            <span className="text-[10px] font-bold text-sky-400 font-mono tracking-wide flex items-center gap-1">
              <i className="fas fa-cube text-[9px]"></i>3D Canvas
            </span>
          </div>
          {isSelected && (
            <div className="absolute inset-0 pointer-events-none z-10 ring-2 ring-sky-400/70" />
          )}
        </>
      )}

      {/* Empty state placeholder — edit mode only */}
      {!panel.canvas3dAssemblyId && !isRuntimeMode && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
          <i className="fas fa-cube text-slate-600 text-3xl"></i>
          <p className="text-slate-500 text-xs font-semibold">No 3D Assembly Loaded</p>
          <p className="text-slate-600 text-[10px]">Right-click → Import from Library</p>
        </div>
      )}
    </div>
  );
};

export default HmiCanvas3dViewport;
