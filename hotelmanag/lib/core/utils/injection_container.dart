import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import '../network/api_service.dart';
import '../../features/auth/data/datasources/auth_remote_data_source.dart';
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/hotels/data/datasources/hotel_remote_data_source.dart';
import '../../features/hotels/data/repositories/hotel_repository_impl.dart';
import '../../features/hotels/domain/repositories/hotel_repository.dart';
import '../../features/booking/data/datasources/booking_remote_data_source.dart';
import '../../features/booking/data/repositories/booking_repository_impl.dart';
import '../../features/booking/domain/repositories/booking_repository.dart';
import '../providers/auth_provider.dart';
import '../providers/hotel_provider.dart';
import '../providers/booking_provider.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External
  sl.registerLazySingleton(() => Dio());

  // Core
  sl.registerLazySingleton(() => ApiService(sl()));

  // Features - Auth
  // Data Sources
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl()),
  );

  // Repositories
  sl.registerLazySingleton<AuthRepository>(
    () => AuthRepositoryImpl(sl()),
  );

  // Features - Hotels
  // Data Sources
  sl.registerLazySingleton<HotelRemoteDataSource>(
    () => HotelRemoteDataSourceImpl(sl()),
  );

  // Repositories
  sl.registerLazySingleton<HotelRepository>(
    () => HotelRepositoryImpl(sl()),
  );

  // Features - Booking
  // Data Sources
  sl.registerLazySingleton<BookingRemoteDataSource>(
    () => BookingRemoteDataSourceImpl(sl()),
  );

  // Repositories
  sl.registerLazySingleton<BookingRepository>(
    () => BookingRepositoryImpl(sl()),
  );

  // Providers
  sl.registerFactory(() => AuthProvider(sl()));
  sl.registerFactory(() => HotelProvider(sl()));
  sl.registerFactory(() => BookingProvider(sl()));
}
