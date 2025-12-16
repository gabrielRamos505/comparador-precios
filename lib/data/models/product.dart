import 'package:equatable/equatable.dart';

class Product extends Equatable {
  final String id;
  final String barcode;
  final String name;
  final String? brand;
  final String? category;
  final String? imageUrl;
  final String? description;

  const Product({
    required this.id,
    required this.barcode,
    required this.name,
    this.brand,
    this.category,
    this.imageUrl,
    this.description,
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? '',
      barcode: json['barcode'] ?? '',
      name: json['name'] ?? json['productName'] ?? 'Producto sin nombre',
      brand: json['brand'],
      category: json['category'],
      imageUrl: json['imageUrl'] ?? json['image'],
      description: json['description'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'barcode': barcode,
      'name': name,
      'brand': brand,
      'category': category,
      'imageUrl': imageUrl,
      'description': description,
    };
  }

  @override
  List<Object?> get props => [id, barcode, name, brand, category, imageUrl];
}
