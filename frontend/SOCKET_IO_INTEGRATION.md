# Socket.IO Real-Time Integration Guide

## ✅ Implementation Complete

Real-time functionality has been successfully integrated into your Hotel Booking Platform using Socket.IO.

---

## 📦 What Was Installed

### Backend
- `socket.io` - Server-side Socket.IO library

### Admin Panel
- `socket.io-client` - Client-side Socket.IO library

---

## 🔧 Backend Implementation

### 1. Socket.IO Server Setup (`backend/server.js`)

```javascript
import { Server as SocketIOServer } from "socket.io";

// Create Socket.IO server attached to existing HTTP server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Connection handling
io.on("connection", (socket) => {
  console.log(`🔗  [Socket.IO] Client connected: ${socket.id}`);
  socket.on("disconnect", () => {
    console.log(`🔌  [Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Store io globally for controllers
app.set("io", io);
```

**Key Features:**
- ✅ Attached to existing HTTP server (no separate port)
- ✅ CORS configured for frontend URLs
- ✅ Stored globally via `app.set("io", io)` for controller access
- ✅ Logs connections/disconnections

---

### 2. Booking Event Emission (`backend/controllers/bookingController.js`)

After a successful booking is created:

```javascript
// Emit Socket.IO event for real-time admin dashboard update
const io = req.app.get("io");
if (io) {
  io.emit("newBooking", {
    bookingId: booking._id,
    hotelName: bookingPayload.hotelName,
    userName: guestData.name,
    amount: totalAmount,
    roomType: room.type,
    status: "Confirmed",
    createdAt: new Date().toISOString(),
  });
}
```

**Event Name:** `newBooking`

**Payload:**
```typescript
{
  bookingId: string;
  hotelName: string;
  userName: string;
  amount: number;
  roomType: string;
  status: string;
  createdAt: string;
}
```

---

## 🎨 Frontend Implementation (Admin Panel)

### 1. Socket Singleton (`admin/src/services/socket.ts`)

```typescript
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000";

const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  transports: ["websocket", "polling"],
});

export default socket;
```

**Features:**
- ✅ Single socket instance (no multiple connections)
- ✅ Auto-reconnect with 5 attempts
- ✅ Reads backend URL from environment variable
- ✅ Fallback to WebSocket + polling transports

---

### 2. useSocket Hook (`admin/src/hooks/useSocket.ts`)

```typescript
import { useEffect } from "react";
import socket from "@/services/socket";

