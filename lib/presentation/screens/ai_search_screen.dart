import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../data/services/ai_service.dart';
import '../blocs/auth/auth_bloc.dart';
import '../blocs/auth/auth_state.dart';
import '../blocs/favorite/favorite_bloc.dart';
import '../blocs/favorite/favorite_event.dart';
import '../blocs/favorite/favorite_state.dart';

class AISearchScreen extends StatefulWidget {
  final String imagePath;
  final String? initialBarcode;

  const AISearchScreen({
    super.key,
    required this.imagePath,
    this.initialBarcode,
  });

  @override
  State<AISearchScreen> createState() => _AISearchScreenState();
}

class _AISearchScreenState extends State<AISearchScreen> {
  final AIService _aiService = AIService();
  bool _isLoading = true;
  String? _errorMessage;
  Map<String, dynamic>? _result;
  String? _productBarcode;
  String? _productName;
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

    // ✅ Llamada al servicio
    final result = await _aiService.searchBarcodeWithImageFallback(
      barcode: _productBarcode ?? 'unknown',
      imageBytes: imageBytes,
      token: token,
    );

    if (mounted) {
      setState(() {
        _result = result;
        
        // ✅ Extraer datos correctamente según backend
        // Backend retorna: {product: {...}, prices: [...]}
        final productData = result['product'];
        
        _productBarcode = productData['barcode'] ?? _productBarcode;
        _productName = productData['name'] ?? 'Producto Identificado';
        
        _isLoading = false;
      });

      if (_productBarcode != null && _productBarcode != 'unknown') {
        _checkFavoriteStatus();
      }
    }
  } catch (e) {
    if (mounted) {
      setState(() {
        _errorMessage = e.toString()
            .replaceAll('Exception:', '')
            .replaceAll('Error:', '')
            .trim();
        _isLoading = false;
      });
    }
  }
}

  void _checkFavoriteStatus() {
    if (_productBarcode == null || _productBarcode == 'unknown') return;
    if (context.read<AuthBloc>().state is Authenticated) {
      context.read<FavoriteBloc>().add(CheckFavorite(_productBarcode!));
    }
  }

  Future<void> _toggleFavorite() async {
    if (_productBarcode == null || _productBarcode == 'unknown' || _isTogglingFavorite) return;

    if (context.read<AuthBloc>().state is! Authenticated) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ Inicia sesión para guardar favoritos')),
      );
      return;
    }

    setState(() => _isTogglingFavorite = true);

    // ✅ Extraer imagen correctamente
    final prices = (_result?['prices'] as List?) ?? [];
    final imageUrl = prices.isNotEmpty ? (prices[0]['imageUrl'] ?? prices[0]['image'] ?? '') : '';

    if (_isFavorite) {
      context.read<FavoriteBloc>().add(RemoveFavorite(_productBarcode!));
    } else {
      context.read<FavoriteBloc>().add(
        AddFavorite(
          barcode: _productBarcode!,
          name: _productName ?? 'Producto',
          imageUrl: imageUrl,
        ),
      );
    }
  }
