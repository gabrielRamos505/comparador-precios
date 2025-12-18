import '../providers/backend_provider.dart';
import '../models/notification.dart';

class NotificationRepository {
  final BackendProvider _provider;

  NotificationRepository(this._provider);

  Future<List<NotificationModel>> getNotifications({
    bool unreadOnly = false,
    int page = 1,
    int limit = 20,
  }) async {
    try {
      final response = await _provider.getNotifications(
        unreadOnly: unreadOnly,
        page: page,
        limit: limit,
      );
      
      if (response.data['success'] == true) {
        final List<dynamic> data = response.data['data'];
        return data.map((json) => NotificationModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      print('❌ Error obteniendo notificaciones: $e');
      return [];
    }
  }

  Future<bool> markAsRead(String notificationId) async {
    try {
      final response = await _provider.markNotificationAsRead(notificationId);
      return response.data['success'] == true;
    } catch (e) {
      print('❌ Error marcando notificación como leída: $e');
      return false;
    }
  }

  Future<bool> markAllAsRead() async {
    try {
      final response = await _provider.markAllNotificationsAsRead();
      return response.data['success'] == true;
    } catch (e) {
      print('❌ Error marcando todas las notificaciones como leídas: $e');
      return false;
    }
  }
}
