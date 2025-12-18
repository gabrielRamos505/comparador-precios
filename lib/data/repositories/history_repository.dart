import '../models/search_history.dart';
import '../providers/backend_provider.dart';

class HistoryRepository {
  final BackendProvider _backendProvider;

  HistoryRepository(this._backendProvider);

  Future<HistoryResult> getUserHistory({int page = 1, int limit = 20}) async {
    try {
      final response = await _backendProvider.getUserHistory(page: page, limit: limit);
      
      if (response.statusCode == 200) {
        final List<dynamic> historyData = response.data['data'] ?? [];
        final int totalItems = response.data['meta']?['totalItems'] ?? historyData.length;
        
        final historyItems = historyData
            .map((item) => SearchHistory.fromMap(item))
            .toList();
            
        return HistoryResult(history: historyItems, total: totalItems);
      } else {
        throw Exception('Error al obtener historial: ${response.statusCode}');
      }
    } catch (e) {
      print('❌ HistoryRepository Error: $e');
      return HistoryResult(history: [], total: 0);
    }
  }

  Future<bool> deleteHistoryItem(String historyId) async {
    try {
      final response = await _backendProvider.deleteHistoryItem(historyId);
      return response.statusCode == 200;
    } catch (e) {
      print('❌ HistoryRepository Error deleting item: $e');
      return false;
    }
  }

  Future<bool> clearHistory() async {
    try {
      final response = await _backendProvider.clearHistory();
      return response.statusCode == 200;
    } catch (e) {
      print('❌ HistoryRepository Error clearing history: $e');
      return false;
    }
  }
}
