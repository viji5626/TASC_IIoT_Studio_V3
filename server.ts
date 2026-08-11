import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
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

function getOrCreateModbusClient(rawHost: string, port: number, unitId: number = 1, connectionId?: string): Promise<any> {
  const host = normalizeHost(rawHost);
  const key = `${host}:${port}:${unitId}`;
  const existing = modbusPool.get(key);

  if (existing && existing.connected && existing.client) {
    if (connectionId) existing.connectionId = connectionId;
    return Promise.resolve(existing.client);
  }

  // If currently connecting, wait a brief tick to prevent socket collision
  if (existing && existing.connecting) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const retryEntry = modbusPool.get(key);
        if (retryEntry && retryEntry.connected) {
          resolve(retryEntry.client);
        } else {
          invalidateModbusClient(host, port, unitId, connectionId);
          reject(new Error(`Modbus client to ${host}:${port} connection attempt timed out.`));
        }
      }, 250);
    });
  }

  return new Promise((resolve, reject) => {
    try {
      const socket = new net.Socket();
      const client = new jsmodbus.client.TCP(socket, unitId, 5000);
      const entry: ModbusClientEntry = { socket, client, connected: false, connecting: true, connectionId };
      modbusPool.set(key, entry);

      socket.setTimeout(5000);

      socket.on('connect', () => {
        console.log(`[ModbusTCP] Connected to Modbus slave at ${host}:${port} (Unit ID: ${unitId})`);
        socket.setTimeout(0); // Disable idle socket timeout on connected persistent TCP connection!
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
        console.warn(`[ModbusTCP] Socket error on ${host}:${port} (Unit ID: ${unitId}):`, err.message);
        invalidateModbusClient(host, port, unitId, connectionId);
        reject(err);
      });

      socket.on('timeout', () => {
        console.warn(`[ModbusTCP] Connection timeout on ${host}:${port}`);
        invalidateModbusClient(host, port, unitId, connectionId);
        reject(new Error(`TCP socket timeout connecting to ${host}:${port}`));
      });

      socket.on('close', () => {
        console.log(`[ModbusTCP] Connection closed to ${host}:${port}`);
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

function executeOnModbusClient<T>(host: string, port: number, unitId: number, connectionId: string | undefined, task: (client: any) => Promise<T>): Promise<T> {
  const key = `${normalizeHost(host)}:${port}:${unitId}`;

  const entry = modbusPool.get(key);
  if (!entry || !entry.connected) {
    modbusQueues.delete(key);
  }

  const previousPromise = modbusQueues.get(key) || Promise.resolve();

  const nextPromise = previousPromise
    .catch(() => {}) // Don't block queue if previous request errored!
    .then(async () => {
      const client = await getOrCreateModbusClient(host, port, unitId, connectionId);
      return await task(client);
    });

  modbusQueues.set(key, nextPromise);
  return nextPromise;
}

async function readModbusTag(tag: any, connection: any): Promise<any> {
  const host = normalizeHost(connection?.host);
  const port = Number(connection?.port) || 502;
  const unitId = Number((tag?.slaveId !== undefined && tag?.slaveId !== null && tag?.slaveId !== 0) ? tag.slaveId : (connection?.unitId || 1));
  const connectionId = connection?.connectionId || tag?.connectionId;

  return executeOnModbusClient(host, port, unitId, connectionId, async (client) => {
    // Address translation (ModScan 40000/40001, 30000/30001, 10000/10001, 00000/00001)
    let rawAddr = Number(tag.address) || 0;
    let registerAddr = rawAddr;

    if (registerAddr >= 40000) {
      registerAddr -= 40000;
      if (registerAddr > 0 && registerAddr < 10000) registerAddr -= 1;
    } else if (registerAddr >= 30000) {
      registerAddr -= 30000;
      if (registerAddr > 0 && registerAddr < 10000) registerAddr -= 1;
    } else if (registerAddr >= 10000) {
      registerAddr -= 10000;
      if (registerAddr > 0 && registerAddr < 10000) registerAddr -= 1;
    } else if (registerAddr >= 1) {
      registerAddr -= 1;
    }

    const dataType = (tag.dataType || 'int16').toLowerCase();
    let count = Number(tag.wordCount) || 1;
    if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') count = 2;
    if (dataType === 'double') count = 4;

    const regType = tag.registerType || 'holding_register';

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

    if (!res || !res.response) {
      throw new Error('No response from Modbus slave');
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

    const buf: Buffer = res.response.body.valuesAsBuffer;
    if (!buf || buf.length === 0) {
      const arr = res.response.body.valuesAsArray || [];
      return arr[0] ?? 0;
    }

    let parsedVal: any;
    if (dataType === 'boolean') {
      parsedVal = buf.readUInt16BE(0) !== 0;
    } else if (dataType === 'int16') {
      parsedVal = tag.byteSwap ? buf.readInt16LE(0) : buf.readInt16BE(0);
    } else if (dataType === 'uint16') {
      parsedVal = tag.byteSwap ? buf.readUInt16LE(0) : buf.readUInt16BE(0);
    } else if (dataType === 'int32') {
      parsedVal = tag.byteSwap ? buf.readInt32LE(0) : buf.readInt32BE(0);
    } else if (dataType === 'uint32') {
      parsedVal = tag.byteSwap ? buf.readUInt32LE(0) : buf.readUInt32BE(0);
    } else if (dataType === 'float') {
      const val = tag.byteSwap ? buf.readFloatLE(0) : buf.readFloatBE(0);
      parsedVal = Math.round(val * 100) / 100;
    } else if (dataType === 'double') {
      const val = tag.byteSwap ? buf.readDoubleLE(0) : buf.readDoubleBE(0);
      parsedVal = Math.round(val * 1000) / 1000;
    } else {
      parsedVal = buf.toString('utf8').replace(/\0/g, '');
    }

    return parsedVal;
  }).catch((err: any) => {
    console.warn(`[ModbusTCP Diagnostic] Read failed for "${tag.tagName || tag.tagId}":`, err.message);
    invalidateModbusClient(host, port, unitId, connectionId);
    throw err;
  });
}

async function writeModbusTag(tag: any, connection: any, value: any): Promise<void> {
  const host = normalizeHost(connection?.host);
  const port = Number(connection?.port) || 502;
  const unitId = Number((tag?.slaveId !== undefined && tag?.slaveId !== null && tag?.slaveId !== 0) ? tag.slaveId : (connection?.unitId || 1));
  const connectionId = connection?.connectionId || tag?.connectionId;

  return executeOnModbusClient(host, port, unitId, connectionId, async (client) => {
    let rawAddr = Number(tag.address) || 0;
    let registerAddr = rawAddr;

    if (registerAddr >= 40000) {
      registerAddr -= 40000;
      if (registerAddr > 0 && registerAddr < 10000) registerAddr -= 1;
    } else if (registerAddr >= 30000) {
      registerAddr -= 30000;
      if (registerAddr > 0 && registerAddr < 10000) registerAddr -= 1;
    } else if (registerAddr >= 10000) {
      registerAddr -= 10000;
      if (registerAddr > 0 && registerAddr < 10000) registerAddr -= 1;
    } else if (registerAddr >= 1) {
      registerAddr -= 1;
    }

    const regType = tag.registerType || 'holding_register';

    if (regType === 'coil') {
      await client.writeSingleCoil(registerAddr, Boolean(value));
    } else {
      const numVal = Number(value) || 0;
      const dataType = (tag.dataType || 'int16').toLowerCase();
      if (dataType === 'int32' || dataType === 'uint32' || dataType === 'float') {
        const buf = Buffer.alloc(4);
        if (dataType === 'float') buf.writeFloatBE(numVal, 0);
        else if (dataType === 'int32') buf.writeInt32BE(numVal, 0);
        else buf.writeUInt32BE(numVal, 0);
        await client.writeMultipleRegisters(registerAddr, buf);
      } else {
        await client.writeSingleRegister(registerAddr, numVal);
      }
    }
  }).catch((err: any) => {
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
          msg.subscriptions.forEach((sub: { tagId: string; panelId: string; pollRate: number; tag?: any; connection?: any }) => {
            const key = `${sub.panelId}_${sub.tagId}`;
            if (activeIntervals.has(key)) {
              clearInterval(activeIntervals.get(key)!);
            }

            const pollInterval = Math.max(50, Number(sub.pollRate) || 1000);

            const interval = setInterval(async () => {
              if (ws.readyState !== WebSocket.OPEN) {
                clearInterval(interval);
                activeIntervals.delete(key);
                return;
              }

              let val: any = null;
              let quality = 'good';

              const protocol = (sub.connection?.protocol || sub.tag?.protocol || '').toLowerCase();

              if (sub.connection && sub.connection.enabled === false) {
                quality = 'bad';
                val = null;
              } else if (protocol === 'modbus_tcp' || protocol === 'modbus_rtu') {
                try {
                  val = await readModbusTag(sub.tag, sub.connection);
                  quality = 'good';
                } catch (err: any) {
                  console.warn(`[DriverBridge] Modbus read failed for tag ${sub.tag?.tagName || sub.tagId}:`, err.message);
                  quality = 'bad';
                  val = null;
                }
              } else if (protocol === 'opcua') {
                try {
                  val = await readOpcUaTag(sub.tag, sub.connection);
                  quality = 'good';
                } catch (err: any) {
                  console.warn(`[DriverBridge] OPC UA read failed for tag ${sub.tag?.tagName || sub.tagId}:`, err.message);
                  quality = 'bad';
                  val = null;
                }
              } else {
                quality = 'bad';
                val = null;
              }

              ws.send(JSON.stringify({
                tagId: sub.tagId,
                panelId: sub.panelId,
                value: val,
                quality,
                timestamp: new Date().toISOString()
              }));
            }, pollInterval);

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