export function useSocket<T = unknown>(
  event: string,
  handler: (data: T) => void
) {
  useEffect(() => {
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
```

**Features:**
- ✅ Automatically subscribes to events
- ✅ Cleans up listeners on unmount
- ✅ Type-safe with generics

---

### 3. BookingsContext Updates (`admin/src/context/BookingsContext.tsx`)

Added real-time alert state:

```typescript
export type NewBookingAlert = {
  bookingId: string;
  hotelName: string;
  userName: string;
  amount: number;
  roomType: string;
  status: string;
  createdAt: string;
};

type BookingsCtx = {
  bookings: Booking[];
  addBooking: (b: Omit<Booking, "id" | "createdAt">) => Booking;
  updateStatus: (id: string, status: Booking["status"]) => void;
  liveAlerts: NewBookingAlert[];
  pushLiveAlert: (alert: NewBookingAlert) => void;
  clearLiveAlerts: () => void;
};
```

**New Methods:**
- `pushLiveAlert(alert)` - Add a new live booking alert
- `clearLiveAlerts()` - Clear all live alerts
- `liveAlerts` - Array of recent live booking alerts (max 20)

---

### 4. Topbar Component (`admin/src/components/Topbar.tsx`)

**Real-Time Features:**

1. **Socket.IO Listener:**
```typescript
const handleNewBooking = useCallback((data: NewBookingAlert) => {
  pushLiveAlert(data);
  setToast(data);
  setTimeout(() => setToast(null), 5000);
}, [pushLiveAlert]);

useSocket<NewBookingAlert>("newBooking", handleNewBooking);
```

2. **Live Notification Badge:**
- Shows count of live bookings
- Animates with pulse effect
- Updates instantly when new booking arrives

3. **Toast Popup:**
- Appears bottom-right corner
- Shows booking details (guest name, hotel, amount)
- Auto-dismisses after 5 seconds
- Click to view booking details

4. **Notification Dropdown:**
- Separate "Live Bookings" section at top
- Shows up to 3 most recent live bookings
- "Clear" button to dismiss live alerts
- Regular bookings shown below

---

## 🚀 How to Test

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

You should see:
```
🚀  LuxeStay API running on http://localhost:5000
⚡  Socket.IO ready
🔌  WebSocket server ready at ws://localhost/ws
```

### Step 2: Start Admin Panel
```bash
cd admin
npm run dev
```

Admin panel runs on: `http://localhost:5173`

### Step 3: Create a Test Booking

**Option A: Using Postman/Thunder Client**

```http
POST http://localhost:5000/api/bookings
Content-Type: application/json

{
  "roomId": "101",
  "guest": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "city": "New York"
  },
  "checkIn": "2026-05-01",
  "checkOut": "2026-05-05",
  "pricePerNight": 250,
  "subtotal": 1000,
  "taxes": 100,
  "discount": 0,
  "totalAmount": 1100,
  "paymentMethod": "card",
  "hotelName": "LuxeStay Grand"
}
```

**Option B: Using curl**

```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "101",
    "guest": {
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567890"
    },
    "checkIn": "2026-05-10",
    "checkOut": "2026-05-15",
    "pricePerNight": 300,
    "subtotal": 1500,
    "taxes": 150,
    "discount": 0,
    "totalAmount": 1650,
    "paymentMethod": "upi",
    "hotelName": "The Urban Boutique"
  }'
```

### Step 4: Watch Admin Panel Update

**What You Should See:**

1. **Notification Bell:**
   - Badge appears with count (e.g., "1")
   - Badge pulses with green animation

2. **Toast Popup (Bottom-Right):**
   - Green header: "⚡ New Booking"
   - Guest name, hotel, room type
   - Total amount
   - "View Booking →" button
   - Auto-dismisses after 5 seconds

3. **Notification Dropdown:**
   - Click bell icon
   - See "⚡ Live Bookings" section at top
   - Shows guest name, hotel, amount
   - "New Booking ✓" status

4. **Browser Console:**
   - Open DevTools (F12)
   - Check Console tab
   - Should see: `🔗  [Socket.IO] Client connected: <socket-id>`

---

## 🔍 Debugging

### Backend Logs

When a booking is created, you should see:
```
[Booking] Looking up room: "101", price: 250
[Booking] Room found: 101 (Available)
✅ [Email] Sent to john@example.com
```

### Frontend Console

Open browser DevTools (F12) → Console:

```javascript
// Check socket connection status
socket.connected  // should be true

// Manually listen for events (for testing)
socket.on("newBooking", (data) => {
  console.log("New booking received:", data);
});

// Manually emit test event (from backend only)
io.emit("newBooking", {
  bookingId: "test123",
  hotelName: "Test Hotel",
  userName: "Test User",
  amount: 999,
  roomType: "Deluxe Suite",
  status: "Confirmed",
  createdAt: new Date().toISOString()
});
```

### Common Issues

**1. Socket not connecting:**
- Check `VITE_API_URL` in `admin/.env`
- Ensure backend is running on correct port
- Check CORS configuration in `backend/server.js`

**2. Events not received:**
- Verify `io.emit("newBooking", ...)` is called in booking controller
- Check browser console for connection errors
- Ensure `useSocket` hook is properly imported

**3. Multiple connections:**
- Only import `socket` from `admin/src/services/socket.ts`
- Don't create new `io()` instances elsewhere

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER CREATES BOOKING                  │
│                  (Frontend → Backend API)                │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           Backend: bookingController.js                  │
│  1. Validate room availability                           │
│  2. Create booking in MongoDB                            │
│  3. Send response to user                                │
│  4. Emit Socket.IO event: "newBooking"                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              Socket.IO Server (server.js)                │
│  io.emit("newBooking", { bookingId, userName, ... })    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Admin Panel: Topbar.tsx (useSocket hook)         │
│  1. Receives "newBooking" event                          │
│  2. Adds to liveAlerts array                             │
│  3. Shows toast popup                                    │
│  4. Updates notification badge                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Best Practices Implemented

✅ **Single Socket Instance** - One connection per admin panel  
✅ **Automatic Cleanup** - Listeners removed on unmount  
✅ **Type Safety** - TypeScript types for all events  
✅ **Error Handling** - Graceful fallback if Socket.IO fails  
✅ **No Blocking** - Events emitted after response sent  
✅ **Modular Code** - Separate files for socket, hook, context  
✅ **Production Ready** - Environment variables, CORS, reconnection  

---

## 🔄 Existing WebSocket vs Socket.IO

Your project now has **both**:

1. **WebSocket (`ws`)** - Used for visitor tracking
   - Path: `/ws`
   - Handles: `visitor_update`, `booking_update`
   - Used by: `backend/routes/wsRoutes.js`

2. **Socket.IO** - Used for admin real-time notifications
   - Path: `/socket.io/` (default)
   - Handles: `newBooking`
   - Used by: `admin/src/components/Topbar.tsx`

Both run on the same HTTP server without conflicts.

---

## 🚀 Optional Enhancements

### 1. Add Sound Notification

```typescript
// admin/src/components/Topbar.tsx
const playNotificationSound = () => {
  const audio = new Audio("/notification.mp3");
  audio.play().catch(() => {});
};

const handleNewBooking = useCallback((data: NewBookingAlert) => {
  pushLiveAlert(data);
  setToast(data);
  playNotificationSound();
  setTimeout(() => setToast(null), 5000);
}, [pushLiveAlert]);
```

### 2. Update Dashboard Stats in Real-Time

```typescript
// admin/src/pages/Dashboard.tsx
import { useSocket } from "@/hooks/useSocket";

const handleNewBooking = useCallback((data: NewBookingAlert) => {
  setStats((prev) => ({
    ...prev,
    totalBookings: prev.totalBookings + 1,
    totalRevenue: prev.totalRevenue + data.amount,
  }));
}, []);

useSocket<NewBookingAlert>("newBooking", handleNewBooking);
```

### 3. Show Live Booking Count on Dashboard

```typescript
// admin/src/pages/Dashboard.tsx
const { liveAlerts } = useBookings();

<StatsCard
  title="Live Bookings"
  value={liveAlerts.length}
  icon={<Bell />}
  trend={liveAlerts.length > 0 ? "up" : "neutral"}
/>
```

---

## 📝 Summary

✅ Socket.IO installed and configured  
✅ Backend emits `newBooking` event after successful booking  
✅ Admin panel receives events instantly  
✅ Toast popup shows new bookings  
✅ Notification badge updates in real-time  
✅ No page refresh required  
✅ Clean, modular, production-ready code  

**Test it now:** Create a booking via API and watch the admin panel update instantly! 🎉
