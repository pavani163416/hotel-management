# WebSocket "Invalid Frame Header" Fix - Complete Solution

## Problem
The application was receiving repeated WebSocket errors:
```
WebSocket connection to 'wss://luxestay-backend-production.up.railway.app/socket.io/?EIO=4&transport=websocket' 
failed: Invalid frame header
```

This prevented real-time features (notifications, bookings, visitor updates) from working in production.

## Root Causes Identified

1. **Missing Socket.IO Configuration**
   - No explicit `path` specification (should be `/socket.io/`)
   - Missing WebSocket upgrade parameters
   - No ping/pong interval configuration
   - No timeout/buffer size limits

2. **CORS Issues**
   - Missing `allowedHeaders` in Socket.IO CORS config
   - No caching headers to prevent HTTP caching of WebSocket upgrades

3. **HTTPS/TLS Handling**
   - Socket.IO paths were being redirected to HTTPS, breaking the upgrade
   - Railway's proxy needs proper trust settings for WebSocket

4. **Client Configuration**
   - Reconnection strategy was too aggressive
   - Missing explicit path in client config
   - No explicit timeout configuration
   - Poor error handling

## Solutions Implemented

### 1. Backend Server Configuration (`backend/server.js`)

#### Socket.IO Initialization - Enhanced
```javascript
const io = new SocketIOServer(httpServer, {
  path: "/socket.io/",                    // ✅ Explicit path
  transports: ["websocket", "polling"],   // ✅ Both transports
  allowUpgrades: true,                    // ✅ Allow HTTP→WS upgrade
  pingInterval: 25000,                    // ✅ Keep-alive ping (25s)
  pingTimeout: 20000,                     // ✅ Wait 20s for pong
  maxHttpBufferSize: 1e6,                 // ✅ 1MB buffer limit
  cors: {
    origin:      allowedOrigins,
    methods:     ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],  // ✅ Added Accept
  },
});
```

#### CORS Headers Middleware - New
```javascript
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});
```
**Purpose**: Prevents proxies from caching WebSocket upgrade responses

#### HTTPS Redirect Fix - Updated
```javascript
if (isProd) {
  app.use((req, res, next) => {
    // Skip redirect for WebSocket/Socket.IO paths
    if (req.path === "/" || req.path === "/api/health" || 
        req.path.startsWith("/socket.io") || req.path.startsWith("/ws")) 
      return next();
    // Only redirect non-WS paths
    if (req.headers["x-forwarded-proto"] && req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
  
  // Trust proxy headers (Railway sets these)
  app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);
}
```
**Purpose**: Allows WebSocket upgrade requests to pass through without HTTPS redirect

### 2. Frontend Client Configuration (`frontend/src/services/socket.ts`)

#### Improved Socket.IO Client
```javascript
const socket = io(BACKEND_URL, {
  path: "/socket.io/",                    // ✅ Explicit path
  transports: ["websocket", "polling"],   // ✅ WebSocket first
  reconnection: true,                     // ✅ Enable reconnection
  reconnectionAttempts: 10,               // ✅ Try 10 times
  reconnectionDelay: 1000,                // ✅ Start at 1s
  reconnectionDelayMax: 5000,             // ✅ Cap at 5s
  randomizationFactor: 0.1,               // ✅ Prevent thundering herd
  timeout: 20000,                         // ✅ 20s connection timeout
  autoConnect: true,                      // ✅ Auto connect
  forceNew: false,                        // ✅ Reuse connection
  multiplex: true,                        // ✅ Allow multiple listeners
});

// Event listeners for debugging
socket.on("connect", () => {
  console.log("[Socket.IO] Connected successfully", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("[Socket.IO] Connection error:", error);
});

socket.on("disconnect", (reason) => {
  console.warn("[Socket.IO] Disconnected:", reason);
});
```

### 3. Admin Panel Socket Configuration (`admin/src/services/socket.ts`)

#### Enhanced Configuration with Better Timeouts
```javascript
const socket = io(BACKEND_URL, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 15,               // ✅ More attempts for admin
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,            // ✅ Allow longer backoff
  randomizationFactor: 0.1,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
  multiplex: true,
  auth: (cb) => {
    const token = localStorage.getItem("luxe_admin_token");
    cb({ token });
  },
});
```

