import 'package:hotelmanag/features/analytics/domain/entities/analytics_entity.dart';

class AnalyticsModel extends AnalyticsEntity {
  const AnalyticsModel({
    required super.totalRevenue,
    required super.totalBookings,
    required super.averageOccupancyRate,
    required super.averageRating,
    required super.revenueByDay,
    required super.bookingsByStatus,
    required super.roomTypePerformance,
  });

  factory AnalyticsModel.fromJson(Map<String, dynamic> json) {
    return AnalyticsModel(
      totalRevenue: json['totalRevenue'] ?? 0,
      totalBookings: json['totalBookings'] ?? 0,
      averageOccupancyRate: json['averageOccupancyRate'] ?? 0,
      averageRating: json['averageRating'] ?? 0,
      revenueByDay: (json['revenueByDay'] as List?)
              ?.map((e) => RevenueByDay(date: e['date'], revenue: e['revenue']))
              .toList() ??
          [],
      bookingsByStatus: (json['bookingsByStatus'] as List?)
              ?.map((e) => BookingByStatus(status: e['status'] ?? e['_id'], count: e['count']))
              .toList() ??
          [],
      roomTypePerformance: (json['roomTypePerformance'] as List?)
              ?.map((e) => RoomTypePerformance(
                    roomType: e['roomType'] ?? e['_id'],
                    revenue: e['revenue'],
                    bookings: e['bookings'],
                  ))
              .toList() ??
          [],
    );
  }
}
