import 'dart:convert';
import 'package:dartz/dartz.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:hotelmanag/core/errors/failures.dart';
import 'package:hotelmanag/shared/domain/entities/hotel_entity.dart';
import 'package:hotelmanag/features/hotels/domain/repositories/hotel_repository.dart';
import 'package:hotelmanag/features/hotels/data/datasources/hotel_remote_data_source.dart';
import 'package:hotelmanag/features/hotels/data/models/hotel_model.dart';

const _kHotelCacheKey = 'cached_hotels_v2';

class HotelRepositoryImpl implements HotelRepository {
  final HotelRemoteDataSource _remoteDataSource;

  HotelRepositoryImpl(this._remoteDataSource);

  // ── Persist hotels to SharedPreferences ──────────────────
  Future<void> _saveToCache(List<HotelEntity> hotels) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final json = jsonEncode(
        hotels.map((h) {
          if (h is HotelModel) return h.toJson();
          return h.toJson();
        }).toList(),
      );
      await prefs.setString(_kHotelCacheKey, json);
    } catch (e) {
      debugPrint('Hotel cache write error: $e');
    }
  }

  // ── Load hotels from SharedPreferences ───────────────────
  Future<List<HotelEntity>> _loadFromCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kHotelCacheKey);
      if (raw == null || raw.isEmpty) return [];
      final List decoded = jsonDecode(raw) as List;
      return decoded
          .map((e) => HotelModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      debugPrint('Hotel cache read error: $e');
      return [];
    }
  }

  @override
  Future<Either<Failure, List<HotelEntity>>> getHotels() async {
    try {
      // Try network first
      final hotels = await _remoteDataSource.getHotels();
      // Save fresh data to cache
      await _saveToCache(hotels);
      return Right(hotels);
    } on DioException catch (e) {
      // Network failed — try cache
      final cached = await _loadFromCache();
      if (cached.isNotEmpty) {
        debugPrint('Offline: serving ${cached.length} hotels from cache');
        return Right(cached);
      }
      // No cache either — return error
      String message =
          'Unable to connect. Please check your internet connection.';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      // Any other error — try cache
      final cached = await _loadFromCache();
      if (cached.isNotEmpty) {
        return Right(cached);
      }
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, HotelEntity>> getHotelDetails(String id) async {
    try {
      final hotel = await _remoteDataSource.getHotelDetails(id);
      return Right(hotel);
    } on DioException catch (e) {
      // Try to serve from the hotels list cache
      final cached = await _loadFromCache();
      final found = cached.where((h) => h.id == id).toList();
      if (found.isNotEmpty) return Right(found.first);

      String message = 'Failed to fetch hotel details';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      } else if (e.message != null && e.message!.isNotEmpty) {
        message = e.message!;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      final cached = await _loadFromCache();
      final found = cached.where((h) => h.id == id).toList();
      if (found.isNotEmpty) return Right(found.first);
      return Left(ServerFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, HotelEntity>> submitReview(
    String hotelId,
    String author,
    int rating,
    String comment,
  ) async {
    try {
      final hotel = await _remoteDataSource.submitReview(
        hotelId,
        author,
        rating,
        comment,
      );
      // Update cache with the new review
      final cached = await _loadFromCache();
      final idx = cached.indexWhere((h) => h.id == hotelId);
      if (idx != -1) {
        cached[idx] = hotel;
        await _saveToCache(cached);
      }
      return Right(hotel);
    } on DioException catch (e) {
      debugPrint('[HotelRepositoryImpl] submitReview failed. Response: ${e.response?.data}');
      String message = 'Failed to submit review';
      if (e.response?.data is Map) {
        message = e.response?.data['message'] ?? message;
      } else if (e.message != null && e.message!.isNotEmpty) {
        message = e.message!;
      }
      return Left(ServerFailure(message));
    } catch (e) {
      debugPrint('[HotelRepositoryImpl] submitReview failed with unexpected error: $e');
      return Left(ServerFailure(e.toString()));
    }
  }
}
