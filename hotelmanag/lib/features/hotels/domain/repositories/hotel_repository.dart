import 'package:dartz/dartz.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/shared/domain/entities/hotel_entity.dart';

abstract class HotelRepository {
  Future<Either<Failure, List<HotelEntity>>> getHotels();
  Future<Either<Failure, HotelEntity>> getHotelDetails(String id);
}
