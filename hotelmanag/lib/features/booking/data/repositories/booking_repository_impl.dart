import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/booking/domain/entities/booking_entity.dart';
import 'package:hotelmanag/features/booking/domain/repositories/booking_repository.dart';
import 'package:hotelmanag/features/booking/data/datasources/booking_remote_data_source.dart';

class BookingRepositoryImpl implements BookingRepository {
  final BookingRemoteDataSource _remoteDataSource;

  BookingRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, BookingEntity>> createBooking({
    required String roomId,
    required DateTime checkIn,
    required DateTime checkOut,
    String? paymentMethod,
    String? specialRequests,
    String? promoCode,
  }) async {
    try {
      final booking = await _remoteDataSource.createBooking(
        roomId: roomId,
        checkIn: checkIn,
        checkOut: checkOut,
        paymentMethod: paymentMethod,
        specialRequests: specialRequests,
        promoCode: promoCode,
      );
      return Right(booking);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to create booking'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<BookingEntity>>> getMyBookings() async {
    try {
      final bookings = await _remoteDataSource.getMyBookings();
      return Right(bookings);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to fetch bookings'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, BookingEntity>> cancelBooking(String id) async {
    try {
      final booking = await _remoteDataSource.cancelBooking(id);
      return Right(booking);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to cancel booking'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
