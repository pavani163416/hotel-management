import 'package:equatable/equatable.dart';

class AnalyticsEntity extends Equatable {
  final num totalRevenue;
  final int totalBookings;
  final num averageOccupancyRate;
  final num averageRating;
  final List<RevenueByDay> revenueByDay;
  final List<BookingByStatus> bookingsByStatus;
  final List<RoomTypePerformance> roomTypePerformance;

  const AnalyticsEntity({
    required this.totalRevenue,
    required this.totalBookings,
    required this.averageOccupancyRate,
    required this.averageRating,
    required this.revenueByDay,
    required this.bookingsByStatus,
    required this.roomTypePerformance,
  });

  @override
  List<Object?> get props => [
        totalRevenue,
        totalBookings,
        averageOccupancyRate,
        averageRating,
        revenueByDay,
        bookingsByStatus,
        roomTypePerformance,
      ];
}

class RevenueByDay extends Equatable {
  final String date;
  final num revenue;
  const RevenueByDay({required this.date, required this.revenue});
  @override
  List<Object?> get props => [date, revenue];
}

class BookingByStatus extends Equatable {
  final String status;
  final int count;
  const BookingByStatus({required this.status, required this.count});
  @override
  List<Object?> get props => [status, count];
}

class RoomTypePerformance extends Equatable {
  final String roomType;
  final num revenue;
  final int bookings;
  const RoomTypePerformance({required this.roomType, required this.revenue, required this.bookings});
  @override
  List<Object?> get props => [roomType, revenue, bookings];
}
