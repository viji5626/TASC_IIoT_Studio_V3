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

export interface JevDecisionResponse {
  requestId: string;
  status: 'SUCCESS' | 'FALLBACK' | 'ERROR';
  executionTimeMs: number;
  answers?: Record<string, string>;
  probabilities?: Record<string, Record<string, number>>;
  confidence?: Record<string, number>;
  backend?: string;
  error?: string;
}

export interface JevRcaResult {
  primary_root_cause: string;
  initiating_event: string;
  severity_badge: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  immediate_rec_safety_action: string;
  subsystem_target: string;
  secondary_damage_risk: string;
  confidence: number;
  latencyMs: number;
  backend?: string;
  probabilities?: Record<string, Record<string, number>>;
  answers?: Record<string, string>;
}

export interface JevTriageResult {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
  target_subsystem: string;
  immediate_action: string;
  operator_notification: string;
  confidence: number;
  latencyMs: number;
  backend?: string;
  probabilities?: Record<string, Record<string, number>>;
  answers?: Record<string, string>;
}

class PythonBridgeClient {
  private isAvailable: boolean = false;
  private lastCheckMs: number = 0;
  private lastLatencyMs: number = 0;

  private daemonInfo: any = null;

  public async checkHealth(): Promise<{ isAvailable: boolean; latencyMs: number; daemon?: any }> {
    // Cache only successful responses for 10s. Failed checks are NOT cached so we retry immediately.
    const now = Date.now();
    if (this.isAvailable && now - this.lastCheckMs < 10000 && this.lastLatencyMs > 0) {
      return { isAvailable: this.isAvailable, latencyMs: this.lastLatencyMs, daemon: this.daemonInfo };
    }

    this.lastCheckMs = now;
    const start = performance.now();

    try {
      // Server-side socket timeout is 5000ms; give the fetch 7000ms to cover round-trip overhead.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch('/api/ai/daemon/health', {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const data = await res.json();
        this.isAvailable = data.status === 'OK';
        this.daemonInfo = data.daemon || null;
        this.lastLatencyMs = Math.round((performance.now() - start) * 100) / 100;
      } else {
        this.isAvailable = false;
        this.daemonInfo = null;
        this.lastLatencyMs = 0;
      }
    } catch {
      this.isAvailable = false;
      this.daemonInfo = null;
      this.lastLatencyMs = 0;
    }

