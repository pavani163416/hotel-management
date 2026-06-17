/// Conditional export: picks the web implementation when dart:js_interop is
/// available, falls back to the stub on native platforms (Android/iOS).
export 'razorpay_web_helper_stub.dart'
    if (dart.library.js_interop) 'razorpay_web_helper_web.dart';
