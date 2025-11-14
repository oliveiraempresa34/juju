/**
 * Security middleware - headers, sanitization, etc.
 * SECURITY FIX: Enhanced sanitization and validation
 */
import { Request, Response, NextFunction } from 'express';

// SECURITY: Maximum input sizes to prevent DoS attacks
const MAX_STRING_LENGTH = 10000;
const MAX_ARRAY_LENGTH = 1000;
const MAX_OBJECT_DEPTH = 10;

/**
 * Add security headers to responses
 * SECURITY FIX: Enhanced CSP and added additional security headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // SECURITY FIX: Enhanced Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' wss: ws:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "upgrade-insecure-requests;"
  );

  // SECURITY FIX: Additional security headers
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // SECURITY FIX: Remove server identification
  res.removeHeader('X-Powered-By');

  next();
}

/**
 * SECURITY FIX: Enhanced sanitization to prevent XSS and injection attacks
 * Uses more robust regex patterns and validates input size
 */
export function sanitizeInput(input: unknown, depth = 0): unknown {
  // SECURITY: Prevent deep recursion attacks
  if (depth > MAX_OBJECT_DEPTH) {
    throw new Error('Input object too deep');
  }

  if (typeof input === 'string') {
    // SECURITY: Validate string length
    if (input.length > MAX_STRING_LENGTH) {
      throw new Error(`Input string too long (max: ${MAX_STRING_LENGTH})`);
    }

    // SECURITY FIX: More comprehensive XSS prevention
    let sanitized = input;

    // Remove all script tags (case insensitive, multiline)
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gis, '');

    // Remove iframe tags
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gis, '');

    // Remove object and embed tags
    sanitized = sanitized.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gis, '');

    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gis, '');

    // Remove data: protocol (except for images which are allowed in CSP)
    sanitized = sanitized.replace(/data:(?!image\/)/gis, '');

    // Remove vbscript: protocol
    sanitized = sanitized.replace(/vbscript:/gis, '');

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\bon\w+\s*=/gis, '');

    // Remove style attributes with expressions
    sanitized = sanitized.replace(/style\s*=\s*['"]*.*?expression\s*\(/gis, '');

    // Remove meta refresh
    sanitized = sanitized.replace(/<meta\b[^>]*http-equiv\s*=\s*['"]*refresh['"]*[^>]*>/gis, '');

    return sanitized.trim();
  }

  if (Array.isArray(input)) {
    // SECURITY: Validate array length
    if (input.length > MAX_ARRAY_LENGTH) {
      throw new Error(`Input array too long (max: ${MAX_ARRAY_LENGTH})`);
    }
    return input.map(item => sanitizeInput(item, depth + 1));
  }

  if (input !== null && typeof input === 'object') {
    const sanitized: Record<string, unknown> = {};
    const entries = Object.entries(input);

    // SECURITY: Validate object size
    if (entries.length > MAX_ARRAY_LENGTH) {
      throw new Error(`Input object has too many keys (max: ${MAX_ARRAY_LENGTH})`);
    }

    for (const [key, value] of entries) {
      // SECURITY: Sanitize keys as well
      const sanitizedKey = sanitizeInput(key, depth + 1);
      if (typeof sanitizedKey === 'string') {
        sanitized[sanitizedKey] = sanitizeInput(value, depth + 1);
      }
    }
    return sanitized;
  }

  return input;
}

/**
 * Middleware to sanitize request body
 * SECURITY FIX: Added error handling for malicious inputs
 */
export function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body) {
    try {
      req.body = sanitizeInput(req.body);
      next();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid input';
      console.warn('[security] Input validation failed:', message);
      return res.status(400).json({ error: 'Invalid input data' });
    }
  } else {
    next();
  }
}

/**
 * SECURITY FIX: Validate request body size
 */
export function validateBodySize(maxSize: number = 1024 * 1024) { // 1MB default
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return res.status(413).json({ error: 'Request body too large' });
    }
    next();
  };
}
