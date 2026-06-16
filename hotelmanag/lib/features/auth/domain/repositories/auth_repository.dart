import 'package:dartz/dartz.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<Either<Failure, (UserEntity, String)>> login(
    String email,
    String password, {
    String? captchaId,
    String? captchaAnswer,
  });
  Future<Either<Failure, (UserEntity, String, String?)>> register(
    String name,
    String email,
    String password,
    String phone, {
    String? city,
    String? captchaId,
    String? captchaAnswer,
  });
  Future<Either<Failure, (UserEntity, String)>> verifyOtp(
    String email,
    String code,
  );
  Future<Either<Failure, String?>> resendOtp(String email);
  Future<Either<Failure, (String, String)?>> fetchCaptcha();
  Future<Either<Failure, (UserEntity, String)>> signInWithGoogle(
    String idToken,
  );
  Future<Either<Failure, (UserEntity, String)>> signInWithFirebase(
    String idToken, {
    String? name,
    String? phone,
  });
  Future<Either<Failure, UserEntity>> getMe();
  Future<Either<Failure, UserEntity>> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
    String? coverImage,
  });
  Future<Either<Failure, String>> uploadImage(String base64Image);
  Future<Either<Failure, List<PaymentMethod>>> addPaymentMethod({
    required String type,
    String? brand,
    String? last4,
    String? expiry,
    String? upiId,
    String? bankName,
    bool isDefault = false,
  });
  Future<Either<Failure, bool>> changePassword(
    String oldPassword,
    String newPassword,
  );
  Future<Either<Failure, bool>> forgotPassword(String email);
  Future<Either<Failure, String?>> sendPhoneOtp(String phone);
  Future<Either<Failure, (UserEntity, String)>> verifyPhoneOtp(
    String phone,
    String code,
  );
}
