import 'package:flutter/material.dart';
import '../../features/hotels/domain/repositories/hotel_repository.dart';
import '../../shared/domain/entities/hotel_entity.dart';

class HotelProvider extends ChangeNotifier {
  final HotelRepository _hotelRepository;
  List<HotelEntity> _allHotels = [];
  List<HotelEntity> _filteredHotels = [];
  bool _isLoading = false;
  String? _error;

  // Cache of pre-built lowercase search strings per hotel id — avoids
  // rebuilding the concatenated string on every filter/sort call.
  final Map<String, String> _hotelSearchCache = {};

  // Filter State
  RangeValues _priceRange = const RangeValues(0, 5000);
  String _propertyType = 'Any';
  double _minRating = 0;
  List<String> _selectedAmenities = [];
  String _searchQuery = '';
  String _sortBy = 'Top Rated';

  HotelProvider(this._hotelRepository) {
    _loadCachedHotels();
  }

  /// Load cached hotels immediately on startup so the UI has data
  /// before the first network response arrives.
  Future<void> _loadCachedHotels() async {
    if (_allHotels.isNotEmpty) return;
    final result = await _hotelRepository.getHotels();
    result.fold(
      (_) {}, // silent — errors handled in fetchHotels
      (hotels) {
        if (hotels.isEmpty) return;
        final uniqueMap = <String, HotelEntity>{};
        for (final hotel in hotels) {
          uniqueMap[hotel.id] = hotel;
        }
        _allHotels = uniqueMap.values.toList();
        _hotelSearchCache.clear();
        for (final hotel in _allHotels) {
          _hotelSearchCache[hotel.id] =
              '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'
                  .toLowerCase();
        }
        _applyFilters();
        notifyListeners();
      },
    );
  }

  List<HotelEntity> get hotels => _filteredHotels;
  List<HotelEntity> get allHotels => _allHotels;
  bool get isLoading => _isLoading;
  String? get error => _error;

  RangeValues get priceRange => _priceRange;
  String get propertyType => _propertyType;
  double get minRating => _minRating;
  List<String> get selectedAmenities => _selectedAmenities;
  String get sortBy => _sortBy;

  Future<void> fetchHotels({bool silent = false}) async {
    // If we already have data, do a silent background refresh
    // so the screen never shows empty while loading
    if (_allHotels.isNotEmpty) {
      silent = true;
    }

    if (!silent) {
      _isLoading = true;
      _error = null;
      notifyListeners();
    }

    final result = await _hotelRepository.getHotels();

    result.fold(
      (failure) {
        // Only show error if we have no data to display
        if (_allHotels.isEmpty) {
          _error = failure.message;
        }
        _isLoading = false;
        notifyListeners();
      },
      (hotels) {
        final uniqueMap = <String, HotelEntity>{};
        for (final hotel in hotels) {
          uniqueMap[hotel.id] = hotel;
        }
        _allHotels = uniqueMap.values.toList();
        // Rebuild search string cache for the new hotel list
        _hotelSearchCache.clear();
        for (final hotel in _allHotels) {
          _hotelSearchCache[hotel.id] =
              '${hotel.name} ${hotel.location} ${hotel.description} ${hotel.type} ${hotel.amenities.join(' ')}'
                  .toLowerCase();
        }
        _error = null;
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
      final searchStr = _hotelSearchCache[hotel.id] ?? '';
      final matchesSearch = searchStr.contains(_searchQuery) ||
                            hotel.name.toLowerCase().contains(_searchQuery);
      final matchesPrice = hotel.pricePerNight >= _priceRange.start &&
                           hotel.pricePerNight <= _priceRange.end;

      bool matchesType = true;
      if (_propertyType != 'Any') {
        if (_propertyType == 'Beach') {
          matchesType = _isBeachHotel(hotel, searchStr);
        } else if (_propertyType == 'Mountain') {
          matchesType = _isMountainHotel(hotel, searchStr);
        } else if (_propertyType == 'City') {
          matchesType = _isCityHotel(hotel, searchStr);
        } else if (_propertyType == 'Desert') {
          matchesType = _isDesertHotel(hotel, searchStr);
        } else if (_propertyType == 'Luxury') {
          matchesType = _isLuxuryHotel(hotel, searchStr);
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
      _filteredHotels.sort((a, b) => b.rating.compareTo(a.rating));
    }

    notifyListeners();
  }

  bool _isBeachHotel(HotelEntity hotel, String searchStr) {
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

  bool _isMountainHotel(HotelEntity hotel, String searchStr) {
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

  bool _isCityHotel(HotelEntity hotel, String searchStr) {
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

  bool _isDesertHotel(HotelEntity hotel, String searchStr) {
    return searchStr.contains('desert') ||
           searchStr.contains('dune') ||
           searchStr.contains('oasis') ||
           searchStr.contains('safari') ||
           searchStr.contains('canyon') ||
           searchStr.contains('dubai') ||
           searchStr.contains('sahara') ||
           searchStr.contains('sun');
  }

  bool _isLuxuryHotel(HotelEntity hotel, String searchStr) {
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
        // Replace the hotel in both lists so reviews appear immediately
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
