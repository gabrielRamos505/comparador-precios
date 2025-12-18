import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../data/repositories/notification_repository.dart';
import 'notification_event.dart';
import 'notification_state.dart';

class NotificationBloc extends Bloc<NotificationEvent, NotificationState> {
  final NotificationRepository _repository;

  NotificationBloc(this._repository) : super(NotificationInitial()) {
    on<LoadNotifications>(_onLoadNotifications);
    on<MarkNotificationAsRead>(_onMarkAsRead);
    on<MarkAllNotificationsAsRead>(_onMarkAllAsRead);
  }

  Future<void> _onLoadNotifications(
    LoadNotifications event,
    Emitter<NotificationState> emit,
  ) async {
    emit(NotificationLoading());
    try {
      final notifications = await _repository.getNotifications(
        unreadOnly: event.onlyUnread,
      );
      emit(NotificationsLoaded(notifications));
    } catch (e) {
      emit(NotificationError(e.toString()));
    }
  }

  Future<void> _onMarkAsRead(
    MarkNotificationAsRead event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      final success = await _repository.markAsRead(event.notificationId);
      if (success && state is NotificationsLoaded) {
        final currentNotifications = (state as NotificationsLoaded).notifications;
        final updatedNotifications = currentNotifications.map((n) {
          if (n.id == event.notificationId) {
            // En una app real crearíamos una copia con isRead: true
            // Aquí por simplicidad recargamos o simplemente actualizamos la lista local
            return n; 
          }
          return n;
        }).toList();
        
        // Refrescar la lista para asegurar sincronización con el backend
        add(const LoadNotifications());
      }
    } catch (e) {
      // Manejar error silenciosamente o emitir error
    }
  }

  Future<void> _onMarkAllAsRead(
    MarkAllNotificationsAsRead event,
    Emitter<NotificationState> emit,
  ) async {
    try {
      final success = await _repository.markAllAsRead();
      if (success) {
        add(const LoadNotifications());
      }
    } catch (e) {
      // Manejar error
    }
  }
}
