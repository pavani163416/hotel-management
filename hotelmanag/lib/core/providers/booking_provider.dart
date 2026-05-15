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
  
  Map<String, String> _leadGuest = {
    'name': '',
    'email': '',
    'phone': '',
    'requests': '',
  };
  
  List<Map<String, String>> _additionalAdults = [];
  List<Map<String, String>> _children = [];

  BookingProvider(this._bookingRepository);

  // Getters
  List<BookingEntity> get bookings => _bookings;
  bool get isLoading => _isLoading;
  String? get error => _error;
  
  HotelEntity? get currentHotel => _currentHotel;
  DateTime get checkIn => _checkIn;
  DateTime get checkOut => _checkOut;
  int get guests => _guests;
  Map<String, String> get leadGuest => _leadGuest;
  List<Map<String, String>> get additionalAdults => _additionalAdults;
  List<Map<String, String>> get children => _children;

  int get nights => _checkOut.difference(_checkIn).inDays;
  double get subtotal => (_currentHotel?.pricePerNight ?? 0) * nights;
  double get serviceFee => subtotal * 0.05;
  double get taxes => subtotal * 0.08;
  double get total => subtotal + serviceFee + taxes;

  // Setters
  void startBooking(HotelEntity hotel) {
    _currentHotel = hotel;
    // Reset guest info for new booking
    _leadGuest = {'name': '', 'email': '', 'phone': '', 'requests': ''};
    _additionalAdults = [];
    _children = [];
    notifyListeners();
  }

  void updateDates(DateTime checkIn, DateTime checkOut) {
    _checkIn = checkIn;
    _checkOut = checkOut;
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

  // --- History Logic ---
  Future<void> fetchMyBookings() async {
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
    final result = await _bookingRepository.cancelBooking(id);
    return result.fold(
      (failure) {
        _error = failure.message;
        notifyListeners();
        return false;
      },
      (booking) {
        final index = _bookings.indexWhere((b) => b.id == id);
        if (index != -1) {
          _bookings[index] = booking;
        }
        notifyListeners();
        return true;
      },
    );
  }
}
