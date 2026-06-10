import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'HotelManag';

  // ── Environment-driven API Configuration ──────────────────────────
  static const String _productionApiUrl = 'https://hotel-management-production-2225.up.railway.app/api/';
  static const String _stagingApiUrl = 'https://hotel-management-staging.up.railway.app/api/';
  
  static const String _envApiUrl = String.fromEnvironment('API_URL');
  static const String _envType = String.fromEnvironment('ENV', defaultValue: 'production');

  /// Returns the correct base URL for the current build/platform.
  /// - Release builds strictly use HTTPS production/staging URLs.
  static String get apiBaseUrl {
    // Enforce strict environment configuration in release mode
    if (!kDebugMode) {
      if (_envType == 'staging') {
        return _stagingApiUrl;
      }
      return _productionApiUrl;
    }

    // In debug mode, if a custom URL is provided via dart-define, use it
    if (_envApiUrl.isNotEmpty) return _envApiUrl;

    // Use the local backend over adb reverse to avoid Windows Firewall drops!
    if (kIsWeb) {
      return 'http://127.0.0.1:5000/api/';
    } else if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://127.0.0.1:5000/api/';
    } else {
      return 'http://127.0.0.1:5000/api/';
    }
  }

  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
