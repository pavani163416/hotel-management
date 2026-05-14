import 'package:flutter/material.dart';
import '../../features/booking/domain/repositories/booking_repository.dart';
import '../../features/booking/domain/entities/booking_entity.dart';

class BookingProvider extends ChangeNotifier {
  final BookingRepository _bookingRepository;
  List<BookingEntity> _bookings = [];
  bool _isLoading = false;
  String? _error;

  BookingProvider(this._bookingRepository);

  List<BookingEntity> get bookings => _bookings;
  bool get isLoading => _isLoading;
  String? get error => _error;

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
        // Update local list
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
