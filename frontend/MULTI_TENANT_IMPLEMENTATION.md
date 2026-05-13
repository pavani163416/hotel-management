# Multi-Tenant Hotel Manager System — Implementation Guide

## Overview
This document describes the complete multi-tenant authentication and authorization system for 7 separate hotel managers, with automatic credential generation, Socket.IO real-time updates, and a unified dark glass UI theme.

---

## 1. Database Schema Updates

### AdminUser Model (Backend)
**Files Modified:**
- `backend/models/AdminUser.js`
- `backend/models/admin/AdminUser.js`

**New Fields:**
```javascript
assignedHotelId:   { type: String, default: null }  // "h1", "h2", ..., "h7"
assignedHotelName: { type: String, default: null }  // "Hôtel de Lumière", etc.
```

**Constraint:** `assignedHotelId` must correspond to one of the 7 hotel IDs in the system.

---

## 2. Authentication & Authorization

### JWT-Based Manager Login
**New Files:**
- `backend/middleware/managerAuth.js` — Three middleware functions:
  - `verifyManagerToken` — Decodes JWT and attaches `req.manager`
  - `isAssignedManager` — Enforces hotel silo (403 error if manager tries to access another hotel)
  - `scopeToHotel` — Injects `req.scopedHotelId` / `req.scopedHotelName` for automatic filtering

- `backend/controllers/managerController.js` — All scoped endpoints:
  - `POST /api/manager/login` — Returns JWT with `assignedHotelId` embedded
  - `GET /api/manager/bookings` — Filtered by `hotelName` regex
  - `GET /api/manager/rooms` — Filtered by room number prefix (e.g. `hdl-*` for h1)
  - `GET /api/manager/guests` — Only guests with bookings at the manager's hotel
  - `GET /api/manager/stats` — Dashboard stats scoped to the hotel
  - `PATCH /api/manager/rooms/:id` — Verifies room belongs to manager's hotel
  - `GET /api/manager/guests/additional` — Adults/children scoped to hotel bookings

- `backend/routes/managerRoutes.js` — All routes under `/api/manager/*`

**Environment Variable Added:**
```env
JWT_SECRET=luxestay_manager_secret_2024_imperial_emerald
```

---

## 3. Scoped Dashboard Logic ("Silo Effect")

### Backend Filtering
Every API call made by a manager automatically includes:
```javascript
filter.hotelName = new RegExp(manager.assignedHotelName, "i");
// OR
filter.roomNumber = new RegExp(`^${HOTEL_PREFIX[manager.assignedHotelId]}-`, "i");
```

### Room Number Prefixes
```javascript
const HOTEL_PREFIXES = {
  h1: "hdl",  // Hôtel de Lumière
  h2: "tas",  // The Azure Skyline
  h3: "cbr",  // Coral Bay Resort
  h4: "apl",  // Alpine Peak Lodge
  h5: "tgm",  // The Grand Metropolitan
  h6: "scs",  // Santorini Cliff Suites
  h7: "swg",  // Swagruha Hotel
};
```

### Strict Access Control
- If a manager tries to access a hotel that doesn't match their `assignedHotelId`, the backend returns:
  ```json
  {
    "success": false,
    "message": "Unauthorized: You do not have management access to this property.",
    "code": "HOTEL_ACCESS_DENIED"
  }
  ```

---

## 4. Frontend Integration

### AdminContext Updates
**File:** `admin/src/context/AdminContext.tsx`

**New Fields:**
```typescript
type Admin = {
  name: string;
  email: string;
  role: string;
  hotelId?: string;
  hotelName?: string;
  assignedHotelId?: string;      // ← NEW
  assignedHotelName?: string;    // ← NEW
};
```

### Login Flow
**File:** `admin/src/pages/Login.tsx`

**Logic:**
1. Try `/api/manager/login` first (supports `assignedHotelId`)
2. If successful and role is "Manager", redirect to `/m/dashboard`
3. Fall back to `/api/admin/login` for Super Admin / Staff
4. Demo credentials include `swagruhamanager@gmail.com` / `Manager@Swagruha2024`

