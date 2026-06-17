import 'package:hotelmanag/core/network/api_service.dart';
import '../../domain/entities/booking_entity.dart';
import '../models/booking_model.dart';

class BookingService {
  final ApiService _apiService;

  BookingService(this._apiService);

  Future<BookingEntity> createBooking(Map<String, dynamic> data) async {
    final response = await _apiService.post('bookings', data: data);
    return BookingModel.fromJson(response.data['data']);
  }

  Future<List<BookingEntity>> getMyBookings() async {
    final response = await _apiService.get('auth/bookings');
    final List list = response.data['data'];
    return list.map((e) => BookingModel.fromJson(e)).toList();
  }

  Future<BookingEntity> cancelBooking(String id) async {
    final response = await _apiService.patch('bookings/$id/cancel');
    return BookingModel.fromJson(response.data['data']);
  }
}
