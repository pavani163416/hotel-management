import 'package:flutter/material.dart';
import '../utils/audio_helper.dart';
import '../widgets/notification_popup.dart';
import '../../features/booking/domain/entities/booking_entity.dart';
import '../services/push_notifications.dart';
import '../network/api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

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
}

class NotificationProvider extends ChangeNotifier {
  final ApiService _apiService;
  final Set<String> _readIds = {};
  final List<NotificationItem> _liveNotifications = [];
  List<NotificationItem> _backendNotifications = [];
  bool _isFetching = false;

  NotificationProvider(this._apiService) {
    _loadReadIds();
  }

  Future<void> _loadReadIds() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getStringList('read_notification_ids');
    if (saved != null) {
      _readIds.addAll(saved);
      notifyListeners();
    }
  }

  Future<void> _saveReadIds() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('read_notification_ids', _readIds.toList());
  }

  bool get isFetching => _isFetching;

  /// Fetch notifications from the backend /api/notifications endpoint.
  Future<void> fetchNotifications() async {
    if (_isFetching) return;
    _isFetching = true;
    notifyListeners();
    try {
      final response = await _apiService.get('/notifications');
      final raw = response.data;
      final List dataList = (raw is Map && raw['data'] is List)
          ? raw['data'] as List
          : [];

      _backendNotifications = dataList.map((n) {
        final id =
            n['_id']?.toString() ??
            DateTime.now().millisecondsSinceEpoch.toString();
        final message = n['message']?.toString() ?? 'Notification';
        final type = _mapType(n['type']?.toString());
        final isRead = n['isRead'] == true;
        final createdAt = n['createdAt'] != null
            ? DateTime.tryParse(n['createdAt'].toString()) ?? DateTime.now()
            : DateTime.now();
        final isCancelled =
            message.toLowerCase().contains('cancel') ||
            (n['type']?.toString().toLowerCase() == 'cancellation');

        return NotificationItem(
          id: id,
          title: message,
          type: type,
          timestamp: createdAt,
          isNew: !isRead && !_readIds.contains(id),
          isCancelled: isCancelled,
        );
      }).toList();
    } catch (e) {
      debugPrint('[NotificationProvider] fetchNotifications error: $e');
    } finally {
      _isFetching = false;
      notifyListeners();
    }
  }

  String _mapType(String? raw) {
    if (raw == null) return 'Booking';
    switch (raw.toLowerCase()) {
      case 'offer':
      case 'promo':
        return 'Offer';
      case 'booking':
      case 'confirmation':
        return 'Booking';
      case 'cancellation':
        return 'Booking';
      default:
        return 'System';
    }
  }

  /// Returns merged list: backend API notifications + booking-derived + live session.
  List<NotificationItem> getRealNotifications(
    List<BookingEntity> realBookings,
  ) {
    final Map<String, NotificationItem> map = {};

    // 1. Backend API notifications (highest priority — real data)
    for (final n in _backendNotifications) {
      map[n.id] = n;
    }

    // 2. Map database bookings (fallback if backend notifications are empty)
    if (_backendNotifications.isEmpty) {
      for (final booking in realBookings) {
        final isCancelled = booking.status.toLowerCase() == 'cancelled';
        final hotelName = booking.hotelName;
        final roomNo = booking.roomNumber ?? '';
        final title = isCancelled
            ? 'Your booking for $hotelName (Room $roomNo) has been cancelled.'
            : 'Your booking for $hotelName (Room $roomNo) is confirmed!';

        map[booking.id] = NotificationItem(
          id: booking.id,
          title: title,
          type: 'Booking',
          timestamp: booking.createdAt ?? booking.checkIn,
          isNew: !_readIds.contains(booking.id),
          isCancelled: isCancelled,
        );
      }
    }

    // 3. Include active session live notifications
    for (final live in _liveNotifications) {
      if (!map.containsKey(live.id)) {
        map[live.id] = NotificationItem(
          id: live.id,
          title: live.title,
          type: live.type,
          timestamp: live.timestamp,
          isNew: !_readIds.contains(live.id),
          isCancelled: live.isCancelled,
        );
      }
    }

    final items = map.values.toList();
    items.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return items;
  }

  void addNotification(
    String title, {
    bool isCancelled = false,
    String? bookingId,
    String subtitle = '',
    String type = 'Booking',
  }) {
    final id = bookingId ?? DateTime.now().millisecondsSinceEpoch.toString();
    final newItem = NotificationItem(
      id: id,
      title: title,
      type: type,
      timestamp: DateTime.now(),
      isNew: true,
      isCancelled: isCancelled,
    );

    _liveNotifications.insert(0, newItem);

    // Show in-app popup banner with sound
    showNotificationPopup(
      title: title,
      subtitle: subtitle,
      icon: type == 'Offer'
          ? Icons.local_offer_rounded
          : isCancelled
          ? Icons.cancel_outlined
          : Icons.check_circle_outline_rounded,
      iconColor: type == 'Offer'
          ? const Color(0xFFC0A080)
          : isCancelled
          ? Colors.redAccent
          : Colors.green,
    );

    // Also trigger system notification so it displays in notification tray
    PushNotificationService.showLocalNotification(title: title, body: subtitle);

    notifyListeners();
  }

  Future<void> markAsRead(String id) async {
    _readIds.add(id);

    // Update locally in backend list
    _backendNotifications = _backendNotifications
        .map(
          (n) => n.id == id
              ? NotificationItem(
                  id: n.id,
                  title: n.title,
                  type: n.type,
                  timestamp: n.timestamp,
                  isNew: false,
                  isCancelled: n.isCancelled,
                )
              : n,
        )
        .toList();

    // Update locally in live list
    for (int i = 0; i < _liveNotifications.length; i++) {
      if (_liveNotifications[i].id == id) {
        _liveNotifications[i] = NotificationItem(
          id: _liveNotifications[i].id,
          title: _liveNotifications[i].title,
          type: _liveNotifications[i].type,
          timestamp: _liveNotifications[i].timestamp,
          isNew: false,
          isCancelled: _liveNotifications[i].isCancelled,
        );
      }
    }

    _saveReadIds();
    notifyListeners();

    try {
      await _apiService.put('/notifications/$id/read');
    } catch (e) {
      debugPrint('[NotificationProvider] Failed to mark notification $id as read on backend: $e');
    }
  }

  Future<void> markAllAsRead(List<NotificationItem> items) async {
    for (final item in items) {
      _readIds.add(item.id);
    }
    // Also update local backend list so dots disappear immediately
    _backendNotifications = _backendNotifications
        .map(
          (n) => NotificationItem(
            id: n.id,
            title: n.title,
            type: n.type,
            timestamp: n.timestamp,
            isNew: !_readIds.contains(n.id),
            isCancelled: n.isCancelled,
          ),
        )
        .toList();

    // Also update locally in live list
    for (int i = 0; i < _liveNotifications.length; i++) {
      if (_readIds.contains(_liveNotifications[i].id)) {
        _liveNotifications[i] = NotificationItem(
          id: _liveNotifications[i].id,
          title: _liveNotifications[i].title,
          type: _liveNotifications[i].type,
          timestamp: _liveNotifications[i].timestamp,
          isNew: false,
          isCancelled: _liveNotifications[i].isCancelled,
        );
      }
    }

    _saveReadIds();
    notifyListeners();

    // Trigger API calls in parallel
    await Future.wait(
      items.map((item) async {
        try {
          await _apiService.put('/notifications/${item.id}/read');
        } catch (e) {
          debugPrint('[NotificationProvider] Failed to mark notification ${item.id} as read on backend: $e');
        }
      }),
    );
  }
}