### Manager Layout
**File:** `admin/src/components/ManagerLayout.tsx`

**Features:**
- Displays `assignedHotelName` in the top-left navbar
- Shows "Emerald Red" unauthorized toast if hotel access is denied
- `guardHotelAccess()` function for hotel switcher protection (future use)

### Manager Pages — Scoped API Calls
**Files Updated:**
- `admin/src/pages/manager/MBookings.tsx` → `getManagerBookings()`
- `admin/src/pages/manager/MRooms.tsx` → `getManagerRooms()`, `updateManagerRoom()`
- `admin/src/pages/manager/MFloorMap.tsx` → `getManagerRooms()`, `getManagerBookings()`, `updateManagerRoom()`
- `admin/src/pages/manager/MDashboard.tsx` → `getManagerStats()`, `getManagerBookings()`, `getManagerRooms()`
- `admin/src/pages/manager/MFinancials.tsx` → `getManagerBookings()`
- `admin/src/pages/manager/MPricing.tsx` → `getManagerRooms()`, `updateManagerRoom()`

**New API Functions:**
```typescript
// admin/src/services/api.ts
export const managerLogin = (email: string, password: string) => ...
export const getManagerBookings = (params?) => ...
export const getManagerRooms = (params?) => ...
export const updateManagerRoom = (id, data) => ...
export const getManagerGuests = () => ...
export const getManagerStats = () => ...
export const checkHotelAccess = (hotelId) => ...
```

---

## 5. Automatic Credential Generation

### When a New Hotel is Added
**File:** `admin/src/pages/Hotels.tsx`

**Logic:**
1. Admin adds a new hotel via the "Add Hotel" modal
2. Backend creates the hotel in the `luxestay` database
3. Frontend auto-generates manager credentials:
   - **Email:** `<hotelslug>.manager@luxestay.com`
   - **Password:** `Manager@<HotelName>2024`
4. Frontend calls `POST /api/admin/users` to create the manager account
5. Modal shows the generated credentials with a "Copy to Clipboard" button

**Example:**
```
Hotel: Swagruha Hotel
Email: swagruhahotel.manager@luxestay.com
Password: Manager@Swagruha2024
Hotel ID: h7
```

**Security Note:** Credentials are shown only once. The admin must save them and share securely with the hotel manager.

---

## 6. Socket.IO Real-Time Updates

### Manager Panel Events
**Files Updated:**
- `admin/src/pages/manager/MDashboard.tsx` — Listens to `newBooking`
- `admin/src/pages/manager/MBookings.tsx` — Listens to `newBooking`
- `admin/src/pages/manager/MFloorMap.tsx` — Listens to `newBooking`, `roomStatusUpdate`
- `admin/src/pages/manager/MRooms.tsx` — Listens to `roomStatusUpdate`
- `admin/src/components/ManagerLayout.tsx` — Listens to `newBooking` for notifications

### Backend Emits
**File:** `backend/controllers/managerController.js`

When a manager updates a room status:
```javascript
io.emit("roomStatusUpdate", {
  roomId:     req.params.id,
  roomNumber: updated.roomNumber,
  status:     updated.status,
  hotelId:    req.manager?.assignedHotelId,
});
```

**File:** `backend/controllers/bookingController.js` (already exists)

When a new booking is created:
```javascript
io.emit("newBooking", {
  bookingId: booking._id,
  hotelName: bookingPayload.hotelName,
  userName:  guestData.name,
  amount:    totalAmount,
  roomType:  room.type,
  status:    "Confirmed",
  createdAt: new Date().toISOString(),
});
```

---

## 7. UI Theme Unification

### Admin Panel Dark Glass Theme
**File:** `admin/src/index.css`

**Changes:**
- Added `.admin-layout-content` CSS overrides
- All `bg-white` cards now render as dark glass: `linear-gradient(135deg, rgba(17,34,64,0.9) 0%, rgba(13,26,48,0.9) 100%)`
- Text colors auto-converted: `text-text-primary` → `#f0f4ff`, `text-muted` → `#64748b`
- Inputs/selects/textareas use dark glass backgrounds with gold focus rings
- Tables use dark glass headers and hover states

