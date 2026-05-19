import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/notification_provider.dart';

class NotificationModal extends StatelessWidget {
  const NotificationModal({super.key});

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just Now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m Ago';
    if (diff.inHours < 24) return '${diff.inHours}h Ago';
    return '${diff.inDays}d Ago';
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationProvider>(
      builder: (context, provider, child) {
        final items = provider.notifications;
        final unreadCount = provider.unreadCount;

        return Container(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Notifications',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.primaryColor,
                      fontFamily: 'Serif',
                    ),
                  ),
                  Row(
                    children: [
                      Text(
                        '$unreadCount unread',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        style: TextButton.styleFrom(
                          padding: EdgeInsets.zero,
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        onPressed: () {
                          provider.markAllAsRead();
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('All notifications marked as read'),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        child: const Text(
                          'Mark all as read',
                          style: TextStyle(
                            color: Color(0xFFC0A080), // Premium gold/accent
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              
              // Notifications List
              if (items.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40),
                  child: Center(
                    child: Text(
                      'No notifications yet.',
                      style: TextStyle(color: Colors.grey[400], fontSize: 14),
                    ),
                  ),
                )
              else
                Flexible(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(
                      maxHeight: MediaQuery.of(context).size.height * 0.45,
                    ),
                    child: ListView.builder(
                      shrinkWrap: true,
                      physics: const BouncingScrollPhysics(),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final item = items[index];
                        final timeStr = _formatTimeAgo(item.timestamp);
                        
                        // Tan background for cancelled notifications as requested in screenshot!
                        final isCancelled = item.isCancelled;
                        final cardColor = isCancelled ? const Color(0xFFE8E3D9) : Colors.white;
                        
                        return Container(
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: cardColor,
                            border: Border(
                              bottom: BorderSide(
                                color: Colors.grey[200]!,
                                width: 0.8,
                              ),
                            ),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.center,
                            children: [
                              // Unread Bullet Dot indicator
                              if (item.isNew)
                                Container(
                                  margin: const EdgeInsets.only(right: 12),
                                  width: 8,
                                  height: 8,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFC0A080), // Accent bullet dot
                                    shape: BoxShape.circle,
                                  ),
                                )
                              else
                                const SizedBox(width: 8), // Placeholder spacing
                              
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.title,
                                      style: TextStyle(
                                        fontWeight: item.isNew ? FontWeight.w600 : FontWeight.w500,
                                        fontSize: 14.5,
                                        color: AppTheme.primaryColor,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${item.type} • $timeStr',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[500],
                                        fontWeight: FontWeight.w400,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }
}
