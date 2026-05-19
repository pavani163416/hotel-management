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
  String _sortBy = 'Top Rated';

  HotelProvider(this._hotelRepository);

  List<HotelEntity> get hotels => _filteredHotels;
  List<HotelEntity> get allHotels => _allHotels;
  bool get isLoading => _isLoading;
  String? get error => _error;

  RangeValues get priceRange => _priceRange;
  String get propertyType => _propertyType;
  double get minRating => _minRating;
  List<String> get selectedAmenities => _selectedAmenities;
  String get sortBy => _sortBy;

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
        final uniqueMap = <String, HotelEntity>{};
        for (final hotel in hotels) {
          uniqueMap[hotel.id] = hotel;
        }
        _allHotels = uniqueMap.values.toList();
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

  void updateSortBy(String option) {
    _sortBy = option;
    _applyFilters();
  }

  void clearFilters() {
    _priceRange = const RangeValues(0, 5000);
    _propertyType = 'Any';
    _minRating = 0;
    _selectedAmenities = [];
    _searchQuery = '';
    _sortBy = 'Top Rated';
    _applyFilters();
  }

  void _applyFilters() {
    _filteredHotels = _allHotels.where((hotel) {
      final matchesSearch = hotel.name.toLowerCase().contains(_searchQuery) || 
                            hotel.location.toLowerCase().contains(_searchQuery);
      final matchesPrice = hotel.pricePerNight >= _priceRange.start && 
                           hotel.pricePerNight <= _priceRange.end;
      
      bool matchesType = true;
      if (_propertyType != 'Any') {
        if (_propertyType == 'Beach') {
          matchesType = _isBeachHotel(hotel);
        } else if (_propertyType == 'Mountain') {
          matchesType = _isMountainHotel(hotel);
        } else if (_propertyType == 'City') {
          matchesType = _isCityHotel(hotel);
        } else if (_propertyType == 'Desert') {
          matchesType = _isDesertHotel(hotel);
        } else if (_propertyType == 'Luxury') {
          matchesType = _isLuxuryHotel(hotel);
        } else {
          matchesType = hotel.type == _propertyType;
        }
      }
      
      final matchesRating = hotel.rating >= _minRating;
      
      final matchesAmenities = _selectedAmenities.isEmpty || 
                               _selectedAmenities.every((a) => hotel.amenities.contains(a));
      
      return matchesSearch && matchesPrice && matchesType && matchesRating && matchesAmenities;
    }).toList();

    // Apply Sorting
    if (_sortBy == 'Price: Low to High') {
      _filteredHotels.sort((a, b) => a.pricePerNight.compareTo(b.pricePerNight));
    } else if (_sortBy == 'Price: High to Low') {
      _filteredHotels.sort((a, b) => b.pricePerNight.compareTo(a.pricePerNight));
    } else {
      // Default to "Top Rated"
      _filteredHotels.sort((a, b) => b.rating.compareTo(a.rating));
    }

    notifyListeners();
  }

  bool _isBeachHotel(HotelEntity hotel) {
    final searchStr = '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'.toLowerCase();
    return searchStr.contains('beach') ||
           searchStr.contains('coast') ||
           searchStr.contains('sea') ||
           searchStr.contains('ocean') ||
           searchStr.contains('surf') ||
           searchStr.contains('sand') ||
           searchStr.contains('island') ||
           searchStr.contains('maldives') ||
           searchStr.contains('bali') ||
           searchStr.contains('tropical') ||
           searchStr.contains('shore') ||
           searchStr.contains('waterfront') ||
           searchStr.contains('palm') ||
           hotel.type.toLowerCase() == 'resort';
  }

  bool _isMountainHotel(HotelEntity hotel) {
    final searchStr = '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'.toLowerCase();
    return searchStr.contains('mountain') ||
           searchStr.contains('hill') ||
           searchStr.contains('alps') ||
           searchStr.contains('peak') ||
           searchStr.contains('summit') ||
           searchStr.contains('highland') ||
           searchStr.contains('snow') ||
           searchStr.contains('ski') ||
           searchStr.contains('forest') ||
           searchStr.contains('wood') ||
           searchStr.contains('nature') ||
           searchStr.contains('valley') ||
           searchStr.contains('ridge');
  }

  bool _isCityHotel(HotelEntity hotel) {
    final searchStr = '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'.toLowerCase();
    return searchStr.contains('city') ||
           searchStr.contains('downtown') ||
           searchStr.contains('urban') ||
           searchStr.contains('metropolis') ||
           searchStr.contains('tower') ||
           searchStr.contains('plaza') ||
           searchStr.contains('london') ||
           searchStr.contains('paris') ||
           searchStr.contains('tokyo') ||
           searchStr.contains('york') ||
           searchStr.contains('boulevard') ||
           searchStr.contains('center') ||
           hotel.type.toLowerCase() == 'hotel';
  }

  bool _isDesertHotel(HotelEntity hotel) {
    final searchStr = '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'.toLowerCase();
    return searchStr.contains('desert') ||
           searchStr.contains('dune') ||
           searchStr.contains('oasis') ||
           searchStr.contains('safari') ||
           searchStr.contains('canyon') ||
           searchStr.contains('dubai') ||
           searchStr.contains('sahara') ||
           searchStr.contains('sun');
  }

  bool _isLuxuryHotel(HotelEntity hotel) {
    final searchStr = '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'.toLowerCase();
    return hotel.pricePerNight > 300 ||
           searchStr.contains('luxury') ||
           searchStr.contains('spa') ||
           searchStr.contains('boutique') ||
           searchStr.contains('premium') ||
           searchStr.contains('royal') ||
           searchStr.contains('grand') ||
           searchStr.contains('star') ||
           hotel.type.toLowerCase() == 'villa' ||
           hotel.type.toLowerCase() == 'suite';
  }

  Future<bool> submitReview({
    required String hotelId,
    required String author,
    required int rating,
    required String comment,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _hotelRepository.submitReview(hotelId, author, rating, comment);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (updatedHotel) {
        final indexAll = _allHotels.indexWhere((h) => h.id == hotelId);
        if (indexAll != -1) {
          _allHotels[indexAll] = updatedHotel;
        }
        final indexFiltered = _filteredHotels.indexWhere((h) => h.id == hotelId);
        if (indexFiltered != -1) {
          _filteredHotels[indexFiltered] = updatedHotel;
        }
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }
}
