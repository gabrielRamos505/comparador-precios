import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:comparador_ra/data/services/ai_service.dart';
import 'package:comparador_ra/presentation/blocs/auth/auth_bloc.dart';
import 'package:comparador_ra/presentation/blocs/auth/auth_state.dart';
import 'package:comparador_ra/presentation/blocs/favorite/favorite_bloc.dart';
import 'package:comparador_ra/presentation/blocs/favorite/favorite_event.dart';
import 'package:comparador_ra/presentation/blocs/favorite/favorite_state.dart';

class AISearchScreen extends StatefulWidget {
  final String imagePath;
  final String? initialBarcode;

  const AISearchScreen({
    Key? key,
    required this.imagePath,
    this.initialBarcode,
  }) : super(key: key);

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
  bool _isTogglingFavorite = false;

  @override
  void initState() {
    super.initState();
    _productBarcode = widget.initialBarcode;
    _identifyProduct();
  }

  Future<void> _identifyProduct() async {
    try {
      final file = File(widget.imagePath);
      if (!await file.exists()) throw Exception("Imagen no encontrada");
      
      final imageBytes = await file.readAsBytes();
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');

      // Búsqueda Dual
      final result = await _aiService.searchBarcodeWithImageFallback(
        barcode: _productBarcode ?? 'unknown',
        imageBytes: imageBytes,
        token: token,
      );

      if (mounted) {
        setState(() {
          _result = result;
          _productBarcode = result['barcode'];
          _isLoading = false;
        });

        if (_productBarcode != null) _checkFavoriteStatus();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceAll('Exception:', '').trim();
          _isLoading = false;
        });
      }
    }
  }

  void _checkFavoriteStatus() {
    if (_productBarcode == null) return;
    if (context.read<AuthBloc>().state is Authenticated) {
      context.read<FavoriteBloc>().add(CheckFavorite(_productBarcode!));
    }
  }

  Future<void> _toggleFavorite() async {
    if (_productBarcode == null || _isTogglingFavorite) return;

    if (context.read<AuthBloc>().state is! Authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ Inicia sesión para guardar favoritos')),
      );
      return;
    }

    setState(() => _isTogglingFavorite = true);

    final data = _result;
    final prices = (data?['searchResults'] as List?) ?? [];
    final imageUrl = prices.isNotEmpty ? (prices[0]['image'] ?? '') : '';

    if (_isFavorite) {
      context.read<FavoriteBloc>().add(RemoveFavorite(_productBarcode!));
    } else {
      context.read<FavoriteBloc>().add(
        AddFavorite(
          barcode: _productBarcode!,
          name: data?['identifiedProduct'] ?? 'Producto',
          imageUrl: imageUrl,
        ),
      );
    }
  }

  Future<void> _openStoreUrl(String platform, String url) async {
    if (url.isEmpty) return;
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Análisis IA'),
        actions: [
          if (_productBarcode != null) 
            BlocListener<FavoriteBloc, FavoriteState>(
              listener: (context, state) {
                if (state is FavoriteChecked) setState(() => _isFavorite = state.isFavorite);
                if (state is FavoriteAdded) setState(() => _isFavorite = true);
                if (state is FavoriteRemoved) setState(() => _isFavorite = false);
                setState(() => _isTogglingFavorite = false);
              },
              child: IconButton(
                icon: _isTogglingFavorite 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Icon(_isFavorite ? Icons.favorite : Icons.favorite_border, color: _isFavorite ? Colors.red : null),
                onPressed: _isTogglingFavorite ? null : _toggleFavorite,
              ),
            ),
        ],
      ),
      body: _isLoading ? _buildLoadingView() : 
            (_errorMessage != null ? _buildErrorView() : _buildResultView()),
    );
  }

  // --- WIDGETS DE VISTA ---

  Widget _buildLoadingView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Image.file(File(widget.imagePath), width: 180, height: 180, fit: BoxFit.cover),
          ),
          const SizedBox(height: 30),
          const CircularProgressIndicator(),
          const SizedBox(height: 15),
          const Text('Analizando producto con IA...', style: TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildResultView() {
    final data = _result!;
    final prices = (data['searchResults'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildInfoCard(data['identifiedProduct'] ?? 'Producto Identificado'),
        const SizedBox(height: 20),
        const Text('Comparativa de Precios', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 10),
        if (prices.isEmpty) 
          const Center(child: Text('No se encontraron precios actuales.'))
        else 
          ...prices.map((p) => _buildPriceCard(p)).toList(),
      ],
    );
  }

  Widget _buildInfoCard(String name) {
    return Card(
      elevation: 0,
      color: Colors.blue.shade50,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.green),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  Text('ID: $_productBarcode', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceCard(Map<String, dynamic> price) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: const Icon(Icons.storefront, color: Colors.blue),
        title: Text(price['platform'] ?? 'Tienda'),
        subtitle: Text(price['shipping'] == 0 ? 'Envío Gratis' : 'Consultar envío'),
        trailing: Text(
          'S/ ${price['price']}', // Localizado para Perú
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green),
        ),
        onTap: () => _openStoreUrl(price['platform'], price['url'] ?? ''),
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 60, color: Colors.red),
          const SizedBox(height: 16),
          Text(_errorMessage ?? 'Error desconocido'),
          TextButton(onPressed: () => context.pop(), child: const Text('Reintentar'))
        ],
      ),
    );
  }
}