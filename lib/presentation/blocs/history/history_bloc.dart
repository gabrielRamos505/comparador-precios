import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../data/repositories/history_repository.dart';
import 'history_event.dart';
import 'history_state.dart';

class HistoryBloc extends Bloc<HistoryEvent, HistoryState> {
  final HistoryRepository _historyRepository;

  HistoryBloc(this._historyRepository) : super(HistoryInitial()) {
    on<LoadHistory>(_onLoadHistory);
    on<DeleteHistoryItem>(_onDeleteHistoryItem);
    on<ClearHistory>(_onClearHistory);
  }

  Future<void> _onLoadHistory(LoadHistory event, Emitter<HistoryState> emit) async {
    if (state is HistoryLoaded && !event.isRefresh && (state as HistoryLoaded).hasReachedMax) return;

    try {
      if (event.isRefresh || state is HistoryInitial) {
        emit(HistoryLoading());
        final result = await _historyRepository.getUserHistory(page: 1);
        emit(HistoryLoaded(
          history: result.history,
          total: result.total,
          currentPage: 1,
          hasReachedMax: result.history.length >= result.total,
        ));
      } else if (state is HistoryLoaded) {
        final currentState = state as HistoryLoaded;
        final nextPage = currentState.currentPage + 1;
        final result = await _historyRepository.getUserHistory(page: nextPage);
        
        emit(result.history.isEmpty
            ? currentState.copyWith(hasReachedMax: true)
            : HistoryLoaded(
                history: currentState.history + result.history,
                total: result.total,
                currentPage: nextPage,
                hasReachedMax: (currentState.history.length + result.history.length) >= result.total,
              ));
      }
    } catch (e) {
      emit(const HistoryError('Error al cargar historial'));
    }
  }

  Future<void> _onDeleteHistoryItem(DeleteHistoryItem event, Emitter<HistoryState> emit) async {
    try {
      final success = await _historyRepository.deleteHistoryItem(event.historyId);
      if (success && state is HistoryLoaded) {
        final currentState = state as HistoryLoaded;
        final updatedHistory = currentState.history.where((item) => item.id != event.historyId).toList();
        emit(currentState.copyWith(
          history: updatedHistory,
          total: currentState.total - 1,
        ));
      }
    } catch (e) {
      // Opcionalmente emitir error temporal
    }
  }

  Future<void> _onClearHistory(ClearHistory event, Emitter<HistoryState> emit) async {
    try {
      final success = await _historyRepository.clearHistory();
      if (success) {
        emit(const HistoryLoaded(history: [], total: 0, hasReachedMax: true));
      }
    } catch (e) {
      emit(const HistoryError('Error al limpiar historial'));
    }
  }
}