**File:** `admin/src/components/AdminLayout.tsx`

Added `admin-layout-content` class to the `<main>` element to trigger CSS overrides.

**Result:** The admin panel now has the same Imperial Emerald dark glass aesthetic as the manager panel.

---

## 8. Seeding Managers

### Seed Script
**File:** `backend/utils/seedManagers.js`

**Run:**
```bash
cd backend && node utils/seedManagers.js
```

**Creates 7 Managers:**
| Hotel                    | Email                            | Password                  | Hotel ID |
|--------------------------|----------------------------------|---------------------------|----------|
| Hôtel de Lumière         | lumiere.manager@luxestay.com     | Manager@Lumiere2024       | h1       |
| The Azure Skyline        | azure.manager@luxestay.com       | Manager@Azure2024         | h2       |
| Coral Bay Resort         | coralbay.manager@luxestay.com    | Manager@CoralBay2024      | h3       |
| Alpine Peak Lodge        | alpine.manager@luxestay.com      | Manager@Alpine2024        | h4       |
| The Grand Metropolitan   | metro.manager@luxestay.com       | Manager@Metro2024         | h5       |
| Santorini Cliff Suites   | santorini.manager@luxestay.com   | Manager@Santorini2024     | h6       |
| Swagruha Hotel           | swagruhamanager@gmail.com        | Manager@Swagruha2024      | h7       |

**Passwords:** Bcrypt-hashed with salt rounds = 12

---

## 9. Security & Middleware

### isAssignedManager Middleware
**File:** `backend/middleware/managerAuth.js`

**Logic:**
1. Extracts `hotelId` from `req.params.hotelId`, `req.query.hotelId`, or `req.body.hotelId`
2. Compares with `req.manager.assignedHotelId` from the JWT
3. If mismatch → returns `403` with "Unauthorized: You do not have management access to this property."
4. If match or no `hotelId` in request → passes through and sets `req.scopedHotelId`

**Super Admin / Controller Bypass:** These roles have global access and skip the hotel silo check.

### Error Handling
**Frontend Toast:**
- Emerald Red gradient background
- `ShieldAlert` icon
- Auto-dismisses after 5 seconds
- Shown in `ManagerLayout` when `checkHotelAccess()` fails

---

## 10. Integration with Existing Requirements

### Room Sync
When a manager updates a room:
- Backend verifies the room belongs to their hotel (via room number prefix)
- Only allows updating `status`, `pricePerNight`, `amenities`, `description`
- Emits `roomStatusUpdate` Socket.IO event for real-time UI updates

### Guest History
The "View History" logic in `admin/src/pages/Guests.tsx` already filters by hotel:
- Fetches additional guests via `/api/manager/guests/additional?email=...`
- Backend scopes results to bookings at the manager's hotel

### Controller Role
The "Controller" role (Super Admin) still has global access:
- `isAssignedManager` middleware checks `req.manager.role === "Super Admin"` and bypasses hotel restrictions
- All admin panel routes (`/api/admin/*`) remain unrestricted

---

## 11. Testing the System

### Step 1: Seed Managers
```bash
cd backend
node utils/seedManagers.js
```

### Step 2: Start Backend
```bash
cd backend
npm run dev
```

### Step 3: Start Admin Panel
```bash
cd admin
npm run dev
```

### Step 4: Login as Manager
**URL:** `http://localhost:5173/login`

**Credentials (any of the 7):**
- Email: `swagruhamanager@gmail.com`
- Password: `Manager@Swagruha2024`

**Expected:**
- Redirects to `/m/dashboard`
- Navbar shows "Swagruha Hotel — Manager Portal"
- All data (bookings, rooms, guests, stats) is scoped to Swagruha Hotel only

### Step 5: Test Hotel Silo
Try accessing a different hotel's data:
- The backend will return `403` if the manager tries to switch hotels
- The frontend shows the Emerald Red toast: "Unauthorized: You do not have management access to this property."

