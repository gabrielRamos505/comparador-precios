import 'package:equatable/equatable.dart';
import '../../../data/models/price_result.dart';

abstract class ProductState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ProductInitial extends ProductState {}

class ProductSearching extends ProductState {}

class ProductSearchSuccess extends ProductState {
  final ProductSearchResult result;

  ProductSearchSuccess(this.result);

  @override
  List<Object?> get props => [result];
}

class ProductSearchError extends ProductState {
  final String message;

  ProductSearchError(this.message);

  @override
  List<Object?> get props => [message];
}
