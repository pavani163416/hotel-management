import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';

class NotificationModal extends StatelessWidget {
  const NotificationModal({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Notifications',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('All notifications marked as read'), behavior: SnackBarBehavior.floating),
                  );
                },
                child: const Text('Mark all as read', style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 20),
          _buildNotificationItem(
            icon: LucideIcons.checkCircle,
            title: 'Booking Confirmed',
            message: 'Your stay at The Azure Boutique is confirmed.',
            time: '2 hours ago',
            isNew: true,
          ),
          const SizedBox(height: 16),
          _buildNotificationItem(
            icon: LucideIcons.tag,
            title: 'Exclusive Offer',
            message: 'Get 20% off on your next stay in Paris.',
            time: '5 hours ago',
            isNew: true,
          ),
          const SizedBox(height: 16),
          _buildNotificationItem(
            icon: LucideIcons.mail,
            title: 'Welcome to LuxeStay',
            message: 'Thank you for choosing our premium service.',
            time: '1 day ago',
            isNew: false,
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildNotificationItem({
    required IconData icon,
    required String title,
    required String message,
    required String time,
    required bool isNew,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isNew ? AppTheme.accentColor.withOpacity(0.05) : Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isNew ? AppTheme.accentColor.withOpacity(0.1) : AppTheme.mutedColor),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isNew ? AppTheme.accentColor.withOpacity(0.1) : AppTheme.mutedColor.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 18, color: isNew ? AppTheme.accentColor : AppTheme.primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    if (isNew)
                      Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(color: AppTheme.accentColor, shape: BoxShape.circle),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(message, style: TextStyle(color: Colors.grey[600], fontSize: 12, height: 1.4)),
                const SizedBox(height: 8),
                Text(time, style: TextStyle(color: Colors.grey[400], fontSize: 10)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