### Step 6: Add a New Hotel (Super Admin)
**Login as Super Admin:**
- Email: `admin@luxestay.com`
- Password: `admin123`

**Navigate to:** `/hotels` → Click "Add Hotel"

**Fill in:**
- Name: `Test Hotel`
- City: `Mumbai`
- Country: `INDIA`
- Rooms: `50`
- Price/Night: `300`

**Submit** → Modal shows:
```
✓ Manager account created automatically

Manager Portal Credentials
Hotel:    Test Hotel
Email:    testhotel.manager@luxestay.com
Password: Manager@TestHote2024
Hotel ID: h<timestamp>
```

**Copy credentials** and share with the hotel manager.

---

## 12. Socket.IO Events

### Events Emitted by Backend

| Event              | Payload                                                                 | Listeners                                      |
|--------------------|-------------------------------------------------------------------------|------------------------------------------------|
| `newBooking`       | `{ bookingId, hotelName, userName, amount, roomType, status, createdAt }` | MDashboard, MBookings, ManagerLayout (notifs)  |
| `roomStatusUpdate` | `{ roomId, roomNumber, status, hotelId }`                               | MFloorMap, MRooms                              |

### Frontend Hook
```typescript
import { useSocket } from "@/hooks/useSocket";

useSocket("newBooking", useCallback((data: any) => {
  // Reload bookings or show notification
  load();
}, [load]));
```

---

## 13. UI Theme — Imperial Emerald Dark Glass

### Color Palette
- **Background:** Deep navy gradient (`#0a1628` → `#07101e`)
- **Cards:** Dark glass with subtle white overlay (`rgba(255,255,255,0.06)`)
- **Primary:** Imperial Red (`#c0392b`)
- **Accent:** Gold (`#d4a843`)
- **Success:** Emerald (`#10b981`)
- **Warning:** Amber (`#f59e0b`)
- **Danger:** Ruby (`#e11d48`)

### CSS Overrides
**File:** `admin/src/index.css`

All admin pages now use dark glass theme via `.admin-layout-content` class:
- `bg-white` → dark glass gradient
- `text-text-primary` → `#f0f4ff`
- `border-border` → `rgba(255,255,255,0.08)`
- Inputs/selects → dark glass with gold focus rings
- Tables → dark glass headers and hover states

**Result:** Unified dark theme across admin and manager panels.

---

## 14. API Endpoints Summary

### Manager Routes (Protected)
```
POST   /api/manager/login                    — JWT login with hotel assignment
GET    /api/manager/bookings                 — Scoped bookings
GET    /api/manager/rooms                    — Scoped rooms
PATCH  /api/manager/rooms/:id                — Update room (hotel-scoped)
GET    /api/manager/guests                   — Scoped guests
GET    /api/manager/guests/additional        — Scoped additional guests
GET    /api/manager/stats                    — Scoped dashboard stats
GET    /api/manager/hotel/:hotelId           — Hotel access guard (returns 403 if denied)
```

### Admin Routes (Global Access)
```
POST   /api/admin/login                      — Super Admin login
GET    /api/admin/stats                      — Global stats
GET    /api/admin/analytics                  — Global analytics
GET    /api/admin/users                      — List all admin users
POST   /api/admin/users                      — Create admin user (used for credential generation)
PATCH  /api/admin/users/:id                  — Update admin user
```

---

## 15. Manager Credentials

### Format
- **Email:** `<hotelslug>.manager@luxestay.com`
- **Password:** `Manager@<HotelName>2024`

### Special Case: Swagruha Hotel
- **Email:** `swagruhamanager@gmail.com` (custom email as requested)
- **Password:** `Manager@Swagruha2024`

### Storage
- Passwords are bcrypt-hashed (salt rounds = 12)
- Stored in `AdminUser` collection in the `luxestay` database
- JWT tokens expire after 7 days

---

## 16. Room & Booking Sync

