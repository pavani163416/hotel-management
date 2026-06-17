# Quick Start Guide — Multi-Tenant Manager System

## 🚀 Get Started in 3 Steps

### Step 1: Seed the 7 Hotel Managers
```bash
cd backend
node utils/seedManagers.js
```

**Output:**
```
🌱  Seeding hotel managers...

  ✅  Created: lumiere.manager@athithigriha.com → Hôtel de Lumière
  ✅  Created: azure.manager@athithigriha.com → The Azure Skyline
  ✅  Created: coralbay.manager@athithigriha.com → Coral Bay Resort
  ✅  Created: alpine.manager@athithigriha.com → Alpine Peak Lodge
  ✅  Created: metro.manager@athithigriha.com → The Grand Metropolitan
  ✅  Created: santorini.manager@athithigriha.com → Santorini Cliff Suites
  ✅  Created: swagruhamanager@gmail.com → Swagruha Hotel

📊  Summary: 7 created, 0 updated

🔑  Manager Credentials:
──────────────────────────────────────────────────────────────────────
  Hôtel de Lumière             lumiere.manager@athithigriha.com
                               Password: Manager@Lumiere2024

  The Azure Skyline            azure.manager@athithigriha.com
                               Password: Manager@Azure2024

  Coral Bay Resort             coralbay.manager@athithigriha.com
                               Password: Manager@CoralBay2024

  Alpine Peak Lodge            alpine.manager@athithigriha.com
                               Password: Manager@Alpine2024

  The Grand Metropolitan       metro.manager@athithigriha.com
                               Password: Manager@Metro2024

  Santorini Cliff Suites       santorini.manager@athithigriha.com
                               Password: Manager@Santorini2024

  Swagruha Hotel               swagruhamanager@gmail.com
                               Password: Manager@Swagruha2024

──────────────────────────────────────────────────────────────────────

✅  Done. Managers seeded successfully.
```

---

### Step 2: Start the Backend
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅  Admin DB (controller) connected: xyz.qehr8hm.mongodb.net
✅  MongoDB connected: xyz.qehr8hm.mongodb.net
🚀  AthithiGriha API running on http://localhost:5000
📋  Environment: development
⚡  Socket.IO ready
```

---

### Step 3: Start the Admin Panel
```bash
cd admin
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## 🧪 Test the System

### Test 1: Login as Super Admin
1. Open `http://localhost:5173/login`
2. Enter:
   - Email: `admin@athithigriha.com`
   - Password: `admin123`
3. Click "Sign in to Dashboard"
4. **Expected:** Redirects to `/dashboard` (global view of all hotels)

---

### Test 2: Add a New Hotel & Get Auto-Generated Credentials
1. Navigate to `/hotels`
2. Click "Add Hotel"
3. Fill in:
   - **Hotel Name:** `Taj Palace`
   - **Subtitle:** `Heritage Luxury`
   - **City:** `Mumbai`
   - **Country:** `INDIA`
   - **Total Rooms:** `120`
   - **Price/Night:** `450`
   - **Status:** `Active`
4. Click "Add Hotel"
5. **Expected:** Modal shows:
   ```
   ✓ Hotel Added!
   ✓ Manager account created automatically

   Manager Portal Credentials
   Hotel:    Taj Palace
   Email:    tajpalace.manager@athithigriha.com
   Password: Manager@TajPalac2024
   Hotel ID: h<timestamp>

   ⚠ Save these credentials — they won't be shown again.
   ```
6. Click "📋 Copy Credentials to Clipboard"
7. Click "Done"

---

### Test 3: Login as a Hotel Manager
1. Logout from Super Admin
2. Login with any manager credentials (e.g. Swagruha):
   - Email: `swagruhamanager@gmail.com`
   - Password: `Manager@Swagruha2024`
3. **Expected:**
   - Redirects to `/m/dashboard`
   - Navbar shows **"Swagruha Hotel — Manager Portal"**
   - All data (bookings, rooms, guests, stats) is scoped to Swagruha Hotel only

---

### Test 4: Verify Hotel Silo Enforcement
1. While logged in as Swagruha Manager, try to access another hotel's data:
   - The backend automatically filters all queries to Swagruha Hotel only
   - If you manually try to access a different hotel via API, you'll get a `403` error
