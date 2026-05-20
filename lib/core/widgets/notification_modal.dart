import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../theme/app_theme.dart';
import '../providers/notification_provider.dart';
import '../providers/booking_provider.dart';

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
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final sheetBg    = isDark ? const Color(0xFF253040) : Colors.white;
    final titleColor = isDark ? const Color(0xFFEAE5DC) : AppTheme.primaryColor;
    final subColor   = isDark ? const Color(0xFFB0A898) : Colors.grey[500]!;
    final divColor   = isDark ? Colors.white12 : Colors.grey.shade200;
    final handleColor = isDark ? Colors.white24 : Colors.grey.shade300;

    // Read providers here — outside the builder — so they have the right context
    final bookings = context.watch<BookingProvider>().bookings;
    final provider = context.watch<NotificationProvider>();
    final items    = provider.getRealNotifications(bookings);
    final unreadCount = items.where((i) => i.isNew).length;

    return DraggableScrollableSheet(
      initialChildSize: 0.55,
      minChildSize: 0.35,
      maxChildSize: 0.92,
      expand: false,
      builder: (_, scrollController) {
        return ClipRRect(
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          child: Material(
            color: sheetBg,
            child: CustomScrollView(
              controller: scrollController,
              physics: const BouncingScrollPhysics(),
              slivers: [
                // ── Handle + Header (pinned) ─────────────────
                SliverToBoxAdapter(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Handle bar
                      Center(
                        child: Container(
                          width: 40,
                          height: 4,
                          margin: const EdgeInsets.only(top: 12, bottom: 8),
                          decoration: BoxDecoration(
                            color: handleColor,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                      // Header row
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 8, 12, 0),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Notifications',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: titleColor,
                                fontFamily: 'Serif',
                              ),
                            ),
                            Row(
                              children: [
                                Text(
                                  '$unreadCount unread',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: subColor,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                TextButton(
                                  style: TextButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8),
                                    minimumSize: Size.zero,
                                    tapTargetSize:
                                        MaterialTapTargetSize.shrinkWrap,
                                  ),
                                  onPressed: () {
                                    provider.markAllAsRead(items);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                            'All notifications marked as read'),
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                  },
                                  child: const Text(
                                    'Mark all read',
                                    style: TextStyle(
                                      color: Color(0xFFC0A080),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Divider(color: divColor, height: 20),
                    ],
                  ),
                ),

                // ── Empty state ──────────────────────────────
                if (items.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Text(
                        'No notifications yet.',
                        style: TextStyle(color: subColor, fontSize: 14),
                      ),
                    ),
                  )
                else
                  // ── Notification items ───────────────────────
                  SliverPadding(
                    padding: const EdgeInsets.only(bottom: 40),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (context, index) {
                          final item = items[index];
                          final timeStr = _formatTimeAgo(item.timestamp);

                          final cardColor = item.isCancelled
                              ? (isDark
                                  ? const Color(0xFF2A3545)
                                  : const Color(0xFFE8E3D9))
                              : Colors.transparent;

                          IconData icon;
                          Color iconColor;
                          if (item.type == 'Offer') {
                            icon = Icons.local_offer_rounded;
                            iconColor = const Color(0xFFC0A080);
                          } else if (item.isCancelled) {
                            icon = Icons.cancel_outlined;
                            iconColor = Colors.redAccent;
                          } else {
                            icon = Icons.check_circle_outline_rounded;
                            iconColor = Colors.green;
                          }

                          return Container(
                            color: cardColor,
                            padding: const EdgeInsets.symmetric(
                                vertical: 12, horizontal: 20),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Icon circle
                                Container(
                                  margin: const EdgeInsets.only(
                                      top: 2, right: 12),
                                  padding: const EdgeInsets.all(7),
                                  decoration: BoxDecoration(
                                    color: iconColor.withOpacity(0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(icon,
                                      size: 16, color: iconColor),
                                ),
                                // Text
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        item.title,
                                        style: TextStyle(
                                          fontWeight: item.isNew
                                              ? FontWeight.w600
                                              : FontWeight.w400,
                                          fontSize: 14,
                                          color: titleColor,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${item.type} • $timeStr',
                                        style: TextStyle(
                                            fontSize: 11, color: subColor),
                                      ),
                                    ],
                                  ),
                                ),
                                // Unread dot
                                if (item.isNew)
                                  Container(
                                    width: 8,
                                    height: 8,
                                    margin: const EdgeInsets.only(
                                        top: 5, left: 8),
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFC0A080),
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                              ],
                            ),
                          );
                        },
                        childCount: items.length,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}
