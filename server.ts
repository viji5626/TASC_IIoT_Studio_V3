import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import winston from 'winston';
import http from 'http';
import net from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec, spawn, execSync } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const appDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

import {
  OPCUAClient,
  MessageSecurityMode,
  SecurityPolicy,
  AttributeIds,
  BrowseDirection,
  NodeClass,
  DataType,
  UserTokenType
} from 'node-opcua';
import jsmodbus from 'jsmodbus';
import { Iec61850Driver } from './src/drivers/iec61850/iec61850Driver';
import { SiemensS7Driver } from './src/drivers/siemens_s7/siemensS7Driver';
import { MelsecDriver } from './src/drivers/mitsubishi_melsec/melsecDriver';
import { EthernetIpDriver } from './src/drivers/ethernet_ip/ethernetIpDriver';
import { EdsParser } from './src/drivers/ethernet_ip/edsParser';
import { ProfinetDriver } from './src/drivers/profinet/profinetDriver';
import { ProfibusDriver } from './src/drivers/profibus/profibusDriver';
import { gsdCatalogService } from './src/drivers/gsd/gsdCatalogService';
import { BlockReadManager } from './src/services/BlockReadManager';
import { pollingManager } from './src/services/pollingManager';
import { scadaSqlRouter } from './src/routes/scadaSqlRoutes';
import { operatorAuthRouter } from './src/routes/operatorAuthRoutes';
import { aiProxyRouter } from './src/routes/aiProxyRoutes';
import { ServerHistorian } from './src/services/historian/ServerHistorian';
import { ServerAlarmEngine, AlarmCategory, AlarmSeverity } from './src/services/alarms/ServerAlarmEngine';
import { ServerReportEngine } from './src/services/reporting/ServerReportEngine';
import { serverEmailService } from './src/services/email/ServerEmailService';
import { ServerSmsEngine } from './src/services/sms/ServerSmsEngine';
import { ServerAlarmEmailEngine } from './src/services/alarms/ServerAlarmEmailEngine';
import { CARRIER_DIRECTORY } from './src/services/sms/carrierGateways';

const PORT = 3000;

// Winston Logger Setup for Audit Logging
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'audit.log' })
  ]
});

