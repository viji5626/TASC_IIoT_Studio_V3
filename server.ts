import express from 'express';
import http from 'http';
import net from 'net';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

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

  // Attach WebSocket server for TCP-MQTT bridging
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    if (url.pathname === '/api/mqtt-bridge') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
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
