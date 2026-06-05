/**
 * Room allocation & date-overlap engine (PMS-style).
 * Availability is driven by booking dates — not permanent "Booked" room status.
 */
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

/** Statuses that block inventory for date ranges */
export const ACTIVE_BOOKING_STATUSES = ["Confirmed", "CheckedIn", "Pending", "CONFIRMED", "PENDING_PAYMENT"];

/** Operational statuses that prevent new bookings regardless of dates */
export const NON_BOOKABLE_STATUSES = ["Maintenance", "Blocked"];

/**
 * Standard overlap: newCheckIn < existingCheckOut AND newCheckOut > existingCheckIn
 */
export function buildOverlapQuery(checkIn, checkOut, extra = {}) {
  const ci = new Date(checkIn);
  const co = new Date(checkOut);
  return {
    ...extra,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkIn: { $lt: co },
    checkOut: { $gt: ci },
  };
}

export async function hasOverlap(roomId, checkIn, checkOut, excludeBookingId = null) {
  const filter = buildOverlapQuery(checkIn, checkOut, { room: roomId });
  if (excludeBookingId) filter._id = { $ne: excludeBookingId };
  const hit = await Booking.findOne(filter).select("_id checkOut").lean();
  return hit;
}

export async function getOccupiedRoomIds(roomIds, checkIn, checkOut) {
  if (!roomIds?.length) return [];
  return Booking.distinct("room", buildOverlapQuery(checkIn, checkOut, {
    room: { $in: roomIds },
  }));
}

/**
 * Build hotel scope filter for Room queries.
 */
export function buildHotelRoomFilter({ hotelObjectId, hotelStringId }) {
  if (hotelObjectId && hotelStringId) {
    return {
      $or: [
        { hotelId: hotelObjectId },
        { hotelStringId: String(hotelStringId) },
      ],
    };
  }
  if (hotelObjectId) return { hotelId: hotelObjectId };
  if (hotelStringId) return { hotelStringId: String(hotelStringId) };
  return {};
}

/**
 * Find candidate rooms for a room-type / identifier at a hotel.
 */
export function buildRoomCandidateFilter({
  hotelObjectId,
  hotelStringId,
  roomId,
  roomNumber,
  roomTypeId,
  type,
  pricePerNight,
}) {
  const filter = {
    isActive: true,
    status: { $nin: NON_BOOKABLE_STATUSES },
    ...buildHotelRoomFilter({ hotelObjectId, hotelStringId }),
  };

  const identifier = roomTypeId || roomNumber || roomId;
  if (identifier) {
    const id = String(identifier).trim();
    filter.$or = [
      { roomTypeId: id },
      { roomNumber: id },
      ...(type ? [{ type }] : []),
    ];
  } else if (type) {
    filter.type = type;
  }

  if (pricePerNight != null && !identifier) {
    filter.pricePerNight = Number(pricePerNight);
  }

  return filter;
}

/**
 * Auto-assign first physical room free for the date range.
 * Returns null if no rooms available → caller should respond "No Rooms Available".
 */
export async function findAvailableRoom({
  hotelObjectId,
  hotelStringId,
  roomId,
  roomNumber,
  roomTypeId,
  type,
  pricePerNight,
  checkIn,
  checkOut,
  excludeBookingId = null,
}) {
  const filter = buildRoomCandidateFilter({
    hotelObjectId,
    hotelStringId,
    roomId,
    roomNumber,
    roomTypeId,
    type,
    pricePerNight,
  });

  // If specific MongoDB room id requested, try that room first
  if (roomId && String(roomId).match(/^[a-f0-9]{24}$/i)) {
    const direct = await Room.findOne({ _id: roomId, isActive: true, ...buildHotelRoomFilter({ hotelObjectId, hotelStringId }) });
    if (direct) {
      const overlap = await hasOverlap(direct._id, checkIn, checkOut, excludeBookingId);
      if (!overlap && !NON_BOOKABLE_STATUSES.includes(direct.status)) return direct;
    }
  }

  const candidates = await Room.find(filter).sort({ roomNumber: 1 }).lean();
  if (!candidates.length) return null;

  const ids = candidates.map((r) => r._id);
  const occupied = new Set(
    (await getOccupiedRoomIds(ids, checkIn, checkOut)).map(String)
  );

  for (const r of candidates) {
    if (excludeBookingId) {
      const overlap = await hasOverlap(r._id, checkIn, checkOut, excludeBookingId);
      if (overlap) continue;
    } else if (occupied.has(String(r._id))) {
      continue;
    }
    if (NON_BOOKABLE_STATUSES.includes(r.status)) continue;
    if (r.cleaningStatus === "Dirty" || r.cleaningStatus === "In Progress") continue;
    if (r.maintenanceStatus === "Requested" || r.maintenanceStatus === "In Progress") continue;
    return await Room.findById(r._id);
  }

  return null;
}