## Configuration Breakdown

### Socket.IO Server Options

| Option | Value | Purpose |
|--------|-------|---------|
| `path` | `/socket.io/` | Explicit path for Socket.IO namespace |
| `transports` | `["websocket", "polling"]` | WebSocket preferred, fallback to polling |
| `allowUpgrades` | `true` | Allow HTTP→WS upgrade |
| `pingInterval` | `25000ms` | Send ping every 25 seconds |
| `pingTimeout` | `20000ms` | Wait 20s for pong, then disconnect |
| `maxHttpBufferSize` | `1e6` (1MB) | Limit message buffer size |
| `cors.credentials` | `true` | Allow cookies with CORS |
| `cors.allowedHeaders` | Include "Accept" | Prevent header rejection |

### Client Reconnection Strategy

| Option | Value | Purpose |
|--------|-------|---------|
| `reconnectionAttempts` | 10 (frontend), 15 (admin) | Retry attempts |
| `reconnectionDelay` | `1000ms` | Initial retry delay |
| `reconnectionDelayMax` | 5000/30000ms | Cap retry backoff |
| `randomizationFactor` | `0.1` | +/- 10% random variation |
| `timeout` | `20000ms` | Give connection 20s to establish |

## How This Fixes the Issue

1. **Invalid Frame Header** - The explicit `path` and `transports` config ensures Socket.IO properly negotiates the WebSocket upgrade
2. **TLS/Proxy Issues** - Bypassing HTTPS redirect for Socket.IO paths allows the upgrade to happen without interference
3. **Connection Failures** - Proper ping/pong keeps idle connections alive; explicit timeout prevents hanging
4. **Production Resilience** - Reconnection strategy with randomization prevents thundering herd when server restarts

## Testing

### Browser Console - Watch Connection
```javascript
// Open DevTools → Console on any page with Socket.IO

// Should see:
// [Socket.IO] Connected successfully <socket-id>
// [Socket.IO] Disconnected: transport close (if manually closed)

// If still seeing errors, check:
// 1. Network tab → filter by "socket.io" → check WebSocket connection
// 2. Console → any [Socket.IO] error messages with full error object
```

### Check Backend Logs
```bash
# Look for Socket.IO connection messages
grep "Socket.IO client connected" backend/logs/*.log
```

### Test Real-time Features
1. **Notifications** - Create booking, check if admin sees real-time notification
2. **Visitor Tracking** - Visit landing page, check if admin sees visitor update
3. **Booking Updates** - Update booking status, check if connected clients get update

## Files Modified

1. **backend/server.js**
   - Lines ~105: Added WebSocket caching headers
   - Lines ~128-137: Fixed HTTPS redirect to skip Socket.IO paths
   - Lines ~197-207: Enhanced Socket.IO initialization

2. **frontend/src/services/socket.ts**
   - Complete rewrite with explicit path, timeouts, and event listeners
   - Added proper error handling

3. **admin/src/services/socket.ts**
   - Enhanced reconnection strategy
   - Better error logging
   - Optimized for admin use case (more attempts, longer timeouts)

## Deployment Notes

### For Railway
- No additional environment variables needed
- Socket.IO upgrade should now work through Railway's proxy
- Trust proxy settings automatically handle `x-forwarded-*` headers

### For Vercel Frontends
- No changes needed on frontend deployment
- Socket.IO will automatically use WSS (secure WebSocket) in production
- VITE_API_URL must point to production backend

## Monitoring

Watch for these in production logs:
- `[Socket.IO] Connected successfully` - Healthy connections
- `[Socket.IO] connect error` - Indicates issues (should be rare)
- `[Socket.IO] Disconnected` - Normal for page navigation

If seeing frequent connection errors, check:
1. Backend server is running (`curl https://backend-url/api/health`)
2. VITE_API_URL environment variable is correct
3. Browser has no Content Security Policy blocking WebSocket
4. Firewall/proxy isn't blocking WSS traffic

## Summary

These fixes ensure Socket.IO can properly upgrade HTTP connections to WebSocket in production environments with proxies/load balancers, while maintaining robust reconnection behavior and proper keep-alive mechanisms.