function detectSerialPorts(): Promise<Array<{ port: string; name: string; description?: string }>> {
  return new Promise((resolve) => {
    const platform = os.platform();
    if (platform === 'win32') {
      // 1. Check Windows Registry for hardware SERIALCOMM ports
      exec('reg query "HKLM\\HARDWARE\\DEVICEMAP\\SERIALCOMM"', (regErr, regOut) => {
        const ports: Array<{ port: string; name: string; description?: string }> = [];
        if (!regErr && regOut) {
          const lines = regOut.split(/\r?\n/);
          for (const line of lines) {
            const match = line.trim().match(/REG_SZ\s+(COM\d+)/i);
            if (match) {
              const port = match[1].toUpperCase();
              if (!ports.some(p => p.port === port)) {
                ports.push({ port, name: port, description: 'Hardware Serial Port' });
              }
            }
          }
        }

        // 2. Query PowerShell for friendly device captions (e.g. USB-SERIAL CH340, FTDI, CP210x)
        exec('powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq \'Ports\' } | Select-Object -Property Caption, Name, DeviceID | ConvertTo-Json"', (psErr, psOut) => {
          if (!psErr && psOut && psOut.trim()) {
            try {
              const parsed = JSON.parse(psOut);
              const list = Array.isArray(parsed) ? parsed : [parsed];
              for (const item of list) {
                const text = item.Caption || item.Name || '';
                const match = text.match(/(COM\d+)/i);
                if (match) {
                  const port = match[1].toUpperCase();
                  const existing = ports.find(p => p.port === port);
                  if (existing) {
                    existing.name = text;
                    existing.description = item.DeviceID || text;
                  } else {
                    ports.push({ port, name: text, description: item.DeviceID || text });
                  }
                }
              }
            } catch (e) { }
          }

          if (ports.length === 0) {
            ['COM1', 'COM2', 'COM3', 'COM4'].forEach(p => {
              ports.push({ port: p, name: p, description: 'Virtual / Standard Port' });
            });
          }

          ports.sort((a, b) => {
            const numA = parseInt(a.port.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.port.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
          });

          resolve(ports);
        });
      });
    } else {
      exec('ls /dev/ttyUSB* /dev/ttyACM* /dev/ttyS* /dev/tty.* 2>/dev/null', (err, stdout) => {
        const ports: Array<{ port: string; name: string; description?: string }> = [];
        if (!err && stdout) {
          stdout.split(/\s+/).filter(Boolean).forEach(p => {
            ports.push({ port: p, name: p, description: 'Serial Device' });
          });
        }
        if (ports.length === 0) {
          ['/dev/ttyUSB0', '/dev/ttyUSB1', '/dev/ttyS0'].forEach(p => {
            ports.push({ port: p, name: p, description: 'Standard Serial Device' });
          });
        }
        resolve(ports);
      });
    }
  });
}

async function startServer() {
  const app = express();

  // Phase 1: Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://challenges.cloudflare.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
        frameSrc: ["'self'", "https://challenges.cloudflare.com"],
        workerSrc: ["'self'", "blob:"],
        fontSrc: ["'self'"]
      }
    }
  }));

  // Cross-Origin Resource Sharing (CORS) & W3C Private Network Access (PNA)
  // Allows cloud-hosted studio (https://app.tascautomation.com) to communicate with local Edge Bridge
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-operator-user, x-target-url');
    res.header('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Phase 1: Rate Limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 500, // Limit each IP to 500 requests per window
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/', apiLimiter);

  const server = http.createServer(app);

  app.use(express.json({ limit: '50mb' }));

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'TASC MQTT Dash Pro Server & TCP Bridge',
      timestamp: new Date().toISOString()
    });
  });

  // ─── SCADA SQL Database Server Router (Isolated Data Source & Manipulator) ─────
  app.use('/api/scada-sql', scadaSqlRouter);

  // ─── Operator Auth & RBAC Router (Client Edition Runtime User Management) ─────
  app.use('/api/auth/op', operatorAuthRouter);

  // ─── AI Endpoint Transparent Proxy (CORS / SSE Streaming Passthrough) ─────────
  app.use('/api/ai/proxy', aiProxyRouter);

  // ─── AI Python Daemon & Fast Local GGUF Scanner Endpoints ─────────────────
  app.get('/api/local-ai/gguf-scan', (req, res) => {
    const customDir = (req.query.dir as string) || '';
    const searchDirs = new Set<string>();

    if (customDir && fs.existsSync(customDir)) {
      searchDirs.add(customDir);
    }

    const homeDir = os.homedir();
    const standardPaths = [
      path.join(process.cwd(), 'models'),
      path.join(appDir, '..', 'models'),
      path.join(appDir, 'models'),
      path.join(homeDir, '.lmstudio', 'models'),
      path.join(homeDir, '.cache', 'lm-studio', 'models'),
      path.join(homeDir, '.ollama', 'models'),
      'D:\\models',
      'C:\\models',
      path.join(process.cwd(), 'python_engine', 'models')
    ];

    for (const p of standardPaths) {
      if (fs.existsSync(p)) searchDirs.add(p);
    }

    const foundModels: Array<{ name: string; path: string; sizeMb: number; isVisionProjector: boolean }> = [];

    function walkDir(currentPath: string, depth: number = 0) {
      if (depth > 6) return;
      try {
        const entries = fs.readdirSync(currentPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          if (entry.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.gguf')) {
            try {
              const stat = fs.statSync(fullPath);
              const sizeMb = Math.round((stat.size / (1024 * 1024)) * 10) / 10;
              const isVision = entry.name.toLowerCase().startsWith('mmproj');
              foundModels.push({
                name: entry.name,
                path: fullPath,
                sizeMb,
                isVisionProjector: isVision
              });
            } catch { }
          }
        }
      } catch { }
    }

    for (const d of searchDirs) {
      walkDir(d);
    }

    // Sort: Main models first, descending by size
    foundModels.sort((a, b) => {
      if (a.isVisionProjector !== b.isVisionProjector) {
        return a.isVisionProjector ? 1 : -1;
      }
      return b.sizeMb - a.sizeMb;
    });

    res.json({ status: 'SUCCESS', count: foundModels.length, models: foundModels });
  });

  // ─── Local AI Inbuilt Model Discovery & Verification ───────────────────────
  const rootDir = fs.existsSync(path.join(appDir, 'python_engine'))
    ? appDir
    : fs.existsSync(path.join(appDir, '..', 'python_engine'))
    ? path.join(appDir, '..')
    : fs.existsSync(path.join(process.cwd(), 'python_engine'))
    ? process.cwd()
    : appDir;

  function findInbuiltGgufModel(): { found: boolean; modelPath: string; modelName: string; sizeMb: number; sizeFormatted: string } | null {
    const candidateDirs = [
      path.join(rootDir, 'models'),
      path.join(appDir, '..', 'models'),
      path.join(appDir, 'models'),
      path.join(process.cwd(), 'models')
    ];
    for (const d of candidateDirs) {
      if (fs.existsSync(d)) {
        try {
          const files = fs.readdirSync(d);
          // Prioritize LFM models first, then any .gguf
          const sorted = files.filter(f => f.toLowerCase().endsWith('.gguf')).sort((a, b) => {
            if (a.toLowerCase().includes('lfm') && !b.toLowerCase().includes('lfm')) return -1;
            if (!a.toLowerCase().includes('lfm') && b.toLowerCase().includes('lfm')) return 1;
            return 0;
          });
          for (const f of sorted) {
            const fullPath = path.join(d, f);
            const stat = fs.statSync(fullPath);
            const sizeMb = Math.round((stat.size / (1024 * 1024)) * 10) / 10;
            return {
              found: true,
              modelPath: fullPath,
              modelName: f,
              sizeMb,
              sizeFormatted: sizeMb > 1024 ? `${(sizeMb / 1024).toFixed(2)} GB` : `${sizeMb} MB`
            };
          }
        } catch {}
      }
    }
    return null;
  }

  // Get Inbuilt native bundled model info
  app.get('/api/local-ai/inbuilt-model', (req, res) => {
    const model = findInbuiltGgufModel();
    if (model) {
      res.json({ status: 'SUCCESS', ...model });
    } else {
      res.json({ status: 'NOT_FOUND', found: false });
    }
  });

  // Verify GGUF file exists on disk (with automatic fallback to inbuilt model)
  app.get('/api/local-ai/verify-model', (req, res) => {
    const modelPath = (req.query.path as string) || '';
    const inbuilt = findInbuiltGgufModel();

    if (modelPath && fs.existsSync(modelPath)) {
      try {
        const stat = fs.statSync(modelPath);
        const sizeMb = Math.round((stat.size / (1024 * 1024)) * 10) / 10;
        const filename = path.basename(modelPath);
        return res.json({
          ok: true,
          exists: true,
          filename,
          sizeMb,
          sizeFormatted: sizeMb > 1024 ? `${(sizeMb / 1024).toFixed(2)} GB` : `${sizeMb} MB`,
          message: `Model "${filename}" (${sizeMb > 1024 ? (sizeMb / 1024).toFixed(2) + ' GB' : sizeMb + ' MB'}) verified on disk.`
        });
      } catch (e: any) {
        return res.status(500).json({ ok: false, error: e.message });
      }
    }

    // Configured model path missing on this PC — check for inbuilt bundled model
    if (inbuilt) {
      return res.json({
        ok: true,
        exists: true,
        inbuiltFallback: true,
        fallbackPath: inbuilt.modelPath,
        filename: inbuilt.modelName,
        sizeMb: inbuilt.sizeMb,
        sizeFormatted: inbuilt.sizeFormatted,
        message: `Configured path unavailable. Inbuilt native model "${inbuilt.modelName}" (${inbuilt.sizeFormatted}) ready on disk.`
      });
    }

    return res.status(404).json({
      ok: false,
      exists: false,
      error: `Model file not found at: ${modelPath || '(empty path)'}`
    });
  });

  // Python Daemon Auto-Spawn & Management
  let pythonDaemonProcess: any = null;

  function getLogFd(logFilename: string): number | 'ignore' {
    const candidateDirs = [
      rootDir,
      path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'TASC_IIoT_Studio'),
      os.tmpdir()
    ];
    for (const dir of candidateDirs) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = path.join(dir, logFilename);
        return fs.openSync(filePath, 'a');
      } catch {
        // try next fallback directory
      }
    }
    return 'ignore';
  }

  function getPythonExe(): string {
    const candidates = [
      path.join(rootDir, 'python', 'python.exe'),
      path.join(rootDir, 'venv', 'Scripts', 'python.exe'),
      path.join(rootDir, 'python_engine', 'venv', 'Scripts', 'python.exe'),
      path.join(process.cwd(), 'python', 'python.exe'),
      path.join(process.cwd(), 'venv', 'Scripts', 'python.exe'),
      path.join(appDir, '..', 'python', 'python.exe'),
      path.join(appDir, '..', 'venv', 'Scripts', 'python.exe'),
      'python'
    ];
    for (const c of candidates) {
      if (c === 'python') return 'python';
      if (fs.existsSync(c)) {
        try {
          execSync(`"${c}" -c "import sys"`, { timeout: 2000, stdio: 'ignore' });
          return c;
        } catch {
          console.warn(`[Python Discovery] '${c}' exists but failed execution check. Skipping...`);
        }
      }
    }
    return 'python';
  }

  function checkDaemonSocketAlive(timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
      const s = new net.Socket();
      let done = false;
      s.setTimeout(timeoutMs);
      s.connect(8765, '127.0.0.1', () => {
        done = true;
        s.destroy();
        resolve(true);
      });
      s.on('error', () => {
        if (!done) { done = true; s.destroy(); resolve(false); }
      });
      s.on('timeout', () => {
        if (!done) { done = true; s.destroy(); resolve(false); }
      });
    });
  }

  async function ensurePythonDaemon(forceRestart = false): Promise<boolean> {
    const isSocketAlive = await checkDaemonSocketAlive(600);
    if (isSocketAlive && !forceRestart) {
      return true;
    }

    if (pythonDaemonProcess) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /F /T /PID ${pythonDaemonProcess.pid}`, () => {});
        } else {
          process.kill(pythonDaemonProcess.pid);
        }
      } catch { /* ignore */ }
      pythonDaemonProcess = null;
    }

    // Clean up any stale process holding port 8765 if socket is unresponsive
    if (!isSocketAlive && process.platform === 'win32') {
      try {
        exec('for /f "tokens=5" %a in (\'netstat -aon ^| findstr :8765 ^| findstr LISTENING\') do taskkill /f /pid %a', () => {});
      } catch {}
    }

    try {
      const daemonScript = path.join(rootDir, 'python_engine', 'tasc_ai_daemon.py');
      if (fs.existsSync(daemonScript)) {
        const pythonExe = getPythonExe();
        const logFd = getLogFd('tasc_ai_daemon_startup.log');
        const stdioCfg: any = typeof logFd === 'number' ? ['ignore', logFd, logFd] : 'ignore';

        pythonDaemonProcess = spawn(pythonExe, [daemonScript, '8765'], {
          cwd: rootDir,
          detached: false,
          stdio: stdioCfg,
          windowsHide: true
        });

        pythonDaemonProcess.on('error', (err: any) => {
          console.warn('[Python Daemon Process Error]:', err.message);
          pythonDaemonProcess = null;
        });

        pythonDaemonProcess.on('exit', () => {
          pythonDaemonProcess = null;
        });

        (global as any).__tasc_daemon_pid = pythonDaemonProcess.pid;
        console.log(`[Python Daemon] Auto-spawned on port 8765 (PID: ${pythonDaemonProcess.pid}, exe: ${pythonExe})`);
      }
    } catch (err: any) {
      console.warn('[Python Daemon Auto-spawn Failed]:', err.message);
    }

    // Await port 8765 socket readiness
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 400));
      if (await checkDaemonSocketAlive(400)) {
        return true;
      }
    }
    return false;
  }

  // Auto-spawn daemon on server boot
  ensurePythonDaemon().catch(() => {});

  app.post('/api/ai/daemon/start', async (req, res) => {
    const isReady = await ensurePythonDaemon(true);
    const inbuilt = findInbuiltGgufModel();

    if (isReady) {
      res.json({
        status: 'OK',
        message: 'Python local AI runtime daemon is online and responsive.',
        inbuiltModel: inbuilt
      });
    } else {
      res.json({
        status: 'STARTING',
        message: 'Python local AI runtime daemon process initiated. Warmup in progress.',
        inbuiltModel: inbuilt
      });
    }
  });

  app.get('/api/ai/daemon/health', (req, res) => {
    const client = new net.Socket();
    let isReturned = false;
    let responseBuffer = '';

    // 5000ms timeout: daemon may be slow on first request while Jev/Laya preloads
    client.setTimeout(5000);

    client.connect(8765, '127.0.0.1', () => {
      client.write(JSON.stringify({ command: 'HEALTH_CHECK', requestId: 'health' }) + '\n');
    });

    client.on('data', (data) => {
      responseBuffer += data.toString();
      const newlineIdx = responseBuffer.indexOf('\n');
      if (newlineIdx === -1) return; // wait for full line
      if (isReturned) return;
      isReturned = true;
      try {
        const parsed = JSON.parse(responseBuffer.substring(0, newlineIdx).trim());
        res.json({ status: 'OK', daemon: parsed });
      } catch {
        res.json({ status: 'OK' });
      }
      client.destroy();
    });

    client.on('timeout', () => {
      if (isReturned) return;
      isReturned = true;
      res.status(503).json({ status: 'OFFLINE', message: 'Python daemon not responding (timeout)' });
      client.destroy();
      // Auto-recovery
      ensurePythonDaemon(false).catch(() => {});
    });

    client.on('error', (err) => {
      if (isReturned) return;
      isReturned = true;
      res.status(503).json({ status: 'OFFLINE', message: `Python daemon socket unavailable: ${err.message}` });
      client.destroy();
      // Auto-recovery
      ensurePythonDaemon(false).catch(() => {});
    });
  });

  app.post('/api/ai/daemon/evaluate', async (req, res) => {
    // Before evaluating, auto-ensure daemon is responsive
    const isAlive = await checkDaemonSocketAlive(300);
    if (!isAlive) {
      await ensurePythonDaemon(false);
    }

    const client = new net.Socket();
    let isReturned = false;
    let responseBuffer = '';

    // Command-aware timeout: GGUF model loading into VRAM can take 60s+ for large models.
    // CPU-only inference on a 1.2B model at 4 threads can take 120-300s — use 300s to be safe.
    // GPU inference is typically <30s. Everything else gets a fast 3s timeout.
    const command = (req.body.command || 'SPECIALIST_EVAL').toUpperCase();
    let socketTimeoutMs = 15000; // default: fast commands (15s allows for slow Jev preload)
    if (command === 'LOAD_GGUF_MODEL') socketTimeoutMs = 180000; // model loading can take 60-120s
    else if (command === 'LOCAL_SLM_INFERENCE') socketTimeoutMs = 300000; // CPU inference can be very slow

    // Tell Express not to close the connection early for long-running commands
    res.setTimeout(socketTimeoutMs + 5000);

    client.setTimeout(socketTimeoutMs);

    client.connect(8765, '127.0.0.1', () => {
      const payload = {
        command,
        requestId: req.body.requestId || String(Date.now()),
        payload: req.body.payload || req.body
      };
      client.write(JSON.stringify(payload) + '\n');
    });

    client.on('data', (data) => {
      responseBuffer += data.toString();
      if (responseBuffer.includes('\n')) {
        if (isReturned) return;
        isReturned = true;
        try {
          const parsed = JSON.parse(responseBuffer.trim());
          res.json(parsed);
        } catch (e: any) {
          res.status(500).json({ status: 'ERROR', error: e.message });
        }
        client.destroy();
      }
    });

    client.on('timeout', () => {
      if (isReturned) return;
      isReturned = true;
      const msg = command === 'LOAD_GGUF_MODEL'
        ? 'GGUF model load timed out (>120s). Model may be too large or GPU drivers unavailable.'
        : 'Python daemon evaluation timed out';
      res.status(504).json({ status: 'TIMEOUT', message: msg });
      client.destroy();
    });

    client.on('error', (err) => {
      if (isReturned) return;
      isReturned = true;
      res.status(503).json({ status: 'OFFLINE', error: err.message });
      client.destroy();
    });
  });

  // ─── GGUF VRAM Unload Endpoint ─────────────────────────────────────────────
  // Called when: (a) user switches AI provider away from embedded_gguf,
  //              (b) user explicitly clicks "Unload" in settings.
  // Sends UNLOAD_GGUF_MODEL to the daemon, which calls llama.close() to free VRAM.
  app.post('/api/ai/daemon/unload-gguf', (req, res) => {
    const client = new net.Socket();
    let isReturned = false;
    let responseBuffer = '';
    client.setTimeout(5000);

    client.connect(8765, '127.0.0.1', () => {
      const payload = {
        command: 'UNLOAD_GGUF_MODEL',
        requestId: `unload_${Date.now()}`,
        payload: {}
      };
      client.write(JSON.stringify(payload) + '\n');
    });

    client.on('data', (data) => {
      responseBuffer += data.toString();
      if (responseBuffer.includes('\n')) {
        if (isReturned) return;
        isReturned = true;
        try { res.json(JSON.parse(responseBuffer.trim())); } catch { res.json({ status: 'OK' }); }
        client.destroy();
      }
    });

    client.on('timeout', () => {
      if (isReturned) return;
      isReturned = true;
      res.json({ status: 'OK', message: 'Daemon unresponsive — considered unloaded.' });
      client.destroy();
    });

    client.on('error', () => {
      if (isReturned) return;
      isReturned = true;
      res.json({ status: 'OK', message: 'Daemon offline — VRAM already free.' });
      client.destroy();
    });
  });

  // ─── Jev Decision & Parallel Constrained Reasoning Endpoints ───────────────
  // Helper: Send command to Python Daemon with configurable timeout (default 8000ms for CPU headroom)
  function sendJevCommand(command: string, payload: any, timeoutMs = 8000): Promise<any> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let responseBuffer = '';
      let isDone = false;

      client.setTimeout(timeoutMs);

      client.connect(8765, '127.0.0.1', () => {
        const msg = {
          command,
          requestId: payload?.requestId || String(Date.now()),
          payload: payload || {}
        };
        client.write(JSON.stringify(msg) + '\n');
      });

      client.on('data', (data) => {
        responseBuffer += data.toString('utf-8');
        if (responseBuffer.includes('\n')) {
          const line = responseBuffer.split('\n')[0].trim();
          try {
            const parsed = JSON.parse(line);
            isDone = true;
            resolve(parsed);
          } catch (e) {
            isDone = true;
            reject(new Error('Malformed JSON response from daemon'));
          }
          client.destroy();
        }
      });

      client.on('timeout', () => {
        if (isDone) return;
        isDone = true;
        reject(new Error(`Jev evaluation timed out (>${timeoutMs}ms)`));
        client.destroy();
      });

      client.on('error', (err) => {
        if (isDone) return;
        isDone = true;
        reject(err);
        client.destroy();
      });
    });
  }

  // Scenario 1: Root Cause Analysis (RCA) on Equipment Trip Avalanche
  app.post('/api/ai/jev/rca', async (req, res) => {
    try {
      const data = await sendJevCommand('JEV_ROOT_CAUSE_ANALYSIS', req.body, 20000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // Scenario 2: ISA-18.2 Dynamic Alarm Rationalization & Priority Triage
  app.post('/api/ai/jev/triage', async (req, res) => {
    try {
      const data = await sendJevCommand('JEV_ALARM_TRIAGE', req.body, 20000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // Scenario 3: Sensor Health & Telemetry Diagnosis
  app.post('/api/ai/jev/sensor', async (req, res) => {
    try {
      const data = await sendJevCommand('JEV_SENSOR_DIAGNOSIS', req.body, 20000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // Scenario 5: Daily Energy Meter Ranking (Top & Bottom)
  app.post('/api/ai/jev/energy', async (req, res) => {
    try {
      const data = await sendJevCommand('JEV_ENERGY_METER_RATING', req.body, 20000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // Scenario 6: Multi-Utility Suite (Water, Air, Gas, Solar, DG)
  app.post('/api/ai/jev/utility', async (req, res) => {
    try {
      const data = await sendJevCommand('JEV_MULTI_UTILITY_RATING', req.body, 20000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // Batch Parallel Meter Ranking
  app.post('/api/ai/jev/batch-meters', async (req, res) => {
    try {
      const data = await sendJevCommand('JEV_RANK_METERS_BATCH', req.body, 20000);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ status: 'ERROR', message: err.message });
    }
  });

  // ─── Serial / COM Port Auto-Detection Endpoint ──────────────────────────────
  app.get('/api/serial-ports', async (req, res) => {
    try {
      const ports = await detectSerialPorts();
      res.json({ success: true, ports, count: ports.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, ports: [] });
    }
  });

  // ─── Virtual NetBird Management API (Simulation & Testing Endpoint) ─────────
  app.get('/api/virtual-gateway/peers', (req, res) => {
    const simulateConflict = req.query.simulate_conflict === 'true';
    const groupId = (req.query.groupId as string) || 'plant-floor-1';

    const peers: any[] = [
      {
        id: 'peer-gw-rpi3-01',
        name: 'rpi3-plant-floor-gateway',
        ip: '192.168.1.34',
        connected: true,
        last_seen: new Date().toISOString(),
        os: 'linux',
        groups: [groupId],
        extra: { is_gateway: true }
      }
    ];

    if (simulateConflict) {
      peers.push({
        id: 'peer-browser-station-02',
        name: 'Operator-Console-Workstation-B',
        ip: '100.64.0.45',
        connected: true,
        last_seen: new Date().toISOString(),
        os: 'browser',
        groups: [groupId],
        extra: { station_session_id: 'conflicting-remote-station-999' }
      });
    }

    res.json(peers);
  });

  // ─── Virtual Plant-Floor Modbus Gateway (192.168.1.34 Simulation) ───────────
  app.get('/api/virtual-gateway/modbus', (req, res) => {
    const unitId = parseInt((req.query.unitId as string) || '1', 10);
    const startAddr = parseInt((req.query.addr as string) || '40001', 10);
    const count = parseInt((req.query.count as string) || '4', 10);

    const now = Date.now();
    const voltage = +(230 + Math.sin(now / 5000) * 5 + Math.random()).toFixed(2);
    const current = +(14.5 + Math.cos(now / 4000) * 1.2 + Math.random() * 0.3).toFixed(2);
    const powerKw = +((voltage * current * 1.732 * 0.92) / 1000).toFixed(2);
    const frequency = +(50 + (Math.random() - 0.5) * 0.1).toFixed(2);
    const motorRpm = Math.round(1450 + Math.sin(now / 3000) * 25 + Math.random() * 5);
    const bearingTemp = +(65.4 + Math.sin(now / 10000) * 4 + Math.random() * 0.2).toFixed(1);

    const tagValues: Record<string, any> = {
      '40001_Voltage_RMS': voltage,
      '40002_Current_RMS': current,
      '40003_Active_Power_kW': powerKw,
      '40004_Frequency_Hz': frequency,
      '40005_Motor_Speed_RPM': motorRpm,
      '40006_Bearing_Temp_C': bearingTemp
    };

    res.json({
      success: true,
      gateway: 'Raspberry-Pi-3-Plant-Floor (192.168.1.34)',
      timestamp: new Date().toISOString(),
      unitId,
      startAddr,
      count,
      data: tagValues
    });
  });

  // ─── Modbus Diagnostic Test Endpoint ─────────────────────────────────────────
  // Usage: GET /api/modbus/test?host=127.0.0.1&port=502&unitId=1&address=0&registerType=holding_register
  app.get('/api/modbus/test', async (req, res) => {
    const host = (req.query.host as string) || '127.0.0.1';
    const port = parseInt((req.query.port as string) || '502', 10);
    const unitId = parseInt((req.query.unitId as string) || '1', 10);
    const address = parseInt((req.query.address as string) || '0', 10);
    const registerType = (req.query.registerType as string) || 'holding_register';
    const dataType = (req.query.dataType as string) || 'int16';

    try {
      const fakeTag = { address, registerType, dataType, tagName: 'diagnostic_test', slaveId: unitId };
      const fakeConn = { host, port, unitId, connectionId: 'diagnostic_test', protocol: 'modbus_tcp' };
      const value = await readModbusTag(fakeTag, fakeConn);
      res.json({ success: true, host, port, unitId, address, registerType, dataType, value });
    } catch (err: any) {
      res.status(500).json({ success: false, host, port, unitId, address, registerType, dataType, error: err.message });
    }
  });

  // ─── Driver Connection Pool Status Endpoint ───────────────────────────────────
  app.get('/api/driver/status', (req, res) => {
    const poolEntries: any[] = [];
    modbusPool.forEach((entry, key) => {
      poolEntries.push({ key, connected: entry.connected, connecting: entry.connecting, connectionId: entry.connectionId });
    });
    const healthEntries: any[] = [];
    connectionHealthMap.forEach((health, key) => {
      healthEntries.push(health);
    });
    res.json({ modbusPool: poolEntries, connectionHealth: healthEntries });
  });

  // Test TCP connectivity to an MQTT broker
  app.get('/api/mqtt/test-tcp', (req, res) => {
    const host = (req.query.host as string) || 'broker.hivemq.com';
    const port = parseInt((req.query.port as string) || '1883', 10);

    const socket = new net.Socket();
    let connected = false;

    socket.setTimeout(4000);

    socket.on('connect', () => {
      connected = true;
      socket.destroy();
      res.json({ success: true, host, port, message: `Successfully reached TCP MQTT broker at ${host}:${port}` });
    });

    socket.on('timeout', () => {
      socket.destroy();
      if (!connected) {
        res.status(504).json({ success: false, host, port, error: `Connection to ${host}:${port} timed out` });
      }
    });

    socket.on('error', (err) => {
      if (!connected) {
        res.status(502).json({ success: false, host, port, error: err.message });
      }
    });

    socket.connect(port, host);
  });

  // ─── OPC UA Security & Policy Helpers ─────────────────────────────────────────
  function parseOpcUaSecurityMode(mode?: string): MessageSecurityMode {
    if (mode === 'Sign') return MessageSecurityMode.Sign;
    if (mode === 'SignAndEncrypt') return MessageSecurityMode.SignAndEncrypt;
    return MessageSecurityMode.None;
  }

  function parseOpcUaSecurityPolicy(policy?: string): SecurityPolicy {
    switch (policy) {
      case 'Basic128Rsa15': return SecurityPolicy.Basic128Rsa15;
      case 'Basic256': return SecurityPolicy.Basic256;
      case 'Basic256Sha256': return SecurityPolicy.Basic256Sha256;
      case 'Aes128_Sha256_RsaOaep': return SecurityPolicy.Aes128_Sha256_RsaOaep;
      case 'Aes256_Sha256_RsaPss': return SecurityPolicy.Aes256_Sha256_RsaPss;
      default: return SecurityPolicy.None;
    }
  }

  // ─── OPC UA Advanced Diagnostic / Test Connection Endpoint ─────────────────
  app.post('/api/opcua/test', async (req, res) => {
    let endpointUrl = (req.body?.endpointUrl || req.query?.endpointUrl || '').trim();
    if (!endpointUrl) {
      return res.status(400).json({ success: false, error: 'Endpoint URL is required (e.g. opc.tcp://127.0.0.1:4840)' });
    }
    if (!endpointUrl.startsWith('opc.tcp://')) {
      endpointUrl = `opc.tcp://${endpointUrl}`;
    }

    const securityModeStr = req.body?.securityMode || 'None';
    const securityPolicyStr = req.body?.securityPolicy || 'None';
    const authMode = req.body?.authMode || 'anonymous';
    const username = req.body?.username?.trim();
    const password = req.body?.password;
    const connectTimeout = Number(req.body?.connectTimeoutMs) || 6000;

    let testClient: any = null;
    let testSession: any = null;

    try {
      testClient = OPCUAClient.create({
        applicationName: 'TASC IIoT Studio Probe',
        connectionStrategy: { initialDelay: 300, maxRetry: 0, maxDelay: connectTimeout },
        securityMode: parseOpcUaSecurityMode(securityModeStr),
        securityPolicy: parseOpcUaSecurityPolicy(securityPolicyStr),
        endpointMustExist: false,
        requestedSessionTimeout: 10000
      });

      const connectPromise = testClient.connect(endpointUrl);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`OPC UA connect timeout after ${connectTimeout}ms`)), connectTimeout));
      await Promise.race([connectPromise, timeoutPromise]);

      // Test Session creation based on authMode
      if (authMode === 'username_password' && username && password) {
        testSession = await testClient.createSession({ type: UserTokenType.UserName, userName: username, password });
      } else {
        testSession = await testClient.createSession();
      }

      // Read root folder / ServerStatus
      const serverStatus = await testSession.readVariableValue('ns=0;i=2256').catch(() => null);

      res.json({
        success: true,
        endpointUrl,
        securityMode: securityModeStr,
        securityPolicy: securityPolicyStr,
        authMode,
        serverStatus: serverStatus ? 'Online' : 'Connected',
        message: `Successfully connected and authenticated with OPC UA server at ${endpointUrl}`
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        endpointUrl,
        error: err.message || 'OPC UA Connection failed'
      });
    } finally {
      try {
        if (testSession) await testSession.close().catch(() => { });
        if (testClient) await testClient.disconnect().catch(() => { });
      } catch { }
    }
  });

  // ─── Local AI Server (Ollama & LM Studio) Management Endpoints ───────────────

  // Helper to probe local HTTP AI endpoints
  function pingLocalAiEndpoint(host: string, port: number, pathname: string): Promise<{ ok: boolean; data?: any; error?: string }> {
    return new Promise((resolve) => {
      const req = http.request({
        host,
        port,
        path: pathname,
        method: 'GET',
        timeout: 2000,
        headers: { 'User-Agent': 'TASC-IIoT-Studio' }
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 400 : true, data: parsed });
          } catch (e) {
            resolve({ ok: res.statusCode ? res.statusCode >= 200 && res.statusCode < 400 : true, data: body });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ ok: false, error: 'Connection timed out' });
      });

      req.on('error', (err) => {
        resolve({ ok: false, error: err.message });
      });

      req.end();
    });
  }

  // 1. GET /api/local-ai/status
  app.get('/api/local-ai/status', async (req, res) => {
    const type = ((req.query.type as string) || 'ollama').toLowerCase();
    const isLmStudio = type === 'lmstudio';
    const host = (req.query.host as string) || '127.0.0.1';
    const port = parseInt((req.query.port as string) || (isLmStudio ? '1234' : '11434'), 10);
    const probePath = isLmStudio ? '/v1/models' : '/api/tags';

    try {
      const result = await pingLocalAiEndpoint(host, port, probePath);
      let models: string[] = [];

      if (result.ok && result.data) {
        if (!isLmStudio && result.data.models && Array.isArray(result.data.models)) {
          models = result.data.models.map((m: any) => m.name || m.model).filter(Boolean);
        } else if (isLmStudio && result.data.data && Array.isArray(result.data.data)) {
          models = result.data.data.map((m: any) => m.id).filter(Boolean);
        }
      }

      res.json({
        success: true,
        type,
        host,
        port,
        running: result.ok,
        status: result.ok ? 'online' : 'offline',
        models,
        error: result.error
      });
    } catch (err: any) {
      res.json({
        success: true,
        type,
        host,
        port,
        running: false,
        status: 'offline',
        models: [],
        error: err.message
      });
    }
  });

  // 2. POST /api/local-ai/start
  app.post('/api/local-ai/start', (req, res) => {
    const type = ((req.body?.type || req.query?.type as string) || 'ollama').toLowerCase();
    const isLmStudio = type === 'lmstudio';
    const isWin = os.platform() === 'win32';
    const customPort = parseInt((req.body?.port || req.query?.port as string) || (isLmStudio ? '1234' : '11434'), 10);

    let cmdToRun = '';
    if (isWin) {
      if (isLmStudio) {
        cmdToRun = `start "LM Studio Server (TASC IIoT)" cmd.exe /k "echo ==================================================== && echo   Starting LM Studio Local Server on Port ${customPort}... && echo ==================================================== && lms server start --cors --port ${customPort}"`;
      } else {
        cmdToRun = `start "Ollama Server (TASC IIoT)" cmd.exe /k "echo ==================================================== && echo   Starting Ollama Server with CORS on Port ${customPort} && echo ==================================================== && set OLLAMA_ORIGINS=* && set OLLAMA_HOST=127.0.0.1:${customPort} && ollama serve"`;
      }
    } else {
      if (isLmStudio) {
        cmdToRun = `nohup lms server start --cors --port ${customPort} > /tmp/lms_server.log 2>&1 &`;
      } else {
        cmdToRun = `nohup env OLLAMA_ORIGINS="*" OLLAMA_HOST="127.0.0.1:${customPort}" ollama serve > /tmp/ollama_server.log 2>&1 &`;
      }
    }

    try {
      exec(cmdToRun, { windowsHide: false }, (err) => {
        if (err) {
          console.warn(`[LocalAI] Launch command note for ${type}:`, err.message);
        }
      });

      // Also execute direct start command as fallback to guarantee background daemon startup
      if (isLmStudio) {
        exec(`lms server start --cors --port ${customPort}`, (err, stdout) => {
          if (stdout) console.log(`[LocalAI LMStudio]`, stdout.trim());
        });
      }

      res.json({
        success: true,
        type,
        port: customPort,
        message: `Command dispatched to launch ${isLmStudio ? 'LM Studio' : 'Ollama'} server on port ${customPort}.`,
        command: cmdToRun
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        type,
        error: err.message
      });
    }
  });

  // 3. POST /api/local-ai/stop
  app.post('/api/local-ai/stop', (req, res) => {
    const type = ((req.body?.type || req.query?.type as string) || 'ollama').toLowerCase();
    const isLmStudio = type === 'lmstudio';
    const isWin = os.platform() === 'win32';

    let stopCmd = '';
    if (isWin) {
      if (isLmStudio) {
        stopCmd = 'lms server stop & taskkill /FI "WINDOWTITLE eq LM Studio Server*" /F /T';
      } else {
        stopCmd = 'taskkill /IM ollama.exe /F /T & taskkill /IM "ollama app.exe" /F /T & taskkill /FI "WINDOWTITLE eq Ollama Server*" /F /T';
      }
    } else {
      if (isLmStudio) {
        stopCmd = 'lms server stop || pkill -f "lms server"';
      } else {
        stopCmd = 'pkill -f "ollama serve"';
      }
    }

    try {
      exec(stopCmd, (err, stdout, stderr) => {
        res.json({
          success: true,
          type,
          message: `Stop command executed for ${isLmStudio ? 'LM Studio' : 'Ollama'}.`,
          output: stdout || stderr
        });
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        type,
        error: err.message
      });
    }
  });

  // 4. GET /api/local-ai/hardware-specs
  app.get('/api/local-ai/hardware-specs', (req, res) => {
    const cpus = os.cpus();
    const cpuModel = cpus[0]?.model || 'Unknown CPU';
    const cpuThreads = cpus.length;
    const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeRamMb = Math.round(os.freemem() / (1024 * 1024));

    // Probe GPU via nvidia-smi
    exec('nvidia-smi --query-gpu=name,memory.total,memory.free,memory.used --format=csv,noheader,nounits', (gpuErr, gpuOut) => {
      let gpu = {
        hasGpu: false,
        name: 'N/A',
        totalVramMb: 0,
        freeVramMb: 0,
        usedVramMb: 0
      };

      if (!gpuErr && gpuOut && gpuOut.trim()) {
        const parts = gpuOut.trim().split(',').map(s => s.trim());
        if (parts.length >= 4) {
          gpu = {
            hasGpu: true,
            name: parts[0],
            totalVramMb: parseInt(parts[1], 10) || 0,
            freeVramMb: parseInt(parts[2], 10) || 0,
            usedVramMb: parseInt(parts[3], 10) || 0
          };
        }
      }

      res.json({
        success: true,
        cpu: {
          model: cpuModel,
          threads: cpuThreads
        },
        ram: {
          totalMb: totalRamMb,
          freeMb: freeRamMb,
          totalGb: (totalRamMb / 1024).toFixed(1)
        },
        gpu
      });
    });
  });

  // 4b. GET /api/local-ai/recommend-settings (Auto-calculates optimal hardware & inference settings per model)
  app.get('/api/local-ai/recommend-settings', async (req, res) => {
    const provider = ((req.query?.provider as string) || 'ollama').toLowerCase();
    const model = ((req.query?.model as string) || '').trim();
    const port = parseInt((req.query?.port as string) || (provider === 'ollama' ? '11434' : '1234'), 10);

    if (!model) {
      return res.status(400).json({ success: false, error: 'Model identifier is required' });
    }

    try {
      let sizeBytes = 0;
      let parameterSize = 'Unknown';
      let quantization = 'Q4_K_M';
      let capabilities: string[] = ['completion'];
      let trainContext = 4096;
      let family = '';

      if (provider === 'ollama') {
        const rootUrl = `http://127.0.0.1:${port}`;
        // Fetch model info from Ollama
        const showRes = await fetch(`${rootUrl}/api/show`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: model })
        }).catch(() => null);

        if (showRes && showRes.ok) {
          const showData = await showRes.json();
          parameterSize = showData.details?.parameter_size || 'Unknown';
          quantization = showData.details?.quantization_level || 'Q4_K_M';
          family = showData.details?.family || '';
          capabilities = Array.isArray(showData.capabilities) ? showData.capabilities : ['completion'];
          trainContext = showData.model_info?.['phi3.context_length'] || showData.model_info?.['llama.context_length'] || 32768;
        }

        // Fetch size from /api/tags
        const tagsRes = await fetch(`${rootUrl}/api/tags`).catch(() => null);
        if (tagsRes && tagsRes.ok) {
          const tagsData = await tagsRes.json();
          const found = (tagsData.models || []).find((m: any) => m.name === model || m.model === model);
          if (found) {
            sizeBytes = found.size || 0;
            if (found.details?.parameter_size) parameterSize = found.details.parameter_size;
          }
        }
      }

      const sizeGb = sizeBytes > 0 ? sizeBytes / (1024 * 1024 * 1024) : 4.0;
      const isCloud = model.includes('cloud') || sizeBytes < 10000;
      const supportsTools = capabilities.includes('tools');
      const supportsVision = capabilities.includes('vision');

      // Hardware calibration against RTX 4060 (8.2 GB VRAM) + Ryzen (24 Threads)
      let recommendedGpuOffload: string | number = 'max';
      let recommendedContextLength = 4096;
      let recommendedCpuThreads = 8;
      let recommendedTemperature = 0.30;
      let recommendedMaxTokens = 2048;
      let fitAssessment = '100% Full GPU Acceleration';
      let explanation = '';

      if (isCloud) {
        recommendedGpuOffload = 'max';
        recommendedContextLength = 16384;
        recommendedCpuThreads = 8;
        fitAssessment = 'Cloud Remote Model (0 Local VRAM)';
        explanation = 'Model is routed via high-speed Ollama Cloud infrastructure with zero local GPU usage.';
      } else if (sizeGb <= 4.5) {
        // e.g. phi3:mini (2.2GB), mistral (4.4GB)
        recommendedGpuOffload = 'max';
        recommendedContextLength = 8192;
        recommendedCpuThreads = 8;
        fitAssessment = '100% Full GPU (Ultra-Fast 60-100 tok/s)';
        explanation = `Compact ${parameterSize} model (${sizeGb.toFixed(1)} GB) fits 100% into RTX 4060 VRAM with generous 8K context.`;
      } else if (sizeGb <= 7.0) {
        // e.g. llama3.1:8b (4.9GB), qwen3.5:9b (6.6GB)
        recommendedGpuOffload = 'max';
        recommendedContextLength = 4096;
        recommendedCpuThreads = 8;
        fitAssessment = '100% Full GPU Acceleration';
        explanation = `${parameterSize} model (${sizeGb.toFixed(1)} GB) occupies ~${Math.round(sizeGb + 1.2)}GB of 8.2GB VRAM. 4K context provides optimal balance.`;
      } else if (sizeGb <= 8.0) {
        // e.g. gemma4:12b (7.55GB)
        recommendedGpuOffload = 'max';
        recommendedContextLength = 2048;
        recommendedCpuThreads = 8;
        fitAssessment = 'Full GPU (High VRAM ~92%)';
        explanation = `Heavy ${parameterSize} model (${sizeGb.toFixed(1)} GB) uses almost all 8.2GB VRAM. 2K context recommended to prevent memory spike.`;
      } else {
        // e.g. gemma4:e4b (9.6GB)
        recommendedGpuOffload = 22; // 22 GPU layers
        recommendedContextLength = 2048;
        recommendedCpuThreads = 12;
        fitAssessment = 'Hybrid Partial GPU (22 GPU Layers)';
        explanation = `Model (${sizeGb.toFixed(1)} GB) exceeds 8.2GB VRAM. Automatically allocated 22 GPU layers + 12 CPU threads to prevent CUDA Out-of-Memory.`;
      }

      res.json({
        success: true,
        model,
        provider,
        modelDetails: {
          sizeGb: sizeGb.toFixed(2),
          parameterSize,
          quantization,
          family,
          supportsTools,
          supportsVision,
          trainContext
        },
        recommendations: {
          contextLength: recommendedContextLength,
          gpuOffload: recommendedGpuOffload,
          cpuThreads: recommendedCpuThreads,
          temperature: recommendedTemperature,
          maxTokens: recommendedMaxTokens,
          fitAssessment,
          explanation
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. POST /api/local-ai/load-model (Applies Context Length, GPU Offload, and CPU Threads)
  app.post('/api/local-ai/load-model', async (req, res) => {
    const provider = ((req.body?.provider || req.query?.provider as string) || 'lmstudio').toLowerCase();
    const model = (req.body?.model || req.query?.model as string || '').trim();
    const contextLength = parseInt(req.body?.contextLength || '4096', 10);
    const gpuOffload = req.body?.gpuOffload !== undefined ? req.body.gpuOffload : 'max';
    const cpuThreads = parseInt(req.body?.cpuThreads || '8', 10);
    const temperature = req.body?.temperature !== undefined ? parseFloat(req.body.temperature) : 0.3;
    const ttl = parseInt(req.body?.ttl || '3600', 10);
    const port = parseInt(req.body?.port || (provider === 'ollama' ? '11434' : '1234'), 10);

    if (!model) {
      return res.status(400).json({ success: false, error: 'Model identifier is required' });
    }

    if (provider === 'lmstudio') {
      const gpuArg = gpuOffload ? `--gpu ${gpuOffload}` : '--gpu max';
      const ctxArg = contextLength ? `-c ${contextLength}` : '';
      const ttlArg = ttl ? `--ttl ${ttl}` : '--ttl 3600';
      const cmd = `lms load "${model}" ${gpuArg} ${ctxArg} ${ttlArg} -y`;

      console.log(`[LocalAI] Executing LM Studio Load: ${cmd}`);
      exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
        if (err) {
          console.error(`[LocalAI Load Error]`, stderr || stdout || err.message);
          return res.status(500).json({
            success: false,
            error: stderr || stdout || err.message,
            command: cmd
          });
        }
        res.json({
          success: true,
          message: `Model "${model}" successfully loaded in LM Studio (Context: ${contextLength}, GPU Offload: ${gpuOffload})`,
          output: (stdout || '').trim(),
          command: cmd
        });
      });
    } else if (provider === 'ollama') {
      // Warm up Ollama model with custom context length, GPU layers, and CPU threads
      let numGpu = gpuOffload === 'max' ? 99 : gpuOffload === 'off' ? 0 : typeof gpuOffload === 'number' ? gpuOffload : 99;
      const rootUrl = `http://127.0.0.1:${port}`;
      console.log(`[LocalAI] Pre-loading Ollama model "${model}" with num_ctx=${contextLength}, num_gpu=${numGpu}, num_thread=${cpuThreads}`);

      const attemptOllamaLoad = async (numCtx: number, numGpuLayers: number): Promise<{ ok: boolean; text: string }> => {
        const ollamaRes = await fetch(`${rootUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            keep_alive: `${ttl}s`,
            options: {
              num_ctx: numCtx,
              num_gpu: numGpuLayers,
              num_thread: cpuThreads,
              temperature
            }
          })
        });
        const text = ollamaRes.ok ? '' : await ollamaRes.text().catch(() => '');
        return { ok: ollamaRes.ok, text };
      };

      try {
        let result = await attemptOllamaLoad(contextLength, numGpu);

        // OOM Detection: if GPU load failed with memory allocation error, retry with CPU-only + reduced context
        if (!result.ok) {
          const isOom = result.text.toLowerCase().includes('alloc') ||
            result.text.toLowerCase().includes('out-of-memory') ||
            result.text.toLowerCase().includes('ggml_backend') ||
            result.text.toLowerCase().includes('cuda_host') ||
            result.text.toLowerCase().includes('failed to allocate');

          if (isOom && numGpu > 0) {
            const reducedCtx = Math.max(1024, Math.floor(contextLength / 2));
            console.warn(`[LocalAI] Ollama OOM on GPU load. Retrying CPU-only with ctx=${reducedCtx} (Original error: ${result.text.slice(0, 120)})`);
            result = await attemptOllamaLoad(reducedCtx, 0);
            if (result.ok) {
              return res.json({
                success: true,
                provider: 'ollama',
                message: `⚠️ GPU OOM detected — model "${model}" loaded in CPU-only mode (Context: ${reducedCtx}, Threads: ${cpuThreads}). For full GPU, select a smaller model or reduce context length.`,
                oomFallback: true
              });
            }
          }
        }

        if (result.ok) {
          res.json({
            success: true,
            message: `Model "${model}" successfully loaded in Ollama (Context: ${contextLength}, GPU Layers: ${numGpu === 99 ? 'Full GPU' : numGpu}, Threads: ${cpuThreads})`,
            provider: 'ollama'
          });
        } else {
          const isOom = result.text.toLowerCase().includes('alloc') ||
            result.text.toLowerCase().includes('out-of-memory') ||
            result.text.toLowerCase().includes('ggml_backend');
          res.status(500).json({
            success: false,
            oomError: isOom,
            error: isOom
              ? `Out of memory loading "${model}". Please: (1) Select a smaller 3B/7B model, (2) Reduce context length to 2048, or (3) Set GPU Offload to "off". Details: ${result.text.slice(0, 300)}`
              : `Ollama load failed: ${result.text.slice(0, 300)}`
          });
        }
      } catch (err: any) {
        res.status(500).json({
          success: false,
          error: `Failed to load Ollama model: ${err.message}`
        });
      }
    } else {
      res.json({
        success: true,
        message: `Configuration updated for ${provider}. Model will apply parameters during next query.`
      });
    }
  });

  // 6. POST /api/local-ai/unload-model
  app.post('/api/local-ai/unload-model', async (req, res) => {
    const provider = ((req.body?.provider || req.query?.provider as string) || 'all').toLowerCase();
    const model = (req.body?.model || '').trim();

    if (provider === 'ollama') {
      try {
        // Query running models from Ollama
        const psRes = await fetch('http://127.0.0.1:11434/api/ps');
        if (psRes.ok) {
          const psData = await psRes.json();
          const runningModels = Array.isArray(psData.models) ? psData.models : [];
          for (const m of runningModels) {
            const mName = m.name || m.model;
            if (!model || model === mName) {
              await fetch('http://127.0.0.1:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: mName, keep_alive: 0 })
              }).catch(() => { });
            }
          }
        }
        return res.json({
          success: true,
          message: model ? `Ollama model "${model}" unloaded.` : 'All Ollama models unloaded from VRAM.'
        });
      } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
      }
    }

    // Default LM Studio unload
    const cmd = model ? `lms unload "${model}"` : 'lms unload --all';
    exec(cmd, { timeout: 30000 }, (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({ success: false, error: stderr || stdout || err.message });
      }
      res.json({
        success: true,
        message: model ? `Model "${model}" unloaded.` : 'All local models unloaded from VRAM/RAM.',
        output: (stdout || '').trim()
      });
    });
  });

  // IEC 61850 Test Connection & Model Discovery Endpoints
  app.post('/api/iec61850/test', async (req, res) => {
    try {
      const conn = req.body;
      const result = await Iec61850Driver.getInstance().testConnection(conn);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Connection test failed' });
    }
  });

  app.post('/api/iec61850/browse', async (req, res) => {
    try {
      const conn = req.body;
      const nodes = await Iec61850Driver.getInstance().browseIedModel(conn);
      res.json({ success: true, nodes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Browse failed' });
    }
  });

  // Siemens S7 (Snap7) Test & Browse Endpoints
  app.post('/api/s7/test', async (req, res) => {
    try {
      const conn = req.body;
      const result = await SiemensS7Driver.getInstance().testConnection(conn);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'S7 connection test failed' });
    }
  });

  app.post('/api/s7/browse', async (req, res) => {
    try {
      const conn = req.body;
      const nodes = await SiemensS7Driver.getInstance().browseS7Blocks(conn);
      res.json({ success: true, nodes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'S7 browse failed' });
    }
  });

  // Mitsubishi MELSEC (MC Protocol) Test & Browse Endpoints
  app.post('/api/melsec/test', async (req, res) => {
    try {
      const conn = req.body;
      const result = await MelsecDriver.getInstance().testConnection(conn);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'MELSEC connection test failed' });
    }
  });

  app.post('/api/melsec/browse', async (req, res) => {
    try {
      const conn = req.body;
      const nodes = await MelsecDriver.getInstance().browseMelsecDevices(conn);
      res.json({ success: true, nodes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'MELSEC browse failed' });
    }
  });

  // ─── Ethernet/IP (CIP) Test, Browse & EDS Parsing Endpoints ─────────────────
  app.post('/api/ethernetip/test', async (req, res) => {
    try {
      const conn = req.body;
      const result = await EthernetIpDriver.getInstance().testConnection(conn);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'EtherNet/IP connection test failed' });
    }
  });

  app.post('/api/ethernetip/browse', async (req, res) => {
    try {
      const conn = req.body;
      const nodes = await EthernetIpDriver.getInstance().browseCipTags(conn);
      res.json({ success: true, nodes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'EtherNet/IP browse failed' });
    }
  });

  app.post('/api/ethernetip/parse-eds', (req, res) => {
    try {
      const { content, fileName } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing or invalid EDS file content' });
      }
      const profile = EdsParser.parse(content, fileName);
      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to parse EDS file' });
    }
  });

  app.post('/api/profinet/dcp-scan', async (req, res) => {
    try {
      const devices = await ProfinetDriver.getInstance().performDcpScan();
      res.json({ success: true, devices });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'DCP scan failed' });
    }
  });

  app.post('/api/profinet/test', async (req, res) => {
    try {
      const result = await ProfinetDriver.getInstance().testProfinetConnection(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'PROFINET test failed' });
    }
  });

  app.post('/api/profibus/test', async (req, res) => {
    try {
      const result = await ProfibusDriver.getInstance().testProfibusNode(req.body);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'PROFIBUS test failed' });
    }
  });

  app.post('/api/gsd/parse', (req, res) => {
    try {
      const { content, fileName } = req.body;
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ success: false, error: 'Missing GSD/GSDML file content' });
      }
      const profile = gsdCatalogService.parseAndRegisterGsdText(content, fileName || 'device.xml');
      res.json({ success: true, profile });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Failed to parse GSD/GSDML file' });
    }
  });

  // Attach WebSocket server for TCP-MQTT bridging, Driver bridge, and OPC UA Browser
  const wss = new WebSocketServer({ noServer: true });
  const driverWss = new WebSocketServer({ noServer: true });
  const opcUaWss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/mqtt-bridge') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else if (url.pathname === '/api/driver-bridge') {
      driverWss.handleUpgrade(request, socket, head, (ws) => {
        driverWss.emit('connection', ws, request);
      });
    } else if (url.pathname === '/api/opc-ua-browse') {
      opcUaWss.handleUpgrade(request, socket, head, (ws) => {
        opcUaWss.emit('connection', ws, request);
      });
    }
  });

  // ─── Real Resilient Modbus TCP Client Engine (jsmodbus + Node.js net.Socket) ─────────
  interface ModbusClientEntry {
    socket: net.Socket;
    client: any;
    connected: boolean;
    connecting: boolean;
    connectionId?: string;
    createdAt: number;
    lastHealthCheck?: number;
  }

  function checkPortOpen(host: string, port: number, timeoutMs = 250): Promise<boolean> {
    return new Promise((resolve) => {
      const s = new net.Socket();
      s.setTimeout(timeoutMs);
      s.on('connect', () => {
        s.destroy();
        resolve(true);
      });
      s.on('error', () => {
        s.destroy();
        resolve(false);
      });
      s.on('timeout', () => {
        s.destroy();
        resolve(false);
      });
      s.connect(port, host);
    });
  }

  interface DriverConnectionHealth {
    connectionId: string;
    connectionState: 'connected' | 'reconnecting' | 'disconnected' | 'stale' | 'unavailable' | 'error';
    lastConnectedAt?: string;
    lastDisconnectedAt?: string;
    lastError?: string;
    retryCount: number;
    consecutiveFailureCount: number;
  }

  const connectionHealthMap = new Map<string, DriverConnectionHealth>();

  function updateConnectionHealth(connectionId: string, patch: Partial<DriverConnectionHealth>) {
    if (!connectionId) return;
    const current = connectionHealthMap.get(connectionId) || {
      connectionId,
      connectionState: 'disconnected',
      retryCount: 0,
      consecutiveFailureCount: 0
    };
    const updated = { ...current, ...patch };

    const stateChanged = current.connectionState !== updated.connectionState;
    const errorChanged = current.lastError !== updated.lastError;
    const shouldBroadcast = stateChanged || errorChanged || (patch.consecutiveFailureCount !== undefined && patch.consecutiveFailureCount % 10 === 0);

    connectionHealthMap.set(connectionId, updated);

    if (shouldBroadcast) {
      const payload = JSON.stringify({
        type: 'connection_health',
        connectionId: updated.connectionId,
        connectionState: updated.connectionState,
        lastConnectedAt: updated.lastConnectedAt,
        lastDisconnectedAt: updated.lastDisconnectedAt,
        lastError: updated.lastError,
        retryCount: updated.retryCount,
        consecutiveFailureCount: updated.consecutiveFailureCount
      });

      driverWss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  const modbusPool = new Map<string, ModbusClientEntry>();

  function normalizeHost(inputHost?: string): string {
    if (!inputHost || inputHost.trim() === '' || inputHost === 'localhost' || inputHost === '127.0.0.1') {
      return '127.0.0.1';
    }
    return inputHost.trim();
  }

  function invalidateModbusClient(rawHost: string, port: number, unitId: number = 1, connectionId?: string, isError: boolean = true, errMsg?: string) {
    const host = normalizeHost(rawHost);
    const key = `${host}:${port}:${unitId}`;
    const entry = modbusPool.get(key);
    const targetConnId = connectionId || entry?.connectionId;
    if (targetConnId && isError) {
      updateConnectionHealth(targetConnId, {
        connectionState: 'disconnected',
        lastDisconnectedAt: new Date().toISOString(),
        lastError: errMsg || 'Modbus TCP server disconnected'
      });
    }
    if (entry) {
      entry.connected = false;
      entry.connecting = false;
      try {
        entry.socket.destroy();
      } catch (_e) { /* ignore */ }
      modbusPool.delete(key);
    }
    modbusQueues.delete(key);
  }

  function getOrCreateModbusClient(rawHost: string, port: number, unitId: number = 1, connectionId?: string, connConfig?: any): Promise<any> {
    const host = normalizeHost(rawHost);
    const key = `${host}:${port}:${unitId}`;
    const existing = modbusPool.get(key);

    if (existing && existing.connected && existing.client) {
      // Check if underlying socket was destroyed or closed by OS/network
      if (existing.socket && !existing.socket.destroyed && existing.socket.writable) {
        const now = Date.now();
        if (!existing.lastHealthCheck || (now - existing.lastHealthCheck > 2000)) {
          existing.lastHealthCheck = now;
          checkPortOpen(host, port, 300).then((isOpen) => {
            if (!isOpen) {
              console.warn(`[ModbusTCP] Port ${host}:${port} is no longer open (server stopped) — invalidating socket`);
              invalidateModbusClient(host, port, unitId, connectionId, true, 'Modbus TCP server stopped listening');
            }
          }).catch(() => { });
        }
        if (connectionId) existing.connectionId = connectionId;
        return Promise.resolve(existing.client);
      } else {
        // Socket was closed or destroyed by OS, invalidate immediately
        invalidateModbusClient(host, port, unitId, connectionId);
      }
    }

    // If currently connecting, wait a brief tick to prevent socket collision.
    if (existing && existing.connecting) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          const retryEntry = modbusPool.get(key);
          if (retryEntry && retryEntry.connected) {
            resolve(retryEntry.client);
          } else {
            // Reject this poll attempt only — do NOT destroy the pending socket.
            reject(new Error(`Modbus TCP: connection to ${host}:${port} still in progress, poll skipped.`));
          }
        }, 250);
      });
    }

    const sendTimeout = Math.max(300, Number(connConfig?.sendTimeoutMs) || 1000);

    return new Promise((resolve, reject) => {
      try {
        const socket = new net.Socket();
        socket.setNoDelay(true);
        const client = new jsmodbus.client.TCP(socket, unitId, sendTimeout);
        const entry: ModbusClientEntry = { socket, client, connected: false, connecting: true, connectionId, createdAt: Date.now() };
        modbusPool.set(key, entry);

        // Connect timeout
        socket.setTimeout(sendTimeout);

        socket.on('connect', () => {
          console.log(`[ModbusTCP] ✓ Connected to Modbus slave at ${host}:${port} (Unit ID: ${unitId})`);
          socket.setKeepAlive(true, 1000);
          socket.setTimeout(0);
          entry.connected = true;
          entry.connecting = false;
          if (connectionId) {
            updateConnectionHealth(connectionId, {
              connectionState: 'connected',
              lastConnectedAt: new Date().toISOString(),
              consecutiveFailureCount: 0,
              lastError: undefined
            });
          }
          resolve(client);
        });

        socket.on('error', (err) => {
          console.warn(`[ModbusTCP] ✗ Socket error on ${host}:${port} (Unit ID: ${unitId}):`, err.message);
          invalidateModbusClient(host, port, unitId, connectionId);
          reject(err);
        });

        socket.on('timeout', () => {
          console.warn(`[ModbusTCP] ✗ Socket timeout on ${host}:${port} — destroying socket`);
          invalidateModbusClient(host, port, unitId, connectionId);
          reject(new Error(`TCP socket timeout connecting to ${host}:${port}`));
        });

        socket.on('close', (hadError) => {
          console.log(`[ModbusTCP] Connection closed to ${host}:${port} (hadError: ${hadError})`);
          invalidateModbusClient(host, port, unitId, connectionId, true, 'Modbus TCP connection closed');
        });

        socket.on('end', () => {
          console.log(`[ModbusTCP] Server at ${host}:${port} sent FIN — connection ending`);
          invalidateModbusClient(host, port, unitId, connectionId, true, 'Modbus server closed connection');
        });

        // Dedicated error listener directly on client instance to catch protocol errors
        if (client && typeof (client as any).on === 'function') {
          (client as any).on('error', (err: any) => {
            console.warn(`[ModbusTCP] Client driver protocol error on ${host}:${port}:`, err?.message || err);
            invalidateModbusClient(host, port, unitId, connectionId);
          });
        }

        socket.connect(port, host);
      } catch (err) {
        invalidateModbusClient(host, port, unitId, connectionId);
        reject(err);
      }
    });
  }

  const modbusQueues = new Map<string, Promise<any>>();

  function executeOnModbusClient<T>(host: string, port: number, unitId: number, connectionId: string | undefined, task: (client: any) => Promise<T>, connConfig?: any): Promise<T> {
    const key = `${normalizeHost(host)}:${port}:${unitId}`;

    const entry = modbusPool.get(key);
    if (!entry || !entry.connected) {
      modbusQueues.delete(key);
    }

    const previousPromise = modbusQueues.get(key) || Promise.resolve();

    const nextPromise = previousPromise
      .catch(() => { }) // Don't block queue if previous request errored!
      .then(async () => {
        const client = await getOrCreateModbusClient(host, port, unitId, connectionId, connConfig);
        return await task(client);
      });

    modbusQueues.set(key, nextPromise);
    return nextPromise;
  }

  function translateModbusAddress(address: number | string, zeroBased: boolean = true): number {
    const rawAddr = Number(address) || 0;
    if (rawAddr >= 400001 && rawAddr <= 499999) return rawAddr - 400001;
    if (rawAddr >= 300001 && rawAddr <= 399999) return rawAddr - 300001;
    if (rawAddr >= 100001 && rawAddr <= 199999) return rawAddr - 100001;
    if (rawAddr >= 40001 && rawAddr <= 49999) return rawAddr - 40001;
    if (rawAddr >= 30001 && rawAddr <= 39999) return rawAddr - 30001;
    if (rawAddr >= 10001 && rawAddr <= 19999) return rawAddr - 10001;
    if (rawAddr >= 40000 && rawAddr < 40001) return 0;

    if (!zeroBased && rawAddr > 0) {
      return rawAddr - 1;
    }
    return Math.max(0, rawAddr);
  }

  function applyModbusSwaps(
    buf: Buffer,
    dataType: string,
    byteSwap: boolean = false,
    wordSwap: boolean = false,
    dwordSwap: boolean = false
  ): any {
    const data = Buffer.from(buf);

    // 1. Byte swap: swap bytes in each 16-bit word
    if (byteSwap) {
      for (let i = 0; i < data.length - 1; i += 2) {
        const temp = data[i];
        data[i] = data[i + 1];
        data[i + 1] = temp;
      }
    }

    // 2. Word swap: swap 16-bit words inside 32-bit dwords
    if (wordSwap && data.length >= 4) {
      for (let i = 0; i < data.length - 3; i += 4) {
        const w0_0 = data[i];
        const w0_1 = data[i + 1];
        data[i] = data[i + 2];
        data[i + 1] = data[i + 3];
        data[i + 2] = w0_0;
        data[i + 3] = w0_1;
      }
    }

    // 3. Dword swap: swap 32-bit dwords inside 64-bit qwords
    if (dwordSwap && data.length >= 8) {
      for (let i = 0; i < data.length - 7; i += 8) {
        for (let b = 0; b < 4; b++) {
          const temp = data[i + b];
          data[i + b] = data[i + 4 + b];
          data[i + 4 + b] = temp;
        }
      }
    }

    if (dataType === 'boolean') {
      return data.readUInt16BE(0) !== 0;
    } else if (dataType === 'int16') {
      return data.readInt16BE(0);
    } else if (dataType === 'uint16') {
      return data.readUInt16BE(0);
    } else if (dataType === 'int32') {
      return data.readInt32BE(0);
    } else if (dataType === 'uint32') {
      return data.readUInt32BE(0);
    } else if (dataType === 'float') {
      const val = data.readFloatBE(0);
      return isNaN(val) ? 0 : Math.round(val * 100) / 100;
    } else if (dataType === 'double') {
      const val = data.readDoubleBE(0);
      return isNaN(val) ? 0 : Math.round(val * 1000) / 1000;
    } else {
      return data.toString('utf8').replace(/\0/g, '');
    }
  }

  function prepareModbusWriteBuffer(
    numVal: number,
    dataType: string,
    byteSwap: boolean = false,
    wordSwap: boolean = false,
    dwordSwap: boolean = false
  ): Buffer {
    let buf: Buffer;
    if (dataType === 'float') {
      buf = Buffer.alloc(4);
      buf.writeFloatBE(numVal, 0);
    } else if (dataType === 'int32') {
      buf = Buffer.alloc(4);
      buf.writeInt32BE(numVal, 0);
    } else if (dataType === 'uint32') {
      buf = Buffer.alloc(4);
      buf.writeUInt32BE(numVal, 0);
    } else if (dataType === 'double') {
      buf = Buffer.alloc(8);
      buf.writeDoubleBE(numVal, 0);
    } else if (dataType === 'int16') {
      buf = Buffer.alloc(2);
      buf.writeInt16BE(numVal, 0);
    } else {
      buf = Buffer.alloc(2);
      buf.writeUInt16BE(numVal & 0xffff, 0);
    }

    if (dwordSwap && buf.length >= 8) {
      for (let i = 0; i < buf.length - 7; i += 8) {
        for (let b = 0; b < 4; b++) {
          const temp = buf[i + b];
          buf[i + b] = buf[i + 4 + b];
          buf[i + 4 + b] = temp;
        }
      }
    }

    if (wordSwap && buf.length >= 4) {
      for (let i = 0; i < buf.length - 3; i += 4) {
        const w0_0 = buf[i];
        const w0_1 = buf[i + 1];
        buf[i] = buf[i + 2];
        buf[i + 1] = buf[i + 3];
        buf[i + 2] = w0_0;
        buf[i + 3] = w0_1;
      }
    }

    if (byteSwap) {
      for (let i = 0; i < buf.length - 1; i += 2) {
        const temp = buf[i];
        buf[i] = buf[i + 1];
        buf[i + 1] = temp;
      }
    }

    return buf;
  }

  async function readModbusTag(tag: any, connection: any): Promise<any> {
    console.log('readModbusTag called from:', new Error().stack);
    const host = normalizeHost(connection?.host);
    const port = Number(connection?.port) || 502;
    const unitId = Number((tag?.slaveId !== undefined && tag?.slaveId !== null && tag?.slaveId !== 0) ? tag.slaveId : (connection?.unitId || 1));
    const connectionId = connection?.connectionId || tag?.connectionId;
    const zeroBased = tag?.zeroBasedAddressing !== undefined ? tag.zeroBasedAddressing : (connection?.zeroBasedAddressing !== false);

    const byteSwap = tag?.byteSwap !== undefined ? tag.byteSwap : (connection?.byteSwap || false);
    const wordSwap = tag?.wordSwap !== undefined ? tag.wordSwap : (connection?.wordSwap || false);
    const dwordSwap = tag?.dwordSwap !== undefined ? tag.dwordSwap : (connection?.dwordSwap || false);
    const recvTimeoutMs = Math.max(300, Number(connection?.recvTimeoutMs || connection?.timeout) || 1000);
    const sendRecvDelayMs = Number(connection?.sendRecvDelayMs) || 0;
    const maxRetries = Math.max(0, Number(connection?.frameRetryCount ?? 1));

    if (sendRecvDelayMs > 0) {
      await new Promise(r => setTimeout(r, sendRecvDelayMs));
    }

    let attempt = 0;
    let lastErr: any = null;

    while (attempt <= maxRetries) {
      try {
        return await executeOnModbusClient(host, port, unitId, connectionId, async (client) => {
          const registerAddr = translateModbusAddress(tag.address, zeroBased);

          const dataType = (tag.dataType || 'int16').toLowerCase();
          let count = Number(tag.wordCount) || 1;
          if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') count = 2;
          if (dataType === 'double') count = 4;

          const regType = tag.registerType || 'holding_register';

          const readPromise = new Promise<any>(async (resolve, reject) => {
            try {
              let res: any;
              if (regType === 'holding_register') {
                res = await client.readHoldingRegisters(registerAddr, count);
              } else if (regType === 'input_register') {
                res = await client.readInputRegisters(registerAddr, count);
              } else if (regType === 'coil') {
                res = await client.readCoils(registerAddr, count);
              } else if (regType === 'discrete_input') {
                res = await client.readDiscreteInputs(registerAddr, count);
              } else {
                res = await client.readHoldingRegisters(registerAddr, count);
              }
              resolve(res);
            } catch (err) {
              reject(err);
            }
          });

          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Modbus read timeout after ${recvTimeoutMs}ms for ${host}:${port} addr=${registerAddr}`));
            }, recvTimeoutMs);
          });

          const res: any = await Promise.race([readPromise, timeoutPromise]);

          if (!res || !res.response) {
            throw new Error('No response from Modbus slave — empty response object');
          }

          if (connectionId) {
            updateConnectionHealth(connectionId, {
              connectionState: 'connected',
              lastConnectedAt: new Date().toISOString(),
              consecutiveFailureCount: 0,
              lastError: undefined
            });
          }

          if (regType === 'coil' || regType === 'discrete_input') {
            const valArray = res.response.body.valuesAsArray || res.response.body.values;
            return valArray[0] === true || valArray[0] === 1;
          }

          let buf: Buffer = res.response.body.valuesAsBuffer;
          if (!buf || buf.length === 0) {
            const rawValues: number[] = res.response.body.values || res.response.body.valuesAsArray || [];
            if (rawValues.length === 0) {
              throw new Error(`Modbus response body has no values — raw response: ${JSON.stringify(res.response.body)}`);
            }
            buf = Buffer.alloc(rawValues.length * 2);
            rawValues.forEach((v, idx) => buf.writeUInt16BE((v || 0) & 0xffff, idx * 2));
          }

          const parsed = applyModbusSwaps(buf, dataType, byteSwap, wordSwap, dwordSwap);
          console.log(`[ModbusDebug] tag="${tag.tagName || tag.tagId}" addr=${tag.address} -> regAddr=${registerAddr} unitId=${unitId} rawValues=`, res.response.body?.values, 'parsed=', parsed);

          // Only release socket after read if reopenSockets is explicitly enabled in connection settings
          if (connection?.reopenSockets === true) {
            invalidateModbusClient(host, port, unitId, connectionId, false);
          }

          return parsed;
        }, connection);
      } catch (err: any) {
        lastErr = err;
        attempt++;
        const isPollingSkip = typeof err?.message === 'string' && err.message.includes('still in progress');
        if (!isPollingSkip) {
          console.warn(`[ModbusTCP] Read FAILED for "${tag.tagName || tag.tagId}" (addr ${tag.address}, attempt ${attempt}/${maxRetries + 1}): ${err.message} — invalidating socket`);
          invalidateModbusClient(host, port, unitId, connectionId);
        }
        if (attempt <= maxRetries) {
          await new Promise(r => setTimeout(r, 50));
        }
      }
    }

    throw lastErr;
  }

  async function writeModbusTag(tag: any, connection: any, value: any): Promise<void> {
    const host = normalizeHost(connection?.host);
    const port = Number(connection?.port) || 502;
    const unitId = Number((tag?.slaveId !== undefined && tag?.slaveId !== null && tag?.slaveId !== 0) ? tag.slaveId : (connection?.unitId || 1));
    const connectionId = connection?.connectionId || tag?.connectionId;
    const zeroBased = tag?.zeroBasedAddressing !== undefined ? tag.zeroBasedAddressing : (connection?.zeroBasedAddressing !== false);
    const byteSwap = tag?.byteSwap !== undefined ? tag.byteSwap : (connection?.byteSwap || false);
    const wordSwap = tag?.wordSwap !== undefined ? tag.wordSwap : (connection?.wordSwap || false);
    const dwordSwap = tag?.dwordSwap !== undefined ? tag.dwordSwap : (connection?.dwordSwap || false);
    const useSingleCoil = connection?.useSingleCoilWrite !== false;
    const useSingleReg = connection?.useSingleRegisterWrite !== false;

    return executeOnModbusClient(host, port, unitId, connectionId, async (client) => {
      const registerAddr = translateModbusAddress(tag.address, zeroBased);
      const regType = tag.registerType || 'holding_register';

      if (regType === 'coil') {
        if (useSingleCoil) {
          await client.writeSingleCoil(registerAddr, Boolean(value));
        } else {
          await client.writeMultipleCoils(registerAddr, [Boolean(value)]);
        }
      } else {
        const numVal = Number(value) || 0;
        const dataType = (tag.dataType || 'int16').toLowerCase();
        const isMultiWord = dataType === 'int32' || dataType === 'uint32' || dataType === 'float' || dataType === 'double';

        if (isMultiWord || !useSingleReg) {
          const buf = prepareModbusWriteBuffer(numVal, dataType, byteSwap, wordSwap, dwordSwap);
          await client.writeMultipleRegisters(registerAddr, buf);
        } else {
          const buf = prepareModbusWriteBuffer(numVal, dataType, byteSwap, wordSwap, dwordSwap);
          const singleVal = buf.readUInt16BE(0);
          await client.writeSingleRegister(registerAddr, singleVal);
        }
      }
    }, connection).catch((err: any) => {
      console.error(`[ModbusTCP Diagnostic] Write failed for "${tag.tagName || tag.tagId}":`, err.message);
      invalidateModbusClient(host, port, unitId, connectionId);
      throw err;
    });
  }

  // ─── OPC UA Client Connection Pool ─────────────────────────────────────────────
  interface OpcUaPoolEntry {
    client: any;
    session: any;
    connecting: boolean;
    connected: boolean;
    endpointUrl: string;
    connectionId?: string;
  }

  const opcUaPool = new Map<string, OpcUaPoolEntry>();

  function invalidateOpcUaClient(endpointUrl: string, connectionId?: string) {
    const key = endpointUrl.trim().toLowerCase();
    const entry = opcUaPool.get(key);
    const targetConnId = connectionId || entry?.connectionId;
    if (targetConnId) {
      updateConnectionHealth(targetConnId, {
        connectionState: 'unavailable',
        lastDisconnectedAt: new Date().toISOString(),
        lastError: 'OPC UA server unreachable'
      });
    }
    if (entry) {
      entry.connected = false;
      entry.connecting = false;
      try {
        if (entry.session) entry.session.close().catch(() => { });
        if (entry.client) entry.client.disconnect().catch(() => { });
      } catch { }
      opcUaPool.delete(key);
    }
  }

  async function getOrCreateOpcUaSession(connection: any): Promise<any> {
    let endpointUrl = (connection?.endpointUrl || connection?.opcUaEndpointUrl || connection?.host || '').trim();
    const secondaryEndpointUrl = connection?.secondaryEndpointUrl?.trim();
    const connectionId = connection?.connectionId;

    if (!endpointUrl) {
      throw new Error('No OPC UA endpoint URL specified in connection configuration');
    }
    if (!endpointUrl.startsWith('opc.tcp://')) {
      endpointUrl = `opc.tcp://${endpointUrl}`;
    }

    const key = endpointUrl.toLowerCase();
    const existing = opcUaPool.get(key);
    if (existing && existing.connected && existing.session) {
      if (connectionId) existing.connectionId = connectionId;
      return existing.session;
    }

    if (existing && existing.connecting) {
      throw new Error(`OPC UA connection to ${endpointUrl} is currently connecting...`);
    }

    const securityMode = parseOpcUaSecurityMode(connection?.securityMode);
    const securityPolicy = parseOpcUaSecurityPolicy(connection?.securityPolicy);
    const requestedSessionTimeout = Number(connection?.sessionTimeoutMs) || 30000;
    const connectTimeout = Number(connection?.connectTimeoutMs) || 10000;

    const opcClient = OPCUAClient.create({
      applicationName: 'TASC IIoT Studio',
      connectionStrategy: { initialDelay: 500, maxRetry: 1, maxDelay: connectTimeout },
      securityMode,
      securityPolicy,
      endpointMustExist: false,
      requestedSessionTimeout
    });

    const entry: OpcUaPoolEntry = {
      client: opcClient,
      session: null,
      connecting: true,
      connected: false,
      endpointUrl,
      connectionId
    };
    opcUaPool.set(key, entry);

    try {
      let connectTarget = endpointUrl;
      try {
        await opcClient.connect(connectTarget);
      } catch (primaryErr: any) {
        // Redundancy Failover: if secondary endpoint is configured, attempt failover
        if (secondaryEndpointUrl) {
          connectTarget = secondaryEndpointUrl.startsWith('opc.tcp://') ? secondaryEndpointUrl : `opc.tcp://${secondaryEndpointUrl}`;
          console.warn(`[OPC UA] Primary endpoint ${endpointUrl} failed (${primaryErr.message}). Failing over to secondary: ${connectTarget}`);
          await opcClient.connect(connectTarget);
        } else {
          throw primaryErr;
        }
      }

      const authMode = connection.authMode || 'anonymous';
      const username = connection.username?.trim();
      const password = connection.password;

      let session: any;
      if (authMode === 'username_password' && username && password) {
        session = await opcClient.createSession({ type: UserTokenType.UserName, userName: username, password });
      } else {
        session = await opcClient.createSession();
      }

      entry.session = session;
      entry.connected = true;
      entry.connecting = false;

      if (connectionId) {
        updateConnectionHealth(connectionId, {
          connectionState: 'connected',
          lastConnectedAt: new Date().toISOString(),
          consecutiveFailureCount: 0,
          lastError: undefined
        });
      }

      return session;
    } catch (err: any) {
      invalidateOpcUaClient(endpointUrl, connectionId);
      throw err;
    }
  }

  async function readOpcUaTag(tag: any, connection: any): Promise<any> {
    const session = await getOrCreateOpcUaSession(connection);
    const nodeId = (tag.nodeId || tag.address || '').trim();
    if (!nodeId) {
      throw new Error(`Missing NodeID for OPC UA tag "${tag.tagName || tag.tagId}"`);
    }

    const dataValue = await session.readVariableValue(nodeId);
    const statusCodeStr = dataValue.statusCode?.toString() ?? 'Bad';
    if (statusCodeStr.includes('Bad') || statusCodeStr.includes('Uncertain')) {
      throw new Error(`OPC UA read returned status code ${statusCodeStr} for node ${nodeId}`);
    }

    const rawVal = dataValue.value?.value;
    if (rawVal === undefined || rawVal === null) {
      return null;
    }

    if (typeof rawVal === 'number' || typeof rawVal === 'boolean' || typeof rawVal === 'string') {
      return rawVal;
    }

    if (rawVal instanceof Date) {
      return rawVal.toISOString();
    }

    return String(rawVal);
  }

  async function writeOpcUaTag(tag: any, connection: any, value: any): Promise<void> {
    const session = await getOrCreateOpcUaSession(connection);
    const nodeId = (tag.nodeId || tag.address || '').trim();
    if (!nodeId) throw new Error(`Missing NodeID for OPC UA tag "${tag.tagName || tag.tagId}"`);

    let dataType = (tag.dataType || 'float').toLowerCase();
    let variantDataType = DataType.Float;
    if (dataType === 'double') variantDataType = DataType.Double;
    else if (dataType === 'int16' || dataType === 'short') variantDataType = DataType.Int16;
    else if (dataType === 'int32' || dataType === 'int') variantDataType = DataType.Int32;
    else if (dataType === 'boolean' || dataType === 'bool') variantDataType = DataType.Boolean;
    else if (dataType === 'string') variantDataType = DataType.String;

    let parsedVal = value;
    if (variantDataType === DataType.Boolean) parsedVal = Boolean(value);
    else if (variantDataType !== DataType.String) parsedVal = Number(value) || 0;

    const nodeToWrite = {
      nodeId,
      attributeId: AttributeIds.Value,
      value: {
        value: {
          dataType: variantDataType,
          value: parsedVal
        }
      }
    };

    const statusCode = await session.write(nodeToWrite);
    if (statusCode.isNotGood()) {
      throw new Error(`OPC UA write returned status code ${statusCode.toString()}`);
    }
  }

  // Driver Bridge Connection Handler (Real Modbus TCP + OPC UA Telemetry)

  // ----------------------------------------------------
  // Core Polling Execution Handler
  // ----------------------------------------------------
  // ----------------------------------------------------
  // Batch Block Read Handler
  // ----------------------------------------------------
  async function executeModbusBatchRead(protocol: string, tags: any[], connection: any): Promise<Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }>> {
    console.log(`[BatchRead] Received ${tags.length} tags for ${protocol}`);
    if (connection && connection.enabled === false) {
      return tags.map(t => ({ tagId: t.tagId, value: null, quality: 'bad', qualityText: 'Source disabled' }));
    }

    const host = normalizeHost(connection?.host);
    const port = Number(connection?.port) || 502;
    const connectionId = connection?.connectionId || tags[0]?.connectionId;
    const maxRetries = Math.max(0, Number(connection?.frameRetryCount ?? 1));
    const recvTimeoutMs = Math.max(300, Number(connection?.recvTimeoutMs || connection?.timeout) || 1000);
    const sendRecvDelayMs = Number(connection?.sendRecvDelayMs) || 0;

    if (sendRecvDelayMs > 0) {
      await new Promise(r => setTimeout(r, sendRecvDelayMs));
    }

    const blocks = BlockReadManager.groupModbusTags(tags);
    console.log(`[BatchRead] Grouped into ${blocks.length} blocks`);
    const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];

    for (const block of blocks) {
      let attempt = 0;
      let blockSuccess = false;
      let blockError: any = null;

      while (attempt <= maxRetries && !blockSuccess) {
        try {
          await executeOnModbusClient(host, port, block.unitId, connectionId, async (client) => {
            const readPromise = new Promise<any>(async (resolve, reject) => {
              try {
                let res: any;
                if (block.registerType === 'holding_register') {
                  res = await client.readHoldingRegisters(block.startAddress, block.count);
                } else if (block.registerType === 'input_register') {
                  res = await client.readInputRegisters(block.startAddress, block.count);
                } else if (block.registerType === 'coil') {
                  res = await client.readCoils(block.startAddress, block.count);
                } else if (block.registerType === 'discrete_input') {
                  res = await client.readDiscreteInputs(block.startAddress, block.count);
                } else {
                  res = await client.readHoldingRegisters(block.startAddress, block.count);
                }
                resolve(res);
              } catch (err) {
                reject(err);
              }
            });

            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error(`Modbus block read timeout after ${recvTimeoutMs}ms for ${host}:${port} addr=${block.startAddress}`));
              }, recvTimeoutMs);
            });

            const res: any = await Promise.race([readPromise, timeoutPromise]);

            if (!res || !res.response) {
              throw new Error('No response from Modbus slave — empty response object');
            }

            // Process Coils / Discrete Inputs
            if (block.registerType === 'coil' || block.registerType === 'discrete_input') {
              const valArray = res.response.body.valuesAsArray || res.response.body.values;
              for (const tagMeta of block.tags) {
                const bitVal = valArray[tagMeta.offset];
                results.push({
                  tagId: tagMeta.tag.tagId,
                  value: bitVal === true || bitVal === 1,
                  quality: 'good',
                  qualityText: 'Good'
                });
              }
            } else {
              // Process Registers
              let buf: Buffer = res.response.body.valuesAsBuffer;
              if (!buf || buf.length === 0) {
                const rawValues: number[] = res.response.body.values || res.response.body.valuesAsArray || [];
                buf = Buffer.alloc(rawValues.length * 2);
                rawValues.forEach((v, idx) => buf.writeUInt16BE((v || 0) & 0xffff, idx * 2));
              }

              for (const tagMeta of block.tags) {
                const dataType = (tagMeta.tag.tag.dataType || 'int16').toLowerCase();
                let wordCount = 1;
                if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') wordCount = 2;
                if (dataType === 'double') wordCount = 4;

                const slice = buf.subarray(tagMeta.offset * 2, (tagMeta.offset + wordCount) * 2);
                const parsed = applyModbusSwaps(slice, dataType, tagMeta.byteSwap, tagMeta.wordSwap, tagMeta.dwordSwap);
                console.log(`[BatchRead] Parsed tag ${tagMeta.tag.tagId} from block ${block.startAddress} offset ${tagMeta.offset}: ${parsed}`);

                results.push({
                  tagId: tagMeta.tag.tagId,
                  value: parsed,
                  quality: 'good',
                  qualityText: 'Good'
                });
              }
            }

            if (connection?.reopenSockets === true) {
              invalidateModbusClient(host, port, block.unitId, connectionId, false);
            }
          }, connection);

          blockSuccess = true;

          if (connectionId) {
            updateConnectionHealth(connectionId, {
              connectionState: 'connected',
              lastConnectedAt: new Date().toISOString(),
              consecutiveFailureCount: 0,
              lastError: undefined
            });
          }
        } catch (err: any) {
          blockError = err;
          attempt++;
          const isPollingSkip = typeof err?.message === 'string' && err.message.includes('still in progress');
          if (!isPollingSkip) {
            console.warn(`[ModbusTCP] Block Read FAILED for block ${block.startAddress} (attempt ${attempt}/${maxRetries + 1}): ${err.message}`);
            invalidateModbusClient(host, port, block.unitId, connectionId);
          }
          if (attempt <= maxRetries) {
            await new Promise(r => setTimeout(r, 50));
          }
        }
      }

      if (!blockSuccess) {
        if (connectionId) {
          updateConnectionHealth(connectionId, {
            connectionState: 'disconnected',
            consecutiveFailureCount: 1,
            lastError: blockError?.message
          });
        }
        // push bad quality for all tags in this block
        for (const tagMeta of block.tags) {
          results.push({
            tagId: tagMeta.tag.tagId,
            value: null,
            quality: 'bad',
            qualityText: blockError?.message || 'Read error',
            error: blockError?.message
          });
        }
      }
    }
    return results;
  }

  // ----------------------------------------------------
  // OPC UA Multi-Node Batch Read Handler (Single Round-Trip)
  // ----------------------------------------------------
  async function executeOpcUaBatchRead(tags: any[], connection: any): Promise<Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }>> {
    const connectionId = connection?.connectionId || tags[0]?.connectionId;
    const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];

    if (connection && connection.enabled === false) {
      return tags.map(t => ({ tagId: t.tagId, value: null, quality: 'bad', qualityText: 'Source disabled' }));
    }

    try {
      const session = await getOrCreateOpcUaSession(connection);
      const CHUNK_SIZE = 250; // Respect maxNodesPerRead server limits
      for (let i = 0; i < tags.length; i += CHUNK_SIZE) {
        const chunk = tags.slice(i, i + CHUNK_SIZE);
        const nodesToRead = chunk.map(t => {
          const nodeId = (t.tag?.nodeId || t.tag?.address || t.tag?.tagName || '').trim();
          return {
            nodeId,
            attributeId: AttributeIds.Value
          };
        });

        const dataValues: any[] = await session.read(nodesToRead, 0);

        dataValues.forEach((dv, idx) => {
          const tag = chunk[idx];
          const scStr = dv.statusCode?.toString() ?? 'Bad';
          const isBad = scStr.includes('Bad') || scStr.includes('Uncertain');
          const rawVal = dv.value?.value;
          let finalVal = rawVal;
          if (finalVal instanceof Date) {
            finalVal = finalVal.toISOString();
          } else if (typeof finalVal !== 'number' && typeof finalVal !== 'boolean' && typeof finalVal !== 'string') {
            finalVal = finalVal !== undefined && finalVal !== null ? String(finalVal) : null;
          }

          results.push({
            tagId: tag.tagId,
            value: isBad ? null : finalVal,
            quality: isBad ? 'bad' : 'good',
            qualityText: isBad ? scStr : 'Good'
          });
        });
      }

      if (connectionId) {
        updateConnectionHealth(connectionId, {
          connectionState: 'connected',
          consecutiveFailureCount: 0,
          lastError: undefined
        });
      }
    } catch (err: any) {
      if (connectionId) {
        updateConnectionHealth(connectionId, {
          connectionState: 'disconnected',
          consecutiveFailureCount: 1,
          lastError: err.message
        });
      }
      for (const t of tags) {
        results.push({
          tagId: t.tagId,
          value: null,
          quality: 'bad',
          qualityText: err.message || 'OPC UA batch error',
          error: err.message
        });
      }
    }

    return results;
  }

  // ----------------------------------------------------
  // Mitsubishi MELSEC Block Batch Read Handler (MC Protocol 0x0401)
  // ----------------------------------------------------
  async function executeMelsecBatchRead(tags: any[], connection: any): Promise<Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }>> {
    const connectionId = connection?.connectionId || tags[0]?.connectionId;
    const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];

    if (connection && connection.enabled === false) {
      return tags.map(t => ({ tagId: t.tagId, value: null, quality: 'bad', qualityText: 'Source disabled' }));
    }

    const blocks = BlockReadManager.groupMelsecTags(tags);
    console.log(`[BatchRead:Melsec] Grouped ${tags.length} tags into ${blocks.length} blocks`);
    const driver = MelsecDriver.getInstance();

    for (const block of blocks) {
      try {
        for (const tagMeta of block.tags) {
          const val = await driver.readTag(tagMeta.tag.tag, connection);
          results.push({
            tagId: tagMeta.tag.tagId,
            value: val,
            quality: 'good',
            qualityText: 'Good'
          });
        }
      } catch (err: any) {
        for (const tagMeta of block.tags) {
          results.push({
            tagId: tagMeta.tag.tagId,
            value: null,
            quality: 'bad',
            qualityText: err.message || 'MELSEC read error',
            error: err.message
          });
        }
      }
    }

    if (connectionId) {
      updateConnectionHealth(connectionId, {
        connectionState: 'connected',
        consecutiveFailureCount: 0,
        lastError: undefined
      });
    }

    return results;
  }

  // ----------------------------------------------------
  // Siemens S7 DB Block Batch Read Handler (S7Comm)
  // ----------------------------------------------------
  async function executeS7BatchRead(tags: any[], connection: any): Promise<Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }>> {
    const connectionId = connection?.connectionId || tags[0]?.connectionId;
    const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];

    if (connection && connection.enabled === false) {
      return tags.map(t => ({ tagId: t.tagId, value: null, quality: 'bad', qualityText: 'Source disabled' }));
    }

    const blocks = BlockReadManager.groupS7Tags(tags);
    console.log(`[BatchRead:S7] Grouped ${tags.length} tags into ${blocks.length} blocks`);
    const driver = SiemensS7Driver.getInstance();

    for (const block of blocks) {
      try {
        for (const tagMeta of block.tags) {
          const val = await driver.readTag(tagMeta.tag.tag, connection);
          results.push({
            tagId: tagMeta.tag.tagId,
            value: val,
            quality: 'good',
            qualityText: 'Good'
          });
        }
      } catch (err: any) {
        for (const tagMeta of block.tags) {
          results.push({
            tagId: tagMeta.tag.tagId,
            value: null,
            quality: 'bad',
            qualityText: err.message || 'S7 read error',
            error: err.message
          });
        }
      }
    }

    if (connectionId) {
      updateConnectionHealth(connectionId, {
        connectionState: 'connected',
        consecutiveFailureCount: 0,
        lastError: undefined
      });
    }

    return results;
  }

  // ----------------------------------------------------
  // EtherNet/IP & Rockwell CIP Batch Read Handler
  // ----------------------------------------------------
  async function executeEthernetIpBatchRead(tags: any[], connection: any): Promise<Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }>> {
    const connectionId = connection?.connectionId || tags[0]?.connectionId;
    const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];

    if (connection && connection.enabled === false) {
      return tags.map(t => ({ tagId: t.tagId, value: null, quality: 'bad', qualityText: 'Source disabled' }));
    }

    console.log(`[BatchRead:EtherNetIP] Batch reading ${tags.length} tags`);
    const driver = EthernetIpDriver.getInstance();

    for (const t of tags) {
      try {
        const val = await driver.readTag(t.tag, connection);
        results.push({
          tagId: t.tagId,
          value: val,
          quality: 'good',
          qualityText: 'Good'
        });
      } catch (err: any) {
        results.push({
          tagId: t.tagId,
          value: null,
          quality: 'bad',
          qualityText: err.message || 'EtherNet/IP error',
          error: err.message
        });
      }
    }

    if (connectionId) {
      updateConnectionHealth(connectionId, {
        connectionState: 'connected',
        consecutiveFailureCount: 0,
        lastError: undefined
      });
    }

    return results;
  }

  // ----------------------------------------------------
  // Unified Protocol Batch Dispatcher
  // ----------------------------------------------------
  async function executeProtocolBatchRead(protocol: string, tags: any[], connection: any): Promise<Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }>> {
    protocol = (protocol || tags[0]?.protocol || connection?.protocol || '').toLowerCase();

    if (protocol === 'modbus_tcp' || protocol === 'modbus_rtu') {
      return executeModbusBatchRead(protocol, tags, connection);
    } else if (protocol === 'opcua') {
      return executeOpcUaBatchRead(tags, connection);
    } else if (protocol === 'melsec') {
      return executeMelsecBatchRead(tags, connection);
    } else if (protocol === 's7') {
      return executeS7BatchRead(tags, connection);
    } else if (protocol === 'ethernet_ip') {
      return executeEthernetIpBatchRead(tags, connection);
    } else if (protocol === 'iec61850') {
      const driver = Iec61850Driver.getInstance();
      const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];
      for (const t of tags) {
        try {
          const val = await driver.readTag(t.tag, connection);
          results.push({ tagId: t.tagId, value: val, quality: 'good', qualityText: 'Good' });
        } catch (err: any) {
          results.push({ tagId: t.tagId, value: null, quality: 'bad', qualityText: err.message || 'IEC 61850 error' });
        }
      }
      return results;
    }

    // Default fallback
    const results: Array<{ tagId: string, value: any, quality: string, qualityText: string, error?: string }> = [];
    for (const t of tags) {
      const res = await executeDriverRead(protocol, t.tag, connection, t.panelId);
      results.push({ tagId: t.tagId, ...res });
    }
    return results;
  }

  async function executeDriverRead(protocol: string, tag: any, connection: any, panelId?: string): Promise<{ value: any, quality: string, qualityText: string, error?: string }> {
    let val: any = null;
    let quality: 'good' | 'bad' | 'uncertain' = 'good';
    let qualityText: string = 'Good';
    const connectionId = connection?.connectionId || tag?.connectionId;
    const now = new Date().toISOString();

    protocol = (protocol || tag?.protocol || connection?.protocol || '').toLowerCase();

    if (connection && connection.enabled === false) {
      return { value: null, quality: 'bad', qualityText: 'Source disabled' };
    }

    try {
      if (protocol === 'modbus_tcp' || protocol === 'modbus_rtu') {
        val = await readModbusTag(tag, connection);
      } else if (protocol === 'opcua') {
        val = await readOpcUaTag(tag, connection);
      } else if (protocol === 'iec61850') {
        val = await Iec61850Driver.getInstance().readTag(tag, connection);
      } else if (protocol === 's7') {
        val = await SiemensS7Driver.getInstance().readTag(tag, connection);
      } else if (protocol === 'melsec') {
        val = await MelsecDriver.getInstance().readTag(tag, connection);
      } else if (protocol === 'ethernet_ip') {
        val = await EthernetIpDriver.getInstance().readTag(tag, connection);
      } else if (protocol === 'profinet') {
        const tagVal = ProfinetDriver.getInstance().readTag(connection, tag, panelId);
        val = tagVal.value;
        quality = (tagVal.quality === 'good' || tagVal.quality === 'bad' || tagVal.quality === 'uncertain') ? tagVal.quality : 'uncertain';
      } else if (protocol === 'profibus') {
        const tagVal = ProfibusDriver.getInstance().readTag(connection, tag, panelId);
        val = tagVal.value;
        quality = (tagVal.quality === 'good' || tagVal.quality === 'bad' || tagVal.quality === 'uncertain') ? tagVal.quality : 'uncertain';
      } else {
        return { value: null, quality: 'bad', qualityText: `Unknown protocol "${protocol}"` };
      }

      if (connectionId) {
        updateConnectionHealth(connectionId, {
          connectionState: 'connected',
          consecutiveFailureCount: 0,
          lastError: undefined
        });
      }

      return { value: val, quality, qualityText };
    } catch (err: any) {
      if (connectionId) {
        updateConnectionHealth(connectionId, {
          connectionState: 'disconnected',
          consecutiveFailureCount: 1,
          lastError: err.message
        });
      }
      return { value: null, quality: 'bad', qualityText: err.message || 'Read error', error: err.message };
    }
  }

  // Bind the handler
  pollingManager.setReadHandler(executeDriverRead);
  pollingManager.setBatchReadHandler(executeProtocolBatchRead);

  app.get('/api/polling-engine/cache', (req, res) => {
    res.json({
      totalTags: pollingManager.cache.size,
      cache: pollingManager.getAllCachedValues()
    });
  });

  // ─── Phase 3: Headless Time-Series Historian & Server-Side Alarm Engine ────────
  const serverHistorian = ServerHistorian.getInstance();
  const serverAlarmEngine = ServerAlarmEngine.getInstance();
  const serverReportEngine = new ServerReportEngine(serverHistorian);

  // Broadcast real-time alarm state transitions to all connected WebSocket clients
  serverAlarmEngine.on('alarm_event', (eventData: any) => {
    const payload = JSON.stringify({
      type: 'alarm_event',
      ...eventData
    });
    driverWss.clients.forEach((client: any) => {
      if (client.readyState === 1 /* WebSocket.OPEN */) {
        client.send(payload);
      }
    });
  });

  // Historian Query API (Raw & Time-Bucket Downsampled)
  app.get('/api/historian/query', (req, res) => {
    try {
      const tagId = req.query.tagId as string;
      if (!tagId) {
        return res.status(400).json({ success: false, error: 'tagId parameter is required' });
      }
      const startTime = req.query.startTime ? Number(req.query.startTime) : (Date.now() - 24 * 60 * 60 * 1000);
      const endTime = req.query.endTime ? Number(req.query.endTime) : Date.now();
      const bucketMs = req.query.bucketMs ? Number(req.query.bucketMs) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 1000;

      const data = serverHistorian.queryTagHistory(tagId, startTime, endTime, bucketMs);
      res.json({
        success: true,
        tagId,
        startTime,
        endTime,
        isDownsampled: !!bucketMs,
        bucketMs,
        count: data.length,
        data
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Historian Database Storage Statistics
  app.get('/api/historian/stats', (req, res) => {
    try {
      const stats = serverHistorian.getStats();
      res.json({ success: true, stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Historian Per-Tag Deadband & Heartbeat Configuration
  app.post('/api/historian/config', (req, res) => {
    try {
      const { tagId, configs, enabled, deadband, maxIntervalMs, rocThreshold } = req.body;
      if (Array.isArray(configs)) {
        for (const cfg of configs) {
          if (cfg.tagId) serverHistorian.setTagConfig(cfg);
        }
        return res.json({ success: true, message: `Configured historian rules for ${configs.length} tags.` });
      } else if (tagId) {
        serverHistorian.setTagConfig({
          tagId,
          enabled: enabled !== false,
          deadband: Number(deadband) || 0.0,
          maxIntervalMs: Number(maxIntervalMs) || 60000,
          rocThreshold: rocThreshold ? Number(rocThreshold) : undefined
        });
        return res.json({ success: true, message: `Configured historian for tag ${tagId}` });
      }
      res.status(400).json({ success: false, error: 'tagId or configs array required' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Server-Side Active Alarms API
  app.get('/api/alarms/active', (req, res) => {
    try {
      const alarms = serverAlarmEngine.getActiveAlarms();
      res.json({ success: true, count: alarms.length, alarms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Server-Side Alarm Historical Log API
  app.get('/api/alarms/history', (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const tagId = req.query.tagId as string | undefined;
      const status = req.query.status as any;

      const history = serverAlarmEngine.getAlarmHistory({ limit, offset, tagId });
      res.json({ success: true, count: history.length, history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Operator Alarm Acknowledgment API (ISA-18.2 ACTIVE_UNACK -> ACTIVE_ACK)
  app.post('/api/alarms/ack', (req, res) => {
    try {
      const { alarmKey, operator } = req.body;
      if (!alarmKey) {
        return res.status(400).json({ success: false, error: 'alarmKey is required' });
      }
      const updatedAlarm = serverAlarmEngine.acknowledgeAlarm(alarmKey, operator || 'Operator');
      if (!updatedAlarm) {
        return res.status(404).json({ success: false, error: `Alarm key ${alarmKey} not found in active alarms.` });
      }
      res.json({ success: true, alarm: updatedAlarm });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Alarm Threshold Configuration API (HH, H, L, LL, ROC, Deadband)
  app.post('/api/alarms/config', (req, res) => {
    try {
      const { tagId, configs, ...rest } = req.body;
      if (Array.isArray(configs)) {
        for (const cfg of configs) {
          if (cfg.tagId) serverAlarmEngine.setTagAlarmConfig(cfg);
        }
        return res.json({ success: true, message: `Configured alarm rules for ${configs.length} tags.` });
      } else if (tagId) {
        serverAlarmEngine.setTagAlarmConfig({ tagId, ...rest });
        return res.json({ success: true, message: `Configured alarm rules for ${tagId}` });
      }
      res.status(400).json({ success: false, error: 'tagId or configs array required' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // External / UI Alarm Dispatch API (triggers ServerAlarmEngine, LibreSMS & SMTP Email)
  app.post('/api/alarms/dispatch', (req, res) => {
    try {
      const { alarmKey, alarmId, id, key, panelId, panelName, panelTitle, zone, alarmType, value, currentValue, threshold, limitThreshold, message, timestamp, triggeredAt, topic } = req.body;
      const effectiveKey = alarmKey || alarmId || id || key || (panelId && (zone || alarmType) ? `${panelId}_${zone || alarmType}` : undefined);
      if (!effectiveKey) {
        return res.status(400).json({ success: false, error: 'alarmKey or alarmId is required' });
      }

      const activeZone = (zone || alarmType || 'HH').toUpperCase();
      let category: AlarmCategory = 'HH';
      let severity: AlarmSeverity = 'high';

      if (activeZone === 'TRIP') {
        category = 'TRIP';
        severity = 'critical';
      } else if (activeZone === 'FAULT') {
        category = 'FAULT';
        severity = 'critical';
      } else if (activeZone === 'HIGH' || activeZone === 'HH') {
        category = 'HH';
        severity = 'critical';
      } else if (activeZone === 'MID' || activeZone === 'H') {
        category = 'H';
        severity = 'high';
      } else if (activeZone === 'LOW' || activeZone === 'L') {
        category = 'L';
        severity = 'medium';
      } else if (activeZone === 'LL') {
        category = 'LL';
        severity = 'critical';
      }

      const parsedTime = triggeredAt
        ? (typeof triggeredAt === 'number' ? triggeredAt : new Date(triggeredAt).getTime())
        : (timestamp ? (typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime()) : Date.now());

      const numVal = value !== undefined ? Number(value) : (currentValue !== undefined ? Number(currentValue) : 0);
      const numLimit = threshold !== undefined ? Number(threshold) : (typeof limitThreshold === 'number' ? limitThreshold : 0);

      serverAlarmEngine.recordExternalAlarm({
        alarmKey: effectiveKey,
        tagId: topic || panelId || effectiveKey,
        tagName: panelName || panelTitle || 'SCADA Equipment',
        category,
        severity,
        value: isNaN(numVal) ? 0 : numVal,
        threshold: isNaN(numLimit) ? 0 : numLimit,
        message: message || `${panelName || 'Asset'} ${activeZone} alarm`,
        timestamp: isNaN(parsedTime) ? Date.now() : parsedTime
      });

      res.json({ success: true, message: `Alarm ${effectiveKey} dispatched to SMS and Email engines.` });
    } catch (err: any) {
      console.error('[Server] Failed to dispatch alarm to notification engines:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // External / UI Alarm Clear API
  app.post('/api/alarms/clear', (req, res) => {
    try {
      const { alarmKey, alarmId, id, key } = req.body;
      const effectiveKey = alarmKey || alarmId || id || key;
      if (!effectiveKey) {
        return res.status(400).json({ success: false, error: 'alarmKey or alarmId is required' });
      }
      serverAlarmEngine.clearExternalAlarm(effectiveKey);
      res.json({ success: true, message: `Alarm ${effectiveKey} cleared.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Phase 4: Report Generation & Automated Delivery Endpoints ───────────────

  // Get all report configs
  app.get('/api/reports/configs', (req, res) => {
    try {
      const configs = serverReportEngine.getAllConfigs();
      res.json({ success: true, count: configs.length, configs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save or update a report config
  app.post('/api/reports/configs', (req, res) => {
    try {
      const config = req.body;
      if (!config || !config.reportId || !config.reportName) {
        return res.status(400).json({ success: false, error: 'reportId and reportName are required' });
      }
      serverReportEngine.saveConfig(config);
      res.json({ success: true, message: `Report "${config.reportName}" saved successfully.`, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete a report config
  app.delete('/api/reports/configs/:id', (req, res) => {
    try {
      const success = serverReportEngine.deleteConfig(req.params.id);
      res.json({ success, message: success ? 'Report deleted.' : 'Report not found.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Async Generate Report on demand
  app.post('/api/reports/generate', async (req, res) => {
    try {
      const { reportId, fromMs, toMs, config: inlineConfig } = req.body;
      const config = inlineConfig || (reportId ? serverReportEngine.getConfigById(reportId) : null);
      if (!config) {
        return res.status(404).json({ success: false, error: 'Report configuration not found.' });
      }

      const from = Number(fromMs) || (Date.now() - 24 * 3600000);
      const to = Number(toMs) || Date.now();

      // Execute report asynchronously
      serverReportEngine.executeReport(config, from, to, { isScheduled: false, triggerType: 'manual' }).catch(err => {
        console.error('[Server] Report generation failed:', err.message);
      });

      res.json({
        success: true,
        status: 'generating',
        message: 'Report generation started.'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get report execution history
  app.get('/api/reports/history', (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 100;
      const offset = req.query.offset ? Number(req.query.offset) : 0;
      const history = serverReportEngine.getHistory(limit, offset);
      res.json({ success: true, count: history.length, history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Secure Download by opaque Job ID (Prevents path traversal)
  app.get('/api/reports/download/:jobId', (req, res) => {
    try {
      const jobId = req.params.jobId;
      const format = (req.query.format as string) || 'xlsx';
      const job = serverReportEngine.getJobById(jobId);

      if (!job) {
        return res.status(404).json({ success: false, error: 'Report job not found.' });
      }

      const fileMeta = job.generatedFiles?.find(f => f.format === format) || job.generatedFiles?.[0];
      if (!fileMeta || !fileMeta.path || !fs.existsSync(fileMeta.path)) {
        return res.status(404).json({ success: false, error: 'Generated report file not found on disk.' });
      }

      res.download(fileMeta.path, fileMeta.filename);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get masked SMTP config
  app.get('/api/smtp/config', (req, res) => {
    try {
      const config = serverEmailService.getMaskedConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save SMTP config
  app.post('/api/smtp/config', (req, res) => {
    try {
      serverEmailService.saveConfig(req.body);
      res.json({ success: true, message: 'SMTP settings updated successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Test SMTP connection
  app.post('/api/smtp/test', async (req, res) => {
    try {
      const { config, testEmail } = req.body;
      const result = await serverEmailService.testConnection(config, testEmail);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Phase 5: Alarm SMS Alert Service Endpoints (Free Telecom Carrier Gateways) ───
  const serverSmsEngine = ServerSmsEngine.getInstance();

  // Rate limiter for manual test SMS (Max 5 tests per 5 minutes per IP)
  const smsTestLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many test SMS requests. Please wait 5 minutes before sending another test.' }
  });

  // List all supported telecom carriers
  app.get('/api/sms/carriers', (req, res) => {
    try {
      const carriers = Object.values(CARRIER_DIRECTORY).map(c => ({
        id: c.id,
        name: c.name,
        region: c.region,
        maxChars: c.maxChars || 160
      }));
      res.json({ success: true, count: carriers.length, carriers });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get SMS Alert Configuration & Recipient Phonebook
  app.get('/api/sms/config', (req, res) => {
    try {
      const config = serverSmsEngine.getConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save SMS Alert Configuration & Recipient Phonebook
  app.post('/api/sms/config', (req, res) => {
    try {
      const operator = (req as any).user?.username || req.headers['x-operator-user'] as string || 'Operator';
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const updated = serverSmsEngine.saveConfig(req.body, operator, clientIp);
      res.json({ success: true, message: 'SMS Alert settings updated successfully.', config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dispatch Test SMS to verify Gateway delivery (Carrier or LibreSMS)
  app.post('/api/sms/test', smsTestLimiter, async (req, res) => {
    try {
      const { phone, carrier, message, libreSmsUrl } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'Phone number is required for test SMS.' });
      }
      const operator = (req as any).user?.username || req.headers['x-operator-user'] as string || 'Operator';
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const result = await serverSmsEngine.sendTestSms(phone, carrier || 'libresms', message, operator, clientIp, libreSmsUrl);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Check health/reachability of LibreSMS local Android phone gateway
  app.post('/api/sms/libresms/health', async (req, res) => {
    try {
      const { url } = req.body;
      const result = await serverSmsEngine.checkLibreSmsHealth(url);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ─── Phase 6: Alarm Email Alert Service Endpoints (Secondary Server SMTP) ───
  const serverAlarmEmailEngine = ServerAlarmEmailEngine.getInstance();

  // Get Alarm Email Alert Configuration & Recipient Directory
  app.get('/api/alarms/email/config', (req, res) => {
    try {
      const config = serverAlarmEmailEngine.getConfig();
      res.json({ success: true, config });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Save Alarm Email Alert Configuration & Recipient Directory
  app.post('/api/alarms/email/config', (req, res) => {
    try {
      const operator = (req as any).user?.username || req.headers['x-operator-user'] as string || 'Operator';
      const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const updated = serverAlarmEmailEngine.saveConfig(req.body, operator, clientIp);
      res.json({ success: true, message: 'Alarm Email Alert settings updated successfully.', config: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Dispatch Test Alarm Email to verify SMTP delivery
  app.post('/api/alarms/email/test', smsTestLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Target email address is required.' });
      }
      const result = await serverAlarmEmailEngine.sendTestEmail(email);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Project Configuration Deployment API (Saves project tags/connections & re-syncs services)
  app.post('/api/project/deploy', (req, res) => {
    try {
      const { tags, connections, driverTags, driverConnections } = req.body;
      const configPath = path.join(process.cwd(), 'tasc_core_config.json');

      const allDriverTags: any[] = [];
      const allDriverConns: any[] = [];

      if (Array.isArray(driverTags)) allDriverTags.push(...driverTags);
      if (Array.isArray(driverConnections)) allDriverConns.push(...driverConnections);

      if (tags && typeof tags === 'object' && !Array.isArray(tags)) {
        for (const [id, t] of Object.entries(tags as Record<string, any>)) {
          allDriverTags.push({ tagId: id, ...t });
        }
      }
      if (connections && typeof connections === 'object' && !Array.isArray(connections)) {
        for (const [id, c] of Object.entries(connections as Record<string, any>)) {
          allDriverConns.push({ connectionId: id, ...c });
        }
      }

      // Persist to tasc_core_config.json only if changed
      const newConfigStr = JSON.stringify({
        tags: tags || {},
        connections: connections || {},
        driverConnections: allDriverConns,
        driverTags: allDriverTags
      }, null, 2);

      let existingConfigStr = '';
      if (fs.existsSync(configPath)) {
        try {
          existingConfigStr = fs.readFileSync(configPath, 'utf8');
        } catch { }
      }

      if (newConfigStr !== existingConfigStr) {
        fs.writeFileSync(configPath, newConfigStr, 'utf8');
      }

      // Sync to PollingManager
      const subs = allDriverTags.map((tag: any) => {
        const conn = allDriverConns.find((c: any) => c.connectionId === tag.connectionId || c.id === tag.connectionId);
        return {
          tagId: tag.tagId || tag.id,
          protocol: (tag.protocol || conn?.protocol || '').toLowerCase(),
          pollRate: Number(tag.pollRate || tag.scanRate || conn?.pollRate) || 1000,
          tag,
          connection: conn
        };
      });

      pollingManager.syncTags(subs, true);

      // Auto-configure historian & alarms
      for (const tag of allDriverTags) {
        const tid = tag.tagId || tag.id;
        if (tid) {
          serverHistorian.setTagConfig({
            tagId: tid,
            enabled: tag.historianEnabled !== false,
            deadband: Number(tag.deadband) || 0.0,
            maxIntervalMs: Number(tag.maxIntervalMs) || 60000,
            rocThreshold: tag.rocThreshold ? Number(tag.rocThreshold) : undefined
          });

          if (tag.alarmConfig || tag.highHigh != null || tag.high != null || tag.low != null || tag.lowLow != null) {
            const cfg = tag.alarmConfig || {};
            serverAlarmEngine.setTagAlarmConfig({
              tagId: tid,
              enabled: cfg.enabled !== false,
              highHigh: tag.highHigh ?? cfg.highHigh,
              high: tag.high ?? cfg.high,
              low: tag.low ?? cfg.low,
              lowLow: tag.lowLow ?? cfg.lowLow,
              rateOfChange: tag.rocLimit ?? cfg.rateOfChange,
              deadband: tag.alarmDeadband ?? cfg.deadband ?? 0.0,
              highHighMsg: tag.highHighMsg ?? cfg.highHighMsg,
              highMsg: tag.highMsg ?? cfg.highMsg,
              lowMsg: tag.lowMsg ?? cfg.lowMsg,
              lowLowMsg: tag.lowLowMsg ?? cfg.lowLowMsg,
              rocMsg: tag.rocMsg ?? cfg.rocMsg
            });
          }
        }
      }

      res.json({
        success: true,
        message: `Successfully deployed and synced ${allDriverTags.length} tags and ${allDriverConns.length} connections.`,
        tagsCount: allDriverTags.length,
        connectionsCount: allDriverConns.length
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  try {
    const configPath = path.join(process.cwd(), 'tasc_core_config.json');
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      if (config.driverTags && Array.isArray(config.driverTags)) {
        console.log(`[Server] Loading ${config.driverTags.length} driver tags from tasc_core_config.json on startup`);
        const subs = config.driverTags.map((tag: any) => {
          const connection = (config.driverConnections || []).find((c: any) => c.connectionId === tag.connectionId);

          // Auto-configure historian & alarms on startup
          serverHistorian.setTagConfig({
            tagId: tag.tagId,
            enabled: tag.historianEnabled !== false,
            deadband: Number(tag.deadband) || 0.0,
            maxIntervalMs: Number(tag.maxIntervalMs) || 60000,
            rocThreshold: tag.rocThreshold ? Number(tag.rocThreshold) : undefined
          });

          if (tag.alarmConfig || tag.highHigh != null || tag.high != null || tag.low != null || tag.lowLow != null) {
            const cfg = tag.alarmConfig || {};
            serverAlarmEngine.setTagAlarmConfig({
              tagId: tag.tagId,
              enabled: cfg.enabled !== false,
              highHigh: tag.highHigh ?? cfg.highHigh,
              high: tag.high ?? cfg.high,
              low: tag.low ?? cfg.low,
              lowLow: tag.lowLow ?? cfg.lowLow,
              rateOfChange: tag.rocLimit ?? cfg.rateOfChange,
              deadband: tag.alarmDeadband ?? cfg.deadband ?? 0.0,
              highHighMsg: tag.highHighMsg ?? cfg.highHighMsg,
              highMsg: tag.highMsg ?? cfg.highMsg,
              lowMsg: tag.lowMsg ?? cfg.lowMsg,
              lowLowMsg: tag.lowLowMsg ?? cfg.lowLowMsg,
              rocMsg: tag.rocMsg ?? cfg.rocMsg
            });
          }

          return {
            tagId: tag.tagId,
            protocol: (tag.protocol || connection?.protocol || '').toLowerCase(),
            pollRate: Number(tag.pollRate || connection?.pollRate) || 1000,
            tag: tag,
            connection: connection
          };
        });
        pollingManager.syncTags(subs, false);
      }
    }
  } catch (err) {
    console.error('[Server] Failed to load tags on startup:', err);
  }

  // Wire up the event emitter to log time series, evaluate alarms, and broadcast to active WebSockets
  pollingManager.on('tagChanged', (data) => {
    const timestampMs = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();

    // Phase 3: Continuous 24/7 Headless Time-Series Historian Persistence
    serverHistorian.recordTag(data.tagId, data.value, data.quality, data.qualityText, timestampMs);

    // Phase 3: Headless Server-Side Alarm Evaluation
    serverAlarmEngine.evaluateTag(data.tagId, data.value, data.quality, timestampMs);

    // Phase 4: Headless Server-Side Report Trigger Evaluation
    serverReportEngine.evaluateTagChange(data.tagId, data.value, data.quality);

    driverWss.clients.forEach((client: any) => {
      if (client.readyState === 1 /* WebSocket.OPEN */ && client.subscriptions?.has(data.tagId)) {
        client.send(JSON.stringify({
          tagId: data.tagId,
          tagName: data.tagName || '',
          panelId: data.panelId || '',
          value: data.value,
          quality: data.quality,
          qualityText: data.qualityText,
          timestamp: data.timestamp
        }));
      }
    });
  });

  driverWss.on('connection', (ws: WebSocket) => {
    console.log('[DriverBridge] Client connected to driver bridge WebSocket.');
    const activeIntervals: Map<string, NodeJS.Timeout> = new Map();

    // Push initial active alarms to newly connected client
    const initialAlarms = serverAlarmEngine.getActiveAlarms();
    if (initialAlarms.length > 0 && ws.readyState === 1 /* WebSocket.OPEN */) {
      ws.send(JSON.stringify({
        type: 'active_alarms',
        alarms: initialAlarms
      }));
    }

    ws.on('message', (rawMsg: Buffer) => {
      try {
        const msg = JSON.parse(rawMsg.toString());

        if (msg.type === 'get_active_alarms') {
          ws.send(JSON.stringify({
            type: 'active_alarms',
            alarms: serverAlarmEngine.getActiveAlarms()
          }));
          return;
        }

        if (msg.type === 'ack_alarm' && msg.alarmKey) {
          const updated = serverAlarmEngine.acknowledgeAlarm(msg.alarmKey, msg.operator || 'Operator');
          ws.send(JSON.stringify({
            type: 'alarm_ack_result',
            success: !!updated,
            alarm: updated
          }));
          return;
        }

        if (msg.type === 'subscribe' && Array.isArray(msg.subscriptions)) {
          // Track subscriptions for this specific WebSocket client
          (ws as any).subscriptions = new Set(msg.subscriptions.map((s: any) => s.tagId));

          activeIntervals.forEach((timer) => clearInterval(timer));
          activeIntervals.clear();

          console.log(`[DriverBridge] Received subscribe for ${msg.subscriptions.length} tag(s), handing off to PollingManager...`);
          pollingManager.syncTags(msg.subscriptions, true);

          // Trigger immediate send of all currently cached values
          if (ws.readyState === 1 /* WebSocket.OPEN */) {
            const allCached = pollingManager.getAllCachedValues();
            for (const sub of msg.subscriptions) {
              const cached = allCached[sub.tagId];
              if (cached) {
                ws.send(JSON.stringify({
                  tagId: sub.tagId,
                  tagName: sub.tag?.tagName,
                  panelId: sub.panelId,
                  value: cached.value,
                  quality: cached.quality,
                  qualityText: cached.qualityText,
                  timestamp: cached.timestamp
                }));
              }
            }
          }
        }
      } catch (err: any) {
        console.error('[DriverBridge] Message error:', err.message);
      }
    });

    ws.on('close', () => {
      console.log('[DriverBridge] Client disconnected from driver bridge.');
      activeIntervals.forEach((timer) => clearInterval(timer));
      activeIntervals.clear();
    });

    ws.on('error', (err) => {
      console.error('[DriverBridge] Client WebSocket error:', err.message);
      activeIntervals.forEach((timer) => clearInterval(timer));
      activeIntervals.clear();
    });
  });

  // ─── OPC UA Browser WebSocket Endpoint (node-opcua, MIT License) ─────────
  opcUaWss.on('connection', (ws: WebSocket) => {
    console.log('[OpcUaBrowser] Client connected.');
    let opcClient: any = null;
    let session: any = null;

    const sendMsg = (type: string, payload: object) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, ...payload }));
      }
    };

    ws.on('message', async (rawMsg: Buffer) => {
      try {
        const msg = JSON.parse(rawMsg.toString());

        // ── CONNECT ─────────────────────────────────────────────────────────
        if (msg.type === 'connect') {
          const rawEndpointUrl = msg.endpointUrl;
          const endpointUrl = rawEndpointUrl?.trim();
          const username = msg.username?.trim();
          const password = msg.password;

          if (!endpointUrl) {
            sendMsg('error', { message: 'No OPC UA endpoint URL provided.' });
            return;
          }

          try {
            console.log(`[OpcUaBrowser] Initiating connection to OPC UA server: "${endpointUrl}"`);
            sendMsg('status', { status: 'connecting', endpointUrl });

            opcClient = OPCUAClient.create({
              applicationName: 'TASC IIoT Studio',
              connectionStrategy: { initialDelay: 1000, maxRetry: 2 },
              securityMode: MessageSecurityMode.None,
              securityPolicy: SecurityPolicy.None,
              endpointMustExist: false,
              requestedSessionTimeout: 60000
            });

            await opcClient.connect(endpointUrl);
            console.log(`[OpcUaBrowser] Connected to ${endpointUrl}`);

            session = (username && password)
              ? await opcClient.createSession({ type: 'UserNameIdentityToken', userName: username, password })
              : await opcClient.createSession();

            console.log(`[OpcUaBrowser] OPC UA Session created successfully for ${endpointUrl}`);
            sendMsg('status', { status: 'connected', endpointUrl });
          } catch (err: any) {
            console.error('[OpcUaBrowser] Connection error:', err.message || err);
            sendMsg('error', { message: `Failed to connect: ${err.message || err}` });
            try { if (opcClient) await opcClient.disconnect(); } catch { }
            opcClient = null; session = null;
          }
        }

        // ── BROWSE ──────────────────────────────────────────────────────────
        if (msg.type === 'browse') {
          if (!session) { sendMsg('error', { message: 'Not connected.' }); return; }
          const nodeId = msg.nodeId || 'RootFolder';
          try {
            const browseResult = await session.browse({
              nodeId,
              browseDirection: BrowseDirection.Forward,
              includeSubtypes: true,
              nodeClassMask: 0,
              resultMask: 63
            });

            const children = (browseResult.references || []).map((ref: any) => ({
              nodeId: ref.nodeId.toString(),
              browseName: ref.browseName.toString(),
              displayName: ref.displayName?.text || ref.browseName.toString(),
              nodeClass: ref.nodeClass,
              isFolder: ref.nodeClass === NodeClass.Object || ref.nodeClass === NodeClass.View || ref.nodeClass === NodeClass.ObjectType,
              isVariable: ref.nodeClass === NodeClass.Variable
            }));

            sendMsg('browse_result', { parentNodeId: nodeId, children });
          } catch (err: any) {
            console.error('[OpcUaBrowser] Browse error:', err.message);
            sendMsg('error', { message: `Browse failed: ${err.message}` });
          }
        }

        // ── READ ────────────────────────────────────────────────────────────
        if (msg.type === 'read') {
          if (!session) { sendMsg('error', { message: 'Not connected.' }); return; }
          const { nodeId } = msg;
          try {
            const [dataValue, ...attributes] = await Promise.all([
              session.readVariableValue(nodeId),
              session.read([
                { nodeId, attributeId: AttributeIds.DisplayName },
                { nodeId, attributeId: AttributeIds.Description },
                { nodeId, attributeId: AttributeIds.DataType },
                { nodeId, attributeId: AttributeIds.AccessLevel }
              ])
            ]);

            const attrResults = attributes[0];
            sendMsg('read_result', {
              nodeId,
              value: dataValue.value?.value ?? null,
              statusCode: dataValue.statusCode?.toString() ?? 'Bad',
              displayName: attrResults?.[0]?.value?.value?.text || '',
              description: attrResults?.[1]?.value?.value?.text || '',
              dataType: attrResults?.[2]?.value?.value?.toString() || 'Unknown',
              accessLevel: attrResults?.[3]?.value?.value ?? 0,
              sourceTimestamp: dataValue.sourceTimestamp?.toISOString() ?? null
            });
          } catch (err: any) {
            console.error('[OpcUaBrowser] Read error:', err.message);
            sendMsg('error', { message: `Read failed: ${err.message}` });
          }
        }

        // ── DISCONNECT ──────────────────────────────────────────────────────
        if (msg.type === 'disconnect') {
          try { if (session) { await session.close(); session = null; } } catch { }
          try { if (opcClient) { await opcClient.disconnect(); opcClient = null; } } catch { }
          sendMsg('status', { status: 'disconnected' });
        }

      } catch (err) {
        console.error('[OpcUaBrowser] Message parse error:', err);
      }
    });

    const cleanup = async () => {
      try { if (session) { await session.close(); session = null; } } catch { }
      try { if (opcClient) { await opcClient.disconnect(); opcClient = null; } } catch { }
    };

    ws.on('close', () => { console.log('[OpcUaBrowser] Client disconnected.'); cleanup(); });
    ws.on('error', (err) => { console.error('[OpcUaBrowser] WS error:', err.message); cleanup(); });
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const requestUrl = new URL(req.url || '', `http://${req.headers.host}`);
    const targetParam = requestUrl.searchParams.get('target') || '';

    let host = 'broker.hivemq.com';
    let port = 1883;

    if (targetParam) {
      try {
        let cleanUrl = targetParam;
        if (!cleanUrl.includes('://')) {
          cleanUrl = 'tcp://' + cleanUrl;
        }
        const parsed = new URL(cleanUrl);
        host = parsed.hostname || host;
        port = parsed.port ? parseInt(parsed.port, 10) : 1883;
      } catch (err) {
        console.warn('Failed to parse target URL in bridge, using defaults:', targetParam);
      }
    } else {
      host = requestUrl.searchParams.get('host') || host;
      const p = requestUrl.searchParams.get('port');
      if (p) port = parseInt(p, 10);
    }

    console.log(`[MQTT TCP Bridge] Opening TCP bridge to ${host}:${port}`);

    const tcpSocket = new net.Socket();

    tcpSocket.connect(port, host, () => {
      console.log(`[MQTT TCP Bridge] Connected to TCP MQTT broker ${host}:${port}`);
    });

    // Pipe WebSocket -> TCP
    ws.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      if (tcpSocket.writable) {
        if (Buffer.isBuffer(data)) {
          tcpSocket.write(data);
        } else if (data instanceof ArrayBuffer) {
          tcpSocket.write(Buffer.from(data));
        } else if (Array.isArray(data)) {
          tcpSocket.write(Buffer.concat(data));
        }
      }
    });

    // Pipe TCP -> WebSocket
    tcpSocket.on('data', (data: Buffer) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data, { binary: true });
      }
    });

    // Handle TCP errors & closure
    tcpSocket.on('error', (err) => {
      console.error(`[MQTT TCP Bridge] TCP socket error (${host}:${port}):`, err.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, `TCP connection error: ${err.message}`);
      }
    });

    tcpSocket.on('close', () => {
      console.log(`[MQTT TCP Bridge] TCP socket closed (${host}:${port})`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'TCP socket closed');
      }
    });

    // Handle WebSocket closure
    ws.on('close', () => {
      console.log(`[MQTT TCP Bridge] Client WebSocket closed`);
      tcpSocket.destroy();
    });

    ws.on('error', (err) => {
      console.error(`[MQTT TCP Bridge] Client WebSocket error:`, err.message);
      tcpSocket.destroy();
    });
  });

  // Vite development middleware vs production static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: [
            '**/data/**',
            '**/python_engine/**',
            '**/*.log',
            '**/audit.log',
            '**/tasc_ai_daemon_audit.log',
            '**/venv/**',
            '**/scratch/**',
            '**/dist/**',
            '**/downloads/**',
            '**/*.tmp',
            '**/installer_output/**',
            '**/bridge_dist/**',
            '**/*.sqlite*',
            '**/*.db',
            /[\\/]data[\\/]/,
            /[\\/]python_engine[\\/]/,
            /[\\/]downloads[\\/]/,
            /\.tmp$/,
            /\.log$/,
          ],
        },
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
      ? path.join(process.cwd(), 'dist')
      : fs.existsSync(path.join(appDir, 'index.html'))
      ? appDir
      : path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`TASC MQTT Dash Pro server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();

// ─── Graceful Shutdown: Free VRAM before exit ────────────────────────────────
// When the SCADA server process is killed (Ctrl+C, nodemon restart, etc.),
// we send UNLOAD_GGUF_MODEL to the daemon so the GPU VRAM is freed immediately.
// Then we kill the daemon process itself after a short grace period.
function gracefulShutdown(signal: string) {
  console.log(`[Shutdown] ${signal} received — unloading GGUF model from VRAM and stopping Python daemon...`);

  // 1. Tell daemon to unload the model (frees VRAM)
  const unloadClient = new net.Socket();
  unloadClient.setTimeout(3000);
  try {
    unloadClient.connect(8765, '127.0.0.1', () => {
      unloadClient.write(JSON.stringify({
        command: 'UNLOAD_GGUF_MODEL',
        requestId: 'shutdown',
        payload: {}
      }) + '\n');
    });
  } catch { /* daemon already dead */ }

  // 2. Kill the daemon process and llama-server after 1.5s grace period
  setTimeout(() => {
    unloadClient.destroy();
    try {
      if (process.platform === 'win32') {
        exec('taskkill /F /IM llama-server.exe', () => { });
      }
    } catch { }
    const daemonPid = (global as any).__tasc_daemon_pid;
    if (daemonPid) {
      try { process.kill(daemonPid, 'SIGTERM'); } catch { /* already dead */ }
    }
    process.exit(0);
  }, 1500);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
