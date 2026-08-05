import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, UserRole } from '../types.js';
import { prisma } from '../lib/prisma.js';
import { JWT_SECRET } from '../lib/env.js';

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
}

/**
 * Middleware to verify JWT token
 */
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as unknown as JWTPayload;
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Middleware to check if user has required role
 * Super Admin role is hidden from users but enforced server-side
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Middleware to check if user is Super Admin (hidden from UI)
 */
export const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Super Administrator access required' });
  }

  next();
};

/**
 * Middleware to check if user is Admin or Super Admin
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ error: 'Administrator access required' });
  }

  next();
};

/**
 * Middleware for read-only routes an Admin, Super Admin, or the
 * read-only Viewer role may all access. Never use this on a route that
 * mutates anything — Viewer must stay strictly read-only; use
 * requireAdmin for every write route instead.
 */
export const requireAdminOrViewer = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN && req.user.role !== UserRole.VIEWER) {
    return res.status(403).json({ error: 'Administrator access required' });
  }

  next();
};

/**
 * Middleware to check if user is Super Admin, or an Admin the Super
 * Admin has flagged isDeletionReviewer — gates the Deletion Report.
 */
export const requireDeletionReviewer = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.user.role !== UserRole.SUPER_ADMIN && !(req.user.role === UserRole.ADMIN && req.user.isDeletionReviewer)) {
    return res.status(403).json({ error: 'Deletion Report access required' });
  }

  next();
};

/**
 * Middleware for rate limiting to prevent abuse
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Keys by the authenticated user when a valid token is present, so
 * multiple people sharing one IP (a school computer lab, an office) each
 * get their own budget instead of collectively draining one. Falls back
 * to IP for anonymous requests (login, register, public listings) — this
 * doesn't need to be as strict as verifyToken since a bad/expired token
 * just falls back to IP-keying here; the route's own verifyToken still
 * enforces real auth separately.
 */
const rateLimitIdentifier = (req: Request): string => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as unknown as JWTPayload;
      return `user:${payload.sub}`;
    } catch {
      // Falls through to IP-keying below.
    }
  }
  return `ip:${req.ip || 'unknown'}`;
};

export const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = rateLimitIdentifier(req);
    const now = Date.now();

    const record = requestCounts.get(identifier);

    if (record && now < record.resetTime) {
      if (record.count >= maxRequests) {
        return res.status(429).json({ error: 'Too many requests' });
      }
      record.count++;
    } else {
      requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
};

/**
 * Tighter rate limit specifically for login, on top of the generic
 * global one — keyed by IP+email so it throttles repeated guesses
 * against one account without also punishing everyone else sharing an
 * IP (e.g. a school/office network). Doesn't stop an attacker who
 * rotates both IP and target email, but closes the much more likely
 * single-account brute-force case the generic 100/15min limit allows.
 */
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

export const loginRateLimit = (maxAttempts = 8, windowMs = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const identifier = `${req.ip || 'unknown'}:${email}`;
    const now = Date.now();

    const record = loginAttempts.get(identifier);
    if (record && now < record.resetTime) {
      if (record.count >= maxAttempts) {
        return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
      }
      record.count++;
    } else {
      loginAttempts.set(identifier, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
};

/**
 * Middleware for request logging and audit trail.
 * Persists to the audit_logs table — best-effort (a logging failure must
 * never break the actual request), so failures are caught and logged to
 * the console rather than surfaced to the client.
 */
export const auditLog = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const original = res.json;

  res.json = function (data: any) {
    if (req.user && (req.method !== 'GET' || req.path.includes('/api/admin'))) {
      // req.path is relative to this router's mount point (Express strips
      // the `/api` prefix while routing through app.use('/api', routes)),
      // so for PUT /api/scholarships/1 this sees '/scholarships/1'.
      const segments = req.path.split('/').filter(Boolean); // ['applications', '5', ...]
      const entityType = segments[0] ?? null;
      const pathId = segments[1] ? parseInt(segments[1], 10) : NaN;
      const responseId = data && typeof data === 'object' && typeof data.id === 'number' ? data.id : NaN;
      const entityId = Number.isFinite(pathId) ? pathId : Number.isFinite(responseId) ? responseId : null;

      prisma.auditLog
        .create({
          data: {
            userId: req.user.sub,
            action: `${req.method} ${req.path}`,
            entityType,
            entityId,
            newValues: data !== undefined ? JSON.parse(JSON.stringify(data)) : undefined,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        })
        .catch((error) => console.error('[AuditLog] Failed to persist audit entry', error));
    }

    return original.call(this, data);
  };

  next();
};

/**
 * Global error handler
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validation error', details: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large — the maximum upload size is 5MB.' : err.message;
    return res.status(400).json({ error: message });
  }
  if (err.message?.includes('Only PDF, JPG, and PNG')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
};

/**
 * Not found handler
 */
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
};
