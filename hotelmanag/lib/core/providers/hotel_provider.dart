import 'package:flutter/material.dart';
import '../../features/hotels/domain/repositories/hotel_repository.dart';
import '../../shared/domain/entities/hotel_entity.dart';

class HotelProvider extends ChangeNotifier {
  final HotelRepository _hotelRepository;
  List<HotelEntity> _hotels = [];
  bool _isLoading = false;
  String? _error;

  HotelProvider(this._hotelRepository);

  List<HotelEntity> get hotels => _hotels;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchHotels() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _hotelRepository.getHotels();

    result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
      },
      (hotels) {
        _hotels = hotels;
        _isLoading = false;
        notifyListeners();
      },
    );
  }
}
