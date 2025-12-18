import 'package:equatable/equatable.dart';
import '../../../data/models/search_history.dart';

abstract class HistoryState extends Equatable {
  const HistoryState();
  
  @override
  List<Object?> get props => [];
}

class HistoryInitial extends HistoryState {}

class HistoryLoading extends HistoryState {}

class HistoryLoaded extends HistoryState {
  final List<SearchHistory> history;
  final int total;
  final int currentPage;
  final bool hasReachedMax;

  const HistoryLoaded({
    required this.history,
    required this.total,
    this.currentPage = 1,
    this.hasReachedMax = false,
  });

  HistoryLoaded copyWith({
    List<SearchHistory>? history,
    int? total,
    int? currentPage,
    bool? hasReachedMax,
  }) {
    return HistoryLoaded(
      history: history ?? this.history,
      total: total ?? this.total,
      currentPage: currentPage ?? this.currentPage,
      hasReachedMax: hasReachedMax ?? this.hasReachedMax,
    );
  }

  @override
  List<Object?> get props => [history, total, currentPage, hasReachedMax];
}

class HistoryError extends HistoryState {
  final String message;

  const HistoryError(this.message);

  @override
  List<Object?> get props => [message];
}
