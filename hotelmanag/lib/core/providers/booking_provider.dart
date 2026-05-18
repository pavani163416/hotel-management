import 'package:flutter/material.dart';
import '../../features/booking/domain/repositories/booking_repository.dart';
import '../../features/booking/domain/entities/booking_entity.dart';
import '../../shared/domain/entities/hotel_entity.dart';

class BookingProvider extends ChangeNotifier {
  final BookingRepository _bookingRepository;
  List<BookingEntity> _bookings = [];
  bool _isLoading = false;
  String? _error;

  // --- Current Booking State ---
  HotelEntity? _currentHotel;
  DateTime _checkIn = DateTime.now().add(const Duration(days: 7));
  DateTime _checkOut = DateTime.now().add(const Duration(days: 10));
  int _guests = 2;
  String _selectedRoomType = 'Deluxe King Room';
  double _selectedRoomPrice = 0.0;
  
  Map<String, String> _leadGuest = {
    'name': '',
    'email': '',
    'phone': '',
    'requests': '',
  };
  
  List<Map<String, String>> _additionalAdults = [];
  List<Map<String, String>> _children = [];

  // Promo Code State
  String? _appliedPromoCode;
  double _discountAmount = 0.0;

  final Map<String, double> _validPromos = {
    'LUXE10': 0.10,
    'WELCOME15': 0.15,
    'VIP20': 0.20,
  };

  BookingProvider(this._bookingRepository);

  // Getters
  List<BookingEntity> get bookings => _bookings;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  HotelEntity? get currentHotel => _currentHotel;
  DateTime get checkIn => _checkIn;
  DateTime get checkOut => _checkOut;
  int get guests => _guests;
  String get selectedRoomType => _selectedRoomType;
  double get selectedRoomPrice => _selectedRoomPrice;
  Map<String, String> get leadGuest => _leadGuest;
  List<Map<String, String>> get additionalAdults => _additionalAdults;
  List<Map<String, String>> get children => _children;
  String? get appliedPromoCode => _appliedPromoCode;
  double get discountAmount => _discountAmount;

  int get nights => _checkOut.difference(_checkIn).inDays;
  double get subtotal => (_selectedRoomPrice > 0 ? _selectedRoomPrice : (_currentHotel?.pricePerNight ?? 0)) * nights;
  double get serviceFee => (subtotal - _discountAmount) * 0.05;
  double get taxes => (subtotal - _discountAmount) * 0.08;
  double get total => (subtotal - _discountAmount) + serviceFee + taxes;

  // Setters
  void startBooking(HotelEntity hotel) {
    _currentHotel = hotel;
    _selectedRoomType = 'Deluxe King Room';
    _selectedRoomPrice = hotel.pricePerNight;
    _appliedPromoCode = null;
    _discountAmount = 0.0;
    _leadGuest = {'name': '', 'email': '', 'phone': '', 'requests': ''};
    _additionalAdults = [];
    _children = [];
    notifyListeners();
  }

  void selectRoom(String type, double price) {
    _selectedRoomType = type;
    _selectedRoomPrice = price;
    // Reapply promo code if active
    if (_appliedPromoCode != null) {
      _discountAmount = subtotal * _validPromos[_appliedPromoCode]!;
    }
    notifyListeners();
  }

  bool applyPromoCode(String code) {
    final normalizedCode = code.toUpperCase().trim();
    if (_validPromos.containsKey(normalizedCode)) {
      _appliedPromoCode = normalizedCode;
      _discountAmount = subtotal * _validPromos[normalizedCode]!;
      notifyListeners();
      return true;
    }
    return false;
  }

  void removePromoCode() {
    _appliedPromoCode = null;
    _discountAmount = 0.0;
    notifyListeners();
  }

  void updateDates(DateTime checkIn, DateTime checkOut) {
    _checkIn = checkIn;
    _checkOut = checkOut;
    // Recalculate discount if promo applied
    if (_appliedPromoCode != null) {
      _discountAmount = subtotal * _validPromos[_appliedPromoCode]!;
    }
    notifyListeners();
  }

  void updateGuests(int count) {
    _guests = count;
    notifyListeners();
  }

  void updateLeadGuest(Map<String, String> data) {
    _leadGuest = data;
    notifyListeners();
  }

  void setAdditionalGuests(List<Map<String, String>> adults, List<Map<String, String>> children) {
    _additionalAdults = adults;
    _children = children;
    notifyListeners();
  }

  // --- Finalize Booking ---
  void completeBooking(String id) {
    if (_currentHotel == null) return;
    
    final newBooking = BookingEntity(
      id: id,
      roomId: 'RM-${_currentHotel!.id}-${_selectedRoomType.replaceAll(' ', '-').toUpperCase()}',
      hotelName: _currentHotel!.name,
      checkIn: _checkIn,
      checkOut: _checkOut,
      status: 'Confirmed',
      totalAmount: total,
      imageUrl: _currentHotel!.imageUrl,
      guestName: _leadGuest['name']?.isNotEmpty == true ? _leadGuest['name'] : 'Guest',
      roomNumber: '101',
      createdAt: DateTime.now(),
    );
    
    _bookings.insert(0, newBooking); // Add to history
    notifyListeners();
  }

  // --- History Logic ---
  Future<void> fetchMyBookings() async {
    // If we have local bookings, don't overwrite them for now to keep the "real data" the user just entered
    if (_bookings.isNotEmpty) return;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _bookingRepository.getMyBookings();

    result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
      },
      (bookings) {
        _bookings = bookings;
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  Future<bool> cancelBooking(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    // If it's a simulated local-only booking (starts with 'LS-'), we handle it entirely locally
    if (id.startsWith('LS-')) {
      final index = _bookings.indexWhere((b) => b.id == id);
      if (index != -1) {
        final old = _bookings[index];
        _bookings[index] = BookingEntity(
          id: old.id,
          roomId: old.roomId,
          hotelName: old.hotelName,
          checkIn: old.checkIn,
          checkOut: old.checkOut,
          status: 'Cancelled',
          totalAmount: old.totalAmount,
          imageUrl: old.imageUrl,
          guestName: old.guestName,
          roomNumber: old.roomNumber,
          createdAt: old.createdAt,
        );
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _isLoading = false;
      return false;
    }

    // Otherwise, it is a backend booking, so we MUST call the backend API!
    final result = await _bookingRepository.cancelBooking(id);
    _isLoading = false;
    
    return result.fold(
      (failure) {
        // Fallback: if it's not found on server but exists locally, cancel it locally anyway
        final index = _bookings.indexWhere((b) => b.id == id);
        if (index != -1) {
          final old = _bookings[index];
          _bookings[index] = BookingEntity(
            id: old.id,
            roomId: old.roomId,
            hotelName: old.hotelName,
            checkIn: old.checkIn,
            checkOut: old.checkOut,
            status: 'Cancelled',
            totalAmount: old.totalAmount,
            imageUrl: old.imageUrl,
            guestName: old.guestName,
            roomNumber: old.roomNumber,
            createdAt: old.createdAt,
          );
          notifyListeners();
          return true;
        }
        _error = failure.message;
        notifyListeners();
        return false;
      },
      (booking) {
        final idx = _bookings.indexWhere((b) => b.id == id);
        if (idx != -1) {
          _bookings[idx] = booking;
        }
        notifyListeners();
        return true;
      },
    );
  }
}
