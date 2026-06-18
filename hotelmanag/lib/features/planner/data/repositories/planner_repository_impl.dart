import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/planner/domain/entities/trip_plan_entity.dart';
import 'package:hotelmanag/features/planner/domain/repositories/planner_repository.dart';
import 'package:hotelmanag/features/planner/data/datasources/planner_remote_data_source.dart';

class PlannerRepositoryImpl implements PlannerRepository {
  final PlannerRemoteDataSource _remoteDataSource;

  PlannerRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, TripPlanEntity>> getTripPlan(String bookingId) async {
    try {
      final plan = await _remoteDataSource.getTripPlan(bookingId);
      return Right(plan);
    } on DioException catch (e) {
      String message = 'Failed to fetch trip plan';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, TripPlanEntity>> addActivity(String planId, String dayId, Map<String, dynamic> data) async {
    try {
      final plan = await _remoteDataSource.addActivity(planId, dayId, data);
      return Right(plan);
    } on DioException catch (e) {
      String message = 'Failed to add activity';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, TripPlanEntity>> toggleActivityStatus(String planId, String dayId, String activityId) async {
    try {
      final plan = await _remoteDataSource.toggleActivityStatus(planId, dayId, activityId);
      return Right(plan);
    } on DioException catch (e) {
      String message = 'Failed to update activity';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
