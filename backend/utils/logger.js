/**
 * logger.js — Winston structured logger
 * Replaces all console.log / console.error calls in production.
 *
 * Log levels: error > warn > info > http > debug
 * In production: writes to files + console (no stack traces in responses)
 * In development: colorized console output
 */

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir   = path.join(__dirname, "../logs");

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// ── Custom readable format for development ────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${stack || message}${extra}`;
  })
);

// ── JSON format for production (structured, parseable) ────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

const isProduction = process.env.NODE_ENV === "production";

const transports = [];

// Console transport — always on
transports.push(
  new winston.transports.Console({
    format: isProduction ? prodFormat : devFormat,
    silent: false,
  })
);

// File transports — production only, skip if filesystem is read-only (e.g. Railway)
if (isProduction) {
  try {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, "error.log"),
        level: "error",
        format: prodFormat,
        maxsize: 10 * 1024 * 1024, // 10 MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, "combined.log"),
        format: prodFormat,
        maxsize: 20 * 1024 * 1024, // 20 MB
        maxFiles: 10,
      })
    );
  } catch {
    // Filesystem not writable (Railway, etc.) — console-only logging
  }
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  transports,
  exitOnError: false,
});

// ── Morgan stream integration ─────────────────────────────
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

export default logger;
