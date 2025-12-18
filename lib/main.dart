import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'core/theme.dart';
import 'data/providers/api_provider.dart';
import 'data/providers/search_provider.dart';
import 'data/providers/backend_provider.dart';
import 'data/repositories/auth_repository.dart';
import 'data/repositories/product_repository.dart';
import 'data/repositories/favorite_repository.dart';
import 'data/repositories/price_alert_repository.dart';
import 'data/repositories/review_repository.dart';
import 'data/repositories/notification_repository.dart';
import 'data/repositories/history_repository.dart';
import 'presentation/blocs/auth/auth_bloc.dart';
import 'presentation/blocs/auth/auth_event.dart';
import 'presentation/blocs/product/product_bloc.dart';
import 'presentation/blocs/scanner/scanner_bloc.dart';
import 'presentation/blocs/favorite/favorite_bloc.dart';
import 'presentation/blocs/notification/notification_bloc.dart';
import 'presentation/blocs/history/history_bloc.dart';
import 'presentation/blocs/history/history_event.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar dependencias
  final prefs = await SharedPreferences.getInstance();
  
  // ✅ Todos los providers reciben prefs para poder acceder al token
  final apiProvider = ApiProvider(prefs);
  final searchProvider = SearchProvider();
  final backendProvider = BackendProvider(prefs); // ✅ CAMBIO AQUÍ
  
  // Repositories
  final authRepository = AuthRepository(apiProvider, prefs);
  final productRepository = ProductRepository(searchProvider);
  final favoriteRepository = FavoriteRepository(backendProvider);
  final priceAlertRepository = PriceAlertRepository(backendProvider);
  final reviewRepository = ReviewRepository(backendProvider);
  final notificationRepository = NotificationRepository(backendProvider);
  final historyRepository = HistoryRepository(backendProvider); // ✅ NUEVO

  runApp(MyApp(
    authRepository: authRepository,
    productRepository: productRepository,
    favoriteRepository: favoriteRepository,
    priceAlertRepository: priceAlertRepository,
    reviewRepository: reviewRepository,
    notificationRepository: notificationRepository,
    historyRepository: historyRepository, // ✅ NUEVO
  ));
}

class MyApp extends StatelessWidget {
  final AuthRepository authRepository;
  final ProductRepository productRepository;
  final FavoriteRepository favoriteRepository;
  final PriceAlertRepository priceAlertRepository;
  final ReviewRepository reviewRepository;
  final NotificationRepository notificationRepository;
  final HistoryRepository historyRepository; // ✅ NUEVO

  const MyApp({
    super.key,
    required this.authRepository,
    required this.productRepository,
    required this.favoriteRepository,
    required this.priceAlertRepository,
    required this.reviewRepository,
    required this.notificationRepository,
    required this.historyRepository, // ✅ NUEVO
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => AuthBloc(authRepository)
            ..add(AppStarted()), // ✅ Auto-login al iniciar
        ),
        BlocProvider(
          create: (context) => ProductBloc(productRepository),
        ),
        BlocProvider(
          create: (context) => ScannerBloc(),
        ),
        BlocProvider(
          create: (context) => FavoriteBloc(favoriteRepository),
        ),
        BlocProvider(
          create: (context) => NotificationBloc(notificationRepository),
        ),
        BlocProvider(
          create: (context) => HistoryBloc(historyRepository)..add(const LoadHistory()),
        ),
      ],
      child: MaterialApp.router(
        title: 'Comparador RA',
        theme: AppTheme.lightTheme,
        routerConfig: createRouter(),
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
