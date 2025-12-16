import 'package:equatable/equatable.dart';

abstract class ProductEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class SearchProductByBarcode extends ProductEvent {
  final String barcode;

  SearchProductByBarcode(this.barcode);

  @override
  List<Object?> get props => [barcode];
}

class ClearProductSearch extends ProductEvent {}
