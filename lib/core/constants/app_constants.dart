import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'HotelManag';

  // ── Production backend (Railway) ──────────────────────────
  static const String _productionApiUrl =
      'https://luxestay-backend-production.up.railway.app/api/';

  // ── Local dev fallback (only used in debug builds on web/emulator) ──
  static const String _localApiUrl = 'http://localhost:5000/api/';

  /// Returns the correct base URL for the current build/platform.
  /// - Release builds always use the production Railway URL.
  /// - Debug builds on web or Android emulator use localhost.
  /// - Debug builds on a physical device also use production so you
  ///   don't need adb reverse or firewall changes during testing.
  static String get apiBaseUrl {
    // Always use production in release mode
    if (!kDebugMode) return _productionApiUrl;

    // In debug mode: web & Android emulator can reach localhost
    if (kIsWeb) return _localApiUrl;

    // Physical devices cannot reach the dev machine via "localhost" —
    // use the production URL so the app works without extra setup.
    return _productionApiUrl;
  }
  
  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
