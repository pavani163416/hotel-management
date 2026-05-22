import connectAdminDB from "../config/adminDb.js";
import RoomSnapshotModel from "../models/admin/RoomSnapshot.js";

let RoomSnapshot;

const getRoomSnapshotModel = async () => {
  if (RoomSnapshot) return RoomSnapshot;
  const conn = await connectAdminDB();
  RoomSnapshot = RoomSnapshotModel(conn);
  return RoomSnapshot;
};

/**
 * Synchronize a room's state to the RoomSnapshot collection in the controller DB.
 */
export const syncRoomSnapshot = async (hotelId, hotelName, roomData) => {
  try {
    const model = await getRoomSnapshotModel();

    // Map embedded room bed types to the allowed enum values in RoomSnapshot
    const BED_TYPE_MAP = {
      "1 King Bed": "King", "2 King Beds": "King", "King": "King",
      "1 Queen Bed": "Queen", "Queen": "Queen",
      "2 Twin Beds": "Twin", "Twin": "Twin",
      "1 King Bed + Sofa": "King",
      "Single": "Single", "Double": "Double",
    };
    const bedRaw = roomData.bed || "King";
    const bed = BED_TYPE_MAP[bedRaw] || "King";

    // Map room types to standard enum values in RoomSnapshot
    const TYPE_MAP = {
      "Standard": "Standard", "Deluxe": "Deluxe", "Suite": "Suite",
      "Penthouse": "Penthouse", "Villa": "Villa"
    };
    const typeRaw = roomData.type || "Standard";
    const type = TYPE_MAP[typeRaw] || "Standard";

    const roomNumber = roomData.id;
    if (!roomNumber) return;

    const payload = {
      roomNumber,
      hotelId,
      hotelName,
      name: roomData.name || `Room ${roomNumber}`,
      type,
      pricePerNight: roomData.price || 0,
      capacity: roomData.capacity || 2,
      bed,
      available: roomData.available ?? 1,
      features: roomData.features || [],
      status: (roomData.available ?? 1) > 0 ? "Available" : "Booked"
    };

    await model.findOneAndUpdate(
      { roomNumber },
      payload,
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error("Failed to sync room snapshot:", error);
  }
};

/**
 * Remove a room snapshot by roomNumber.
 */
export const deleteRoomSnapshotByNumber = async (roomNumber) => {
  try {
    if (!roomNumber) return;
    const model = await getRoomSnapshotModel();
    await model.findOneAndDelete({ roomNumber });
  } catch (error) {
    console.error("Failed to delete room snapshot:", error);
  }
};
