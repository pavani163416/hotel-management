import 'package:flutter/material.dart';
import '../../features/hotels/domain/repositories/hotel_repository.dart';
import '../../shared/domain/entities/hotel_entity.dart';

class HotelProvider extends ChangeNotifier {
  final HotelRepository _hotelRepository;
  List<HotelEntity> _allHotels = [];
  List<HotelEntity> _filteredHotels = [];
  bool _isLoading = false;
  String? _error;

  // Filter State
  RangeValues _priceRange = const RangeValues(0, 5000);
  String _propertyType = 'Any';
  double _minRating = 0;
  List<String> _selectedAmenities = [];
  String _searchQuery = '';

  HotelProvider(this._hotelRepository);

  List<HotelEntity> get hotels => _filteredHotels;
  List<HotelEntity> get allHotels => _allHotels;
  bool get isLoading => _isLoading;
  String? get error => _error;

  RangeValues get priceRange => _priceRange;
  String get propertyType => _propertyType;
  double get minRating => _minRating;
  List<String> get selectedAmenities => _selectedAmenities;

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
        _allHotels = hotels;
        _applyFilters();
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  void updatePriceRange(RangeValues values) {
    _priceRange = values;
    _applyFilters();
  }

  void updatePropertyType(String type) {
    _propertyType = type;
    _applyFilters();
  }

  void updateMinRating(double rating) {
    _minRating = rating;
    _applyFilters();
  }

  void toggleAmenity(String amenity) {
    if (_selectedAmenities.contains(amenity)) {
      _selectedAmenities.remove(amenity);
    } else {
      _selectedAmenities.add(amenity);
    }
    _applyFilters();
  }

  void updateSearch(String query) {
    _searchQuery = query.toLowerCase();
    _applyFilters();
  }

  void clearFilters() {
    _priceRange = const RangeValues(0, 5000);
    _propertyType = 'Any';
    _minRating = 0;
    _selectedAmenities = [];
    _searchQuery = '';
    _applyFilters();
  }

  void _applyFilters() {
    _filteredHotels = _allHotels.where((hotel) {
      final matchesSearch = hotel.name.toLowerCase().contains(_searchQuery) || 
                            hotel.location.toLowerCase().contains(_searchQuery);
      final matchesPrice = hotel.pricePerNight >= _priceRange.start && 
                           hotel.pricePerNight <= _priceRange.end;
      final matchesType = _propertyType == 'Any' || hotel.type == _propertyType;
      final matchesRating = hotel.rating >= _minRating;
      
      final matchesAmenities = _selectedAmenities.isEmpty || 
                               _selectedAmenities.every((a) => hotel.amenities.contains(a));
      
      return matchesSearch && matchesPrice && matchesType && matchesRating && matchesAmenities;
    }).toList();
    notifyListeners();
  }
}
