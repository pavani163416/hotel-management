import 'package:hotelmanag/core/network/api_service.dart';
import '../../domain/entities/payment_models.dart';

class PaymentService {
  final ApiService _apiService;

  PaymentService(this._apiService);

  Future<PaymentOrder> createOrder(String bookingId) async {
    final response = await _apiService.post(
      'payments/create-order',
      data: {'bookingId': bookingId},
    );
    if (response.data['success'] == true) {
      return PaymentOrder.fromJson(response.data);
    } else {
      throw Exception(response.data['message'] ?? 'Failed to create payment order');
    }
  }

  Future<bool> verifyPayment(PaymentResponse verificationData) async {
    final response = await _apiService.post(
      'payments/verify',
      data: verificationData.toJson(),
    );
    return response.data['success'] == true;
  }

  Future<void> cancelPayment(String orderId, String bookingId) async {
    await _apiService.post(
      'payments/cancel',
      data: {'orderId': orderId, 'bookingId': bookingId},
    );
  }
}
