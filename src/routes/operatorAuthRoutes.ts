/**
 * TASC IIoT Studio — Operator Auth REST API Routes
 *
 * All routes are mounted at /api/auth/op in server.ts
 *
 * Public routes (no token):
 *   GET  /api/auth/op/status           — check if system is initialized
 *   POST /api/auth/op/init-admin        — create first admin (one-time)
 *   POST /api/auth/op/login             — authenticate and get token
 *
 * Protected routes (Bearer token required):
 *   POST /api/auth/op/logout
 *   GET  /api/auth/op/session/verify
 *   GET  /api/auth/op/users             (+ manageUsers)
 *   POST /api/auth/op/users             (+ manageUsers)
 *   PUT  /api/auth/op/users/:id         (+ manageUsers)
 *   DELETE /api/auth/op/users/:id       (+ manageUsers)
 *   POST /api/auth/op/users/:id/unlock  (+ manageUsers)
 *   PUT  /api/auth/op/policy            (+ manageUsers)
 *   GET  /api/auth/op/audit-log         (+ manageUsers)
 *   GET  /api/auth/op/audit-log/export  (+ exportReports)
 *   POST /api/auth/op/audit-log/event   (any valid token)
 *   GET  /api/auth/op/export            (+ manageUsers)
 *   POST /api/auth/op/import            (+ manageUsers)
 */

import { Router, Request, Response } from 'express';
import { operatorAuthService } from '../services/auth/operatorAuthService';
import { requireAuth, requirePermission, getClientIp } from '../middleware/operatorAuthMiddleware';
import type { AuditExportFormat, AuditLogQuery } from '../types/auth';

export const operatorAuthRouter = Router();

// ─── Public Routes ────────────────────────────────────────────────────────────

/**
 * GET /api/auth/op/status
 * Returns initialization state. Called on every page load to decide which
 * screen to show (FirstGoModal / LoginModal / normal app).
 */
operatorAuthRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const status = operatorAuthService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/op/init-admin
 * Creates the first admin operator account. Blocked if already initialized.
 * Body: { username, displayName, password }
 */
