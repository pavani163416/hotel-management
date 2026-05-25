import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/auth/domain/entities/user_entity.dart';
import 'package:hotelmanag/features/auth/domain/repositories/auth_repository.dart';
import 'package:hotelmanag/features/auth/data/datasources/auth_remote_data_source.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;

  AuthRepositoryImpl(this._remoteDataSource);

  @override
  Future<Either<Failure, (UserEntity, String)>> login(String email, String password) async {
    try {
      final authResponse = await _remoteDataSource.login(email, password);
      return Right((authResponse.user, authResponse.token));
    } on DioException catch (e) {
      String message = 'Login failed';
      
      if (e.response != null) {
        if (e.response?.data is Map) {
          message = e.response?.data['message'] ?? message;
        } else if (e.response?.data is String) {
          message = e.response?.data;
        }
      } else if (e.type == DioExceptionType.connectionError || 
                 e.type == DioExceptionType.connectionTimeout) {
        message = 'Unable to connect to the server. Please check your internet connection.';
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, (UserEntity, String)>> register(String name, String email, String password, String phone) async {
    try {
      final authResponse = await _remoteDataSource.register(name, email, password, phone);
      return Right((authResponse.user, authResponse.token));
    } on DioException catch (e) {
      String message = 'Registration failed';
      
      if (e.response != null) {
        if (e.response?.data is Map) {
          message = e.response?.data['message'] ?? message;
        } else if (e.response?.data is String) {
          message = e.response?.data;
        }
      } else if (e.type == DioExceptionType.connectionError || 
                 e.type == DioExceptionType.connectionTimeout) {
        message = 'Unable to connect to the server. Please check your internet connection.';
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, (UserEntity, String)>> verifyOtp(String email, String code) async {
    try {
      final authResponse = await _remoteDataSource.verifyOtp(email, code);
      return Right((authResponse.user, authResponse.token));
    } on DioException catch (e) {
      String message = 'OTP Verification failed';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      } else if (e.response?.data is String) {
        message = e.response?.data;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> resendOtp(String email) async {
    try {
      await _remoteDataSource.resendOtp(email);
      return const Right(null);
    } on DioException catch (e) {
      String message = 'Failed to resend OTP';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, (UserEntity, String)>> signInWithGoogle(String idToken) async {
    try {
      final authResponse = await _remoteDataSource.signInWithGoogle(idToken);
      return Right((authResponse.user, authResponse.token));
    } on DioException catch (e) {
      String message = 'Google login failed';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> getMe() async {
    try {
      final user = await _remoteDataSource.getMe(''); // Token handled by ApiService
      return Right(user);
    } on DioException catch (e) {
      String message = 'Failed to get profile';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      } else if (e.message != null && e.message!.isNotEmpty) {
        message = e.message!;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, UserEntity>> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
    String? coverImage,
  }) async {
    try {
      final user = await _remoteDataSource.updateProfile(
        name: name,
        phone: phone,
        city: city,
        profileImage: profileImage,
        coverImage: coverImage,
      );
      return Right(user);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to update profile'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, String>> uploadImage(String base64Image) async {
    try {
      final url = await _remoteDataSource.uploadImage(base64Image);
      return Right(url);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Upload failed'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
  @override
  Future<Either<Failure, List<PaymentMethod>>> addPaymentMethod({
    required String type,
    String? brand,
    String? last4,
    String? expiry,
    String? upiId,
    String? bankName,
    bool isDefault = false,
  }) async {
    try {
      final paymentMethods = await _remoteDataSource.addPaymentMethod(
        type: type,
        brand: brand,
        last4: last4,
        expiry: expiry,
        upiId: upiId,
        bankName: bankName,
        isDefault: isDefault,
      );
      return Right(paymentMethods);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to add payment method'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, bool>> changePassword(String oldPassword, String newPassword) async {
    try {
      final success = await _remoteDataSource.changePassword(oldPassword, newPassword);
      return Right(success);
    } on DioException catch (e) {
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to change password'));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
