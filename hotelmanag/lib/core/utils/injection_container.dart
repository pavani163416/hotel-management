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
import '../providers/notification_provider.dart';
import '../providers/promo_provider.dart';
import '../../features/booking/data/services/payment_service.dart';
import '../../features/booking/data/services/booking_service.dart';

import '../../features/waitlist/data/datasources/waitlist_remote_data_source.dart';
import '../../features/waitlist/data/repositories/waitlist_repository_impl.dart';
import '../../features/waitlist/domain/repositories/waitlist_repository.dart';
import '../../features/waitlist/presentation/bloc/waitlist_bloc.dart';

import '../../features/planner/data/datasources/planner_remote_data_source.dart';
import '../../features/planner/data/repositories/planner_repository_impl.dart';
import '../../features/planner/domain/repositories/planner_repository.dart';
import '../../features/planner/presentation/bloc/planner_bloc.dart';

import '../../features/lost_found/data/datasources/lost_found_remote_data_source.dart';
import '../../features/lost_found/data/repositories/lost_found_repository_impl.dart';
import '../../features/lost_found/domain/repositories/lost_found_repository.dart';
import '../../features/lost_found/presentation/bloc/lost_found_bloc.dart';

import '../../features/analytics/data/datasources/analytics_remote_data_source.dart';
import '../../features/analytics/data/repositories/analytics_repository_impl.dart';
import '../../features/analytics/domain/repositories/analytics_repository.dart';
import '../../features/analytics/presentation/bloc/analytics_bloc.dart';

final sl = GetIt.instance;

Future<void> init() async {
  // External
  sl.registerLazySingleton(() => Dio());

  // Core
  sl.registerLazySingleton(() => ApiService(sl()));

  // Features - Auth
  sl.registerLazySingleton<AuthRemoteDataSource>(
    () => AuthRemoteDataSourceImpl(sl()),
  );
  sl.registerLazySingleton<AuthRepository>(() => AuthRepositoryImpl(sl()));

  // Features - Hotels
  sl.registerLazySingleton<HotelRemoteDataSource>(
    () => HotelRemoteDataSourceImpl(sl()),
  );
  sl.registerLazySingleton<HotelRepository>(() => HotelRepositoryImpl(sl()));

  // Features - Booking
  sl.registerLazySingleton<BookingRemoteDataSource>(
    () => BookingRemoteDataSourceImpl(sl()),
  );
  sl.registerLazySingleton<BookingRepository>(
    () => BookingRepositoryImpl(sl()),
  );

  // Features - Waitlist
  sl.registerLazySingleton<WaitlistRemoteDataSource>(
    () => WaitlistRemoteDataSourceImpl(sl<ApiService>()),
  );
  sl.registerLazySingleton<WaitlistRepository>(
    () => WaitlistRepositoryImpl(sl()),
  );
  sl.registerFactory(() => WaitlistBloc(sl()));

  // Features - Planner
  sl.registerLazySingleton<PlannerRemoteDataSource>(
    () => PlannerRemoteDataSourceImpl(sl<ApiService>()),
  );
  sl.registerLazySingleton<PlannerRepository>(
    () => PlannerRepositoryImpl(sl()),
  );
  sl.registerFactory(() => PlannerBloc(sl()));

  // Features - LostFound
  sl.registerLazySingleton<LostFoundRemoteDataSource>(
    () => LostFoundRemoteDataSourceImpl(sl<ApiService>()),
  );
  sl.registerLazySingleton<LostFoundRepository>(
    () => LostFoundRepositoryImpl(sl()),
  );
  sl.registerFactory(() => LostFoundBloc(sl()));

  // Features - Analytics
  sl.registerLazySingleton<AnalyticsRemoteDataSource>(
    () => AnalyticsRemoteDataSourceImpl(sl<ApiService>()),
  );
  sl.registerLazySingleton<AnalyticsRepository>(
    () => AnalyticsRepositoryImpl(sl()),
  );
  sl.registerFactory(() => AnalyticsBloc(sl()));

  // Providers
  sl.registerLazySingleton(() => AuthProvider(sl(), sl<ApiService>()));
  sl.registerLazySingleton(() => HotelProvider(sl()));
  sl.registerLazySingleton(() => BookingProvider(sl()));
  sl.registerLazySingleton(() => PromoProvider(sl()));
  // NotificationProvider needs ApiService to fetch /api/notifications
  sl.registerLazySingleton(() => NotificationProvider(sl<ApiService>()));

  // Services
  sl.registerLazySingleton(() => PaymentService(sl()));
  sl.registerLazySingleton(() => BookingService(sl()));
}
