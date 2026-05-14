import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/booking/data/models/booking_model.dart';

abstract class BookingRemoteDataSource {
  Future<BookingModel> createBooking({
    required String roomId,
    required DateTime checkIn,
    required DateTime checkOut,
    String? paymentMethod,
    String? specialRequests,
    String? promoCode,
  });
  Future<List<BookingModel>> getMyBookings();
  Future<BookingModel> cancelBooking(String id);
}

class BookingRemoteDataSourceImpl implements BookingRemoteDataSource {
  final ApiService _apiService;

  BookingRemoteDataSourceImpl(this._apiService);

  @override
  Future<BookingModel> createBooking({
    required String roomId,
    required DateTime checkIn,
    required DateTime checkOut,
    String? paymentMethod,
    String? specialRequests,
    String? promoCode,
  }) async {
    final response = await _apiService.post('bookings', data: {
      'roomId': roomId,
      'checkIn': checkIn.toIso8601String(),
      'checkOut': checkOut.toIso8601String(),
      'paymentMethod': paymentMethod,
      'specialRequests': specialRequests,
      'promoCode': promoCode,
    });
    return BookingModel.fromJson(response.data['data']);
  }

  @override
  Future<List<BookingModel>> getMyBookings() async {
    final response = await _apiService.get('auth/bookings');
    final List list = response.data['data'];
    return list.map((e) => BookingModel.fromJson(e)).toList();
  }

  @override
  Future<BookingModel> cancelBooking(String id) async {
    final response = await _apiService.patch('bookings/$id/cancel');
    return BookingModel.fromJson(response.data['data']);
  }
}
