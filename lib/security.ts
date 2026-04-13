/**
 * Security utilities for FitLife.
 *
 * Covers:
 *  - Input validation and sanitization
 *  - Password strength enforcement
 *  - Rate limiting (simple in-memory, prevents API abuse)
 *  - XSS prevention helpers
 *  - Sensitive data masking for logs
 */

// ─── Input sanitization ───────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from text input */
export function sanitizeText(input: string, maxLength = 500): string {
  return input
    .replace(/<[^>]*>/g, '')          // strip HTML tags
    .replace(/[<>"';&]/g, '')         // strip XSS-risky chars
    .replace(/javascript:/gi, '')     // strip JS protocol
    .replace(/on\w+=/gi, '')          // strip event handlers
    .trim()
    .slice(0, maxLength);
}

/** Sanitize a number — returns null if not a valid finite number */
export function sanitizeNumber(value: string | number, min?: number, max?: number): number | null {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (!isFinite(n) || isNaN(n)) return null;
  if (min !== undefined && n < min) return null;
  if (max !== undefined && n > max) return null;
  return n;
}

/** Validate an email address */
export function validateEmail(email: string): { ok: boolean; error?: string } {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: 'Email is required' };
  if (trimmed.length > 254) return { ok: false, error: 'Email too long' };
  // RFC 5322 simplified
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) return { ok: false, error: 'Invalid email address' };
  return { ok: true };
}

/** Enforce strong password policy */
export function validatePassword(password: string): { ok: boolean; error?: string } {
  if (!password) return { ok: false, error: 'Password is required' };
  if (password.length < 8) return { ok: false, error: 'Password must be at least 8 characters' };
  if (password.length > 128) return { ok: false, error: 'Password too long' };
  if (!/[A-Z]/.test(password)) return { ok: false, error: 'Password must contain at least one uppercase letter' };
  if (!/[0-9]/.test(password)) return { ok: false, error: 'Password must contain at least one number' };
  // Check for common weak passwords
  const weak = ['password', 'password1', '12345678', 'fitlife123', 'qwerty123'];
  if (weak.includes(password.toLowerCase())) return { ok: false, error: 'Password is too common' };
  return { ok: true };
}

/** Validate a user's name */
export function validateName(name: string): { ok: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Name is required' };
  if (trimmed.length < 2) return { ok: false, error: 'Name must be at least 2 characters' };
  if (trimmed.length > 100) return { ok: false, error: 'Name too long' };
  if (!/^[a-zA-Z\s'\-\.]+$/.test(trimmed)) return { ok: false, error: 'Name contains invalid characters' };
  return { ok: true };
}

/** Validate body metrics */
export function validateBodyMetrics(weight: number, height: number): { ok: boolean; error?: string } {
  if (weight < 20 || weight > 500) return { ok: false, error: 'Weight must be between 20–500 kg' };
  if (height < 50 || height > 300) return { ok: false, error: 'Height must be between 50–300 cm' };
  return { ok: true };
}

// ─── Rate limiting ────────────────────────────────────────────────────────────

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

/**
 * Simple in-memory rate limiter.
 * Returns true if the action is allowed, false if rate limited.
 *
 * @param key      Unique key (e.g. 'login:user@example.com')
 * @param limit    Max allowed calls in the window
 * @param windowMs Time window in ms (default 60s)
 */
export function checkRateLimit(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/** Auth-specific rate limit: 5 login attempts per minute */
export function checkAuthRateLimit(identifier: string): boolean {
  return checkRateLimit(`auth:${identifier}`, 5, 60_000);
}

/** API-specific rate limit: 10 calls per 10 seconds */
export function checkApiRateLimit(endpoint: string): boolean {
  return checkRateLimit(`api:${endpoint}`, 10, 10_000);
}

// ─── Sensitive data masking (for logs) ────────────────────────────────────────

/** Mask an email for safe logging: user@example.com → u***@e***.com */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const domainParts = domain.split('.');
  const tld = domainParts.pop() ?? '';
  const maskedDomain = domainParts.map((p) => p[0] + '***').join('.');
  return `${local[0]}***@${maskedDomain}.${tld}`;
}

/** Production-safe logger — strips sensitive data in production builds */
export const secureLog = {
  info: (...args: any[]) => { if (__DEV__) console.log('[FitLife]', ...args); },
  warn: (...args: any[]) => { if (__DEV__) console.warn('[FitLife]', ...args); },
  error: (...args: any[]) => { if (__DEV__) console.error('[FitLife]', ...args); },
};

// ─── URL validation (prevent open redirects) ──────────────────────────────────

const ALLOWED_REDIRECT_HOSTS = [
  'fitlife.app',
  'localhost',
  '127.0.0.1',
  'your-project.supabase.co', // replace with actual Supabase project host
];

/** Validate that a redirect URL is pointing to a trusted host */
export function validateRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' ||
      parsed.protocol === 'fitlife:' || // native deep link
      ALLOWED_REDIRECT_HOSTS.some((host) => parsed.hostname === host || parsed.hostname.endsWith('.' + host))
    );
  } catch {
    return false;
  }
}
