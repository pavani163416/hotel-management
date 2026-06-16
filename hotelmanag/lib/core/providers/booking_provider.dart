import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../features/booking/domain/repositories/booking_repository.dart';
import '../widgets/notification_popup.dart';
import '../../features/booking/domain/entities/booking_entity.dart';
import '../../shared/domain/entities/hotel_entity.dart';
import '../../features/auth/domain/entities/user_entity.dart';
import 'promo_provider.dart';
import '../services/push_notifications.dart';

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
  String? _promoDescription;
  String _promoType = 'percentage';
  double _promoValue = 0.0;

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
  String? get promoDescription => _promoDescription;

  int get nights => _checkOut.difference(_checkIn).inDays;
  double get subtotal =>
      (_selectedRoomPrice > 0
          ? _selectedRoomPrice
          : (_currentHotel?.pricePerNight ?? 0)) *
      nights;
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

  /// TC-FE-041: Securely wipe ALL user-specific booking state on logout so no
  /// PII or booking data leaks to the next authenticated user on this device.
  void reset() {
    _currentHotel = null;
    _selectedRoomType = 'Deluxe King Room';
    _selectedRoomPrice = 0.0;
    _checkIn = DateTime.now().add(const Duration(days: 7));
    _checkOut = DateTime.now().add(const Duration(days: 10));
    _guests = 2;

    // Clear all PII
    _leadGuest = {
      'name': '',
      'email': '',
      'phone': '',
      'id': '',
      'requests': '',
    };
    _additionalAdults = [];
    _children = [];

    // Clear promo / financial data
    _appliedPromoCode = null;
    _discountAmount = 0.0;
    _promoDescription = null;
    _promoType = 'percentage';
    _promoValue = 0.0;

    // Clear booking history and error state
    _bookings = [];
    _error = null;

    notifyListeners();
  }

  void selectRoom(String type, double price) {
    _selectedRoomType = type;
    _selectedRoomPrice = price;
    _recalculateDiscount();
    notifyListeners();
  }

  void _recalculateDiscount() {
    if (_appliedPromoCode != null) {
      if (_promoType == 'percentage') {
        _discountAmount = subtotal * (_promoValue / 100);
      } else {
        _discountAmount = _promoValue;
      }
    } else {
      _discountAmount = 0.0;
    }
  }

  bool applyPromoCode(String code, List<CouponEntity> availableCoupons) {
    final normalizedCode = code.toUpperCase().trim();
    final coupon = availableCoupons.cast<CouponEntity?>().firstWhere(
      (c) => c!.code.toUpperCase() == normalizedCode,
      orElse: () => null,
    );

    if (coupon != null) {
      if (coupon.firstTimeOnly && _bookings.isNotEmpty) {
        _error = '$normalizedCode is for first-time guests only.';
        notifyListeners();
        return false;
      }
      _appliedPromoCode = normalizedCode;
      _promoDescription = coupon.description;
      _promoType = coupon.type;
      _promoValue = coupon.value;
      _recalculateDiscount();
      _error = null;
      notifyListeners();
      return true;
    }
    _error = 'Invalid promo code';
    notifyListeners();
    return false;
  }

  void removePromoCode() {
    _appliedPromoCode = null;
    _promoDescription = null;
    _promoType = 'percentage';
    _promoValue = 0.0;
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
    _recalculateDiscount();
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

  void setAdditionalGuests(
    List<Map<String, String>> adults,
    List<Map<String, String>> children,
  ) {
    _additionalAdults = adults;
    _children = children;
    notifyListeners();
  }

  // --- Finalize Booking ---
  Future<BookingEntity?> completeBooking(String paymentMethod) async {
    if (_currentHotel == null) return null;

    _isLoading = true;
    _error = null;
    notifyListeners();

    final prefixMap = const {
      'h1': 'hdl',
      'h2': 'tas',
      'h3': 'cbr',
      'h4': 'apl',
      'h5': 'tgm',
      'h6': 'scs',
    };
    String prefix = prefixMap[_currentHotel!.id] ?? '';
    if (prefix.isEmpty) {
      final cleanName = _currentHotel!.name.toLowerCase().replaceAll(
        RegExp(r'[^a-z]'),
        '',
      );
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

    final data = <String, dynamic>{
      // roomId is sent as hotelStringId so backend can look up the room
      'hotelStringId': mappedRoomId,
      'hotelId': _currentHotel!.id,
      'checkIn': _checkIn.toIso8601String(),
      'checkOut': _checkOut.toIso8601String(),
      'guests': _guests,
      if (_appliedPromoCode != null && _appliedPromoCode!.isNotEmpty)
        'promoCode': _appliedPromoCode,
      'paymentMode': paymentMethod == 'card'
          ? 'card'
          : paymentMethod == 'upi'
              ? 'upi'
              : paymentMethod == 'bank_transfer'
                  ? 'bank_transfer'
                  : 'online',
      if (_leadGuest['requests']?.isNotEmpty == true)
        'specialRequests': _leadGuest['requests'],
      'guestSnapshot': {
        'name': _leadGuest['name']?.isNotEmpty == true
            ? _leadGuest['name']!
            : 'Guest',
        'email': _leadGuest['email'] ?? '',
        'phone': _leadGuest['phone'] ?? '',
      },
    };

    final result = await _bookingRepository.createBooking(data);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return null;
      },
      (booking) {
        _bookings.insert(0, booking); // Add backend booking
        _isLoading = false;
        notifyListeners();
        return booking;
      },
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
      (bookings) async {
        final prefs = await SharedPreferences.getInstance();
        final storedStatuses = prefs.getString('booking_statuses') ?? '{}';
        final Map<String, dynamic> persistedOld = json.decode(storedStatuses);

        final oldStatuses = {
          for (var b in _bookings) b.id: b.status.toLowerCase(),
        };
        _bookings = List<BookingEntity>.from(bookings);
        _error = null;
        _isLoading = false;

        final newStatusesToSave = <String, String>{};

        for (var newB in _bookings) {
          final newStatus = newB.status.toLowerCase();
          newStatusesToSave[newB.id] = newStatus;

          final oldStatusMemory = oldStatuses[newB.id];
          final oldStatusDisk = persistedOld[newB.id]?.toString().toLowerCase();

          // Check if we have a known old state (either from disk or memory)
          // and it has changed to a NEW state.
          final oldStatus = oldStatusMemory ?? oldStatusDisk;

          if (oldStatus != null && oldStatus != newStatus) {
            String title = 'Booking Update';
            String body =
                'Your booking at ${newB.hotelName} is now ${newB.status}.';

            if (newStatus == 'confirmed' || newStatus == 'checkedin') {
              title = 'Booking Accepted';
            } else if (newStatus == 'cancelled' || newStatus == 'rejected') {
              title = 'Booking Cancelled/Rejected';
            }

            showNotificationPopup(
              title: title,
              subtitle: body,
              icon: Icons.info_outline,
              iconColor: Colors.blueAccent,
            );
            PushNotificationService.showLocalNotification(
              title: title,
              body: body,
            );
          }
        }

        await prefs.setString(
          'booking_statuses',
          json.encode(newStatusesToSave),
        );
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