Future<void> _openStoreUrl(String url) async {
  if (url.isEmpty) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ URL no disponible')),
      );
    }
    return;
  }

  try {
    final uri = Uri.parse(url);
    
    // ✅ CRÍTICO: Verificar si la URL se puede abrir
    if (await canLaunchUrl(uri)) {
      // ✅ Abrir en navegador externo para evitar bloqueos
      final launched = await launchUrl(
        uri,
        mode: LaunchMode.externalApplication, // Abre en Chrome/Safari
      );
      
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('❌ No se pudo abrir el enlace')),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('❌ URL no válida: $url')),
        );
      }
    }
  } catch (e) {
    debugPrint("❌ Error abriendo URL: $e");
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('❌ Error al abrir: ${e.toString()}')),
      );
    }
  }
}

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[100],
      appBar: AppBar(
        title: const Text('Resultado de Análisis'),
        actions: [
          if (_productBarcode != null && _productBarcode != 'unknown') 
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
                  : Icon(_isFavorite ? Icons.favorite : Icons.favorite_border, 
                         color: _isFavorite ? Colors.red : null),
                onPressed: _isTogglingFavorite ? null : _toggleFavorite,
              ),
            ),
        ],
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 400),
        child: _isLoading 
            ? _buildLoadingView() 
            : (_errorMessage != null ? _buildErrorView() : _buildResultView()),
      ),
    );
  }

  // --- VISTAS ---

  Widget _buildLoadingView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 10)],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(20),
              child: Image.file(File(widget.imagePath), width: 220, height: 220, fit: BoxFit.cover),
            ),
          ),
          const SizedBox(height: 40),
          const CircularProgressIndicator(),
          const SizedBox(height: 20),
          const Text('Buscando en tiendas...', 
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500, color: Colors.blueGrey)),
        ],
      ),
    );
  }

  Widget _buildResultView() {
    if (_result == null) return const SizedBox();
    
    // ✅ Extraer datos correctamente según la estructura del backend
    final prices = (_result!['prices'] as List?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        _buildProductHeader(_productName ?? 'Producto'),
        const SizedBox(height: 24),
        const Row(
          children: [
            Icon(Icons.compare_arrows, color: Colors.blue),
            SizedBox(width: 8),
            Text('MEJORES PRECIOS', 
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
          ],
        ),
        const Divider(),
        if (prices.isEmpty) 
          _buildNoResults()
        else 
          ...prices.map((p) => _buildPriceCard(p)).toList(),
        const SizedBox(height: 30),
      ],
    );
  }

  Widget _buildProductHeader(String name) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(15),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('IDENTIFICADO COMO:', 
            style: TextStyle(fontSize: 10, color: Colors.blue, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.qr_code, size: 14, color: Colors.grey),
              const SizedBox(width: 5),
              Text('Barcode: ${_productBarcode ?? "N/A"}', 
                style: const TextStyle(color: Colors.grey, fontSize: 13)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildPriceCard(Map<String, dynamic> price) {
    final bool hasDiscount = price['oldPrice'] != null;
    
    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200)
      ),
      child: InkWell(
        onTap: () => _openStoreUrl(price['url'] ?? ''),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // ✅ Manejar ambos formatos de imagen (imageUrl o image)
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  price['imageUrl'] ?? price['image'] ?? '',
                  width: 60, height: 60,
                  fit: BoxFit.contain,
                  errorBuilder: (_, __, ___) => const Icon(Icons.inventory, size: 40),
                ),
              ),
              const SizedBox(width: 15),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text((price['platform'] ?? price['store'] ?? 'TIENDA').toUpperCase(), 
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue)),
                    const SizedBox(height: 2),
                    Text(price['title'] ?? price['name'] ?? 'Ver en tienda',
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (hasDiscount)
                    Text('S/ ${price['oldPrice']}', 
                      style: const TextStyle(fontSize: 11, decoration: TextDecoration.lineThrough, color: Colors.red)),
                  Text('S/ ${price['price'] ?? '0.00'}', 
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
                ],
              ),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNoResults() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Column(
        children: [
          Icon(Icons.search_off, size: 60, color: Colors.grey[400]),
          const SizedBox(height: 10),
          const Text('No se encontraron precios en tiendas online.', 
            style: TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildErrorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.cloud_off, size: 80, color: Colors.redAccent),
            const SizedBox(height: 20),
            Text(_errorMessage ?? 'Error al procesar', 
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
            const SizedBox(height: 30),
            ElevatedButton.icon(
              onPressed: () => context.pop(), 
              icon: const Icon(Icons.arrow_back),
              label: const Text('Intentar con otra foto'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12)
              ),
            )
          ],
        ),
      ),
    );
  }
}