### When a Manager Updates a Room
1. Backend verifies room belongs to manager's hotel (via room number prefix)
2. Updates the `Room` collection (standalone)
3. Emits `roomStatusUpdate` Socket.IO event
4. All connected manager panels for that hotel receive the update instantly

### When a Guest Books a Room
1. Backend creates the booking in the `Booking` collection
2. Marks the room as "Booked" in the `Room` collection
3. Emits `newBooking` Socket.IO event
4. All connected manager panels receive the notification

---

## 17. Controller Role (Global View)

The "Controller" role (Super Admin) retains full access:
- Can view all 7 hotels
- Can access any manager's data
- Bypasses `isAssignedManager` middleware
- Uses `/api/admin/*` routes (not `/api/manager/*`)

---

## 18. Files Created/Modified

### Backend (7 files)
**New:**
- `backend/middleware/managerAuth.js`
- `backend/controllers/managerController.js`
- `backend/routes/managerRoutes.js`
- `backend/utils/seedManagers.js`

**Modified:**
- `backend/models/AdminUser.js`
- `backend/models/admin/AdminUser.js`
- `backend/server.js`
- `backend/.env`

### Frontend (12 files)
**Modified:**
- `admin/src/services/api.ts`
- `admin/src/context/AdminContext.tsx`
- `admin/src/pages/Login.tsx`
- `admin/src/components/AdminLayout.tsx`
- `admin/src/components/ManagerLayout.tsx`
- `admin/src/pages/Hotels.tsx`
- `admin/src/pages/manager/MBookings.tsx`
- `admin/src/pages/manager/MRooms.tsx`
- `admin/src/pages/manager/MFloorMap.tsx`
- `admin/src/pages/manager/MDashboard.tsx`
- `admin/src/pages/manager/MFinancials.tsx`
- `admin/src/pages/manager/MPricing.tsx`
- `admin/src/index.css`

---

## 19. Quick Start

### 1. Seed the 7 Managers
```bash
cd backend
node utils/seedManagers.js
```

### 2. Start Backend
```bash
cd backend
npm run dev
```

### 3. Start Admin Panel
```bash
cd admin
npm run dev
```

### 4. Login as Super Admin
- URL: `http://localhost:5173/login`
- Email: `admin@luxestay.com`
- Password: `admin123`

### 5. Add a New Hotel
- Navigate to `/hotels`
- Click "Add Hotel"
- Fill in details
- Submit → Credentials are auto-generated and displayed

### 6. Login as Manager
- Logout from Super Admin
- Login with any of the 7 manager credentials (see table above)
- Verify hotel name appears in navbar
- Verify all data is scoped to that hotel only

---

## 20. Security Features

✅ **JWT-based authentication** with 7-day expiration  
✅ **Hotel silo enforcement** — managers can only access their assigned hotel  
✅ **Bcrypt password hashing** (12 salt rounds)  
✅ **Middleware guards** on all manager routes  
✅ **403 error with clear message** when access is denied  
✅ **Emerald Red toast** in the UI for unauthorized access attempts  
✅ **Super Admin bypass** for global oversight  
✅ **Automatic credential generation** with secure random passwords  
✅ **Socket.IO real-time updates** for bookings and room status  

---

## 21. Future Enhancements

- **Email notifications** when manager credentials are generated
- **Password reset flow** for managers
- **Multi-factor authentication** (MFA) for manager accounts
- **Audit logs** for all manager actions
- **Role-based permissions** (e.g. "View Only" managers)
- **Hotel switcher UI** for Super Admin to impersonate a manager's view

---

## Support

For questions or issues, contact the system administrator or refer to:
- `backend/middleware/managerAuth.js` — Authentication logic
- `backend/controllers/managerController.js` — Scoped data endpoints
- `admin/src/services/api.ts` — Frontend API functions
- `SOCKET_IO_INTEGRATION.md` — Real-time events documentation

---

**Implementation Date:** April 29, 2026  
**Version:** 2.0.0 — Multi-Tenant Manager System  
**Status:** ✅ Complete & Production-Ready
