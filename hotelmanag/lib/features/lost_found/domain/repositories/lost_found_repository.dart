import 'package:dartz/dartz.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/lost_found/domain/entities/lost_found_entity.dart';

abstract class LostFoundRepository {
  Future<Either<Failure, LostFoundEntity>> reportLostFound(Map<String, dynamic> data);
  Future<Either<Failure, List<LostFoundEntity>>> getMyLostFoundReports();
}
