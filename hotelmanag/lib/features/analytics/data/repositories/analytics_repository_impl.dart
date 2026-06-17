import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/analytics/domain/entities/analytics_entity.dart';
import 'package:hotelmanag/features/analytics/domain/repositories/analytics_repository.dart';
import 'package:hotelmanag/features/analytics/data/datasources/analytics_remote_data_source.dart';

class AnalyticsRepositoryImpl implements AnalyticsRepository {
  final AnalyticsRemoteDataSource _remoteDataSource;

  AnalyticsRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, AnalyticsEntity>> getWeeklyAnalytics(String hotelId) async {
    try {
      final analytics = await _remoteDataSource.getWeeklyAnalytics(hotelId);
      return Right(analytics);
    } on DioException catch (e) {
      String message = 'Failed to fetch weekly analytics';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, AnalyticsEntity>> getMonthlyAnalytics(String hotelId) async {
    try {
      final analytics = await _remoteDataSource.getMonthlyAnalytics(hotelId);
      return Right(analytics);
    } on DioException catch (e) {
      String message = 'Failed to fetch monthly analytics';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
