import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
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

const PORT = 3000;

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
            } catch (e) {}
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
  const server = http.createServer(app);

  app.use(express.json());

  // Health check API
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'TASC MQTT Dash Pro Server & TCP Bridge',
      timestamp: new Date().toISOString()
    });
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
  createdAt: number;  // Date.now() when socket was created — used for forced reconnect
}

// Force-reconnect Modbus TCP sockets older than this to detect server restarts.
// On localhost, TCP connections can survive a server stop/start on the same port,
// causing jsmodbus to return stale cached data from the old server session.
const MAX_MODBUS_CONNECTION_AGE_MS = 10_000;  // 10 seconds

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
  connectionHealthMap.set(connectionId, updated);

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

const modbusPool = new Map<string, ModbusClientEntry>();

function normalizeHost(inputHost?: string): string {
  if (!inputHost || inputHost.trim() === '' || inputHost === 'localhost' || inputHost === '127.0.0.1') {
    return '127.0.0.1';
  }
  return inputHost.trim();
}

function invalidateModbusClient(rawHost: string, port: number, unitId: number = 1, connectionId?: string) {
  const host = normalizeHost(rawHost);
  const key = `${host}:${port}:${unitId}`;
  const entry = modbusPool.get(key);
  const targetConnId = connectionId || entry?.connectionId;
  if (targetConnId) {
    updateConnectionHealth(targetConnId, {
      connectionState: 'disconnected',
      lastDisconnectedAt: new Date().toISOString(),
      lastError: 'Modbus TCP server disconnected'
    });
  }
  if (entry) {
    entry.connected = false;
    entry.connecting = false;
    try {
      entry.socket.destroy();
    } catch (e) {
      // Ignore socket destroy errors
    }
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
        invalidateModbusClient(host, port, unitId, connectionId);
      });

      socket.on('end', () => {
        console.log(`[ModbusTCP] Server at ${host}:${port} sent FIN — connection ending`);
        invalidateModbusClient(host, port, unitId, connectionId);
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
    .catch(() => {}) // Don't block queue if previous request errored!
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
  const maxRetries = Math.max(0, Number(connection?.frameRetryCount) || 0);

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

        // When reopenSockets is true (default for single-socket channels & simulators),
        // release the socket after read pass so server stop/start is detected instantly
        if (connection?.reopenSockets !== false) {
          invalidateModbusClient(host, port, unitId, connectionId);
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
      if (entry.session) entry.session.close().catch(() => {});
      if (entry.client) entry.client.disconnect().catch(() => {});
    } catch {}
    opcUaPool.delete(key);
  }
}

