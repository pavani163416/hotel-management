/// Web implementation using dart:js_interop.
/// This file is imported only when `dart.library.js_interop` is available.

import 'dart:js_interop';

@JS('Razorpay')
extension type _RazorpayJS._(JSObject _) implements JSObject {
  external _RazorpayJS(JSObject options);
  external void open();
}

void openRazorpayWeb({
  required Map<String, dynamic> options,
  required void Function(String? paymentId, String? orderId, String? signature)
      onSuccess,
  required void Function(String message) onFailure,
}) {
  // Build the options map with handler callbacks
  final jsOptionsMap = <String, dynamic>{
    ...options,
    'handler': ((JSObject response) {
      final paymentId =
          (response.getProperty('razorpay_payment_id'.toJS) as JSString?)
              ?.toDart;
      final signature =
          (response.getProperty('razorpay_signature'.toJS) as JSString?)
              ?.toDart;
      final orderId =
          (response.getProperty('razorpay_order_id'.toJS) as JSString?)
              ?.toDart;
      onSuccess(paymentId, orderId, signature);
    }).toJS,
    'modal': {
      'ondismiss': (() {
        onFailure('Payment cancelled by user');
      }).toJS,
    },
  };

  final jsOptions = jsOptionsMap.jsify() as JSObject;
  final rzp = _RazorpayJS(jsOptions);
  rzp.open();
}
