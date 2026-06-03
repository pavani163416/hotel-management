import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

const TYPE_MAPPING = {
  standard: { prefix: "S", floor: 1, bedType: "Queen", capacity: 2, name: "Standard" },
  deluxe: { prefix: "D", floor: 2, bedType: "King", capacity: 2, name: "Deluxe" },
  suite: { prefix: "SU", floor: 3, bedType: "King", capacity: 3, name: "Suite" },
  penthouse: { prefix: "P", floor: 4, bedType: "King", capacity: 4, name: "Penthouse" },
  villa: { prefix: "V", floor: 5, bedType: "King", capacity: 4, name: "Villa" },
};

/**
 * Checks if a room has any active/future bookings or is currently occupied/reserved.
 */
export async function isRoomUsed(roomId) {
  // Check room status
  const room = await Room.findById(roomId);
  if (!room) return false;
  if (room.status !== "Available") {
    return true;
  }

  // Check future bookings
  const now = new Date();
  const activeBooking = await Booking.findOne({
    room: roomId,
    status: { $in: ["Confirmed", "CheckedIn", "Pending"] },
    checkOut: { $gt: now },
  });

  return !!activeBooking;
}

/**
 * Automatically generates room documents for a newly created hotel based on its roomInventory.
 */
export async function generateRoomsForHotel(hotel) {
  const inventory = hotel.roomInventory;
  if (!inventory) return;

  const roomsToCreate = [];
  const keys = typeof inventory.keys === "function" ? Array.from(inventory.keys()) : Object.keys(inventory);

  for (const key of keys) {
    const invItem = typeof inventory.get === "function" ? inventory.get(key) : inventory[key];
    if (!invItem) continue;

    const totalRooms = Number(invItem.total) || 0;
    const price = Number(invItem.price) || 0;
    const mapping = TYPE_MAPPING[key.toLowerCase()] || { prefix: key.toUpperCase().slice(0, 2), floor: 1, bedType: "King", capacity: 2, name: key };

    for (let i = 1; i <= totalRooms; i++) {
      const roomNumSuffix = i.toString().padStart(2, "0");
      const roomNumber = `${mapping.prefix}-${mapping.floor}${roomNumSuffix}`;

      roomsToCreate.push({
        hotelId: hotel._id,
        hotelStringId: hotel.hotelId,
        roomNumber,
        roomTypeId: key.toLowerCase(),
        type: mapping.name,
        description: `${mapping.name} Room at ${hotel.name}`,
        pricePerNight: price,
        capacity: mapping.capacity,
        bedType: mapping.bedType,
        status: "Available",
        floor: mapping.floor,
        isActive: true,
      });
    }
  }

  if (roomsToCreate.length > 0) {
    await Room.insertMany(roomsToCreate);
  }
}

/**
 * Synchronizes room documents when hotel inventory is updated.
 */
export async function syncRoomsForHotel(hotel) {
  const inventory = hotel.roomInventory;
  if (!inventory) return;

  const keys = typeof inventory.keys === "function" ? Array.from(inventory.keys()) : Object.keys(inventory);

  // ── Step 1: Clean up rooms of room types that have been removed from the inventory ──
  const allExistingRooms = await Room.find({ hotelId: hotel._id, isActive: true });
  const inventoryKeys = new Set(keys.map(k => k.toLowerCase()));
  const obsoleteRoomTypeIds = [...new Set(allExistingRooms.map(r => r.roomTypeId).filter(Boolean))].filter(id => !inventoryKeys.has(id));

  for (const obsoleteId of obsoleteRoomTypeIds) {
    const roomsToClean = allExistingRooms.filter(r => r.roomTypeId === obsoleteId);
    for (const room of roomsToClean) {
      const isUsed = await isRoomUsed(room._id);
      if (!isUsed) {
        await Room.findByIdAndDelete(room._id);
      } else {
        throw new Error(`Cannot delete room type "${obsoleteId}" as some rooms of this type are currently occupied, reserved, or booked.`);
      }
    }
  }

  for (const key of keys) {
    const invItem = typeof inventory.get === "function" ? inventory.get(key) : inventory[key];
    if (!invItem) continue;

    const targetTotal = Number(invItem.total) || 0;
    const price = Number(invItem.price) || 0;
    const mapping = TYPE_MAPPING[key.toLowerCase()] || { prefix: key.toUpperCase().slice(0, 2), floor: 1, bedType: "King", capacity: 2, name: key };

    // Find all existing active rooms for this type
    const existingRooms = await Room.find({
      hotelId: hotel._id,
      roomTypeId: key.toLowerCase(),
      isActive: true,
    }).sort({ roomNumber: 1 });

    const currentCount = existingRooms.length;

    if (currentCount < targetTotal) {
      // Need to generate more rooms
      const roomsToCreate = [];
      for (let i = currentCount + 1; i <= targetTotal; i++) {
        const roomNumSuffix = i.toString().padStart(2, "0");
        const roomNumber = `${mapping.prefix}-${mapping.floor}${roomNumSuffix}`;

        roomsToCreate.push({
          hotelId: hotel._id,
          hotelStringId: hotel.hotelId,
          roomNumber,
          roomTypeId: key.toLowerCase(),
          type: mapping.name,
          description: `${mapping.name} Room at ${hotel.name}`,
          pricePerNight: price,
          capacity: mapping.capacity,
          bedType: mapping.bedType,
          status: "Available",
          floor: mapping.floor,
          isActive: true,
        });
      }
      if (roomsToCreate.length > 0) {
        await Room.insertMany(roomsToCreate);
      }
    } else if (currentCount > targetTotal) {
      // Need to reduce rooms. Scan from the end.
      let roomsToDeleteCount = currentCount - targetTotal;
      const sortedDesc = [...existingRooms].reverse();

      for (const room of sortedDesc) {
        if (roomsToDeleteCount <= 0) break;

        const isUsed = await isRoomUsed(room._id);
        if (!isUsed) {
          await Room.findByIdAndDelete(room._id);
          roomsToDeleteCount--;
        }
      }

      if (roomsToDeleteCount > 0) {
        throw new Error(
          `Cannot reduce inventory for ${mapping.name} to ${targetTotal}. ${roomsToDeleteCount} room(s) are currently occupied, reserved, or booked.`
        );
      }
    }

    // Update prices of existing rooms to match the new inventory price
    await Room.updateMany(
      { hotelId: hotel._id, roomTypeId: key.toLowerCase(), isActive: true },
      { pricePerNight: price }
    );
  }
}
