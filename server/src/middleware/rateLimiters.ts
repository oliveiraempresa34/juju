/**
 * Rate limiters for different endpoints
 */
import rateLimit from 'express-rate-limit';

// Auth endpoints (login, register) - strict limit
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Wallet/transaction endpoints - moderate limit
export const walletLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per window
  message: 'Too many wallet requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Balance check endpoints - relaxed limit
export const balanceLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  message: 'Too many balance check requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API limiter - very relaxed
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Affiliate validation - moderate limit (prevent enumeration)
export const affiliateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per window
  message: 'Too many affiliate requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
