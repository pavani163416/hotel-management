import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../utils/audio_helper.dart';

/// A single popup item queued for display
class _PopupItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color iconColor;

  const _PopupItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.iconColor,
  });
}

/// Global key to access the overlay from anywhere
final GlobalKey<NotificationPopupOverlayState> notificationPopupKey =
    GlobalKey<NotificationPopupOverlayState>();

/// Call this from anywhere to show a popup notification with sound
void showNotificationPopup({
  required String title,
  String subtitle = '',
  IconData icon = Icons.notifications_rounded,
  Color iconColor = const Color(0xFFC0A080),
}) {
  notificationPopupKey.currentState?.show(
    _PopupItem(
      title: title,
      subtitle: subtitle,
      icon: icon,
      iconColor: iconColor,
    ),
  );
}

/// Wrap your app's router widget with this to get global popups
class NotificationPopupOverlay extends StatefulWidget {
  final Widget child;
  const NotificationPopupOverlay({super.key, required this.child});

  @override
  State<NotificationPopupOverlay> createState() =>
      NotificationPopupOverlayState();
}

class NotificationPopupOverlayState
    extends State<NotificationPopupOverlay> with TickerProviderStateMixin {
  final List<_PopupItem> _queue = [];
  _PopupItem? _current;
  late AnimationController _animController;
  late Animation<Offset> _slideAnim;
  late Animation<double> _fadeAnim;
  Timer? _dismissTimer;
  bool _showing = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 380),
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, -1.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOutBack,
    ));
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
  }

  @override
  void dispose() {
    _dismissTimer?.cancel();
    _animController.dispose();
    super.dispose();
  }

  void show(_PopupItem item) {
    _queue.add(item);
    if (!_showing) _showNext();
  }

  void _showNext() {
    if (_queue.isEmpty) {
      setState(() {
        _current = null;
        _showing = false;
      });
      return;
    }

    setState(() {
      _current = _queue.removeAt(0);
      _showing = true;
    });

    // Play sound
    triggerNotificationChime();

    _animController.forward(from: 0);

    _dismissTimer?.cancel();
    _dismissTimer = Timer(const Duration(seconds: 4), _dismiss);
  }

  void _dismiss() {
    _animController.reverse().then((_) {
      if (_queue.isNotEmpty) {
        Future.delayed(const Duration(milliseconds: 200), _showNext);
      } else {
        setState(() {
          _current = null;
          _showing = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_current != null)
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: SlideTransition(
              position: _slideAnim,
              child: FadeTransition(
                opacity: _fadeAnim,
                child: _PopupCard(
                  item: _current!,
                  onDismiss: () {
                    _dismissTimer?.cancel();
                    _dismiss();
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _PopupCard extends StatelessWidget {
  final _PopupItem item;
  final VoidCallback onDismiss;

  const _PopupCard({required this.item, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF253040) : Colors.white;
    final titleColor = isDark ? const Color(0xFFEAE5DC) : AppTheme.primaryColor;
    final subColor = isDark ? const Color(0xFFB0A898) : Colors.grey[600]!;
    final shadowColor = isDark
        ? Colors.black.withOpacity(0.4)
        : Colors.black.withOpacity(0.12);

    return Material(
      color: Colors.transparent,
      child: GestureDetector(
        onTap: onDismiss,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: bg,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: item.iconColor.withOpacity(0.35),
              width: 1.2,
            ),
            boxShadow: [
              BoxShadow(
                color: shadowColor,
                blurRadius: 20,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              // Icon circle
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: item.iconColor.withOpacity(0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(item.icon, color: item.iconColor, size: 22),
              ),
              const SizedBox(width: 14),
              // Text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: titleColor,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (item.subtitle.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(
                        item.subtitle,
                        style: TextStyle(fontSize: 12, color: subColor),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              // Dismiss X
              GestureDetector(
                onTap: onDismiss,
                child: Padding(
                  padding: const EdgeInsets.only(left: 8),
                  child: Icon(Icons.close_rounded, size: 18, color: subColor),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
