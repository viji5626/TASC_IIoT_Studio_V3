import * as THREE from 'three';
import { CameraManager } from './CameraManager';
import { LightingManager } from './LightingManager';
import { MaterialManager } from './MaterialManager';
import { Scada3dEnvironmentConfig } from '../types/scene';

export class ViewportEngine {
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public cameraManager: CameraManager;
  public lightingManager: LightingManager;
  public materialManager: MaterialManager;

  // Environment helpers
  private gridHelper: THREE.GridHelper | null = null;
  private axesHelper: THREE.AxesHelper | null = null;
  private environmentGroup: THREE.Group;

  // Render loop control
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  private clock: THREE.Clock = new THREE.Clock();

  // Callbacks for hooks inside render loop
  private onRenderTickCallbacks: Set<(delta: number) => void> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a); // SCADA Dark Slate

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      stencil: false
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Append canvas to DOM with responsive styling
    const canvas = this.renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.style.outline = 'none';
    this.container.appendChild(canvas);

    // 3. Subsystem Managers
    this.cameraManager = new CameraManager(container);
    this.lightingManager = new LightingManager(this.scene);
    this.lightingManager.setupDefaultIndustrialLighting();
    this.materialManager = new MaterialManager();

    // 4. Environment Helpers (Grid + Coordinate Axes)
    this.environmentGroup = new THREE.Group();
    this.environmentGroup.name = '__SCADA_3D_ENVIRONMENT__';
    this.scene.add(this.environmentGroup);
    this.setupEnvironment({
      backgroundColor: '#0f172a',
      gridVisible: true,
      gridSize: 30,
      gridDivisions: 30,
      axisHelperVisible: true,
      axisHelperSize: 3,
      fogEnabled: false,
      fogColor: '#0f172a',
      fogNear: 20,
      fogFar: 80
    });

    // 5. Start render loop
    this.start();
  }

  /**
   * Configures environmental floor grid, axes, fog and background.
   */
  public setupEnvironment(config: Scada3dEnvironmentConfig): void {
    this.scene.background = new THREE.Color(config.backgroundColor || '#0f172a');

    // Grid Helper (1 unit = 1 meter)
    if (this.gridHelper) {
      this.environmentGroup.remove(this.gridHelper);
      this.gridHelper.dispose();
      this.gridHelper = null;
    }
    if (config.gridVisible) {
      this.gridHelper = new THREE.GridHelper(
        config.gridSize || 30,
        config.gridDivisions || 30,
        0x38bdf8, // Sky primary center line
        0x334155  // Subtle slate divisions
      );
      this.gridHelper.position.y = 0;
      this.environmentGroup.add(this.gridHelper);
    }

    // Coordinate Axes Helper (X=Red, Y=Green, Z=Blue)
    if (this.axesHelper) {
      this.environmentGroup.remove(this.axesHelper);
      this.axesHelper.dispose();
      this.axesHelper = null;
    }
    if (config.axisHelperVisible) {
      this.axesHelper = new THREE.AxesHelper(config.axisHelperSize || 3);
      this.axesHelper.position.set(0, 0.01, 0); // Slight offset above grid
      this.environmentGroup.add(this.axesHelper);
    }

    // Optional Distance Fog
    if (config.fogEnabled) {
      this.scene.fog = new THREE.Fog(config.fogColor || '#0f172a', config.fogNear || 20, config.fogFar || 80);
    } else {
      this.scene.fog = null;
    }
  }

  /**
   * Registers a high-frequency tick callback (e.g. SCADA tag dynamics, animations)
   */
  public registerRenderTick(callback: (delta: number) => void): () => void {
    this.onRenderTickCallbacks.add(callback);
    return () => {
      this.onRenderTickCallbacks.delete(callback);
    };
  }

  /**
   * Render loop tick running at up to 60/120 FPS.
   */
  private render = (): void => {
    if (!this.isRunning) return;

    const delta = this.clock.getDelta();

    // 1. Execute registered tick listeners (Animations, Telemetry transformations)
    this.onRenderTickCallbacks.forEach(cb => {
      try {
        cb(delta);
      } catch (err) {
        console.error('[ViewportEngine] Error in tick callback:', err);
      }
    });

    // 2. Render active camera
    this.renderer.render(this.scene, this.cameraManager.activeCamera);

    // 3. Queue next frame
    this.animationFrameId = requestAnimationFrame(this.render);
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.render();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Resizes viewport when panel/window dimensions change.
   */
  public resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width <= 0 || height <= 0 || !Number.isFinite(width) || !Number.isFinite(height)) return;

    this.cameraManager.handleResize(width, height);
    this.renderer.setSize(width, height, false);
  }

  /**
   * Complete disposal and WebGL resource cleanup.
   */
  public dispose(): void {
    this.stop();
    this.onRenderTickCallbacks.clear();

    // Dispose helpers
    if (this.gridHelper) this.gridHelper.dispose();
    if (this.axesHelper) this.axesHelper.dispose();

    // Dispose lighting & materials
    this.lightingManager.dispose();
    this.materialManager.dispose();

    // Traverse scene and dispose meshes
    this.scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });

    // Dispose renderer and detach DOM element
    if (this.renderer.domElement && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
