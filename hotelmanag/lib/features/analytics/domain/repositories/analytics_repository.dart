import 'package:dartz/dartz.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/analytics/domain/entities/analytics_entity.dart';

abstract class AnalyticsRepository {
  Future<Either<Failure, AnalyticsEntity>> getWeeklyAnalytics(String hotelId);
  Future<Either<Failure, AnalyticsEntity>> getMonthlyAnalytics(String hotelId);
}
