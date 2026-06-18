import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/waitlist/domain/entities/waitlist_entity.dart';
import 'package:hotelmanag/features/waitlist/domain/repositories/waitlist_repository.dart';
import 'package:hotelmanag/features/waitlist/data/datasources/waitlist_remote_data_source.dart';

class WaitlistRepositoryImpl implements WaitlistRepository {
  final WaitlistRemoteDataSource _remoteDataSource;

  WaitlistRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, WaitlistEntity>> joinWaitlist(Map<String, dynamic> data) async {
    try {
      final waitlist = await _remoteDataSource.joinWaitlist(data);
      return Right(waitlist);
    } on DioException catch (e) {
      String message = 'Failed to join waitlist';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<WaitlistEntity>>> getMyWaitlists() async {
    try {
      final waitlists = await _remoteDataSource.getMyWaitlists();
      return Right(waitlists);
    } on DioException catch (e) {
      String message = 'Unable to connect. Please check your internet connection.';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, WaitlistEntity>> cancelWaitlist(String id) async {
    try {
      final waitlist = await _remoteDataSource.cancelWaitlist(id);
      return Right(waitlist);
    } on DioException catch (e) {
      String message = 'Failed to cancel waitlist';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
