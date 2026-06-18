import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/planner/data/models/trip_plan_model.dart';

abstract class PlannerRemoteDataSource {
  Future<TripPlanModel> getTripPlan(String bookingId);
  Future<TripPlanModel> addActivity(String planId, String dayId, Map<String, dynamic> data);
  Future<TripPlanModel> toggleActivityStatus(String planId, String dayId, String activityId);
}

class PlannerRemoteDataSourceImpl implements PlannerRemoteDataSource {
  final ApiService _apiService;

  PlannerRemoteDataSourceImpl(this._apiService);

  @override
  Future<TripPlanModel> getTripPlan(String bookingId) async {
    final response = await _apiService.get('/trip-plans/$bookingId');
    return TripPlanModel.fromJson(response.data['data']);
  }

  @override
  Future<TripPlanModel> addActivity(String planId, String dayId, Map<String, dynamic> data) async {
    final response = await _apiService.post('/trip-plans/$planId/day/$dayId/activity', data: data);
    return TripPlanModel.fromJson(response.data['data']);
  }

  @override
  Future<TripPlanModel> toggleActivityStatus(String planId, String dayId, String activityId) async {
    final response = await _apiService.patch('/trip-plans/$planId/day/$dayId/activity/$activityId');
    return TripPlanModel.fromJson(response.data['data']);
  }
}
