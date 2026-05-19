import 'package:flutter/material.dart';
import '../utils/audio_helper.dart';

class NotificationItem {
  final String id;
  final String title;
  final String type; // e.g. "Booking"
  final DateTime timestamp;
  final bool isNew;
  final bool isCancelled;

  NotificationItem({
    required this.id,
    required this.title,
    required this.type,
    required this.timestamp,
    this.isNew = true,
    this.isCancelled = false,
  });

  NotificationItem copyWith({bool? isNew}) {
    return NotificationItem(
      id: id,
      title: title,
      type: type,
      timestamp: timestamp,
      isNew: isNew ?? this.isNew,
      isCancelled: isCancelled,
    );
  }
}

class NotificationProvider extends ChangeNotifier {
  final List<NotificationItem> _notifications = [
    NotificationItem(
      id: '1',
      title: 'Your booking is confirmed',
      type: 'Booking',
      timestamp: DateTime.now().subtract(const Duration(minutes: 6)),
      isNew: true,
      isCancelled: false,
    ),
    NotificationItem(
      id: '2',
      title: 'Your booking has been cancelled',
      type: 'Booking',
      timestamp: DateTime.now().subtract(const Duration(minutes: 8)),
      isNew: true,
      isCancelled: true,
    ),
    NotificationItem(
      id: '3',
      title: 'Your booking is confirmed',
      type: 'Booking',
      timestamp: DateTime.now().subtract(const Duration(minutes: 25)),
      isNew: false,
      isCancelled: false,
    ),
    NotificationItem(
      id: '4',
      title: 'Your booking is confirmed',
      type: 'Booking',
      timestamp: DateTime.now().subtract(const Duration(minutes: 42)),
      isNew: false,
      isCancelled: false,
    ),
  ];

  List<NotificationItem> get notifications => _notifications;

  int get unreadCount => _notifications.where((n) => n.isNew).length;

  void addNotification(String title, {bool isCancelled = false}) {
    final newItem = NotificationItem(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      type: 'Booking',
      timestamp: DateTime.now(),
      isNew: true,
      isCancelled: isCancelled,
    );
    _notifications.insert(0, newItem);
    
    // Play pleasant chime audio chime feedback
    try {
      triggerNotificationChime();
    } catch (_) {}
    
    notifyListeners();
  }

  void markAllAsRead() {
    for (int i = 0; i < _notifications.length; i++) {
      if (_notifications[i].isNew) {
        _notifications[i] = _notifications[i].copyWith(isNew: false);
      }
    }
    notifyListeners();
  }
}
