import 'package:dartz/dartz.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/planner/domain/entities/trip_plan_entity.dart';

abstract class PlannerRepository {
  Future<Either<Failure, TripPlanEntity>> getTripPlan(String bookingId);
  Future<Either<Failure, TripPlanEntity>> addActivity(String planId, String dayId, Map<String, dynamic> data);
  Future<Either<Failure, TripPlanEntity>> toggleActivityStatus(String planId, String dayId, String activityId);
}
