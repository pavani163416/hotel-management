import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/booking_entity.dart';

abstract class BookingRepository {
  Future<Either<Failure, BookingEntity>> createBooking({
    required String roomId,
    required DateTime checkIn,
    required DateTime checkOut,
    String? paymentMethod,
    String? specialRequests,
    String? promoCode,
  });
  Future<Either<Failure, List<BookingEntity>>> getMyBookings();
  Future<Either<Failure, BookingEntity>> cancelBooking(String id);
}
