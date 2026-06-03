import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";

export const getDynamicRoomsForHotel = async (hotelId) => {
  const activeRooms = await Room.find({ hotelStringId: hotelId, isActive: true });
  const roomTypesMap = {};
  for (const room of activeRooms) {
    const typeId = room.roomTypeId || room.type?.toLowerCase() || "standard";
    if (!roomTypesMap[typeId]) {
      roomTypesMap[typeId] = {
        id: typeId,
        roomTypeId: typeId,
        name: `${room.type} Room`,
        description: room.description || `${room.type} Room`,
        price: room.pricePerNight,
        capacity: room.capacity,
        bed: room.bedType === "King" ? "1 King Bed" : room.bedType === "Queen" ? "1 Queen Bed" : room.bedType === "Twin" ? "2 Twin Beds" : room.bedType || "1 King Bed",
        available: 0,
        features: room.amenities && room.amenities.length > 0 ? room.amenities : ["WiFi", "AC"],
      };
    }
    if (room.status === "Available") {
      roomTypesMap[typeId].available += 1;
    }
  }
  return Object.values(roomTypesMap);
};

export const getEnrichedHotelsData = async (city, minPrice, maxPrice) => {
  const filter = { isActive: true };
  if (city) filter.city = new RegExp(city, "i");
  if (minPrice || maxPrice) {
    filter.pricePerNight = {};
    if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
    if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
  }
  const hotels = await Hotel.find(filter);
  const hotelIds = hotels.map((hotel) => hotel.hotelId).filter(Boolean);
  let statsByHotel = {};

  if (hotelIds.length > 0) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const activeStatuses = ["Confirmed", "CheckedIn", "Pending"];
    const revenueStatuses = ["Confirmed", "Completed", "CheckedIn", "CheckedOut"];

    const hotelStats = await Booking.aggregate([
      {
        $match: {
          hotelStringId: { $in: hotelIds },
          $or: [
            { status: { $in: activeStatuses }, checkOut: { $gt: now } },
            { status: { $in: revenueStatuses }, createdAt: { $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`) } },
          ],
        },
      },
      {
        $group: {
          _id: "$hotelStringId",
          activeBookings: {
            $sum: {
              $cond: [
                { $and: [
                  { $in: ["$status", activeStatuses] },
                  { $gt: ["$checkOut", now] },
                ] },
                1,
                0,
              ],
            },
          },
          ytdRevenue: {
            $sum: {
              $cond: [
                { $and: [
                  { $in: ["$status", revenueStatuses] },
                  { $gte: ["$createdAt", new Date(`${currentYear}-01-01T00:00:00.000Z`) ] },
                ] },
                "$totalAmount",
                0,
              ],
            },
          },
        },
      },
    ]);

    statsByHotel = hotelStats.reduce((acc, stat) => {
      acc[stat._id] = {
        activeBookings: stat.activeBookings || 0,
        ytdRevenue: stat.ytdRevenue || 0,
      };
      return acc;
    }, {});
  }

  const enrichedHotels = await Promise.all(hotels.map(async (hotel) => {
    const roomsArray = await getDynamicRoomsForHotel(hotel.hotelId);
    return {
      ...hotel.toObject(),
      rooms: roomsArray,
      activeBookings: statsByHotel[hotel.hotelId]?.activeBookings ?? 0,
      ytdRevenue: statsByHotel[hotel.hotelId]?.ytdRevenue ?? 0,
    };
  }));
  enrichedHotels.sort((a, b) => b.ytdRevenue - a.ytdRevenue || b.activeBookings - a.activeBookings);
  return enrichedHotels;
};
