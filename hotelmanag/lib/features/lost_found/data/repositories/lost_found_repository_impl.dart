import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/lost_found/domain/entities/lost_found_entity.dart';
import 'package:hotelmanag/features/lost_found/domain/repositories/lost_found_repository.dart';
import 'package:hotelmanag/features/lost_found/data/datasources/lost_found_remote_data_source.dart';

class LostFoundRepositoryImpl implements LostFoundRepository {
  final LostFoundRemoteDataSource _remoteDataSource;

  LostFoundRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, LostFoundEntity>> reportLostFound(Map<String, dynamic> data) async {
    try {
      final report = await _remoteDataSource.reportLostFound(data);
      return Right(report);
    } on DioException catch (e) {
      String message = 'Failed to submit report';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<LostFoundEntity>>> getMyLostFoundReports() async {
    try {
      final reports = await _remoteDataSource.getMyLostFoundReports();
      return Right(reports);
    } on DioException catch (e) {
      String message = 'Failed to fetch reports';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
