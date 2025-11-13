import { NextFunction, Request, Response } from 'express';
import jwt, { SignOptions, Secret } from 'jsonwebtoken';

type UserRole = 'user' | 'admin';

interface AuthPayload {
  userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

// Security: Require JWT_SECRET to be set in production
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET must be set in production environment');
}

const JWT_SECRET: Secret = (process.env.JWT_SECRET ?? 'dev-secret-only-for-development-CHANGE-IN-PRODUCTION') as Secret;
const JWT_EXPIRES_IN: NonNullable<SignOptions['expiresIn']> = (process.env.JWT_EXPIRES_IN ?? '4h') as NonNullable<SignOptions['expiresIn']>;

// Warn if using default secret in development
if (!process.env.JWT_SECRET && process.env.NODE_ENV !== 'production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET environment variable for security.');
}

const normalizeHeaderToken = (token: string | undefined | null) => {
  if (!token) {
    return null;
  }

  const trimmed = token.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }

  return trimmed || null;
};

const extractToken = (req: Request): string | null => {
  const headerToken = normalizeHeaderToken(req.get('authorization'));
  if (headerToken) {
    return headerToken;
  }

  const queryToken = normalizeHeaderToken(req.query?.token as string | undefined);
  if (queryToken) {
    return queryToken;
  }

  if (req.headers.cookie) {
    const tokenCookie = req.headers.cookie
      .split(';')
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.startsWith('authToken='));
    if (tokenCookie) {
      const [, value] = tokenCookie.split('=');
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
};

export const issueAuthToken = (payload: AuthPayload): string => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const authenticate = (allowedRoles?: UserRole | UserRole[]) => {
  const roleSet = Array.isArray(allowedRoles)
    ? new Set<UserRole>(allowedRoles)
    : allowedRoles
      ? new Set<UserRole>([allowedRoles])
      : null;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = extractToken(req);
      if (!token) {
        return res.status(401).json({ error: 'Não autenticado. Faça login novamente.' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
      if (!decoded?.userId || !decoded?.role) {
        return res.status(401).json({ error: 'Token inválido.' });
      }

      if (roleSet && !roleSet.has(decoded.role)) {
        return res.status(403).json({ error: 'Permissões insuficientes.' });
      }

      req.auth = decoded;
      return next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token inválido';
      console.warn('[auth] Token verification failed', message);
      return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
  };
};

export const ensureSelfOrAdmin = (req: Request, res: Response, targetUserId: string) => {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: 'Não autenticado.' });
    return false;
  }

  if (auth.userId === targetUserId || auth.role === 'admin') {
    return true;
  }

  res.status(403).json({ error: 'Acesso negado.' });
  return false;
};

export const ensureAdminSelf = (req: Request, res: Response, adminId: string) => {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: 'Não autenticado.' });
    return false;
  }

  if (auth.role !== 'admin' || auth.userId !== adminId) {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores autorizados.' });
    return false;
  }

  return true;
};
