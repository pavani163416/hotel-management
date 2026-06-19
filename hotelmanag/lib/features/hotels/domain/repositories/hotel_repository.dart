import 'package:dartz/dartz.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/shared/domain/entities/hotel_entity.dart';

abstract class HotelRepository {
  Future<Either<Failure, List<HotelEntity>>> getHotels();
  Future<Either<Failure, HotelEntity>> getHotelDetails(String id);
  Future<Either<Failure, HotelEntity>> submitReview(
    String hotelId,
    String author,
    int rating,
    String comment,
  );
  Future<Either<Failure, HotelEntity>> updateReview(
    String hotelId,
    String reviewId,
    int rating,
    String comment,
  );
  Future<Either<Failure, HotelEntity>> deleteReview(
    String hotelId,
    String reviewId,
  );
}
