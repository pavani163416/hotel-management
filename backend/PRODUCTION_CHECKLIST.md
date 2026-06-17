# AthithiGriha Backend — Production Checklist

## ✅ Completed Hardening

### 🔐 Secrets & Environment
- [x] `.env` in `.gitignore` — never committed
- [x] `.env.example` updated with all required variables and instructions
- [x] Server refuses to start if `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` are missing
- [x] No hardcoded fallback secrets anywhere in the codebase

### 🔑 Authentication
- [x] Admin login now uses **JWT** (replaces base64 token)
- [x] JWT expires in **8 hours** (was never expiring)
- [x] Manager JWT expires in **8 hours** (was 7 days)
- [x] All passwords hashed with **bcrypt (cost 12)**
- [x] Plaintext manager passwords auto-upgraded to bcrypt on first login
- [x] Admin routes protected with `verifyAdminToken + requireAdmin` middleware
- [x] Manager routes protected with `verifyManagerToken + scopeToHotel`

### 🛡 Security Middleware
- [x] **helmet** — secure HTTP headers (XSS, clickjacking, MIME sniffing, etc.)
- [x] **express-mongo-sanitize** — NoSQL injection prevention
- [x] **CORS** — localhost origins removed in production (`NODE_ENV=production`)
- [x] **Rate limiting** — auth endpoints: 10 attempts/15min in prod
- [x] **Payload limit** — 5MB max (was 20MB)

### 📊 Logging
- [x] **Winston** structured logger replaces all `console.log` / `console.error`
- [x] Log levels: error, warn, info, http, debug
- [x] Production: writes to `logs/error.log` + `logs/combined.log` (10MB rotation)
- [x] Auth events, API errors, manager actions all logged
- [x] Stack traces never exposed in production responses

### 📡 Socket.IO
- [x] JWT authentication on socket connections
- [x] Graceful handling of invalid/expired tokens
- [x] Connection/disconnection events logged

### 🗄 Database
- [x] Retry logic — 5 attempts with 5s delay before exit
- [x] Graceful shutdown — closes DB connections on SIGTERM/SIGINT
- [x] Added indexes: `Booking.hotelName`, `Booking.status+createdAt`, `Manager.assignedHotelId`, `Manager.isActive`

### 📈 API
- [x] `GET /api/bookings` — paginated (`?page=1&limit=20`)
- [x] `occupancyRate` — dynamic calculation (was hardcoded `84.2`)
- [x] Admin routes all require authentication

### 📦 Dependencies
- [x] All versions pinned (no `^` caret ranges)
- [x] `engines.node >= 18.0.0` specified
- [x] Added: `helmet`, `winston`, `express-mongo-sanitize`

### 🚀 Deployment
- [x] `start` script: `node server.js`
- [x] `PORT` from environment variable
- [x] Unhandled rejections and uncaught exceptions logged + handled
- [x] Graceful shutdown on SIGTERM (Render/Railway sends this)

---

## 🔧 Before Going Live

### 1. Rotate all credentials
The `.env` file was previously committed. Rotate these immediately:
- MongoDB Atlas password
- Cloudinary API key + secret
- Resend API key
- Generate a new JWT secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### 2. Set NODE_ENV=production
```
NODE_ENV=production
```

### 3. Set CLIENT_ORIGIN to your actual domains
```
CLIENT_ORIGIN=https://your-frontend.com,https://your-admin.com
```

### 4. Hash the admin password
```bash
node -e "const b=require('bcryptjs'); b.hash('yourpassword',12).then(console.log)"
```
Then set `ADMIN_PASSWORD=<the hash>` in your deployment environment.

### 5. MongoDB Atlas — Network Access
Add your deployment platform's IP or use `0.0.0.0/0` for cloud platforms.

---

## 🚀 Deployment Platforms

### Render
1. New Web Service → connect repo
2. Build command: `npm install`
3. Start command: `node server.js`
4. Add all env vars in the Environment tab
5. Set `NODE_ENV=production`

### Railway
1. New Project → Deploy from GitHub
2. Add env vars in Variables tab
3. Railway auto-detects `start` script

### Environment Variables Required
| Variable | Description |
|---|---|
| `PORT` | Server port (platform sets this) |
| `NODE_ENV` | `production` |
| `MONGO_URI` | MongoDB Atlas connection string |
| `MONGO_ADMIN_URI` | Admin DB connection string |
| `JWT_SECRET` | 64+ char random string |
| `ADMIN_EMAIL` | Super admin email |
| `ADMIN_PASSWORD` | Bcrypt hash of admin password |
| `CLIENT_ORIGIN` | Comma-separated allowed origins |
| `RESEND_API_KEY` | Email service key |
| `CLOUDINARY_CLOUD_NAME` | Image upload |
| `CLOUDINARY_API_KEY` | Image upload |
| `CLOUDINARY_API_SECRET` | Image upload |
