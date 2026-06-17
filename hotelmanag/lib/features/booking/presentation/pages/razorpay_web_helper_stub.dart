/// Stub implementation for non-web platforms.
/// This file is imported when `dart.library.html` is not available.

void openRazorpayWeb({
  required Map<String, dynamic> options,
  required void Function(String? paymentId, String? orderId, String? signature)
      onSuccess,
  required void Function(String message) onFailure,
}) {
  throw UnsupportedError('Razorpay web is not supported on this platform');
}
