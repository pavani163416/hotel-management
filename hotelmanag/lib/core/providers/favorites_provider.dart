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
        _favorites = decodedList.map((item) => HotelEntity.fromJson(item)).toList();
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
