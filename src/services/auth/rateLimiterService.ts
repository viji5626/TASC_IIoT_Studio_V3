import fs from 'fs';
import path from 'path';

export interface RateLimitAttempt {
  count: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  lockedUntil?: number;
}

export interface SecurityAuditEntry {
  id: string;
  timestamp: string;
  eventType: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'ACCOUNT_LOCKOUT' | 'SUBNET_THROTTLE';
  username: string;
  ip: string;
  userAgent?: string;
  details?: string;
}

export interface SecurityLockoutStore {
  userLockouts: Record<string, RateLimitAttempt>;
  ipRateLimits: Record<string, RateLimitAttempt>;
  auditTrail: SecurityAuditEntry[];
}

const LOCKOUT_FILE = path.join(process.cwd(), 'data', 'security_lockouts.json');

// Configuration
export const RATE_LIMIT_CONFIG = {
  USER_MAX_FAILURES: 5,
  USER_LOCKOUT_MS: 5 * 60 * 1000, // 5 minutes
  USER_WINDOW_MS: 15 * 60 * 1000, // 15 minutes window
  IP_MAX_ATTEMPTS: 30, // 30 attempts per IP window (protects against distributed floods)
  IP_WINDOW_MS: 60 * 1000, // 1 minute
  IP_LOCKOUT_MS: 2 * 60 * 1000, // 2 minutes
  MAX_AUDIT_LOGS: 200
};

// Memory cache with disk persistence
let storeCache: SecurityLockoutStore = {
  userLockouts: {},
  ipRateLimits: {},
  auditTrail: []
};

function ensureLockoutFile(): void {
  try {
    const dir = path.dirname(LOCKOUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(LOCKOUT_FILE)) {
      const data = fs.readFileSync(LOCKOUT_FILE, 'utf-8');
      storeCache = JSON.parse(data);
      if (!storeCache.userLockouts) storeCache.userLockouts = {};
      if (!storeCache.ipRateLimits) storeCache.ipRateLimits = {};
      if (!storeCache.auditTrail) storeCache.auditTrail = [];
    } else {
      saveStore();
    }
  } catch (err) {
    console.warn('[RateLimiter] Error initializing lockouts file:', err);
  }
}

