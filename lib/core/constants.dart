class AppConstants {
  // ⭐ Base URLs - ACTUALIZADO con nueva IP
  static const String backendUrl = 'http://192.168.100.14:3000/api';
  static const String baseUrl = 'http://192.168.100.14:3000/api';
  
  // Config
  static const bool useMockData = false;
  
  // Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
  
  // Keys para SharedPreferences
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  static const String keyToken = 'auth_token';
  static const String keyUserId = 'user_id';
  static const String keyEmail = 'user_email';
  static const String keyUserName = 'user_name';
  
  // Keys para Features
  static const String searchHistoryKey = 'search_history';
  static const String favoritesKey = 'favorites';
  static const String priceAlertsKey = 'price_alerts';
  
  // Configuración de la app
  static const String appName = 'AR Shopping';
  static const String appVersion = '1.0.0';
  
  // Límites
  static const int maxSearchHistoryItems = 50;
  static const int maxFavoriteItems = 100;
  static const int maxPriceAlerts = 20;
}
