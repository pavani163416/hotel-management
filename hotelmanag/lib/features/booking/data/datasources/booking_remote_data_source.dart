import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/booking/data/models/booking_model.dart';

abstract class BookingRemoteDataSource {
  Future<BookingModel> createBooking(Map<String, dynamic> data);
  Future<List<BookingModel>> getMyBookings();
  Future<BookingModel> cancelBooking(String id);
}

class BookingRemoteDataSourceImpl implements BookingRemoteDataSource {
  final ApiService _apiService;

  BookingRemoteDataSourceImpl(this._apiService);

  @override
  Future<BookingModel> createBooking(Map<String, dynamic> data) async {
    final response = await _apiService.post('bookings', data: data);
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
