import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:url_launcher/url_launcher.dart'; // ✅ Agregar
import '../../blocs/product/product_bloc.dart';
import '../../blocs/product/product_state.dart';
import '../../blocs/favorite/favorite_bloc.dart';
import '../../blocs/favorite/favorite_event.dart';
import '../../blocs/favorite/favorite_state.dart';
import '../../blocs/auth/auth_bloc.dart';
import '../../blocs/auth/auth_state.dart';
import '../../../data/models/price_result.dart';

class ResultsScreen extends StatefulWidget {
  const ResultsScreen({super.key});

  @override
  State<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends State<ResultsScreen> {
  bool _isFavorite = false;

  @override
  void initState() {
    super.initState();
    _checkFavoriteStatus();
  }

  void _checkFavoriteStatus() {
    final authState = context.read<AuthBloc>().state;
    final productState = context.read<ProductBloc>().state;
    
    if (authState is Authenticated && productState is ProductSearchSuccess) {
      context.read<FavoriteBloc>().add(
        CheckFavorite(productState.result.product.barcode),
      );
    }
  }

  void _toggleFavorite() {
    final authState = context.read<AuthBloc>().state;
    final productState = context.read<ProductBloc>().state;
    
    if (authState is! Authenticated || productState is! ProductSearchSuccess) {
      return;
    }
    
    final product = productState.result.product;
    
    if (_isFavorite) {
      context.read<FavoriteBloc>().add(
        RemoveFavorite(product.barcode),
      );
    } else {
      context.read<FavoriteBloc>().add(
        AddFavorite(
          barcode: product.barcode,
          name: product.name,
          imageUrl: product.imageUrl ?? '',
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Resultados'),
        actions: [
          BlocListener<FavoriteBloc, FavoriteState>(
            listener: (context, state) {
              if (state is FavoriteChecked) {
                setState(() {
                  _isFavorite = state.isFavorite;
                });
              } else if (state is FavoriteAdded) {
                setState(() {
                  _isFavorite = true;
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
              icon: Icon(
                _isFavorite ? Icons.favorite : Icons.favorite_border,
                color: _isFavorite ? Colors.red : null,
              ),
              onPressed: _toggleFavorite,
              tooltip: _isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos',
            ),
          ),
        ],
      ),
      body: BlocBuilder<ProductBloc, ProductState>(
        builder: (context, state) {
          if (state is ProductSearchSuccess) {
            final result = state.result;
            final product = result.product;
            final prices = result.sortedPrices;
            final lowestPrice = result.lowestPrice;

            return SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Header del producto
                  Container(
                    padding: const EdgeInsets.all(24),
                    color: Colors.blue.shade50,
                    child: Column(
                      children: [
                        if (product.imageUrl != null)
                          ClipRRect(
                            borderRadius: BorderRadius.circular(12),
                            child: Image.network(
                              product.imageUrl!,
                              height: 120,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  height: 120,
                                  color: Colors.grey.shade200,
                                  child: const Icon(Icons.image_not_supported,
                                      size: 60),
                                );
                              },
                            ),
                          ),
                        const SizedBox(height: 16),
                        Text(
                          product.name,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        if (product.brand != null) ...[
                          const SizedBox(height: 8),
                          Text(
                            product.brand!,
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey.shade700,
                            ),
                          ),
                        ],
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            'Código: ${product.barcode}',
                            style: const TextStyle(
                              fontSize: 12,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Mejor precio
                  if (lowestPrice != null)
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: Colors.green.shade300,
                          width: 2,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.star, color: Colors.green.shade700, size: 40),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Mejor precio',
                                  style: TextStyle(
                                    fontSize: 14,
                                    color: Colors.green.shade900,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  lowestPrice.platform,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                '\$${lowestPrice.totalPrice.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.green.shade700,
                                ),
                              ),
                              if (lowestPrice.shipping > 0)
                                Text(
                                  '(+\$${lowestPrice.shipping.toStringAsFixed(2)} envío)',
                                  style: const TextStyle(fontSize: 11),
                                ),
                            ],
                          ),
                        ],
                      ),
                    ),

                  // Lista de precios
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Comparación de precios',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 16),
                        ...prices.map((price) => _PriceCard(
                              price: price,
                              isLowest: price == lowestPrice,
                            )),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          return const Center(
            child: Text('No hay resultados'),
          );
        },
      ),
    );
  }
}

class _PriceCard extends StatelessWidget {
  final PriceResult price;
  final bool isLowest;

  const _PriceCard({
    required this.price,
    this.isLowest = false,
  });

  // ✅ Función para abrir URL con confirmación
  Future<void> _openUrl(BuildContext context) async {
    if (price.url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('⚠️ No hay enlace disponible'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    // Mostrar diálogo de confirmación
    final shouldOpen = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Abrir tienda'),
        content: Text(
          '¿Deseas abrir ${price.platform} en el navegador?',
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

    // Si el usuario confirmó
    if (shouldOpen == true && context.mounted) {
      try {
        final uri = Uri.parse(price.url);
        if (await canLaunchUrl(uri)) {
          await launchUrl(
            uri,
            mode: LaunchMode.externalApplication,
          );
        } else {
          throw 'No se pudo abrir el enlace';
        }
      } catch (e) {
        if (context.mounted) {
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
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: isLowest ? 4 : 1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isLowest
            ? BorderSide(color: Colors.green.shade300, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: () => _openUrl(context), // ✅ Abrir con confirmación
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Icono de plataforma
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: _getPlatformColor(price.platform),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  _getPlatformIcon(price.platform),
                  color: Colors.white,
                ),
              ),
              const SizedBox(width: 16),
              
              // Información del precio
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      price.platform,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Producto: \$${price.price.toStringAsFixed(2)}',
                      style: const TextStyle(fontSize: 13),
                    ),
                    if (price.shipping > 0)
                      Text(
                        'Envío: \$${price.shipping.toStringAsFixed(2)}',
                        style: const TextStyle(fontSize: 13),
                      )
                    else
                      const Text(
                        'Envío gratis',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.green,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
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
                ),
              ),
              
              // Precio total
              Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '\$${price.totalPrice.toStringAsFixed(2)}',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: isLowest ? Colors.green.shade700 : Colors.black,
                    ),
                  ),
                  if (isLowest)
                    Container(
                      margin: const EdgeInsets.only(top: 4),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.green.shade100,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        'MEJOR',
                        style: TextStyle(
                          fontSize: 10,
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return Colors.orange;
      case 'mercado libre':
      case 'mercado libre perú':
        return Colors.yellow.shade600;
      case 'ebay':
        return Colors.blue;
      case 'walmart':
        return Colors.blue.shade800;
      case 'target':
        return Colors.red;
      case 'temu':
        return Colors.red.shade900;
      case 'ripley':
        return Colors.purple;
      case 'falabella':
      case 'saga falabella':
        return Colors.green.shade700;
      default:
        return Colors.grey;
    }
  }

  IconData _getPlatformIcon(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return Icons.shopping_bag;
      case 'mercado libre':
      case 'mercado libre perú':
        return Icons.local_shipping;
      case 'ebay':
        return Icons.shopping_cart;
      case 'walmart':
        return Icons.storefront;
      case 'target':
        return Icons.shopping_basket;
      case 'temu':
        return Icons.store;
      case 'ripley':
      case 'falabella':
      case 'saga falabella':
        return Icons.local_mall;
      default:
        return Icons.store;
    }
  }
}
