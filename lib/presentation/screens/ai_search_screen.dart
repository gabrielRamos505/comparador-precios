import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart'; // ✅ Agregar
import 'package:comparador_ra/data/services/ai_service.dart';
import 'package:comparador_ra/presentation/blocs/auth/auth_bloc.dart';
import 'package:comparador_ra/presentation/blocs/auth/auth_state.dart';
import 'package:comparador_ra/presentation/blocs/favorite/favorite_bloc.dart';
import 'package:comparador_ra/presentation/blocs/favorite/favorite_event.dart';
import 'package:comparador_ra/presentation/blocs/favorite/favorite_state.dart';

class AISearchScreen extends StatefulWidget {
  final String imagePath;

  const AISearchScreen({Key? key, required this.imagePath}) : super(key: key);

  @override
  State<AISearchScreen> createState() => _AISearchScreenState();
}

class _AISearchScreenState extends State<AISearchScreen> {
  final AIService _aiService = AIService();
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _result;
  String? _productBarcode;
  bool _isFavorite = false;
  bool _isTogglingFavorite = false; // ✅ Prevenir doble click

  @override
  void initState() {
    super.initState();
    _identifyProduct();
  }

  Future<void> _identifyProduct() async {
    try {
      final file = File(widget.imagePath);
      final imageBytes = await file.readAsBytes();

      String? token;
      try {
        final prefs = await SharedPreferences.getInstance();
        token = prefs.getString('auth_token');
        
        if (token != null && token.isNotEmpty) {
          print('🔑 Token obtenido: ${token.substring(0, 20)}...');
        } else {
          print('⚠️ Usuario no autenticado, búsqueda anónima');
        }
      } catch (e) {
        print('⚠️ Error obteniendo token: $e');
      }

      final result = await _aiService.identifyProduct(
        imageBytes,
        token: token,
      );

      setState(() {
        _result = result;
        _productBarcode = result['barcode']; // 👈 Corregido: barcode está en el root de data
        _isLoading = false;
      });

      print('✅ Barcode del producto: $_productBarcode');

      if (_productBarcode != null) {
        _checkFavoriteStatus();
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _checkFavoriteStatus() {
    if (_productBarcode == null) return;

    final authState = context.read<AuthBloc>().state;
    if (authState is Authenticated) {
      context.read<FavoriteBloc>().add(
        CheckFavorite(_productBarcode!),
      );
    }
  }

  Future<void> _toggleFavorite() async {
    if (_productBarcode == null || _isTogglingFavorite) {
      return;
    }

    final authState = context.read<AuthBloc>().state;
    if (authState is! Authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ Debes iniciar sesión')),
      );
      return;
    }

    setState(() {
      _isTogglingFavorite = true;
    });

    final data = _result;
    final productName = data?['identifiedProduct'] ?? 'Producto';
    final prices = (data?['searchResults'] as List?) ?? [];
    final imageUrl = prices.isNotEmpty ? prices[0]['image'] ?? prices[0]['image_url'] ?? '' : '';

    if (_isFavorite) {
      context.read<FavoriteBloc>().add(
        RemoveFavorite(_productBarcode!),
      );
    } else {
      context.read<FavoriteBloc>().add(
        AddFavorite(
          barcode: _productBarcode!,
          name: productName,
          imageUrl: imageUrl,
        ),
      );
    }

    await Future.delayed(const Duration(milliseconds: 500));
    
    if (mounted) {
      setState(() {
        _isTogglingFavorite = false;
      });
    }
  }

  // ✅ Función para abrir URL con confirmación
  Future<void> _openStoreUrl(String platform, String url) async {
    if (url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ No hay enlace disponible'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    final shouldOpen = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Abrir tienda'),
        content: Text(
          '¿Deseas abrir $platform en el navegador?',
          style: const TextStyle(fontSize: 16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Abrir'),
          ),
        ],
      ),
    );

    if (shouldOpen == true && mounted) {
      try {
        final uri = Uri.parse(url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(
            uri,
            mode: LaunchMode.externalApplication,
          );
        } else {
          throw 'No se pudo abrir el enlace';
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('❌ Error: ${e.toString()}'),
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Búsqueda por IA'),
        actions: _productBarcode != null ? [
          BlocListener<FavoriteBloc, FavoriteState>(
            listener: (context, state) {
              if (state is FavoriteChecked) {
                setState(() {
                  _isFavorite = state.isFavorite;
                  _isTogglingFavorite = false;
                });
              } else if (state is FavoriteAdded) {
                setState(() {
                  _isFavorite = true;
                  _isTogglingFavorite = false;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✅ Agregado a favoritos'),
                    duration: Duration(seconds: 2),
                  ),
                );
              } else if (state is FavoriteRemoved) {
                setState(() {
                  _isFavorite = false;
                  _isTogglingFavorite = false;
                });
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('❌ Eliminado de favoritos'),
                    duration: Duration(seconds: 2),
                  ),
                );
              }
            },
            child: IconButton(
              icon: _isTogglingFavorite
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    )
                  : Icon(
                      _isFavorite ? Icons.favorite : Icons.favorite_border,
                      color: _isFavorite ? Colors.red : null,
                    ),
              onPressed: _isTogglingFavorite ? null : _toggleFavorite,
              tooltip: _isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos',
            ),
          ),
        ] : null,
      ),
      body: _isLoading
          ? _buildLoadingView()
          : _errorMessage != null
              ? _buildErrorView()
              : _buildResultView(),
    );
  }

  Widget _buildLoadingView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.file(
              File(widget.imagePath),
              width: 200,
              height: 200,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(height: 40),
          const CircularProgressIndicator(),
          const SizedBox(height: 20),
          const Text(
            '🤖 Analizando imagen con IA...',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 10),
          const Text(
            'Identificando producto y buscando precios',
            style: TextStyle(color: Colors.grey),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 80, color: Colors.red),
            const SizedBox(height: 20),
            const Text(
              'Error al identificar producto',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Text(
              _errorMessage ?? 'Error desconocido',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 30),
            ElevatedButton(
              onPressed: () => context.pop(),
              child: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultView() {
    final data = _result;
    final productName = data?['identifiedProduct'] ?? 'Producto desconocido';
    final prices = (data?['searchResults'] as List?) ?? [];

    if (prices.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.file(
                  File(widget.imagePath),
                  width: 120,
                  height: 120,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(height: 20),
              const Icon(Icons.search_off, size: 80, color: Colors.orange),
              const SizedBox(height: 20),
              Text(
                productName,
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 10),
              const Text(
                'No se encontraron precios para este producto',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 30),
              ElevatedButton(
                onPressed: () => context.pop(),
                child: const Text('Intentar de nuevo'),
              ),
            ],
          ),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.file(
                      File(widget.imagePath),
                      width: 80,
                      height: 80,
                      fit: BoxFit.cover,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '✅ Producto identificado',
                          style: TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          productName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (_productBarcode != null) ...[
                          const SizedBox(height: 4),
                          Text(
                            'ID: ${_productBarcode!.length > 40 ? "${_productBarcode!.substring(0, 40)}..." : _productBarcode}',
                            style: TextStyle(
                              fontSize: 10,
                              color: Colors.grey.shade600,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          Text(
            '💰 ${prices.length} tiendas encontradas',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),

          ...prices.map((price) => _buildPriceCard(price)).toList(),
        ],
      ),
    );
  }

  Widget _buildPriceCard(Map<String, dynamic> price) {
    final platform = price['platform'] ?? 'Tienda';
    final amount = price['price']?.toString() ?? '0.00';
    final shipping = price['shipping'] ?? 0;
    final url = price['url'] ?? '';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: url.isNotEmpty ? () => _openStoreUrl(platform, url) : null, // ✅ Con confirmación
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.store, color: Colors.blue, size: 40),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      platform,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      shipping == 0 || shipping == 'N/A' 
                        ? 'Envío: Gratis ✨' 
                        : 'Envío: \$$shipping',
                      style: const TextStyle(fontSize: 13),
                    ),
                    if (url.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      // ✅ Indicador de enlace
                      Row(
                        children: [
                          Icon(
                            Icons.open_in_new,
                            size: 14,
                            color: Colors.blue.shade700,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Toca para abrir',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.blue.shade700,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
              Text(
                '\$$amount',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
