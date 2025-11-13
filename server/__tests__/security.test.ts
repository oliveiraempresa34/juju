/**
 * Security middleware tests
 */
import { sanitizeInput } from '../src/middleware/security';

describe('sanitizeInput', () => {
  it('should remove script tags from strings', () => {
    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeInput(input);
    expect(result).toBe('Hello');
  });

  it('should remove iframe tags from strings', () => {
    const input = '<iframe src="evil.com"></iframe>Safe content';
    const result = sanitizeInput(input);
    expect(result).toBe('Safe content');
  });

  it('should remove javascript: protocol', () => {
    const input = 'javascript:alert("xss")';
    const result = sanitizeInput(input);
    expect(result).toBe('alert("xss")');
  });

  it('should remove event handlers', () => {
    const input = '<div onclick="evil()">Click me</div>';
    const result = sanitizeInput(input);
    expect(result).not.toContain('onclick=');
  });

  it('should sanitize nested objects', () => {
    const input = {
      username: '<script>alert("xss")</script>user',
      email: 'test@example.com',
      profile: {
        bio: '<iframe src="evil.com"></iframe>Hello',
      },
    };
    const result = sanitizeInput(input) as Record<string, unknown>;
    expect(result.username).toBe('user');
    expect(result.email).toBe('test@example.com');
    expect((result.profile as Record<string, unknown>).bio).toBe('Hello');
  });

  it('should sanitize arrays', () => {
    const input = ['<script>xss</script>clean', 'safe', '<iframe>bad</iframe>'];
    const result = sanitizeInput(input) as string[];
    expect(result[0]).toBe('clean');
    expect(result[1]).toBe('safe');
    expect(result[2]).toBe('');
  });

  it('should handle non-string primitives', () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(true)).toBe(true);
    expect(sanitizeInput(null)).toBe(null);
  });
});
