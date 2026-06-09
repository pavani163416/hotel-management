import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'HotelManag';

  // ── Environment-driven API Configuration ──────────────────────────
  static const String _productionApiUrl = 'https://hotel-management-production-2225.up.railway.app/api/';
  
  // To use local dev endpoints in debug mode, run flutter with:
  // flutter run --dart-define=API_URL=http://localhost:5000/api/
  static const String _envApiUrl = String.fromEnvironment('API_URL');

  /// Returns the correct base URL for the current build/platform.
  /// - Release builds always use the production Railway URL.
  /// - Debug builds will use the API_URL environment variable if provided, else production.
  static String get apiBaseUrl {
    // Always enforce production in release mode
    if (!kDebugMode) return _productionApiUrl;

    // In debug mode, if a custom URL is provided via dart-define, use it
    if (_envApiUrl.isNotEmpty) return _envApiUrl;

    // Default fallback is production so no http:// strings are hardcoded in the AST
    return _productionApiUrl;
  }

  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
