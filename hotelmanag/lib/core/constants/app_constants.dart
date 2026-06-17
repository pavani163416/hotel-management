import 'package:flutter/foundation.dart';

class AppConstants {
  static const String appName = 'Athithigriha';

  // ── Environment-driven API Configuration ──────────────────────────
  static const String _productionApiUrl =
      'https://hotel-management-production-2225.up.railway.app/api/';
  static const String _stagingApiUrl =
      'https://hotel-management-staging.up.railway.app/api/';

  static const String _envApiUrl = String.fromEnvironment('API_URL');
  static const String _envType = String.fromEnvironment(
    'ENV',
    defaultValue: 'production',
  );

  /// Returns the correct base URL for the current build/platform.
  /// - Release builds strictly use HTTPS production/staging URLs.
  static String get apiBaseUrl {
    if (_envApiUrl.isNotEmpty) return _envApiUrl;
    return _productionApiUrl;
  }

  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';
  static const String onboardingKey = 'HAS_SEEN_ONBOARDING';

  // Google Sign-In – Web Application Client ID (GCP project 70312411330)
  // Used as `serverClientId` in GoogleSignIn so the returned idToken can be
  // verified by the custom backend via google-auth-library.
  static const String googleWebClientId =
      '70312411330-jbppehv6ds52au1n7r62r6qji7j8cs9n.apps.googleusercontent.com';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
