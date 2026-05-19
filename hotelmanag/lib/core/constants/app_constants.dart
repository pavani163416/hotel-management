import 'dart:io' show Platform;
import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'HotelManag';
  
  // DYNAMIC URL MATCHER
  static String get apiBaseUrl {
    if (kIsWeb) {
      // Chrome (Web) natively reaches the computer's localhost
      return 'http://localhost:5000/api/';
    } else {
      // For physical mobile WITHOUT USB, change this to: 'http://192.168.1.60:5000/api/' 
      // (Note: You MUST turn off Windows Defender Firewall for this to work over Wi-Fi)
      // For physical mobile WITH USB, keep it as localhost and use `adb reverse tcp:5000 tcp:5000`
      return 'http://localhost:5000/api/'; 
    }
  }
  
  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
