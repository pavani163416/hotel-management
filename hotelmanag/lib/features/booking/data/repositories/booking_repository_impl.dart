import 'dart:convert';
import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/features/booking/domain/entities/booking_entity.dart';
import 'package:hotelmanag/features/booking/domain/repositories/booking_repository.dart';
import 'package:hotelmanag/features/booking/data/datasources/booking_remote_data_source.dart';
import 'package:hotelmanag/features/booking/data/models/booking_model.dart';

const _kBookingCacheKey = 'cached_bookings_v2';

class BookingRepositoryImpl implements BookingRepository {
  final BookingRemoteDataSource _remoteDataSource;

  BookingRepositoryImpl(this._remoteDataSource);

  Future<void> _saveToCache(List<BookingEntity> bookings) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(bookings.map((b) {
        if (b is BookingModel) return b.toJson();
        return (b as BookingModel).toJson();
      }).toList());
      await prefs.setString(_kBookingCacheKey, json);
    } catch (e) {
      debugPrint('Booking cache write error: $e');
    }
  }

  Future<List<BookingEntity>> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kBookingCacheKey);
      if (raw == null || raw.isEmpty) return [];
      final List decoded = jsonDecode(raw) as List;
      return decoded
          .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('Booking cache read error: $e');
      return [];
    }
  }

  @override
  Future<Either<Failure, BookingEntity>> createBooking(
      Map<String, dynamic> data) async {
    try {
      final booking = await _remoteDataSource.createBooking(data);
      // Append new booking to cache
      final cached = await _loadFromCache();
      cached.insert(0, booking);
      await _saveToCache(cached);
      return Right(booking);
    } on DioException catch (e) {
      String message = 'Failed to create booking';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, List<BookingEntity>>> getMyBookings() async {
    try {
      final bookings = await _remoteDataSource.getMyBookings();
      await _saveToCache(bookings);
      return Right(bookings);
    } on DioException catch (e) {
      // Offline — serve from cache
      final cached = await _loadFromCache();
      if (cached.isNotEmpty) {
        debugPrint('Offline: serving ${cached.length} bookings from cache');
        return Right(cached);
      }
      String message = 'Unable to connect. Please check your internet connection.';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      final cached = await _loadFromCache();
      if (cached.isNotEmpty) return Right(cached);
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, BookingEntity>> cancelBooking(String id) async {
    try {
      final booking = await _remoteDataSource.cancelBooking(id);
      // Update cache
      final cached = await _loadFromCache();
      final idx = cached.indexWhere((b) => b.id == id);
      if (idx != -1) {
        cached[idx] = booking;
        await _saveToCache(cached);
      }
      return Right(booking);
    } on DioException catch (e) {
      String message = 'Failed to cancel booking';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      return Left(ServerFailure(e.toString()));
    }
  }
}
