class AppConstants {
  // ⭐ Base URLs
  static const String backendUrl = 'https://comparador-precios-w3mm.onrender.com/api';
  
  // Como usas 'baseUrl' en algunos lados y 'backendUrl' en otros,
  // es mejor que una apunte a la otra para no confundirte.
  static const String baseUrl = backendUrl; 
 
  // Config
  static const bool useMockData = false;
 
  // ⚠️ Configuración de Timeout aumentado para permitir Scraping intensivo
  // Tottus/Wong pueden tardar 45s+ en responder.
  static const Duration apiTimeout = Duration(seconds: 120);
  static const Duration connectionTimeout = Duration(seconds: 60);
  static const Duration receiveTimeout = Duration(seconds: 120); 
 
  // Keys para SharedPreferences
  static const String tokenKey = 'auth_token';
  static const String userKey = 'user_data';
  
  // Mapeamos las duplicadas para evitar errores si usas librerías viejas
  static const String keyToken = tokenKey; 
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