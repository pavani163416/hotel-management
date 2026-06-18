import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import 'notification_modal.dart';
import '../providers/notification_provider.dart';
import '../providers/booking_provider.dart';
import '../providers/hotel_provider.dart';
import '../providers/currency_provider.dart';
import 'package:provider/provider.dart';
class MainLayout extends StatelessWidget {
  final Widget child;
  final bool showNavbar;
  final bool showAppBar;
  final bool showBottomNav;
  final bool isScrollable;

  const MainLayout({
    super.key,
    required this.child,
    this.showNavbar = true,
    this.showAppBar = false,
    this.showBottomNav = true,
    this.isScrollable = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      extendBody: true,
      appBar: (showNavbar && showAppBar) ? _buildAppBar(context) : null,
      body: Stack(
        children: [
          Container(
            width: double.infinity,
            height: double.infinity,
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height,
            ),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  theme.scaffoldBackgroundColor,
                  isDark ? const Color(0xFF253040) : AppTheme.accentColor,
                ],
                stops: const [0.7, 1.0],
              ),
            ),
            child: isScrollable
                ? SingleChildScrollView(child: Column(children: [child]))
                : child,
          ),
        ],
      ),
      bottomNavigationBar: (showNavbar && showBottomNav)
          ? _buildBottomNav(context)
          : null,
      floatingActionButton: Navigator.of(context).canPop()
          ? Padding(
              padding: const EdgeInsets.only(top: 16),
              child: FloatingActionButton.small(
                onPressed: () => context.pop(),
                backgroundColor: theme.colorScheme.surface.withOpacity(0.9),
                child: Icon(
                  LucideIcons.arrowLeft,
                  color: theme.colorScheme.primary,
                ),
              ),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.startTop,
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    final theme = Theme.of(context);
    return AppBar(
      backgroundColor: (theme.appBarTheme.backgroundColor ?? theme.colorScheme.surface).withOpacity(0.9),
      elevation: 0,
      title: InkWell(
        onTap: () => context.go('/'),
        child: Text(
          'Athithigriha',
          style: TextStyle(
            color: theme.colorScheme.primary,
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
      ),
      actions: [
        Consumer2<NotificationProvider, BookingProvider>(
          builder: (context, provider, bookingProv, child) {
            final items = provider.getRealNotifications(bookingProv.bookings);
            final unreadCount = items.where((i) => i.isNew).length;
            return Stack(
              children: [
                IconButton(
                  icon: Icon(
                    LucideIcons.bell,
                    color: theme.colorScheme.primary,
                    size: 22,
                  ),
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (context) => const NotificationModal(),
                    );
                  },
                ),
                if (unreadCount > 0)
                  Positioned(
                    top: 8,
                    right: 8,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                      child: Text(
                        '$unreadCount',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
        Consumer<CurrencyProvider>(
          builder: (context, currencyProvider, child) {
            return DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                value: currencyProvider.currency,
                dropdownColor: theme.colorScheme.surface,
                icon: Icon(
                  LucideIcons.chevronDown,
                  color: theme.colorScheme.primary,
                  size: 16,
                ),
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    currencyProvider.setCurrency(newValue);
                  }
                },
                items: CurrencyProvider.rates.keys
                    .map<DropdownMenuItem<String>>((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(
                          value,
                          style: TextStyle(color: theme.colorScheme.onSurface),
                        ),
                      );
                    })
                    .toList(),
              ),
            );
          },
        ),
        IconButton(
          icon: Icon(
            LucideIcons.user,
            color: theme.colorScheme.primary,
            size: 22,
          ),
          onPressed: () => context.go('/profile'),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    final theme = Theme.of(context);
    final location = GoRouterState.of(context).matchedLocation;
    int currentIndex = 0;
    if (location == '/')
      currentIndex = 0;
    else if (location == '/hotels')
      currentIndex = 1;
    else if (location == '/history')
      currentIndex = 2;
    else if (location == '/profile')
      currentIndex = 3;

    return Container(
      height: 70 + MediaQuery.of(context).padding.bottom,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(30)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 20,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).padding.bottom),
        child: Row(
          children: [
            _buildNavItem(
              context,
              0,
              Icons.home_outlined,
              Icons.home_rounded,
              'Home',
              currentIndex == 0,
            ),
            _buildNavItem(
              context,
              1,
              Icons.apartment_outlined,
              Icons.apartment_rounded,
              'Hotels',
              currentIndex == 1,
            ),
            _buildNavItem(
              context,
              2,
              Icons.history_rounded,
              Icons.manage_history_rounded,
              'History',
              currentIndex == 2,
            ),
            _buildNavItem(
              context,
              3,
              Icons.account_circle_outlined,
              Icons.account_circle_rounded,
              'Profile',
              currentIndex == 3,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context,
    int index,
    IconData outlineIcon,
    IconData filledIcon,
    String label,
    bool isSelected,
  ) {
    final theme = Theme.of(context);
    return Expanded(
      child: InkWell(
        onTap: () {
          if (index == 0) {
            context.go('/');
          } else if (index == 1) {
            context.read<HotelProvider>().clearFilters();
            context.go('/hotels');
          } else if (index == 2) {
            context.go('/history');
          } else if (index == 3) {
            context.go('/profile');
          }
        },
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? filledIcon : outlineIcon,
              size: 24,
              color: isSelected
                  ? theme.colorScheme.primary
                  : theme.colorScheme.onSurface.withOpacity(0.4),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected
                    ? theme.colorScheme.primary
                    : theme.colorScheme.onSurface.withOpacity(0.4),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
