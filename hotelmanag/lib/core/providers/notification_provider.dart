import 'package:flutter/material.dart';
import '../utils/audio_helper.dart';
import '../utils/audio_helper.dart';
import '../widgets/notification_popup.dart';
import '../../features/booking/domain/entities/booking_entity.dart';
import '../services/push_notifications.dart';

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
  final Set<String> _readBookingIds = {};
  final List<NotificationItem> _liveNotifications = [];

  // Get combined list of real notifications mapped from backend database bookings
  List<NotificationItem> getRealNotifications(List<BookingEntity> realBookings) {
    final List<NotificationItem> items = [];

    // 1. Map database bookings to real notifications
    for (final booking in realBookings) {
      final isCancelled = booking.status.toLowerCase() == 'cancelled';
      final hotelName = booking.hotelName;
      final roomNo = booking.roomNumber ?? '';
      
      final title = isCancelled
          ? 'Your booking for $hotelName (Room $roomNo) has been cancelled.'
          : 'Your booking for $hotelName (Room $roomNo) is confirmed!';

      items.add(
        NotificationItem(
          id: booking.id,
          title: title,
          type: 'Booking',
          timestamp: booking.createdAt ?? booking.checkIn,
          isNew: !_readBookingIds.contains(booking.id),
          isCancelled: isCancelled,
        ),
      );
    }

    // 2. Include active session live notifications if any
    for (final live in _liveNotifications) {
      if (!items.any((i) => i.id == live.id)) {
        items.add(
          NotificationItem(
            id: live.id,
            title: live.title,
            type: live.type,
            timestamp: live.timestamp,
            isNew: !_readBookingIds.contains(live.id),
            isCancelled: live.isCancelled,
          ),
        );
      }
    }

    // 3. Sort by newest first
    items.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    return items;
  }

  void addNotification(String title, {
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

    // Also trigger system notification (vibration/sound) so it displays in notification tray
    PushNotificationService.showLocalNotification(title: title, body: subtitle);

    // Sound is played inside showNotificationPopup via the overlay
    notifyListeners();
  }

  void markAllAsRead(List<NotificationItem> items) {
    for (final item in items) {
      _readBookingIds.add(item.id);
    }
    notifyListeners();
  }
}
