import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<Either<Failure, (UserEntity, String)>> login(String email, String password);
  Future<Either<Failure, (UserEntity, String)>> register(String name, String email, String password, String phone);
  Future<Either<Failure, UserEntity>> getMe();
  Future<Either<Failure, UserEntity>> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
  });
  Future<Either<Failure, String>> uploadImage(String base64Image);
}
