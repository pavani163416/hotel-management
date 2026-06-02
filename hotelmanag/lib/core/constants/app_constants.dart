import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'HotelManag';

  // ── Production backend (Railway) ──────────────────────────
  static const String _productionApiUrl =
      'https://luxestay-backend-production.up.railway.app/api/';

  // ── Local dev fallback (only used in debug builds on web/emulator) ──
  static const String _localApiUrl = 'http://localhost:5001/api/';

  /// Returns the correct base URL for the current build/platform.
  /// - Release builds always use the production Railway URL.
  /// - Debug builds on web or Android emulator use localhost.
  /// - Debug builds on a physical device also use production so you
  ///   don't need adb reverse or firewall changes during testing.
  static String get apiBaseUrl {
    // Always use production in release mode
    if (!kDebugMode) return _productionApiUrl;

    // In debug mode: web can reach localhost directly
    if (kIsWeb) return _localApiUrl;

    if (defaultTargetPlatform == TargetPlatform.windows || defaultTargetPlatform == TargetPlatform.macOS) {
      return 'http://localhost:5001/api/';
    }

    // Physical Android device uses the host machine's LAN IP
    return 'http://192.168.1.60:5001/api/';
  }
  
  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
