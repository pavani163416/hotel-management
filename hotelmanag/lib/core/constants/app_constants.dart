class AppConstants {
  static const String appName = 'HotelManag';
  // If running locally, use your machine's IP or 10.0.2.2 for Android Emulator
  static const String apiBaseUrl = 'http://192.168.1.60:5000/api/'; 
  
  // Storage Keys
  static const String tokenKey = 'CACHED_AUTH_TOKEN';
  static const String userKey = 'CACHED_USER_DATA';

  // Feature specific strings
  static const String searchHotelsHint = 'Search for hotels, cities...';
}
