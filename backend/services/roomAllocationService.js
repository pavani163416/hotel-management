/**
 * Room allocation & date-overlap engine (PMS-style).
 * Availability is driven by booking dates — not permanent "Booked" room status.
 */
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";

/** Statuses that block inventory for date ranges */
export const ACTIVE_BOOKING_STATUSES = ["Confirmed", "CheckedIn", "Pending"];

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

  const roomIds = rooms.map((r) => r._id);
  const bookings = roomIds.length
    ? await Booking.find({
        room: { $in: roomIds },
        status: { $in: ACTIVE_BOOKING_STATUSES },
        checkIn: { $lte: dayEnd },
        checkOut: { $gt: dayStart },
      })
        .populate("guest", "name email phone")
        .select("guestSnapshot room checkIn checkOut status totalAmount nights createdAt")
        .lean()
    : [];

  const bookingByRoom = new Map();
  for (const b of bookings) {
    const rid = String(b.room);
    if (!bookingByRoom.has(rid)) bookingByRoom.set(rid, b);
  }

  const enrichedRooms = rooms.map((room) => {
    const op = NON_BOOKABLE_STATUSES.includes(room.status)
      ? room.status
      : bookingByRoom.has(String(room._id))
        ? "Booked"
        : room.status === "Booked"
          ? "Available"
          : room.status || "Available";

    return {
      ...room,
      displayStatus: op,
      activeBooking: bookingByRoom.get(String(room._id)) || null,
    };
  });

  const stats = {
    total: enrichedRooms.length,
    available: enrichedRooms.filter((r) => r.displayStatus === "Available").length,
    booked: enrichedRooms.filter((r) => r.displayStatus === "Booked").length,
    maintenance: enrichedRooms.filter((r) => r.displayStatus === "Maintenance").length,
    cleaning: enrichedRooms.filter((r) => r.displayStatus === "Cleaning").length,
    blocked: enrichedRooms.filter((r) => r.displayStatus === "Blocked").length,
  };
  stats.occupancyPct = stats.total
    ? Math.round((stats.booked / stats.total) * 100)
    : 0;

  return { rooms: enrichedRooms, bookings, stats };
}
