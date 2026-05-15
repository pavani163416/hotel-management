class AppConstants {
  static const String appName = 'HotelManag';
  // If running locally, use your machine's IP or 10.0.2.2 for Android Emulator
  static const String apiBaseUrl = 'https://luxestay-fix-final-v2.loca.lt/api/'; 
  // Production: https://luxestay-backend-production.up.railway.app/api/
  // For iOS Simulator, use: http://localhost:8080/api/
  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
