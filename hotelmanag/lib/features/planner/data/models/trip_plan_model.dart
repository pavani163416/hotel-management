import 'package:hotelmanag/features/planner/domain/entities/trip_plan_entity.dart';

class TripPlanModel extends TripPlanEntity {
  const TripPlanModel({
    required super.id,
    required super.bookingId,
    required super.hotelId,
    required super.userId,
    required super.days,
  });

  factory TripPlanModel.fromJson(Map<String, dynamic> json) {
    return TripPlanModel(
      id: json['_id'] ?? json['id'] ?? '',
      bookingId: json['bookingId'] ?? '',
      hotelId: json['hotelId'] ?? '',
      userId: json['userId'] ?? '',
      days: (json['days'] as List?)?.map((d) => DayPlanModel.fromJson(d)).toList() ?? [],
    );
  }
}

class DayPlanModel extends DayPlanEntity {
  const DayPlanModel({
    required super.id,
    required super.date,
    required super.activities,
  });

  factory DayPlanModel.fromJson(Map<String, dynamic> json) {
    return DayPlanModel(
      id: json['_id'] ?? json['id'] ?? '',
      date: DateTime.parse(json['date']),
      activities: (json['activities'] as List?)?.map((a) => ActivityModel.fromJson(a)).toList() ?? [],
    );
  }
}

class ActivityModel extends ActivityEntity {
  const ActivityModel({
    required super.id,
    required super.title,
    required super.time,
    required super.type,
    required super.status,
  });

  factory ActivityModel.fromJson(Map<String, dynamic> json) {
    return ActivityModel(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      time: json['time'] ?? '',
      type: json['type'] ?? 'Other',
      status: json['status'] ?? 'Pending',
    );
  }
}
