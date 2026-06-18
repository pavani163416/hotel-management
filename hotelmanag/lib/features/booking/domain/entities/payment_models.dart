class PaymentOrder {
  final String orderId;
  final int amount;
  final String currency;
  final String key;

  PaymentOrder({
    required this.orderId,
    required this.amount,
    required this.currency,
    required this.key,
  });

  factory PaymentOrder.fromJson(Map<String, dynamic> json) {
    return PaymentOrder(
      orderId: json['orderId'] ?? '',
      amount: (json['amount'] as num?)?.toInt() ?? 0,
      currency: json['currency'] ?? 'INR',
      key: json['key'] ?? '',
    );
  }
}

class PaymentResponse {
  final String razorpayOrderId;
  final String razorpayPaymentId;
  final String razorpaySignature;

  PaymentResponse({
    required this.razorpayOrderId,
    required this.razorpayPaymentId,
    required this.razorpaySignature,
  });

  Map<String, dynamic> toJson() {
    return {
      'razorpay_order_id': razorpayOrderId,
      'razorpay_payment_id': razorpayPaymentId,
      'razorpay_signature': razorpaySignature,
    };
  }
}

enum BookingPaymentStatus {
  pending,
  paymentProcessing,
  paymentVerified,
  confirmed,
  failed,
  refunded,
}
