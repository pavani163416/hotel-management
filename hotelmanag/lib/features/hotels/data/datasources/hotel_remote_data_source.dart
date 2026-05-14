import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/hotels/data/models/hotel_model.dart';

abstract class HotelRemoteDataSource {
  Future<List<HotelModel>> getHotels();
  Future<HotelModel> getHotelDetails(String id);
}

class HotelRemoteDataSourceImpl implements HotelRemoteDataSource {
  final ApiService _apiService;

  HotelRemoteDataSourceImpl(this._apiService);

  @override
  Future<List<HotelModel>> getHotels() async {
    final response = await _apiService.get('hotels');
    final List list = response.data['data'];
    return list.map((e) => HotelModel.fromJson(e)).toList();
  }

  @override
  Future<HotelModel> getHotelDetails(String id) async {
    final response = await _apiService.get('hotels/$id');
    return HotelModel.fromJson(response.data['data']);
  }
}
