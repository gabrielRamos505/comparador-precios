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
import 'presentation/blocs/auth/auth_bloc.dart';
import 'presentation/blocs/auth/auth_event.dart';
import 'presentation/blocs/product/product_bloc.dart';
import 'presentation/blocs/scanner/scanner_bloc.dart';
import 'presentation/blocs/favorite/favorite_bloc.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Inicializar dependencias
  final prefs = await SharedPreferences.getInstance();
  final apiProvider = ApiProvider();
  final searchProvider = SearchProvider();
  final backendProvider = BackendProvider();
  
  // Repositories
  final authRepository = AuthRepository(apiProvider, prefs);
  final productRepository = ProductRepository(searchProvider);
  final favoriteRepository = FavoriteRepository(backendProvider);
  final priceAlertRepository = PriceAlertRepository(backendProvider);
  final reviewRepository = ReviewRepository(backendProvider);

  runApp(MyApp(
    authRepository: authRepository,
    productRepository: productRepository,
    favoriteRepository: favoriteRepository,
    priceAlertRepository: priceAlertRepository,
    reviewRepository: reviewRepository,
  ));
}

class MyApp extends StatelessWidget {
  final AuthRepository authRepository;
  final ProductRepository productRepository;
  final FavoriteRepository favoriteRepository;
  final PriceAlertRepository priceAlertRepository;
  final ReviewRepository reviewRepository;

  const MyApp({
    super.key,
    required this.authRepository,
    required this.productRepository,
    required this.favoriteRepository,
    required this.priceAlertRepository,
    required this.reviewRepository,
  });

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(
          create: (context) => AuthBloc(authRepository)..add(AppStarted()),
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
