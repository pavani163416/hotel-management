import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/analytics/data/models/analytics_model.dart';

abstract class AnalyticsRemoteDataSource {
  Future<AnalyticsModel> getWeeklyAnalytics(String hotelId);
  Future<AnalyticsModel> getMonthlyAnalytics(String hotelId);
}

class AnalyticsRemoteDataSourceImpl implements AnalyticsRemoteDataSource {
  final ApiService _apiService;

  AnalyticsRemoteDataSourceImpl(this._apiService);

  @override
  Future<AnalyticsModel> getWeeklyAnalytics(String hotelId) async {
    final response = await _apiService.get('/owners/analytics/weekly?hotelId=$hotelId');
    return AnalyticsModel.fromJson(response.data['data']);
  }

  @override
  Future<AnalyticsModel> getMonthlyAnalytics(String hotelId) async {
    final response = await _apiService.get('/owners/analytics/monthly?hotelId=$hotelId');
    return AnalyticsModel.fromJson(response.data['data']);
  }
}
