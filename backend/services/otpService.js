import crypto from "crypto";
import { cacheSet, cacheGet, cacheDel } from "../cache/redisCache.js";

const OTP_PREFIX = "otp";

const normalizeKey = (email) => String(email || "").toLowerCase().trim();
const hashValue = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

export const generateOtpCode = (length = 6) => {
  const digits = "0123456789";
  let code = "";
  while (code.length < length) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
};

const buildOtpKey = (purpose, email) => {
  const normalized = normalizeKey(email);
  return `${OTP_PREFIX}:${purpose}:${normalized}`;
};

export const issueOtpToken = async ({ email, purpose = "verification", ttlSeconds = 300 }) => {
  if (!email) throw new Error("Email is required for OTP issuance.");
  const code = generateOtpCode(6);
  const token = crypto.randomBytes(24).toString("hex");
  const key = buildOtpKey(purpose, email);

  await cacheSet(key, {
    code,
    token: hashValue(token),
    createdAt: new Date().toISOString(),
    purpose,
    email: normalizeKey(email),
  }, ttlSeconds);

  return { code, token };
};

export const issueResetToken = async ({ email, ttlSeconds = 3600 }) => {
  if (!email) throw new Error("Email is required for reset token issuance.");
  const token = crypto.randomBytes(24).toString("hex");
  const key = buildOtpKey("reset", email);

  await cacheSet(key, {
    token: hashValue(token),
    createdAt: new Date().toISOString(),
    purpose: "reset",
    email: normalizeKey(email),
  }, ttlSeconds);

  return token;
};

export const verifyOtpCode = async ({ email, purpose = "verification", code }) => {
  if (!email || !code) return false;
  const key = buildOtpKey(purpose, email);
  const entry = await cacheGet(key);
  if (!entry || !entry.code || entry.code !== String(code).trim()) return false;
  await cacheDel(key);
  return true;
};

export const verifyResetToken = async ({ email, token }) => {
  if (!email || !token) return false;
  const key = buildOtpKey("reset", email);
  const entry = await cacheGet(key);
  if (!entry || !entry.token) return false;
  const matched = entry.token === hashValue(token);
  if (matched) await cacheDel(key);
  return matched;
};