/**
 * Count available rooms for a type / hotel in a date range.
 */
export async function countAvailableRooms({
  hotelStringId,
  hotelObjectId,
  roomTypeId,
  type,
  checkIn,
  checkOut,
}) {
  try {
    const Hotel = (await import("../models/Hotel.js")).default;
    const hotel = await Hotel.findOne({
      $or: [
        ...(hotelObjectId ? [{ _id: hotelObjectId }] : []),
        ...(hotelStringId ? [{ hotelId: hotelStringId }] : []),
      ].filter(Boolean)
    }).lean();

    let totalCapacity = 0;
    let useInventory = false;

    if (hotel && hotel.roomInventory && roomTypeId) {
      const inv = hotel.roomInventory[roomTypeId] || hotel.roomInventory.get?.(roomTypeId);
      if (inv && typeof inv.total === "number") {
        totalCapacity = inv.total;
        useInventory = true;
      }
    }

    if (useInventory) {
      const activeBookingsCount = await Booking.countDocuments({
        $or: [
          ...(hotelObjectId ? [{ hotelId: hotelObjectId }] : []),
          ...(hotelStringId ? [{ hotelStringId: hotelStringId }] : []),
        ].filter(Boolean),
        roomType: roomTypeId,
        status: { $in: ["Confirmed", "CheckedIn", "Pending"] },
        checkIn: { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) }
      });
      const available = Math.max(0, totalCapacity - activeBookingsCount);
      return { available, total: totalCapacity };
    }
  } catch (err) {
    /* fallback to old logic if query fails */
  }

  const filter = buildRoomCandidateFilter({
    hotelStringId,
    hotelObjectId,
    roomTypeId,
    type,
  });

  const allRooms = await Room.find(filter).select("_id").lean();
  if (!allRooms.length) return { available: 0, total: 0 };

  const ids = allRooms.map((r) => r._id);
  const occupied = await getOccupiedRoomIds(ids, checkIn, checkOut);
  const available = Math.max(0, ids.length - occupied.length);
  return { available, total: ids.length };
}

/**
 * After cancel/checkout: clear legacy "Booked" flag only when no active bookings remain.
 */
export async function syncRoomLegacyStatus(roomId) {
  if (!roomId) return;
  const room = await Room.findById(roomId);
  if (!room || NON_BOOKABLE_STATUSES.includes(room.status)) return;

  const now = new Date();
  const active = await Booking.findOne({
    room: roomId,
    status: { $in: ACTIVE_BOOKING_STATUSES },
    checkOut: { $gt: now },
  }).select("_id");

  if (!active && room.status === "Booked") {
    await Room.findByIdAndUpdate(roomId, { status: "Available" });
  }
}

/**
 * Map overview: rooms + bookings for hotel map UI (date-based occupancy).
 */
