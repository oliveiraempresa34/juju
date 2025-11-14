/**
 * Rate limiters for different endpoints
 * SECURITY FIX: Enhanced rate limiting with better key generation and headers
 */
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

/**
 * SECURITY FIX: Custom key generator that combines IP and user info
 * Prevents distributed attacks and provides better tracking
 */
const generateKey = (req: Request): string => {
  // Use forwarded IP if behind proxy (Cloudflare, Nginx, etc.)
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || (req.headers['x-real-ip'] as string)
    || req.ip
    || req.socket.remoteAddress
    || 'unknown';

  // Include user ID if authenticated for better tracking
  const userId = (req as any).auth?.userId || '';

  return `${ip}-${userId}`;
};

/**
 * SECURITY FIX: Enhanced error handler to prevent information leakage
 */
const handler = (_req: Request, res: any) => {
  return res.status(429).json({
    error: 'Too many requests',
    message: 'Please wait before trying again',
    retryAfter: res.getHeader('Retry-After')
  });
};

// SECURITY FIX: Auth endpoints - strict limit with enhanced tracking
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too (prevent brute force)
});

// SECURITY FIX: Failed login attempts - even stricter
export const loginFailureLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10, // 10 failed attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
  skipSuccessfulRequests: true, // Only count failed attempts
});

// Wallet/transaction endpoints - moderate limit
export const walletLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
});

// Balance check endpoints - relaxed limit
export const balanceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
});

// General API limiter - very relaxed
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
});

// Affiliate validation - moderate limit (prevent enumeration)
export const affiliateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
});

// SECURITY FIX: Strict limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler,
});
