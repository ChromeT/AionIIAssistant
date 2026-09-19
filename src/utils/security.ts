/**
 * security.ts — Security utilities for AionIIAssistant
 *
 * Uses the Web Crypto API (built-in to all modern browsers & Expo Web).
 * Zero external dependencies required.
 *
 * Features:
 *  - Password hashing (SHA-256 + random salt)
 *  - Password verification
 *  - Input sanitization (username)
 *  - Input validation (username + password)
 *  - Client-side login rate limiting
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert ArrayBuffer to hex string */
const bufToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

/** Generate a cryptographically random hex salt (16 bytes = 32 hex chars) */
export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return bufToHex(array.buffer);
};

// ─── Password Hashing (SHA-256 + salt) ───────────────────────────────────────

/**
 * Hash a password using SHA-256 with a random salt.
 * Returns an object { hash, salt } to be stored separately in the DB.
 *
 * Usage (register):
 *   const { hash, salt } = await hashPassword(passwordEntered);
 *   store { passwordHash: hash, passwordSalt: salt } in Firestore
 */
export const hashPassword = async (
  password: string,
  salt?: string
): Promise<{ hash: string; salt: string }> => {
  const usedSalt = salt ?? generateSalt();
  // Combine password + salt before hashing
  const combined = `${usedSalt}:${password}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return { hash: bufToHex(hashBuffer), salt: usedSalt };
};

/**
 * Verify a plaintext password against a stored hash + salt.
 * Returns true if password matches.
 *
 * Usage (login):
 *   const valid = await verifyPassword(passwordEntered, profile.passwordHash, profile.passwordSalt);
 */
export const verifyPassword = async (
  plaintext: string,
  storedHash: string,
  storedSalt: string
): Promise<boolean> => {
  try {
    const { hash } = await hashPassword(plaintext, storedSalt);
    return hash === storedHash;
  } catch {
    return false;
  }
};

// ─── Input Sanitization ───────────────────────────────────────────────────────

/**
 * Sanitize a username input:
 * - Trim whitespace
 * - Lowercase
 * - Remove any character that is not: alphanumeric, underscore, hyphen, or dot
 * - Truncate to 30 characters max
 */
export const sanitizeUsername = (input: string): string =>
  input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.\-]/g, '')
    .substring(0, 30);

// ─── Input Validation ─────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate username rules:
 * - 3–30 characters
 * - Only alphanumeric, underscore, hyphen, dot
 * - Must not start or end with a dot or hyphen
 */
export const validateUsername = (username: string): ValidationResult => {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username minimal 3 karakter.' };
  }
  if (username.length > 30) {
    return { valid: false, error: 'Username maksimal 30 karakter.' };
  }
  if (!/^[a-z0-9][a-z0-9_.\-]*[a-z0-9]$/.test(username) && username.length > 1) {
    return { valid: false, error: 'Username hanya boleh huruf, angka, titik, underscore, atau hyphen.' };
  }
  return { valid: true };
};

/**
 * Validate password rules:
 * - 6–128 characters
 */
export const validatePassword = (password: string): ValidationResult => {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password minimal 6 karakter.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password terlalu panjang (maks 128 karakter).' };
  }
  return { valid: true };
};

// ─── Rate Limiter ─────────────────────────────────────────────────────────────

interface RateLimitState {
  attempts: number;
  windowStart: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;      // 1 minute sliding window
const LOCKOUT_MS = 120_000;    // 2 minute lockout after max attempts

const rateLimitStore: Record<string, RateLimitState> = {};

/**
 * Check if a key (e.g., username) is rate-limited.
 * Returns { allowed: true } or { allowed: false, retryAfterSec: number, error: string }
 */
export const checkRateLimit = (
  key: string
): { allowed: boolean; error?: string; retryAfterSec?: number } => {
  const now = Date.now();
  const normalizedKey = key.trim().toLowerCase();

  if (!rateLimitStore[normalizedKey]) {
    rateLimitStore[normalizedKey] = { attempts: 0, windowStart: now, lockedUntil: null };
  }

  const state = rateLimitStore[normalizedKey];

  // Check if currently locked out
  if (state.lockedUntil && now < state.lockedUntil) {
    const retryAfterSec = Math.ceil((state.lockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfterSec,
      error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSec} detik.`,
    };
  }

  // Reset window if expired
  if (now - state.windowStart > WINDOW_MS) {
    state.attempts = 0;
    state.windowStart = now;
    state.lockedUntil = null;
  }

  state.attempts++;

  if (state.attempts > MAX_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_MS;
    const retryAfterSec = Math.ceil(LOCKOUT_MS / 1000);
    return {
      allowed: false,
      retryAfterSec,
      error: `Terlalu banyak percobaan. Akun sementara dikunci selama ${retryAfterSec} detik.`,
    };
  }

  return { allowed: true };
};

/**
 * Record a successful login — resets rate limit state for the key.
 */
export const resetRateLimit = (key: string): void => {
  const normalizedKey = key.trim().toLowerCase();
  delete rateLimitStore[normalizedKey];
};