function saveStore(): void {
  try {
    const dir = path.dirname(LOCKOUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCKOUT_FILE, JSON.stringify(storeCache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[RateLimiter] Error writing lockouts file:', err);
  }
}

// Initialize immediately
ensureLockoutFile();

/**
 * Extract real client IP taking proxies (Cloudflare, Nginx) into account
 */
export function extractClientIp(req: any): string {
  if (!req) return '127.0.0.1';
  const cfIp = req.headers?.['cf-connecting-ip'];
  if (cfIp) return Array.isArray(cfIp) ? cfIp[0] : cfIp;

  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
    return ips[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Check if a user or IP is currently rate-limited/locked out
 */
export function checkRateLimit(username: string, ip: string): { 
  allowed: boolean; 
  reason?: 'USER_LOCKED' | 'IP_THROTTLED';
  retryAfterSeconds?: number;
  remainingAttempts?: number;
} {
  const now = Date.now();
  const cleanUser = (username || '').toLowerCase().trim();

  // 1. Check User Lockout
  if (cleanUser && storeCache.userLockouts[cleanUser]) {
    const userRec = storeCache.userLockouts[cleanUser];
    if (userRec.lockedUntil && userRec.lockedUntil > now) {
      const retryAfter = Math.ceil((userRec.lockedUntil - now) / 1000);
      return {
        allowed: false,
        reason: 'USER_LOCKED',
        retryAfterSeconds: retryAfter,
        remainingAttempts: 0
      };
    } else if (userRec.lockedUntil && userRec.lockedUntil <= now) {
      // Lockout expired - reset
      delete storeCache.userLockouts[cleanUser];
      saveStore();
    }
  }

  // 2. Check IP Rate Limit
  if (ip && storeCache.ipRateLimits[ip]) {
    const ipRec = storeCache.ipRateLimits[ip];
    if (ipRec.lockedUntil && ipRec.lockedUntil > now) {
      const retryAfter = Math.ceil((ipRec.lockedUntil - now) / 1000);
      return {
        allowed: false,
        reason: 'IP_THROTTLED',
        retryAfterSeconds: retryAfter,
        remainingAttempts: 0
      };
    } else if (ipRec.lockedUntil && ipRec.lockedUntil <= now) {
      delete storeCache.ipRateLimits[ip];
      saveStore();
    }
  }

  const currentFailures = cleanUser && storeCache.userLockouts[cleanUser] ? storeCache.userLockouts[cleanUser].count : 0;
  const remaining = Math.max(0, RATE_LIMIT_CONFIG.USER_MAX_FAILURES - currentFailures);

  return {
    allowed: true,
    remainingAttempts: remaining
  };
}

/**
 * Record a failed login attempt for both username and IP
 */
export function recordFailedAttempt(username: string, ip: string, userAgent?: string): {
  isLocked: boolean;
  lockedUntil?: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const cleanUser = (username || '').toLowerCase().trim();

  let isLocked = false;
  let lockedUntil: number | undefined;

  // 1. Update User Failures
  if (cleanUser) {
    if (!storeCache.userLockouts[cleanUser]) {
      storeCache.userLockouts[cleanUser] = {
        count: 1,
        firstAttemptTime: now,
        lastAttemptTime: now
      };
    } else {
      const rec = storeCache.userLockouts[cleanUser];
      // Reset if window has elapsed
      if (now - rec.firstAttemptTime > RATE_LIMIT_CONFIG.USER_WINDOW_MS) {
        rec.count = 1;
        rec.firstAttemptTime = now;
      } else {
        rec.count += 1;
      }
      rec.lastAttemptTime = now;

      if (rec.count >= RATE_LIMIT_CONFIG.USER_MAX_FAILURES) {
        rec.lockedUntil = now + RATE_LIMIT_CONFIG.USER_LOCKOUT_MS;
        isLocked = true;
        lockedUntil = rec.lockedUntil;

        addAuditLog({
          id: `audit-${now}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(now).toISOString(),
          eventType: 'ACCOUNT_LOCKOUT',
          username: cleanUser,
          ip,
          userAgent,
          details: `Account locked for 5 minutes after ${rec.count} consecutive failures.`
        });
      }
    }
  }

  // 2. Update IP Failures
  if (ip) {
    if (!storeCache.ipRateLimits[ip]) {
      storeCache.ipRateLimits[ip] = {
        count: 1,
        firstAttemptTime: now,
        lastAttemptTime: now
      };
    } else {
      const rec = storeCache.ipRateLimits[ip];
      if (now - rec.firstAttemptTime > RATE_LIMIT_CONFIG.IP_WINDOW_MS) {
        rec.count = 1;
        rec.firstAttemptTime = now;
      } else {
        rec.count += 1;
      }
      rec.lastAttemptTime = now;

      if (rec.count >= RATE_LIMIT_CONFIG.IP_MAX_ATTEMPTS) {
        rec.lockedUntil = now + RATE_LIMIT_CONFIG.IP_LOCKOUT_MS;
        addAuditLog({
          id: `audit-${now}-${Math.random().toString(36).substr(2, 6)}`,
          timestamp: new Date(now).toISOString(),
          eventType: 'SUBNET_THROTTLE',
          username: cleanUser || 'unknown',
          ip,
          userAgent,
          details: `IP throttled for 2 minutes after ${rec.count} requests in 60s window.`
        });
      }
    }
  }

  addAuditLog({
    id: `audit-${now}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date(now).toISOString(),
    eventType: 'LOGIN_FAILURE',
    username: cleanUser || 'unknown',
    ip,
    userAgent,
    details: 'Invalid username or password.'
  });

  saveStore();

  return {
    isLocked,
    lockedUntil,
    retryAfterSeconds: lockedUntil ? Math.ceil((lockedUntil - now) / 1000) : undefined
  };
}

/**
 * Record a successful login - clears user lockout history
 */
export function recordSuccessfulLogin(username: string, ip: string, userAgent?: string): void {
  const now = Date.now();
  const cleanUser = (username || '').toLowerCase().trim();

  if (cleanUser && storeCache.userLockouts[cleanUser]) {
    delete storeCache.userLockouts[cleanUser];
  }

  addAuditLog({
    id: `audit-${now}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date(now).toISOString(),
    eventType: 'LOGIN_SUCCESS',
    username: cleanUser,
    ip,
    userAgent,
    details: 'Authenticated successfully.'
  });

  saveStore();
}

function addAuditLog(entry: SecurityAuditEntry): void {
  storeCache.auditTrail.unshift(entry);
  if (storeCache.auditTrail.length > RATE_LIMIT_CONFIG.MAX_AUDIT_LOGS) {
    storeCache.auditTrail = storeCache.auditTrail.slice(0, RATE_LIMIT_CONFIG.MAX_AUDIT_LOGS);
  }
}

/**
 * Get the recent security audit log trail
 */
export function getSecurityAuditTrail(): SecurityAuditEntry[] {
  ensureLockoutFile();
  return storeCache.auditTrail;
}

/**
 * Unlock a specific user account (e.g. by Engineering Admin)
 */
export function unlockUserAccount(username: string): boolean {
  const cleanUser = (username || '').toLowerCase().trim();
  if (storeCache.userLockouts[cleanUser]) {
    delete storeCache.userLockouts[cleanUser];
    saveStore();
    return true;
  }
  return false;
}
