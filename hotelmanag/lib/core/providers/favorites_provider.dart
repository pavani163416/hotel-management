import 'package:flutter/material.dart';
import '../../shared/domain/entities/hotel_entity.dart';

class FavoritesProvider extends ChangeNotifier {
  final List<HotelEntity> _favorites = [];

  List<HotelEntity> get favorites => List.unmodifiable(_favorites);

  void toggleFavorite(HotelEntity hotel) {
    if (_favorites.contains(hotel)) {
      _favorites.remove(hotel);
    } else {
      _favorites.add(hotel);
    }
    notifyListeners();
  }

  bool isFavorite(HotelEntity hotel) {
    return _favorites.contains(hotel);
  }
}
