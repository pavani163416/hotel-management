/**
 * Math-based CAPTCHA utility for LuxeStay
 * ------------------------------------------
 * Generates a simple arithmetic challenge (e.g., "What is 7 + 4?") and stores
 * the expected answer keyed by a UUID. On verification, the key is consumed
 * (one-time use) and the challenge expires after 10 minutes.
 *
 * Storage priority:
 *  1. Redis (if available)
 *  2. In-memory Map with TTL cleanup (dev / Redis-less environments)
 */

import { randomUUID } from "crypto";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import logger from "./logger.js";

const CAPTCHA_TTL_SECONDS = 600; // 10 minutes

// ── In-memory fallback ────────────────────────────────────────────────────────
const memStore = new Map(); // captchaId → { answer, expiresAt }

const memSet = (id, answer) => {
  memStore.set(id, { answer, expiresAt: Date.now() + CAPTCHA_TTL_SECONDS * 1000 });
};

const memGet = (id) => {
  const entry = memStore.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { memStore.delete(id); return null; }
  return entry.answer;
};

const memDel = (id) => memStore.delete(id);

// Periodic cleanup of expired entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of memStore) {
    if (now > v.expiresAt) memStore.delete(k);
  }
}, 5 * 60 * 1000);

// ── CAPTCHA generation ────────────────────────────────────────────────────────
const OPS = ["+", "-", "*"];

/**
 * Generate a math CAPTCHA challenge.
 * @returns {{ captchaId: string, challenge: string }}
 */
export const generateCaptcha = async () => {
  const op  = OPS[Math.floor(Math.random() * OPS.length)];
  const a   = Math.floor(Math.random() * 10) + 1; // 1–10
  const b   = Math.floor(Math.random() * 10) + 1;

  let answer;
  let question;
  if (op === "+") { answer = a + b; question = `${a} + ${b}`; }
  else if (op === "-") {
    // Ensure non-negative result
    const [big, small] = a >= b ? [a, b] : [b, a];
    answer = big - small; question = `${big} - ${small}`;
  } else {
    // Multiplication: keep numbers small so it's quick to solve
    const x = Math.floor(Math.random() * 5) + 1;
    const y = Math.floor(Math.random() * 5) + 1;
    answer = x * y; question = `${x} × ${y}`;
  }

  const captchaId = randomUUID();
  const challenge = `What is ${question}?`;

  if (isRedisReady()) {
    try {
      await getRedisClient().set(`captcha:${captchaId}`, String(answer), { EX: CAPTCHA_TTL_SECONDS });
    } catch (err) {
      logger.warn("CAPTCHA Redis set failed, using memory fallback", { error: err.message });
      memSet(captchaId, String(answer));
    }
  } else {
    memSet(captchaId, String(answer));
  }

  return { captchaId, challenge };
};

/**
 * Verify a CAPTCHA answer (one-time use — key is deleted after verification).
 * @param {string} captchaId
 * @param {string|number} providedAnswer
 * @returns {Promise<boolean>}
 */
export const verifyCaptcha = async (captchaId, providedAnswer) => {
  // Validate inputs - both must be provided
  if (!captchaId) {
    logger.warn("CAPTCHA verification failed: missing captchaId");
    return false;
  }
  if (providedAnswer === undefined || providedAnswer === null || String(providedAnswer).trim() === "") {
    logger.warn("CAPTCHA verification failed: missing or empty answer", { captchaId });
    return false;
  }

  let stored = null;

  if (isRedisReady()) {
    try {
      stored = await getRedisClient().get(`captcha:${captchaId}`);
      // Delete the CAPTCHA immediately after retrieval (one-time use)
      if (stored !== null) {
        await getRedisClient().del(`captcha:${captchaId}`);
      }
    } catch (err) {
      logger.warn("CAPTCHA Redis get failed, falling back to memory", { error: err.message, captchaId });
      stored = memGet(captchaId);
      if (stored !== null) memDel(captchaId);
    }
  } else {
    stored = memGet(captchaId);
    if (stored !== null) memDel(captchaId);
  }

  // If CAPTCHA not found (expired or invalid ID)
  if (stored === null) {
    logger.warn("CAPTCHA verification failed: not found or expired", { captchaId });
    return false;
  }

  // Trim and compare answers
  const normalizedStored = String(stored).trim().toLowerCase();
  const normalizedProvided = String(providedAnswer).trim().toLowerCase();
  
  const isValid = normalizedStored === normalizedProvided;
  
  if (!isValid) {
    logger.warn("CAPTCHA verification failed: incorrect answer", {
      captchaId,
      providedLength: normalizedProvided.length,
    });
  }
  
  return isValid;
};
