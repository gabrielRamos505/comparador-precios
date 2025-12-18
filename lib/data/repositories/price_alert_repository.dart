import 'package:dio/dio.dart';
import '../models/price_alert.dart';
import '../models/product.dart'; // Necesario para sacar datos del producto al crear
import '../providers/backend_provider.dart';

/// Clase auxiliar para paginación
class PriceAlertResult {
  final List<PriceAlert> alerts;
  final int totalCount;
  final int totalPages;

  PriceAlertResult({
    required this.alerts,
    required this.totalCount,
    required this.totalPages,
  });
}

class PriceAlertRepository {
  final BackendProvider _provider;

  PriceAlertRepository(this._provider);

  // ✅ Obtener alertas con Paginación
  Future<PriceAlertResult> getAlerts({
    bool activeOnly = false,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      // Nota: Asegúrate de que BackendProvider.getAlerts acepte queryParameters
      // Si no, modifícalo como hicimos con Notifications.
      // Por ahora, asumimos que el backend filtra por defecto o pasamos params manuales si el provider lo permite.
      final response = await _provider.getAlerts(
        activeOnly: activeOnly,
        page: page,
        limit: limit,
      );
      
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        final meta = response.data['meta'];

        return PriceAlertResult(
          alerts: data.map((json) => PriceAlert.fromJson(json)).toList(),
          totalCount: meta != null ? (meta['total'] ?? 0) : 0,
          totalPages: meta != null ? (meta['totalPages'] ?? 1) : 1,
        );
      }
      return PriceAlertResult(alerts: [], totalCount: 0, totalPages: 0);

    } catch (e) {
      throw _handleError(e);
    }
  }

  // ✅ Crear Alerta con la estructura EXACTA que espera el Backend
  Future<PriceAlert> createAlert({
    required Product product,
    required String platform, // Ej: "Plaza Vea", "Metro"
    required double targetPrice,
    required double currentPrice,
  }) async {
    try {
      final response = await _provider.createAlert({
        'barcode': product.barcode,
        'platform': platform,
        'targetPrice': targetPrice,
        'currentPrice': currentPrice,
        'productData': {
          'name': product.name,
          'imageUrl': product.imageUrl,
          'brand': product.brand,
          'category': product.category
        }
      });
      
      if (response.data['success'] == true) {
        return PriceAlert.fromJson(response.data['data']);
      } else {
        throw Exception(response.data['error'] ?? 'Error al crear alerta');
      }
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Desactivar alerta (Lógica de negocio: no se suele "editar" el precio, se desactiva o borra)
  Future<void> deactivateAlert(String alertId) async {
    try {
      final response = await _provider.deactivateAlert(alertId);
      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? 'No se pudo desactivar la alerta');
      }
    } catch (e) {
      throw _handleError(e);
    }
  }

  Future<void> deleteAlert(String alertId) async {
    try {
      final response = await _provider.deleteAlert(alertId);
      if (response.data['success'] != true) {
        throw Exception(response.data['error'] ?? 'No se pudo eliminar la alerta');
      }
    } catch (e) {
      throw _handleError(e);
    }
  }

  // Helper de errores limpio
  Exception _handleError(dynamic e) {
    if (e is DioException) {
      // Si el backend responde 409 (Conflict), es porque ya existe la alerta
      if (e.response?.statusCode == 409) {
        return Exception('Ya tienes una alerta activa para este producto en esta tienda.');
      }
      return Exception(e.message);
    }
    return Exception(e.toString().replaceAll('Exception: ', ''));
  }
}