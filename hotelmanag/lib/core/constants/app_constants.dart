import 'package:flutter/foundation.dart';
import 'dart:io' show Platform;

class AppConstants {
  static const String appName = 'HotelManag';
  
  static String get apiBaseUrl {
    if (kIsWeb) {
      return 'http://localhost:5000/api/';
    }
    try {
      if (Platform.isAndroid) {
        return 'http://10.0.2.2:5000/api/';
      }
    } catch (_) {}
    return 'http://localhost:5000/api/';
  }
  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