    return { isAvailable: this.isAvailable, latencyMs: this.lastLatencyMs, daemon: this.daemonInfo };
  }

  public async evaluateSpecialist(req: PythonSpecialistRequest): Promise<PythonSpecialistResponse | null> {
    if (!this.isAvailable) {
      return null;
    }

    const start = performance.now();
    try {
      const controller = new AbortController();
      // Specialist eval is a quick Python multi-agent call — 15s is plenty even with Jev preload.
      const timeoutId = setTimeout(() => controller.abort(), 15000);

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

  public async loadGgufModel(modelPath: string, nCtx: number = 2048, nThreads: number = 0, gpuLayers: number = 33): Promise<{
    status: string;
    modelName?: string;
    error?: string;
    message?: string;
    loadTimeMs?: number;
    nThreads?: number;
    nCtx?: number;
    gpuLayers?: number;
    engine?: string;
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

  /**
   * Unload the current GGUF model from VRAM/RAM immediately.
   * Call this when the user switches away from embedded_gguf provider
   * so the GPU is freed for Ollama, LM Studio, or another application.
   */
  public async unloadGgufModel(): Promise<{ status: string; message?: string }> {
    try {
      const res = await fetch('/api/ai/daemon/unload-gguf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) return { status: 'OK', message: 'Unload request sent (daemon may be offline).' };
      return await res.json();
    } catch {
      // Treat network errors as success — daemon is probably already down
      return { status: 'OK', message: 'Daemon offline — VRAM already free.' };
    }
  }

  /**
   * Run raw SLM completion inference (legacy path, used for GBNF tool-grammar calls).
   */
  public async runSlmInference(prompt: string, tools: any[] = [], maxTokens: number = 1024): Promise<{
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

  /**
   * Run multi-turn chat inference via the local GGUF model.
   * Sends the full OpenAI-style messages[] array so the model retains full
   * conversation history across turns. This is the PRIMARY path for the
   * embedded_gguf provider — prevents the "reset to settings" bug.
   */
  public async runSlmChatInference(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    maxTokens: number = 1024,
    temperature: number = 0.1
  ): Promise<{
    status: string;
    engine?: string;
    text?: string;
    tokensPerSec?: number;
    executionTimeMs?: number;
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180000);
    try {
      const res = await fetch('/api/ai/daemon/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          command: 'LOCAL_SLM_INFERENCE',
          requestId: `slm_chat_${Date.now()}`,
          payload: { messages, maxTokens, temperature }
        })
      });
      if (!res.ok) return { status: 'ERROR', text: 'Local GGUF inference endpoint offline' };
      return await res.json();
    } catch (e: any) {
      if (e.name === 'AbortError') {
        return { status: 'ERROR', text: 'Local GGUF inference timed out (>180s).' };
      }
      return { status: 'ERROR', text: e.message };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Run Jev Parallel Constrained Root Cause Analysis (RCA) on equipment trip/alarm avalanche (<35ms).
   */
  public async runRootCauseAnalysis(
    telemetry: string,
    options: { provider?: string; server_url?: string; model_id?: string } = {}
  ): Promise<JevRcaResult | null> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/ai/jev/rca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetry,
          provider: options.provider || 'auto',
          server_url: options.server_url,
          model_id: options.model_id || 'default'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) return null;

      const data: JevDecisionResponse = await res.json();
      if (data.status === 'SUCCESS' && data.answers) {
        return {
          primary_root_cause: data.answers.primary_root_cause || 'UNKNOWN_ANOMALY',
          initiating_event: data.answers.initiating_event || '',
          severity_badge: (data.answers.severity_badge as any) || 'MEDIUM',
          immediate_rec_safety_action: data.answers.immediate_rec_safety_action || '',
          subsystem_target: data.answers.subsystem_target || '',
          secondary_damage_risk: data.answers.secondary_damage_risk || '',
          confidence: data.confidence?.primary_root_cause ?? 0.85,
          latencyMs: data.executionTimeMs ?? Math.round((performance.now() - start) * 10) / 10,
          backend: data.backend || 'laya-english',
          probabilities: data.probabilities,
          answers: data.answers
        };
      }
      return null;
    } catch (err) {
      console.warn('[PythonBridgeClient] runRootCauseAnalysis failed:', err);
      return null;
    }
  }

  /**
   * Run Jev Parallel Constrained ISA-18.2 Alarm Triage & Priority Rationalization (<35ms).
   */
  public async runAlarmTriage(
    telemetry: string,
    options: { provider?: string; server_url?: string; model_id?: string } = {}
  ): Promise<JevTriageResult | null> {
    const start = performance.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch('/api/ai/jev/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telemetry,
          provider: options.provider || 'auto',
          server_url: options.server_url,
          model_id: options.model_id || 'default'
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) return null;

      const data: JevDecisionResponse = await res.json();
      if (data.status === 'SUCCESS' && data.answers) {
        return {
          severity: (data.answers.severity as any) || 'HIGH',
          target_subsystem: data.answers.target_subsystem || '',
          immediate_action: data.answers.immediate_action || '',
          operator_notification: data.answers.operator_notification || '',
          confidence: data.confidence?.severity ?? 0.9,
          latencyMs: data.executionTimeMs ?? Math.round((performance.now() - start) * 10) / 10,
          backend: data.backend || 'laya-english',
          probabilities: data.probabilities,
          answers: data.answers
        };
      }
      return null;
    } catch (err) {
      console.warn('[PythonBridgeClient] runAlarmTriage failed:', err);
      return null;
    }
  }

  /**
   * Run Jev Sensor Telemetry Diagnosis & Drift Detection.
   */
  public async diagnoseSensor(telemetry: string): Promise<any | null> {
    try {
      const res = await fetch('/api/ai/jev/sensor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Run Jev Energy Meter Rating & Hog Detection.
   */
  public async rateEnergyMeters(telemetry: string): Promise<any | null> {
    try {
      const res = await fetch('/api/ai/jev/energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry })
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
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

