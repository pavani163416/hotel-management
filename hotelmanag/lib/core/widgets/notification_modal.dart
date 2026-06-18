import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import '../providers/notification_provider.dart';
import '../providers/booking_provider.dart';
import '../providers/auth_provider.dart';

class NotificationModal extends StatefulWidget {
  const NotificationModal({super.key});

  @override
  State<NotificationModal> createState() => _NotificationModalState();
}

class _NotificationModalState extends State<NotificationModal> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      if (!mounted) return;
      final auth = context.read<AuthProvider>();
      if (auth.isAuthenticated) {
        context.read<NotificationProvider>().fetchNotifications();
      }
    });
  }

  String _formatTimeAgo(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inSeconds < 60) return 'Just Now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m Ago';
    if (diff.inHours < 24) return '${diff.inHours}h Ago';
    return '${diff.inDays}d Ago';
  }

  void _showNotificationDetails(BuildContext context, NotificationItem item) {
    // Mark as read immediately on open
    context.read<NotificationProvider>().markAllAsRead([item]);

    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final dialogBg = isDark ? const Color(0xFF253040) : Colors.white;
    final titleColor = isDark ? const Color(0xFFEAE5DC) : AppTheme.primaryColor;
    final bodyColor = isDark ? Colors.grey[350] : Colors.grey[800];

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

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: dialogBg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(
            color: isDark ? Colors.white10 : AppTheme.mutedColor,
            width: 1,
          ),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                '${item.type} Notification',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: titleColor,
                  fontFamily: 'Serif',
                ),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              item.title,
              style: TextStyle(
                fontSize: 14,
                color: bodyColor,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Received: ${DateFormat('MMM dd, yyyy \'at\' hh:mm a').format(item.timestamp)}',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(
              'Close',
              style: TextStyle(
                color: isDark ? Colors.grey[400] : Colors.grey[600],
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          if (item.type == 'Booking')
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Close notification modal
                context.go('/history'); // Go to bookings history
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                elevation: 0,
              ),
              child: const Text(
                'View Bookings',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final sheetBg = isDark ? const Color(0xFF253040) : Colors.white;
    final titleColor = isDark ? const Color(0xFFEAE5DC) : AppTheme.primaryColor;
    final subColor = isDark ? const Color(0xFFB0A898) : Colors.grey[500]!;
    final divColor = isDark ? Colors.white12 : Colors.grey.shade200;
    final handleColor = isDark ? Colors.white24 : Colors.grey.shade300;

    final bookings = context.watch<BookingProvider>().bookings;
    final provider = context.watch<NotificationProvider>();
    final items = provider.getRealNotifications(bookings);
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
                SliverToBoxAdapter(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
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
                            Flexible(
                              child: FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Row(
                                  children: [
                                    if (provider.isFetching)
                                      Padding(
                                        padding: const EdgeInsets.only(
                                          right: 8,
                                        ),
                                        child: SizedBox(
                                          width: 14,
                                          height: 14,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                            color: subColor,
                                          ),
                                        ),
                                      ),
                                    const SizedBox.shrink(),
                                    TextButton(
                                      style: TextButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                        ),
                                        minimumSize: Size.zero,
                                        tapTargetSize:
                                            MaterialTapTargetSize.shrinkWrap,
                                      ),
                                      onPressed: () {
                                        provider.markAllAsRead(items);
                                        ScaffoldMessenger.of(
                                          context,
                                        ).showSnackBar(
                                          const SnackBar(
                                            content: Text(
                                              'All notifications marked as read',
                                            ),
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
                                    IconButton(
                                      icon: Icon(
                                        Icons.refresh,
                                        size: 18,
                                        color: subColor,
                                      ),
                                      tooltip: 'Refresh',
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                      onPressed: provider.isFetching
                                          ? null
                                          : () => provider.fetchNotifications(),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      Divider(color: divColor, height: 16),
                    ],
                  ),
                ),

                if (items.isEmpty && provider.isFetching)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: CircularProgressIndicator(color: subColor),
                    ),
                  )
                else if (items.isEmpty)
                  SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.notifications_none_outlined,
                            size: 48,
                            color: subColor,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No notifications yet.',
                            style: TextStyle(color: subColor, fontSize: 14),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.only(bottom: 40),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate((context, index) {
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

                        return InkWell(
                          onTap: () => _showNotificationDetails(context, item),
                          child: Container(
                            color: cardColor,
                          padding: const EdgeInsets.symmetric(
                            vertical: 12,
                            horizontal: 20,
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                margin: const EdgeInsets.only(
                                  top: 2,
                                  right: 12,
                                ),
                                padding: const EdgeInsets.all(7),
                                decoration: BoxDecoration(
                                  color: iconColor.withOpacity(0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(icon, size: 16, color: iconColor),
                              ),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
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
                                        fontSize: 11,
                                        color: subColor,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (item.isNew)
                                Container(
                                  width: 8,
                                  height: 8,
                                  margin: const EdgeInsets.only(
                                    top: 5,
                                    left: 8,
                                  ),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFC0A080),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                            ],
                          ),
                        ));
                      }, childCount: items.length),
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
