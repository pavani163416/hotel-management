import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../shared/domain/entities/hotel_entity.dart';

class FavoritesProvider extends ChangeNotifier {
  List<HotelEntity> _favorites = [];
  static const String _favoritesKey = 'user_favorites';

  FavoritesProvider() {
    _loadFavorites();
  }

  List<HotelEntity> get favorites => List.unmodifiable(_favorites);

  Future<void> _loadFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? favoritesJson = prefs.getString(_favoritesKey);
      
      if (favoritesJson != null) {
        final List<dynamic> decodedList = jsonDecode(favoritesJson);
        final loaded = decodedList.map((item) => HotelEntity.fromJson(item)).toList();
        
        bool needsResave = false;
        _favorites = loaded.map((hotel) {
          if (hotel.id.isEmpty) {
            needsResave = true;
            String repairedId = '';
            final name = hotel.name.toLowerCase();
            if (name.contains('lumière') || name.contains('lumiere')) repairedId = 'h1';
            else if (name.contains('azure')) repairedId = 'h2';
            else if (name.contains('coral')) repairedId = 'h3';
            else if (name.contains('alpine')) repairedId = 'h4';
            else if (name.contains('grand')) repairedId = 'h5';
            else if (name.contains('santorini')) repairedId = 'h6';
            
            if (repairedId.isNotEmpty) {
              return HotelEntity(
                id: repairedId,
                name: hotel.name,
                location: hotel.location,
                rating: hotel.rating,
                pricePerNight: hotel.pricePerNight,
                imageUrl: hotel.imageUrl,
                description: hotel.description,
                type: hotel.type,
                amenities: hotel.amenities,
                reviews: hotel.reviews,
              );
            }
          }
          return hotel;
        }).where((hotel) => hotel.id.isNotEmpty).toList();
        
        final uniqueMap = <String, HotelEntity>{};
        for (final hotel in _favorites) {
          uniqueMap[hotel.id] = hotel;
        }
        _favorites = uniqueMap.values.toList();
        
        if (needsResave) {
          await _saveFavorites();
        }
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error loading favorites: $e');
    }
  }

  Future<void> _saveFavorites() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String encodedList = jsonEncode(_favorites.map((h) => h.toJson()).toList());
      await prefs.setString(_favoritesKey, encodedList);
    } catch (e) {
      debugPrint('Error saving favorites: $e');
    }
  }

  void toggleFavorite(HotelEntity hotel) {
    final index = _favorites.indexWhere((h) => h.id == hotel.id);
    if (index != -1) {
      _favorites.removeAt(index);
    } else {
      _favorites.add(hotel);
    }
    notifyListeners();
    _saveFavorites();
  }

  bool isFavorite(HotelEntity hotel) {
    return _favorites.any((h) => h.id == hotel.id);
  }

  Future<void> clearFavorites() async {
    _favorites = [];
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_favoritesKey);
  }
}
