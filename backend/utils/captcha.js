/**
 * Math-based CAPTCHA utility for AthithiGriha
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
import svgCaptcha from "svg-captcha";

export const generateCaptcha = async () => {
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0o1iIlLqQpP', 
    noise: 1, 
    color: false,
    background: '#f8f9fa',
    width: 200,
    height: 60,
    fontSize: 55,
  });

  const captchaId = randomUUID();
  let challenge = captcha.data; // The SVG markup
  
  // flutter_svg on mobile cannot parse percentage widths inside SVGs.
  challenge = challenge.replace(/width="100%"/g, 'width="200"').replace(/height="100%"/g, 'height="60"');
  
  const answer = captcha.text;

  if (isRedisReady()) {
    try {
      await getRedisClient().set(`captcha:${captchaId}`, answer, { EX: CAPTCHA_TTL_SECONDS });
    } catch (err) {
      logger.warn("CAPTCHA Redis set failed, using memory fallback", { error: err.message });
      memSet(captchaId, answer);
    }
  } else {
    memSet(captchaId, answer);
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

  // Trim and compare answers (case-insensitive)
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

/**
 * Verifies either a Cloudflare Turnstile / Google reCAPTCHA token,
 * or falls back to verifying an SVG math-based CAPTCHA.
 *
 * @param {object} body - Request body containing captchaId/captchaAnswer or captchaToken
 * @returns {Promise<boolean>}
 */
export const verifyCaptchaOrToken = async (body) => {
  if (!body) return false;

  const { captchaId, captchaAnswer, captchaToken } = body;

  // 1. Verify Cloudflare Turnstile or Google reCAPTCHA if token is provided
  if (captchaToken) {
    // Cloudflare Turnstile
    if (process.env.TURNSTILE_SECRET_KEY) {
      try {
        const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${encodeURIComponent(process.env.TURNSTILE_SECRET_KEY)}&response=${encodeURIComponent(captchaToken)}`,
        });
        const data = await response.json();
        if (data?.success) return true;
        logger.warn("Turnstile verification failed", { error: data["error-codes"] });
      } catch (err) {
        logger.error("Turnstile verification error", { error: err.message });
      }
    }

    // Google reCAPTCHA
    if (process.env.RECAPTCHA_SECRET_KEY) {
      try {
        const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${encodeURIComponent(process.env.RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(captchaToken)}`,
        });
        const data = await response.json();
        if (data?.success) return true;
        logger.warn("reCAPTCHA verification failed", { error: data["error-codes"] });
      } catch (err) {
        logger.error("reCAPTCHA verification error", { error: err.message });
      }
    }
  }

  // 2. Fallback to math SVG CAPTCHA (keeps mobile/Flutter compatibility intact)
  if (captchaId && captchaAnswer) {
    return await verifyCaptcha(captchaId, captchaAnswer);
  }

  return false;
};

