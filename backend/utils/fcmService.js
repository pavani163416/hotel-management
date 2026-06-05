/**
 * FCM Push Notification Service
 * ─────────────────────────────
 * Initialises Firebase Admin SDK once and exposes a single
 * `sendFcmNotification(tokens, title, body, data)` helper.
 *
 * Required env vars:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (the raw PEM string — newlines as \n)
 */
import admin from "firebase-admin";
import logger from "./logger.js";

let initialised = false;

function initFirebase() {
  if (initialised || admin.apps.length > 0) return;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    logger.warn("FCM: Firebase Admin SDK not configured — FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY missing. Push notifications to mobile will be skipped.");
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });

  initialised = true;
  logger.info("FCM: Firebase Admin SDK initialised");
}

initFirebase();

/**
 * Send a push notification to one or more FCM registration tokens.
 *
 * @param {string|string[]} tokens  - Single token or array of tokens
 * @param {string}          title   - Notification title
 * @param {string}          body    - Notification body
 * @param {object}          [data]  - Optional key-value data payload
 * @returns {Promise<{successCount: number, failureCount: number}>}
 */
export async function sendFcmNotification(tokens, title, body, data = {}) {
  if (!admin.apps.length) {
    logger.debug("FCM: SDK not initialised, skipping push notification");
    return { successCount: 0, failureCount: 0 };
  }

  const tokenList = Array.isArray(tokens) ? tokens : [tokens];
  const validTokens = tokenList.filter(Boolean);
  if (validTokens.length === 0) return { successCount: 0, failureCount: 0 };

  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        notification: {
          channelId: "high_importance_channel",
          priority: "high",
          sound: "notification",
        },
        priority: "high",
      },
      apns: {
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    if (validTokens.length === 1) {
      await admin.messaging().send({ ...message, token: validTokens[0] });
      return { successCount: 1, failureCount: 0 };
    }

    const response = await admin.messaging().sendEachForMulticast({
      ...message,
      tokens: validTokens,
    });

    logger.info(`FCM multicast: ${response.successCount} sent, ${response.failureCount} failed`);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    logger.error("FCM send error", { error: err.message });
    return { successCount: 0, failureCount: 1 };
  }
}
