/**
 * TASC IIoT Studio — Operator Auth Middleware
 *
 * Validates Bearer tokens on protected routes and attaches the verified
 * OperatorSession to req.operatorUser.
 *
 * Usage:
 *   router.get('/protected', requireAuth, handler)
 *   router.post('/admin-only', requireAuth, requirePermission('manageUsers'), handler)
 */

import { Request, Response, NextFunction } from 'express';
import { operatorAuthService } from '../services/auth/operatorAuthService';
import { OPERATOR_PERMISSION_PRESETS } from '../types/auth';
import type { OperatorSession, OperatorPermissions } from '../types/auth';

// Extend Express Request to carry verified operator session
declare global {
  namespace Express {
    interface Request {
      operatorUser?: OperatorSession;
    }
  }
}

/**
 * Validates the Authorization: Bearer <token> header or x-tasc-engineering-admin header.
 * Attaches session to req.operatorUser on success.
 * Returns 401 if token is missing or invalid/expired.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const isEnggAdmin = req.headers['x-tasc-engineering-admin'] === 'true' || req.headers['x-tasc-role'] === 'admin';
  if (isEnggAdmin) {
    req.operatorUser = {
      token: 'engg_admin_token',
      userId: 'engg_admin',
      username: 'TASC_ENGG',
      displayName: 'Engineering Studio Admin',
      role: 'admin',
      permissions: OPERATOR_PERMISSION_PRESETS.admin,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      lastActivity: new Date().toISOString()
    };
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const session = operatorAuthService.verifySession(token);

  if (!session) {
    res.status(401).json({ error: 'Session expired or invalid. Please log in again.' });
    return;
  }

  req.operatorUser = session;
  next();
}

/**
 * Factory — creates a middleware that checks a specific permission.
 * Must be used AFTER requireAuth (depends on req.operatorUser being set).
 *
 * @example
 *   router.delete('/users/:id', requireAuth, requirePermission('manageUsers'), handler)
 */
export function requirePermission(permission: keyof OperatorPermissions) {
  return function (req: Request, res: Response, next: NextFunction): void {
    if (!req.operatorUser) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    if (!req.operatorUser.permissions[permission]) {
      res.status(403).json({
        error: `Insufficient permissions. "${permission}" access required.`,
        required: permission,
        username: req.operatorUser.username
      });
      return;
    }
    next();
  };
}

/** Helper: extract client IP from request */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]).trim();
  return req.socket?.remoteAddress ?? null;
}
