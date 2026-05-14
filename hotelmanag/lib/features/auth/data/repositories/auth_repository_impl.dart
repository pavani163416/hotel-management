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
      String message = e.response?.data['message'] ?? 'Login failed';
      if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout) {
        message = 'Cannot reach server. Check your Base URL in AppConstants and ensure your backend is running.';
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
      String message = e.response?.data['message'] ?? 'Registration failed';
      if (e.type == DioExceptionType.connectionError || e.type == DioExceptionType.connectionTimeout) {
        message = 'Cannot reach server. Check your Base URL in AppConstants and ensure your backend is running.';
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
      return Left(ServerFailure(e.response?.data['message'] ?? 'Failed to get profile'));
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
  }) async {
    try {
      final user = await _remoteDataSource.updateProfile(
        name: name,
        phone: phone,
        city: city,
        profileImage: profileImage,
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
}