2. **Expected:** Manager can only see Swagruha Hotel data — no other hotels visible

---

### Test 5: Real-Time Updates (Socket.IO)
1. Open two browser windows:
   - **Window 1:** Manager panel (`http://localhost:5173/m/dashboard`)
   - **Window 2:** User booking panel (`http://localhost:3000` or `http://localhost:8082`)
2. In Window 2, create a new booking for Swagruha Hotel
3. **Expected:** Window 1 (manager panel) shows:
   - Notification bell badge updates
   - "New booking" alert appears in the notification dropdown
   - Dashboard stats refresh automatically
   - No page reload needed

---

### Test 6: Room Status Updates
1. Login as Swagruha Manager
2. Navigate to `/m/floor-map`
3. Click on a room (e.g. Room #101)
4. Change status from "Available" to "Maintenance"
5. **Expected:**
   - Room color changes instantly
   - Socket.IO emits `roomStatusUpdate` event
   - All other connected manager panels for Swagruha Hotel see the update in real-time

---

## 🎨 UI Theme Verification

### Admin Panel (Super Admin)
- **Background:** Deep navy gradient
- **Cards:** Dark glass with subtle white overlay
- **Inputs:** Dark glass with gold focus rings
- **Tables:** Dark glass headers and hover states
- **Primary Color:** Imperial Red (`#c0392b`)
- **Accent Color:** Gold (`#d4a843`)

### Manager Panel
- **Same theme as admin panel** — fully unified
- **Navbar:** Shows hotel name in top-left
- **Tabs:** Imperial Red active indicator
- **Notifications:** Live booking alerts with emerald green badges

---

## 📋 Manager Credentials Reference

| Hotel                    | Email                            | Password                  |
|--------------------------|----------------------------------|---------------------------|
| Hôtel de Lumière         | lumiere.manager@athithigriha.com     | Manager@Lumiere2024       |
| The Azure Skyline        | azure.manager@athithigriha.com       | Manager@Azure2024         |
| Coral Bay Resort         | coralbay.manager@athithigriha.com    | Manager@CoralBay2024      |
| Alpine Peak Lodge        | alpine.manager@athithigriha.com      | Manager@Alpine2024        |
| The Grand Metropolitan   | metro.manager@athithigriha.com       | Manager@Metro2024         |
| Santorini Cliff Suites   | santorini.manager@athithigriha.com   | Manager@Santorini2024     |
| Swagruha Hotel           | swagruhamanager@gmail.com        | Manager@Swagruha2024      |

---

## 🔧 Troubleshooting

### Backend won't start
- Check MongoDB connection strings in `backend/.env`
- Verify `MONGO_URI` and `MONGO_ADMIN_URI` are correct
- Run `npm install` in the `backend` folder

### Managers can't login
- Run `node utils/seedManagers.js` to create manager accounts
- Check `JWT_SECRET` is set in `backend/.env`
- Verify backend is running on `http://localhost:5000`

### Socket.IO not working
- Check browser console for connection errors
- Verify `VITE_API_URL` in `admin/.env` points to `http://localhost:5000/api`
- Check backend logs for Socket.IO connection messages

### Credentials not showing after adding hotel
- Check browser console for errors
- Verify `POST /api/admin/users` endpoint is working
- Check backend logs for user creation errors

---

## 📚 Documentation

- **Full Implementation:** `MULTI_TENANT_IMPLEMENTATION.md`
- **Socket.IO Events:** `SOCKET_IO_INTEGRATION.md`
- **Payment Flow:** `PAYMENT_FLOW.md`
- **Frontend Integration:** `backend/FRONTEND_INTEGRATION.md`

---

## ✅ What's Working

✅ Multi-tenant authentication with JWT  
✅ Hotel silo enforcement (managers can only access their hotel)  
✅ Automatic credential generation when hotels are added  
✅ Socket.IO real-time updates for bookings and room status  
✅ Unified dark glass UI theme across admin and manager panels  
✅ Bcrypt password hashing (12 salt rounds)  
✅ 403 error with "Unauthorized" message when access is denied  
✅ Emerald Red toast in manager panel for unauthorized access  
✅ Super Admin global access (bypasses hotel restrictions)  
✅ Manager-scoped API endpoints (`/api/manager/*`)  
✅ Real-time notifications in manager navbar  

---

**Ready to use!** 🎉
