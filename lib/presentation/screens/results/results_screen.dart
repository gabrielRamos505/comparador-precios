import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
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
            CheckFavorite(authState.user.id, productState.result.product.id),
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
    final lowestPrice = productState.result.lowestPrice;
    
    if (_isFavorite) {
      // Eliminar de favoritos
      context.read<FavoriteBloc>().add(
            RemoveFavorite(authState.user.id, product.id),
          );
    } else {
      // Agregar a favoritos
      context.read<FavoriteBloc>().add(
            AddFavorite(
              userId: authState.user.id,
              productId: product.id,
              productName: product.name,
              barcode: product.barcode,
              imageUrl: product.imageUrl,
              lowestPrice: lowestPrice?.totalPrice,
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
          // Botón de favorito
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

// Resto del código (_PriceCard) permanece igual...
class _PriceCard extends StatelessWidget {
  final PriceResult price;
  final bool isLowest;

  const _PriceCard({
    required this.price,
    this.isLowest = false,
  });

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
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
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
        title: Text(
          price.platform,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
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
          ],
        ),
        trailing: Column(
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
      ),
    );
  }

  Color _getPlatformColor(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return Colors.orange;
      case 'mercado libre':
        return Colors.yellow.shade600;
      case 'ebay':
        return Colors.blue;
      case 'temu':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  IconData _getPlatformIcon(String platform) {
    switch (platform.toLowerCase()) {
      case 'amazon':
        return Icons.shopping_bag;
      case 'mercado libre':
        return Icons.local_shipping;
      case 'ebay':
        return Icons.shopping_cart;
      case 'temu':
        return Icons.storefront;
      default:
        return Icons.store;
    }
  }
}
