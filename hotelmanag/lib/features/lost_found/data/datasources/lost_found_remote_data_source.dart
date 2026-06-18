import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/lost_found/data/models/lost_found_model.dart';

abstract class LostFoundRemoteDataSource {
  Future<LostFoundModel> reportLostFound(Map<String, dynamic> data);
  Future<List<LostFoundModel>> getMyLostFoundReports();
}

class LostFoundRemoteDataSourceImpl implements LostFoundRemoteDataSource {
  final ApiService _apiService;

  LostFoundRemoteDataSourceImpl(this._apiService);

  @override
  Future<LostFoundModel> reportLostFound(Map<String, dynamic> data) async {
    final response = await _apiService.post('/lost-found/report', data: data);
    return LostFoundModel.fromJson(response.data['data']);
  }

  @override
  Future<List<LostFoundModel>> getMyLostFoundReports() async {
    final response = await _apiService.get('/lost-found/my');
    final List list = response.data['data'];
    return list.map((e) => LostFoundModel.fromJson(e)).toList();
  }
}
