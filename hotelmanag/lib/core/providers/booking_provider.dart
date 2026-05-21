import 'package:flutter/material.dart';
import '../../features/booking/domain/repositories/booking_repository.dart';
import '../widgets/notification_popup.dart';
import '../../features/booking/domain/entities/booking_entity.dart';
import '../../shared/domain/entities/hotel_entity.dart';
import '../../features/auth/domain/entities/user_entity.dart';

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
    'id': '',
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
  void startBooking(HotelEntity hotel, {UserEntity? user}) {
    _currentHotel = hotel;
    _selectedRoomType = 'Deluxe King Room';
    _selectedRoomPrice = hotel.pricePerNight;
    _appliedPromoCode = null;
    _discountAmount = 0.0;
    _leadGuest = {
      'name': user?.name ?? '',
      'email': user?.email ?? '',
      'phone': user?.phone ?? '',
      'id': '',
      'requests': '',
    };
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
    if (checkOut.isBefore(checkIn.add(const Duration(days: 1)))) {
      _checkOut = checkIn.add(const Duration(days: 1));
    } else {
      _checkOut = checkOut;
    }
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
  Future<bool> completeBooking(String paymentMethod) async {
    if (_currentHotel == null) return false;
    
    _isLoading = true;
    _error = null;
    notifyListeners();

    final prefixMap = const {
      'h1': 'hdl', 'h2': 'tas', 'h3': 'cbr',
      'h4': 'apl', 'h5': 'tgm', 'h6': 'scs',
    };
    String prefix = prefixMap[_currentHotel!.id] ?? '';
    if (prefix.isEmpty) {
      final cleanName = _currentHotel!.name.toLowerCase().replaceAll(RegExp(r'[^a-z]'), '');
      prefix = cleanName.length >= 3 ? cleanName.substring(0, 3) : cleanName;
      if (prefix.isEmpty) prefix = 'hh';
    }

    String suffix = '101';
    final normalizedRoomType = _selectedRoomType.toLowerCase();
    if (normalizedRoomType.contains('suite')) {
      suffix = '102';
    } else if (normalizedRoomType.contains('penthouse') || 
               normalizedRoomType.contains('villa') || 
               normalizedRoomType.contains('bungalow')) {
      suffix = '103';
    }
    
    final mappedRoomId = '$prefix-$suffix';

    final data = {
      'roomId': mappedRoomId,
      'roomNumber': mappedRoomId,
      'hotelId': _currentHotel!.id,
      'hotelName': _currentHotel!.name,
      'checkIn': _checkIn.toIso8601String(),
      'checkOut': _checkOut.toIso8601String(),
      'pricePerNight': _selectedRoomPrice,
      'subtotal': subtotal,
      'taxes': taxes,
      'discount': discountAmount,
      'totalAmount': total,
      'promoCode': _appliedPromoCode,
      'paymentMethod': paymentMethod,
      'guest': {
        'name': _leadGuest['name']?.isNotEmpty == true ? _leadGuest['name']! : 'Guest',
        'email': _leadGuest['email'] ?? '',
        'phone': _leadGuest['phone'] ?? '',
        'id': _leadGuest['id'] ?? '',
      },
      'additionalAdults': _additionalAdults,
      'additionalChildren': _children,
    };

    final result = await _bookingRepository.createBooking(data);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (booking) {
        _bookings.insert(0, booking); // Add backend booking
        _isLoading = false;
        notifyListeners();
        return true;
      }
    );
  }

  // --- History Logic ---
  Future<void> fetchMyBookings() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _bookingRepository.getMyBookings();

    result.fold(
      (failure) {
        // Only show error if we have no cached bookings
        if (_bookings.isEmpty) {
          _error = failure.message;
        }
        _isLoading = false;
        notifyListeners();
      },
      (bookings) {
        _bookings = List<BookingEntity>.from(bookings);
        _error = null;
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  Future<bool> cancelBooking(String id) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _bookingRepository.cancelBooking(id);
    _isLoading = false;
    
    return result.fold(
      (failure) {
        _error = failure.message;
        notifyListeners();
        return false;
      },
      (booking) {
        final idx = _bookings.indexWhere((b) => b.id == id);
        if (idx != -1) {
          _bookings[idx] = booking;
        }
        // Show global in-app popup notification for cancellations
        if (booking.status.toLowerCase() == 'cancelled') {
          showNotificationPopup(
            title: 'Booking Cancelled',
            subtitle: 'Your stay at ${booking.hotelName} has been cancelled.',
            icon: Icons.cancel_outlined,
            iconColor: Colors.redAccent,
          );
        }
        notifyListeners();
        return true;
      },
    );
  }
}
