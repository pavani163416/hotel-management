import 'package:dartz/dartz.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/waitlist/domain/entities/waitlist_entity.dart';

abstract class WaitlistRepository {
  Future<Either<Failure, WaitlistEntity>> joinWaitlist(Map<String, dynamic> data);
  Future<Either<Failure, List<WaitlistEntity>>> getMyWaitlists();
  Future<Either<Failure, WaitlistEntity>> cancelWaitlist(String id);
}
