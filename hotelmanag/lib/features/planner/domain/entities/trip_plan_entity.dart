import 'package:equatable/equatable.dart';

class TripPlanEntity extends Equatable {
  final String id;
  final String bookingId;
  final String hotelId;
  final String userId;
  final List<DayPlanEntity> days;

  const TripPlanEntity({
    required this.id,
    required this.bookingId,
    required this.hotelId,
    required this.userId,
    required this.days,
  });

  @override
  List<Object?> get props => [id, bookingId, hotelId, userId, days];
}

class DayPlanEntity extends Equatable {
  final String id;
  final DateTime date;
  final List<ActivityEntity> activities;

  const DayPlanEntity({
    required this.id,
    required this.date,
    required this.activities,
  });

  @override
  List<Object?> get props => [id, date, activities];
}

class ActivityEntity extends Equatable {
  final String id;
  final String title;
  final String time;
  final String type; // 'Breakfast', 'Tour', 'Leisure', 'Dinner', 'Other'
  final String status; // 'Pending', 'Completed'

  const ActivityEntity({
    required this.id,
    required this.title,
    required this.time,
    required this.type,
    required this.status,
  });

  @override
  List<Object?> get props => [id, title, time, type, status];
}
