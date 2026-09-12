import { Router } from 'express';
import cors from 'cors';
import winston from 'winston';

const aiProxyRouter = Router();

// Re-initialize logger for this module
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

const proxyCors = cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE']
});

aiProxyRouter.options('/', proxyCors);
aiProxyRouter.all('/', proxyCors, async (req, res) => {
    
    // Audit Logging
    auditLogger.info('AI Proxy Accessed', { 
      method: req.method, 
      targetUrl: req.query.url || req.headers['x-target-url'],
      ip: req.ip
    });

    let targetUrl = (req.query.url as string) || (req.headers['x-target-url'] as string);
    if (!targetUrl) {
      return res.status(400).json({ error: 'Missing target url parameter (?url=... or x-target-url header)' });
    }
    // Normalize localhost to 127.0.0.1 to avoid Windows Node.js IPv6 resolution errors for local Ollama/LM Studio
    if (targetUrl.includes('//localhost:')) {
      targetUrl = targetUrl.replace('//localhost:', '//127.0.0.1:');
    }

    try {
      const headersToForward: Record<string, string> = {
        'content-type': 'application/json'
      };

      if (req.headers['authorization']) {
        headersToForward['authorization'] = req.headers['authorization'] as string;
      }
      if (req.headers['api-key']) {
        headersToForward['api-key'] = req.headers['api-key'] as string;
      }
      if (req.headers['x-api-key']) {
        headersToForward['x-api-key'] = req.headers['x-api-key'] as string;
      }

      // Forward custom vendor headers (e.g. NVIDIA, OpenRouter, Anthropic)
      for (const [key, val] of Object.entries(req.headers)) {
        if (key.startsWith('x-') && key !== 'x-target-url' && typeof val === 'string') {
          headersToForward[key] = val;
        }
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers: headersToForward
      };

      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }

      const upstreamRes = await fetch(targetUrl, fetchOptions);

      res.status(upstreamRes.status);
      upstreamRes.headers.forEach((val, headerKey) => {
        const lower = headerKey.toLowerCase();
        if (lower === 'content-type' || lower === 'cache-control' || lower === 'content-encoding') {
          res.setHeader(headerKey, val);
        }
      });

      if (upstreamRes.body) {
        const reader = upstreamRes.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } finally {
          reader.releaseLock();
          res.end();
        }
      } else {
        res.end();
      }
    } catch (err: any) {
      console.error('[AI Proxy Error]:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: `Proxy failed to reach ${targetUrl}: ${err.message}` });
      } else {
        res.end();
      }
    }
});

export { aiProxyRouter };
