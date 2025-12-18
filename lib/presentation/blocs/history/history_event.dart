import 'package:equatable/equatable.dart';

abstract class HistoryEvent extends Equatable {
  const HistoryEvent();

  @override
  List<Object?> get props => [];
}

class LoadHistory extends HistoryEvent {
  final int page;
  final bool isRefresh;

  const LoadHistory({this.page = 1, this.isRefresh = false});

  @override
  List<Object?> get props => [page, isRefresh];
}

class DeleteHistoryItem extends HistoryEvent {
  final String historyId;

  const DeleteHistoryItem(this.historyId);

  @override
  List<Object?> get props => [historyId];
}

class ClearHistory extends HistoryEvent {}
