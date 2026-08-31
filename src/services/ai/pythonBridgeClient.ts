/**
 * TASC IIoT Studio — Python AI Daemon IPC Bridge Client
 *
 * Provides ultra-low-latency bridge to the local Python AI daemon sidecar
 * with instant sub-millisecond fallback to native TypeScript micro-agents.
 */

export interface PythonSpecialistRequest {
  requestId: string;
  queryText: string;
  targetSpecialists: string[];
  timeHorizon?: {
    fromMs: number;
    toMs: number;
    isArchive: boolean;
    storageTier: string;
  };
  context: {
    liveTags: Record<string, { val: any; quality?: string; ts?: number }>;
    activeAlarmsCount: number;
    activeDriversCount: number;
  };
}

export interface PythonSpecialistResponse {
  requestId: string;
  status: 'SUCCESS' | 'ERROR' | 'FALLBACK';
  executionTimeMs: number;
  evidenceLines: string[];
  storageTierUsed?: 'hot_raw' | 'compressed_archive_chunk' | '1hour_rollup' | '1day_rollup';
  error?: string;
}

class PythonBridgeClient {
  private isAvailable: boolean = false;
  private lastCheckMs: number = 0;
  private lastLatencyMs: number = 0;

  public async checkHealth(): Promise<{ isAvailable: boolean; latencyMs: number }> {
    // Avoid hammering health check more than once every 10 seconds
    const now = Date.now();
    if (now - this.lastCheckMs < 10000 && this.lastLatencyMs > 0) {
      return { isAvailable: this.isAvailable, latencyMs: this.lastLatencyMs };
    }

    this.lastCheckMs = now;
    const start = performance.now();

    try {
      // In browser/Vite context, we check via local API proxy or fallback
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 150);

      const res = await fetch('/api/ai/daemon/health', {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        this.isAvailable = data.status === 'OK';
        this.lastLatencyMs = Math.round((performance.now() - start) * 100) / 100;
      } else {
        this.isAvailable = false;
        this.lastLatencyMs = 0;
      }
    } catch {
      this.isAvailable = false;
      this.lastLatencyMs = 0;
    }

    return { isAvailable: this.isAvailable, latencyMs: this.lastLatencyMs };
  }

  public async evaluateSpecialist(req: PythonSpecialistRequest): Promise<PythonSpecialistResponse | null> {
    if (!this.isAvailable) {
      return null;
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);

      const res = await fetch('/api/ai/daemon/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return {
        requestId: req.requestId,
        status: 'SUCCESS',
        executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
        evidenceLines: data.evidenceLines || [],
        storageTierUsed: data.storageTierUsed || 'hot_raw'
      };
    } catch {
      return null;
    }
  }

  public async queryRag(queryText: string, topK: number = 3): Promise<Array<{
    id: string;
    title: string;
    parentContext: string;
    childContent: string;
    category?: string;
    score: number;
    source: string;
  }> | null> {
    if (!this.isAvailable) return null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 400);

      const res = await fetch('/api/ai/daemon/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'RAG_QUERY',
          requestId: `rag_${Date.now()}`,
          payload: { queryText, topK }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) return null;

      const data = await res.json();
      return data.citations || null;
    } catch {
      return null;
    }
  }

  public async scanGgufModels(searchDir?: string): Promise<Array<{
    name: string;
    path: string;
    sizeMb: number;
    isLoaded: boolean;
    isVisionProjector?: boolean;
  }>> {
    try {
      const url = searchDir
        ? `/api/local-ai/gguf-scan?dir=${encodeURIComponent(searchDir)}`
        : '/api/local-ai/gguf-scan';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.models)) {
          return data.models.map((m: any) => ({
            name: m.name,
            path: m.path,
            sizeMb: m.sizeMb,
            isLoaded: false,
            isVisionProjector: m.isVisionProjector
          }));
        }
      }
    } catch {}

    try {
      const res = await fetch('/api/ai/daemon/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'SCAN_GGUF_MODELS',
          requestId: `scan_${Date.now()}`,
          payload: { searchDir }
        })
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.models || [];
    } catch {
      return [];
    }
  }

  public async loadGgufModel(modelPath: string, nCtx: number = 2048, nThreads: number = 4, gpuLayers: number = 0): Promise<{
    status: string;
    modelName?: string;
    error?: string;
    message?: string;
    loadTimeMs?: number;
  }> {
    try {
      const res = await fetch('/api/ai/daemon/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'LOAD_GGUF_MODEL',
          requestId: `load_${Date.now()}`,
          payload: { modelPath, nCtx, nThreads, gpuLayers }
        })
      });
      if (!res.ok) return { status: 'ERROR', error: 'IPC request failed' };
      return await res.json();
    } catch (e: any) {
      return { status: 'ERROR', error: e.message };
    }
  }

  public async runSlmInference(prompt: string, tools: any[] = [], maxTokens: number = 512): Promise<{
    status: string;
    engine?: string;
    text?: string;
    tokensPerSec?: number;
    executionTimeMs?: number;
  }> {
    try {
      const res = await fetch('/api/ai/daemon/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: 'LOCAL_SLM_INFERENCE',
          requestId: `slm_${Date.now()}`,
          payload: { prompt, tools, maxTokens }
        })
      });
      if (!res.ok) return { status: 'ERROR', text: 'Local SLM engine offline' };
      return await res.json();
    } catch (e: any) {
      return { status: 'ERROR', text: e.message };
    }
  }

  public getLatency(): number {
    return this.lastLatencyMs;
  }

  public getIsAvailable(): boolean {
    return this.isAvailable;
  }
}

export const pythonBridge = new PythonBridgeClient();

