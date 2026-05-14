# Frontend Integration Guide

## Base URL
```
http://localhost:5000/api
```

---

## Option A — Using Axios (Recommended)

### Install
```bash
npm install axios
```

### Create `src/services/api.js`
```js
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Global error interceptor
api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;
```

---

## Option B — Using Fetch (No install needed)

### Create `src/services/api.js`
```js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const request = async (endpoint, options = {}) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
};

export const get  = (url)          => request(url);
export const post = (url, body)    => request(url, { method: "POST",  body: JSON.stringify(body) });
export const patch= (url, body)    => request(url, { method: "PATCH", body: JSON.stringify(body) });
```

---

## Usage Examples

### 1. Fetch Available Rooms
```js
// Axios
import api from "@/services/api";
const { data: rooms } = await api.get("/rooms?status=Available");

// Fetch
import { get } from "@/services/api";
const { data: rooms } = await get("/rooms?status=Available");
```

### 2. Create a Booking (POST /api/bookings)
```js
import api from "@/services/api";

const bookingPayload = {
  roomId: "64abc123...",          // MongoDB _id of the room
  guest: {
    name: "James Wilson",
    email: "james@example.com",
    phone: "+1 555 000 0000",
  },
  checkIn:  "2025-08-01",
  checkOut: "2025-08-04",
  pricePerNight: 480,
  subtotal: 1440,
  taxes: 115,
  discount: 144,
  totalAmount: 1411,
  promoCode: "LUXE10",
  paymentMethod: "card",
  specialRequests: "Late check-in please",
  additionalAdults: [
    { name: "Sarah Wilson", email: "sarah@example.com", phone: "+1 555 111" }
  ],
  additionalChildren: [
    { name: "Tom Wilson", age: 8 }
  ],
};

const result = await api.post("/bookings", bookingPayload);
console.log(result.data.bookingRef); // e.g. "LS-A1B2C"
```

### 3. Update Room Status (PATCH /api/rooms/:id)
```js
await api.patch(`/rooms/${roomId}`, { status: "Booked" });
```

### 4. Cancel a Booking
```js
await api.patch(`/bookings/${bookingId}/cancel`, {
  reason: "Change of plans"
});
```

---

## Add to your .env (Vite project)
```
VITE_API_URL=http://localhost:5000/api
```

## Add to your .env.local (Next.js project)
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
