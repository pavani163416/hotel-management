import session from "express-session";
import RedisStore from "connect-redis";
import { getRedisClient, isRedisReady } from "./redis.js";

export const createSessionMiddleware = () => {
  let store;
  try {
    store = isRedisReady() ? new RedisStore({ client: getRedisClient(), prefix: "luxe:sess:" }) : undefined;
  } catch (error) {
    console.error("Failed to initialize RedisStore for sessions", error);
    store = undefined;
  }

  return session({
    store,
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "default-session-secret",
    name: process.env.SESSION_NAME || "luxe_sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: Number(process.env.SESSION_TTL_MS) || 24 * 60 * 60 * 1000,
    },
  });
};
