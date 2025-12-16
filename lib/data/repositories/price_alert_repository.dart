import '../models/price_alert.dart';
import '../providers/backend_provider.dart';

class PriceAlertRepository {
  final BackendProvider _backendProvider;

  PriceAlertRepository(this._backendProvider);

  Future<List<PriceAlert>> getAlerts(String userId) async {
    try {
      final response = await _backendProvider.getAlerts(userId);
      
      if (response.data['success']) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => PriceAlert.fromJson(json)).toList();
      }
      
      return [];
    } catch (e) {
      throw Exception('Error al obtener alertas: $e');
    }
  }

  Future<PriceAlert> createAlert({
    required String userId,
    required String productId,
    required String productName,
    required double targetPrice,
    required double currentPrice,
  }) async {
    try {
      final response = await _backendProvider.createAlert({
        'userId': userId,
        'productId': productId,
        'productName': productName,
        'targetPrice': targetPrice,
        'currentPrice': currentPrice,
      });
      
      if (response.data['success']) {
        return PriceAlert.fromJson(response.data['data']);
      }
      
      throw Exception(response.data['message']);
    } catch (e) {
      throw Exception('Error al crear alerta: $e');
    }
  }

  Future<bool> updateAlert(String alertId, double targetPrice) async {
    try {
      final response = await _backendProvider.updateAlert(
        alertId,
        {'targetPrice': targetPrice},
      );
      return response.data['success'] ?? false;
    } catch (e) {
      throw Exception('Error al actualizar alerta: $e');
    }
  }

  Future<bool> deleteAlert(String alertId) async {
    try {
      final response = await _backendProvider.deleteAlert(alertId);
      return response.data['success'] ?? false;
    } catch (e) {
      throw Exception('Error al eliminar alerta: $e');
    }
  }
}