async function getOrCreateOpcUaSession(connection: any): Promise<any> {
  let endpointUrl = (connection?.endpointUrl || connection?.opcUaEndpointUrl || connection?.host || '').trim();
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

  const opcClient = OPCUAClient.create({
    applicationName: 'TASC IIoT Studio',
    connectionStrategy: { initialDelay: 500, maxRetry: 1 },
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpointMustExist: false,
    requestedSessionTimeout: 30000
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
    await opcClient.connect(endpointUrl);
    const username = connection.username?.trim();
    const password = connection.password;
    const session = (username && password)
      ? await opcClient.createSession({ type: UserTokenType.UserName, userName: username, password })
      : await opcClient.createSession();

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
  driverWss.on('connection', (ws: WebSocket) => {
    console.log('[DriverBridge] Client connected to driver bridge WebSocket.');
    const activeIntervals: Map<string, NodeJS.Timeout> = new Map();

    ws.on('message', (rawMsg: Buffer) => {
      try {
        const msg = JSON.parse(rawMsg.toString());

        if (msg.type === 'subscribe' && Array.isArray(msg.subscriptions)) {
          // ─── CRITICAL: Clear ALL existing intervals before creating new ones ────
          // The client sends a full subscribe list each time anything changes.
          // Without clearing first, we get duplicate polling intervals.
          activeIntervals.forEach((timer) => clearInterval(timer));
          activeIntervals.clear();

          console.log(`[DriverBridge] Received subscribe for ${msg.subscriptions.length} tag(s) (cleared ${activeIntervals.size} old intervals)`);
          msg.subscriptions.forEach((sub: { tagId: string; panelId: string; pollRate: number; tag?: any; connection?: any }) => {
            const proto = sub.connection?.protocol || sub.tag?.protocol || 'UNKNOWN';
            const hostV = sub.connection?.host || 'NONE';
            const portV = sub.connection?.port || 'NONE';
            const unitIdV = sub.tag?.slaveId ?? sub.connection?.unitId ?? 'NONE';
            const addrV = sub.tag?.address ?? 'NONE';
            const regTypeV = sub.tag?.registerType || 'NONE';
            const enabledV = sub.connection?.enabled;
            console.log(`  → Tag: "${sub.tag?.tagName || sub.tagId}" | proto=${proto} | ${hostV}:${portV} unitId=${unitIdV} | addr=${addrV} regType=${regTypeV} | enabled=${enabledV} | rate=${sub.pollRate}ms`);
            const key = `${sub.panelId}_${sub.tagId}`;

            const pollInterval = Math.max(50, Number(sub.pollRate) || 1000);

            // ─── Per-subscription last-good tracking for stale/disconnect detection ────
            let subLastGoodValue: any = undefined;
            let subLastGoodTimestamp: string | undefined = undefined;
            let subConsecutiveFailures = 0;
            let readCount = 0;
            let isPolling = false;

            const pollFn = async () => {
              if (ws.readyState !== WebSocket.OPEN) {
                const timer = activeIntervals.get(key);
                if (timer) {
                  clearInterval(timer);
                  activeIntervals.delete(key);
                }
                return;
              }

              // Skip if a previous read is still awaiting network timeout/response
              if (isPolling) {
                return;
              }
              isPolling = true;

              try {
                let val: any = null;
                let quality: 'good' | 'bad' = 'good';
                let qualityText: string | undefined;
                const now = new Date().toISOString();

                const protocol = (sub.connection?.protocol || sub.tag?.protocol || '').toLowerCase();
                const connectionId = sub.connection?.connectionId || sub.tag?.connectionId;

                if (sub.connection && sub.connection.enabled === false) {
                  quality = 'bad';
                  val = null;
                  qualityText = 'Source disabled';
                } else if (protocol === 'modbus_tcp' || protocol === 'modbus_rtu') {
                  try {
                    val = await readModbusTag(sub.tag, sub.connection);
                    quality = 'good';
                    qualityText = 'Good';
                    readCount++;
                    // Log first read and then every 50th read for diagnostics
                    if (readCount === 1 || readCount % 50 === 0) {
                      console.log(`[DriverBridge] ✓ Read #${readCount} for "${sub.tag?.tagName || sub.tagId}" addr=${sub.tag?.address}: value=${val}`);
                    }
                    // On success: reset failure counter, update last-good
                    subConsecutiveFailures = 0;
                    subLastGoodValue = val;
                    subLastGoodTimestamp = now;
                    // Ensure connection health reflects connected state
                    if (connectionId) {
                      updateConnectionHealth(connectionId, {
                        connectionState: 'connected',
                        consecutiveFailureCount: 0,
                        lastError: undefined
                      });
                    }
                  } catch (err: any) {
                    subConsecutiveFailures++;
                    quality = 'bad';
                    val = null;
                    qualityText = err.message?.includes('in progress') ? 'Reconnecting' : 'Read error';
                    if (subConsecutiveFailures <= 5 || subConsecutiveFailures % 20 === 0) {
                      console.warn(`[DriverBridge] ✗ Modbus read fail #${subConsecutiveFailures} for "${sub.tag?.tagName || sub.tagId}": ${err.message}`);
                    }
                    // Update connection health immediately to disconnected
                    if (connectionId) {
                      updateConnectionHealth(connectionId, {
                        connectionState: 'disconnected',
                        consecutiveFailureCount: subConsecutiveFailures,
                        lastError: err.message
                      });
                    }
                  }
                } else if (protocol === 'opcua') {
                  try {
                    val = await readOpcUaTag(sub.tag, sub.connection);
                    quality = 'good';
                    qualityText = 'Good';
                    subConsecutiveFailures = 0;
                    subLastGoodValue = val;
                    subLastGoodTimestamp = now;
                  } catch (err: any) {
                    subConsecutiveFailures++;
                    quality = 'bad';
                    val = null;
                    qualityText = 'OPC UA read error';
                    if (subConsecutiveFailures <= 3 || subConsecutiveFailures % 20 === 0) {
                      console.warn(`[DriverBridge] OPC UA read failed for tag ${sub.tag?.tagName || sub.tagId}:`, err.message);
                    }
                  }
                } else {
                  quality = 'bad';
                  val = null;
                  qualityText = 'Unknown protocol';
                }

                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({
                    tagId: sub.tagId,
                    panelId: sub.panelId,
                    value: val,
                    quality,
                    qualityText,
                    // Pass last-good metadata so the client can preserve last known good value
                    lastGoodValue: quality === 'bad' ? subLastGoodValue : val,
                    lastGoodTimestamp: quality === 'bad' ? subLastGoodTimestamp : now,
                    timestamp: now
                  }));
                }
              } finally {
                isPolling = false;
              }
            };

            // Trigger immediate read on subscribe (instant data on browser connect / refresh)
            pollFn();

            const interval = setInterval(pollFn, pollInterval);
            activeIntervals.set(key, interval);
          });
        }

        if (msg.type === 'write') {
          console.log(`[DriverBridge] Write request received: tagId=${msg.tagId}, connectionId=${msg.connectionId}, value=${msg.value}`);
          const protocol = (msg.connection?.protocol || msg.tag?.protocol || '').toLowerCase();

          if (msg.tag && msg.connection && (protocol === 'modbus_tcp' || protocol === 'modbus_rtu')) {
            writeModbusTag(msg.tag, msg.connection, msg.value)
              .then(() => console.log(`[DriverBridge] Modbus write success: address=${msg.tag.address}, value=${msg.value}`))
              .catch((err: any) => console.error(`[DriverBridge] Modbus write failed:`, err.message));
          } else if (msg.tag && msg.connection && protocol === 'opcua') {
            writeOpcUaTag(msg.tag, msg.connection, msg.value)
              .then(() => console.log(`[DriverBridge] OPC UA write success: nodeId=${msg.tag.nodeId || msg.tag.address}, value=${msg.value}`))
              .catch((err: any) => console.error(`[DriverBridge] OPC UA write failed:`, err.message));
          }
        }

        if (msg.type === 'unsubscribe_all') {
          activeIntervals.forEach((timer) => clearInterval(timer));
          activeIntervals.clear();
        }
      } catch (err) {
        console.error('[DriverBridge] Error parsing message:', err);
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
            try { if (opcClient) await opcClient.disconnect(); } catch {}
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
          try { if (session) { await session.close(); session = null; } } catch {}
          try { if (opcClient) { await opcClient.disconnect(); opcClient = null; } } catch {}
          sendMsg('status', { status: 'disconnected' });
        }

      } catch (err) {
        console.error('[OpcUaBrowser] Message parse error:', err);
      }
    });

    const cleanup = async () => {
      try { if (session) { await session.close(); session = null; } } catch {}
      try { if (opcClient) { await opcClient.disconnect(); opcClient = null; } } catch {}
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
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
