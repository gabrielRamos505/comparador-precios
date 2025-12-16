import 'package:flutter_bloc/flutter_bloc.dart';
import 'product_event.dart';
import 'product_state.dart';
import '../../../data/repositories/product_repository.dart';

class ProductBloc extends Bloc<ProductEvent, ProductState> {
  final ProductRepository _productRepository;

  ProductBloc(this._productRepository) : super(ProductInitial()) {
    on<SearchProductByBarcode>(_onSearchProductByBarcode);
    on<ClearProductSearch>(_onClearProductSearch);
  }

  Future<void> _onSearchProductByBarcode(
    SearchProductByBarcode event,
    Emitter<ProductState> emit,
  ) async {
    emit(ProductSearching());

    try {
      final result = await _productRepository.searchByBarcode(event.barcode);
      emit(ProductSearchSuccess(result));
    } catch (e) {
      emit(ProductSearchError(e.toString()));
    }
  }

  void _onClearProductSearch(
    ClearProductSearch event,
    Emitter<ProductState> emit,
  ) {
    emit(ProductInitial());
  }
}
