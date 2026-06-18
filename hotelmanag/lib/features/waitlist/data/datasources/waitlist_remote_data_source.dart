import 'package:dio/dio.dart';
import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/waitlist/data/models/waitlist_model.dart';

abstract class WaitlistRemoteDataSource {
  Future<WaitlistModel> joinWaitlist(Map<String, dynamic> data);
  Future<List<WaitlistModel>> getMyWaitlists();
  Future<WaitlistModel> cancelWaitlist(String id);
}

class WaitlistRemoteDataSourceImpl implements WaitlistRemoteDataSource {
  final ApiService _apiService;

  WaitlistRemoteDataSourceImpl(this._apiService);

  @override
  Future<WaitlistModel> joinWaitlist(Map<String, dynamic> data) async {
    final response = await _apiService.post('/waitlist/join', data: data);
    return WaitlistModel.fromJson(response.data['data']);
  }

  @override
  Future<List<WaitlistModel>> getMyWaitlists() async {
    final response = await _apiService.get('/waitlist/my');
    final List list = response.data['data'];
    return list.map((e) => WaitlistModel.fromJson(e)).toList();
  }

  @override
  Future<WaitlistModel> cancelWaitlist(String id) async {
    final response = await _apiService.delete('/waitlist/cancel/$id');
    return WaitlistModel.fromJson(response.data['data']);
  }
}