operatorAuthRouter.post('/init-admin', (req: Request, res: Response) => {
  try {
    const { username, displayName, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required.' });
      return;
    }
    const result = operatorAuthService.initializeAdmin({ username, displayName, password, role: 'admin', permissions: {} as any });
    if (!result.success) {
      res.status(409).json({ error: result.error });
      return;
    }
    res.status(201).json({ session: result.session });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

import { 
  checkRateLimit, 
  recordFailedAttempt, 
  recordSuccessfulLogin, 
  getSecurityAuditTrail, 
  unlockUserAccount,
  extractClientIp 
} from '../services/auth/rateLimiterService';

/**
 * POST /api/auth/op/login
 * Authenticate with username + password.
 * Body: { username, password }
 * Returns: { token, user, expiresAt, sessionTimeoutMinutes }
 */
operatorAuthRouter.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'username and password are required.' });
      return;
    }
    const ip = extractClientIp(req);
    const userAgent = req.headers['user-agent'] as string | undefined;

    // 1. Check Dual-Key Rate Limit (User + Subnet)
    const rateCheck = checkRateLimit(username, ip);
    if (!rateCheck.allowed) {
      const isUserLock = rateCheck.reason === 'USER_LOCKED';
      const errMsg = isUserLock 
        ? `Account "${username}" is temporarily locked due to repeated failed login attempts. Retry in ${rateCheck.retryAfterSeconds} seconds.`
        : `Too many requests from your network. Please wait ${rateCheck.retryAfterSeconds} seconds before retrying.`;
      
      res.status(429).json({
        error: errMsg,
        isLocked: true,
        reason: rateCheck.reason,
        retryAfterSeconds: rateCheck.retryAfterSeconds
      });
      return;
    }

    const result = operatorAuthService.login(username, password, ip);
    if (!result.success || !result.session) {
      // Record failure in rate limiter
      const failInfo = recordFailedAttempt(username, ip, userAgent);
      if (failInfo.isLocked) {
        res.status(429).json({
          error: `Account "${username}" has been locked for 5 minutes due to 5 consecutive failed login attempts.`,
          isLocked: true,
          retryAfterSeconds: failInfo.retryAfterSeconds
        });
        return;
      }

      res.status(401).json({
        error: result.error,
        attemptsLeft: rateCheck.remainingAttempts ? rateCheck.remainingAttempts - 1 : 0,
        lockedUntilMs: result.lockedUntilMs
      });
      return;
    }

    // Record success
    recordSuccessfulLogin(username, ip, userAgent);

    const policy = operatorAuthService.getPolicy();
    res.json({
      token: result.session.token,
      user: {
        id: result.session.userId,
        username: result.session.username,
        displayName: result.session.displayName,
        role: result.session.role,
        permissions: result.session.permissions
      },
      expiresAt: result.session.expiresAt,
      sessionTimeoutMinutes: policy?.sessionTimeoutMinutes ?? 480
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Session Routes ───────────────────────────────────────────────────────────

/**
 * POST /api/auth/op/logout
 * Invalidates the current session token.
 */
operatorAuthRouter.post('/logout', requireAuth, (req: Request, res: Response) => {
  const token = req.headers['authorization']!.slice(7).trim();
  const ip = getClientIp(req);
  operatorAuthService.invalidateSession(token, ip);
  res.json({ success: true });
});

/**
 * GET /api/auth/op/session/verify
 * Called on page reload to restore session from sessionStorage token.
 * Returns current user profile if valid.
 */
operatorAuthRouter.get('/session/verify', requireAuth, (req: Request, res: Response) => {
  const session = req.operatorUser!;
  const policy = operatorAuthService.getPolicy();
  res.json({
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      permissions: session.permissions
    },
    expiresAt: session.expiresAt,
    sessionTimeoutMinutes: policy?.sessionTimeoutMinutes ?? 480
  });
});

// ─── User Management Routes ───────────────────────────────────────────────────

/**
 * GET /api/auth/op/users
 * List all operator users (passwords excluded).
 */
operatorAuthRouter.get('/users', requireAuth, requirePermission('manageUsers'), (_req: Request, res: Response) => {
  try {
    const users = operatorAuthService.listUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/op/users
 * Create a new operator user.
 * Body: { username, displayName, password, role, permissions }
 */
operatorAuthRouter.post('/users', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const result = operatorAuthService.createUser(req.body, req.operatorUser!, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json({ user: result.user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/op/users/:id
 * Update user details, role, permissions, status, or password.
 * Body: Partial<UpdateUserRequest>
 */
operatorAuthRouter.put('/users/:id', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const result = operatorAuthService.updateUser(req.params.id, req.body, req.operatorUser!, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/auth/op/users/:id
 * Delete an operator account (last-admin guard active).
 */
operatorAuthRouter.delete('/users/:id', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const result = operatorAuthService.deleteUser(req.params.id, req.operatorUser!, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/op/users/:id/unlock
 * Admin unlocks a rate-limited account.
 */
operatorAuthRouter.post('/users/:id/unlock', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const result = operatorAuthService.unlockUser(req.params.id, req.operatorUser!, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/auth/op/policy
 * Update security policy (session timeout, lockout config).
 * Body: OperatorSecurityPolicy
 */
operatorAuthRouter.put('/policy', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const result = operatorAuthService.updatePolicy(req.body, req.operatorUser!, ip);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Audit Log Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/auth/op/audit-log
 * Paginated + filtered audit event list (JSON).
 * Query: page, pageSize, from, to, username, action, success
 */
operatorAuthRouter.get('/audit-log', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const query: AuditLogQuery = {
      page: req.query.page ? Number(req.query.page) : 1,
      pageSize: req.query.pageSize ? Number(req.query.pageSize) : 20,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      username: req.query.username as string | undefined,
      action: req.query.action as any,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined
    };
    const result = operatorAuthService.queryAuditLog(query);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/op/audit-log/export
 * Download audit log in CSV, HTML, or PDF format.
 * Query: format (csv|html|pdf), from, to, username, action, success
 * Requires exportReports permission.
 */
operatorAuthRouter.get('/audit-log/export', requireAuth, requirePermission('exportReports'), (req: Request, res: Response) => {
  try {
    const format = (req.query.format as AuditExportFormat) || 'csv';
    if (!['csv', 'html', 'pdf'].includes(format)) {
      res.status(400).json({ error: 'Invalid format. Use csv, html, or pdf.' });
      return;
    }
    const query: AuditLogQuery = {
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      username: req.query.username as string | undefined,
      action: req.query.action as any,
      success: req.query.success !== undefined ? req.query.success === 'true' : undefined
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    const generatedBy = req.operatorUser!.displayName;
    const content = operatorAuthService.exportAuditLog(format, query, generatedBy);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit_log_${dateStr}.csv"`);
      res.send(content);
    } else if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit_report_${dateStr}.html"`);
      res.send(content);
    } else if (format === 'pdf') {
      // Server-side PDF rendering via html-pdf-node
      // If html-pdf-node is not installed, fall back to sending the print-ready HTML
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const htmlPdf = require('html-pdf-node');
        const file = { content: content as string };
        const options = { format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } };
        htmlPdf.generatePdf(file, options).then((pdfBuffer: Buffer) => {
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="audit_report_${dateStr}.pdf"`);
          res.send(pdfBuffer);
        }).catch(() => {
          // Fallback: send print-ready HTML with print dialog hint
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="audit_report_${dateStr}_print.html"`);
          res.send((content as string).replace('</body>', '<script>window.onload=function(){window.print()}</script></body>'));
        });
      } catch {
        // html-pdf-node not installed — send print-ready HTML
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="audit_report_${dateStr}_print.html"`);
        res.send((content as string).replace('</body>', '<script>window.onload=function(){window.print()}</script></body>'));
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/op/audit-log/event
 * Frontend posts an audit event (mqtt_write, alarm_ack, etc.).
 * Any valid session token can post events.
 * Body: { action, success, details }
 */
operatorAuthRouter.post('/audit-log/event', requireAuth, (req: Request, res: Response) => {
  try {
    const { action, success = true, details = {} } = req.body;
    const ip = getClientIp(req);
    const session = req.operatorUser!;
    operatorAuthService.appendAuditEvent({
      username: session.username,
      displayName: session.displayName,
      action,
      success,
      ip,
      details
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Credential Package Export/Import Routes ──────────────────────────────────

/**
 * GET /api/auth/op/export
 * Returns the signed credential block for embedding in a .tasc export.
 * Requires manageUsers.
 */
operatorAuthRouter.get('/export', requireAuth, requirePermission('manageUsers'), (_req: Request, res: Response) => {
  try {
    const pkg = operatorAuthService.exportForPackaging();
    if (!pkg) {
      res.status(404).json({ error: 'No operator credentials configured to export.' });
      return;
    }
    res.json(pkg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/op/import
 * Import credential block from a .tasc package.
 * Body: { pkg: PackagedOperatorCredentials, sourcePkgName?: string, confirmOverwrite?: boolean }
 * If existing credentials are present, confirmOverwrite must be true.
 */
operatorAuthRouter.post('/import', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const { pkg, sourcePkgName, confirmOverwrite } = req.body;
    if (!pkg) {
      res.status(400).json({ error: 'pkg field is required.' });
      return;
    }

    // If credentials already exist, require explicit confirmation
    const status = operatorAuthService.getStatus();
    if (status.isInitialized && !confirmOverwrite) {
      res.status(409).json({
        error: 'Operator credentials already exist on this system.',
        requiresConfirmation: true,
        message: 'Set confirmOverwrite: true after admin confirms to proceed.'
      });
      return;
    }

    const ip = getClientIp(req);
    const result = operatorAuthService.importFromPackage(pkg, req.operatorUser!, ip, sourcePkgName);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/op/audit
 * Retrieve security audit log trail (logins, failures, lockouts).
 * Requires manageUsers or admin role.
 */
operatorAuthRouter.get('/audit', requireAuth, requirePermission('manageUsers'), (_req: Request, res: Response) => {
  try {
    const auditLogs = getSecurityAuditTrail();
    res.json({ auditLogs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/op/unlock
 * Manually unlock a locked operator account.
 * Body: { username }
 * Requires manageUsers or admin role.
 */
operatorAuthRouter.post('/unlock', requireAuth, requirePermission('manageUsers'), (req: Request, res: Response) => {
  try {
    const { username } = req.body;
    if (!username) {
      res.status(400).json({ error: 'username is required.' });
      return;
    }
    const success = unlockUserAccount(username);
    res.json({ success, message: success ? `User ${username} unlocked successfully.` : `No active lockout found for ${username}.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

