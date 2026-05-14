import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/shared/domain/entities/hotel_entity.dart';
import 'package:hotelmanag/features/hotels/domain/repositories/hotel_repository.dart';
import 'package:hotelmanag/features/hotels/data/datasources/hotel_remote_data_source.dart';

class HotelRepositoryImpl implements HotelRepository {
  final HotelRemoteDataSource _remoteDataSource;

  HotelRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, List<HotelEntity>>> getHotels() async {
    try {
      final hotels = await _remoteDataSource.getHotels();
      return Right(hotels);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to fetch hotels'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, HotelEntity>> getHotelDetails(String id) async {
    try {
      final hotel = await _remoteDataSource.getHotelDetails(id);
      return Right(hotel);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to fetch hotel details'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