export async function getHotelMapOverview({ hotelStringId, hotelObjectId, date }) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const hotelFilter = buildHotelRoomFilter({ hotelStringId, hotelObjectId });
  const rooms = await Room.find({ isActive: true, ...hotelFilter }).sort({ floor: 1, roomNumber: 1 }).lean();

  const roomIds     = rooms.map((r) => r._id);
  const roomNumbers = rooms.map((r) => r.roomNumber).filter(Boolean);

  // ── Query 1: bookings linked via Room ObjectId ─────────────────────────
  const bookingsByRef = roomIds.length
    ? await Booking.find({
        room: { $in: roomIds },
        status: { $in: ACTIVE_BOOKING_STATUSES },
        checkOut: { $gt:  dayStart },
      })
        .populate("guest", "name email phone")
        .select("guestSnapshot room checkIn checkOut status totalAmount nights createdAt additionalAdults additionalChildren totalGuests")
        .lean()
    : [];

  // ── Query 2: bookings linked via roomNumber string (legacy / frontend bookings) ─
  const bookingsByNumber = roomNumbers.length
    ? await Booking.find({
        roomNumber: { $in: roomNumbers },
        status: { $in: ACTIVE_BOOKING_STATUSES },
        checkOut: { $gt:  dayStart },
      })
        .populate("guest", "name email phone")
        .select("guestSnapshot room roomNumber checkIn checkOut status totalAmount nights createdAt additionalAdults additionalChildren totalGuests")
        .lean()
    : [];

  // Build roomNumber → room._id map for cross-referencing
  const roomNumberToId = new Map(
    rooms.map((r) => [r.roomNumber, String(r._id)])
  );

  // Group all matching bookings by room id
  const bookingsMap = new Map();

  const addBookingToMap = (rid, b) => {
    if (!bookingsMap.has(rid)) {
      bookingsMap.set(rid, []);
    }
    bookingsMap.get(rid).push(b);
  };

  for (const b of bookingsByRef) {
    addBookingToMap(String(b.room), b);
  }

  for (const b of bookingsByNumber) {
    const rid = b.room ? String(b.room) : roomNumberToId.get(b.roomNumber);
    if (rid) {
      addBookingToMap(rid, b);
    }
  }

  // Sort bookings for each room by checkIn ascending
  for (const [rid, list] of bookingsMap.entries()) {
    list.sort((a, b) => new Date(a.checkIn).getTime() - new Date(b.checkIn).getTime());
  }

  const enrichedRooms = rooms.map((room) => {
    const rid = String(room._id);
    const roomBookings = bookingsMap.get(rid) || [];

    // Find the primary booking to represent room status
    // 1. Overlapping booking (checkIn <= dayEnd && checkOut > dayStart) -> Occupied
    // 2. Next future booking (checkIn > dayEnd) -> Reserved
    const activeBooking = roomBookings.find(b => new Date(b.checkIn) <= dayEnd);
    const futureBooking = roomBookings.find(b => new Date(b.checkIn) > dayEnd);

    const bookingToReport = activeBooking || futureBooking || null;
    let op = room.status || "Available";

    // Priority 1: Maintenance
    if (room.maintenanceStatus === "Requested" || room.maintenanceStatus === "In Progress" || room.status === "Maintenance") {
      op = "Maintenance";
    } 
    // Priority 2: Cleaning
    else if (room.cleaningStatus === "Dirty" || room.cleaningStatus === "In Progress" || room.status === "Cleaning") {
      op = "Cleaning";
    }
    // Priority 3: Blocked
    else if (room.status === "Blocked") {
      op = "Blocked";
    }
    // Priority 4: Occupied / Reserved
    else if (activeBooking) {
      op = "Occupied";
    }
    else if (futureBooking) {
      op = "Reserved";
    }
    else if (room.status === "Booked" || room.status === "Occupied") {
      op = "Occupied";
    }
    else if (room.status === "Reserved") {
      op = "Reserved";
    }
    else {
      op = "Available";
    }

    return {
      ...room,
      displayStatus: op,
      activeBooking: bookingToReport,
    };
  });

  // Merge all matched bookings for the response array
  const allMatchedBookings = [...bookingsByRef, ...bookingsByNumber];

  const stats = {
    total:       enrichedRooms.length,
    available:   enrichedRooms.filter((r) => r.displayStatus === "Available").length,
    occupied:    enrichedRooms.filter((r) => r.displayStatus === "Occupied").length,
    reserved:    enrichedRooms.filter((r) => r.displayStatus === "Reserved").length,
    booked:      enrichedRooms.filter((r) => r.displayStatus === "Occupied" || r.displayStatus === "Reserved").length, // kept for backward compat
    maintenance: enrichedRooms.filter((r) => r.displayStatus === "Maintenance").length,
    cleaning:    enrichedRooms.filter((r) => r.displayStatus === "Cleaning").length,
    blocked:     enrichedRooms.filter((r) => r.displayStatus === "Blocked").length,
  };
  stats.occupancyPct = stats.total
    ? Math.round(((stats.occupied + stats.reserved) / stats.total) * 100)
    : 0;

  return { rooms: enrichedRooms, bookings: allMatchedBookings, stats };
}
