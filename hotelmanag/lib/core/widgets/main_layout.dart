import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../theme/app_theme.dart';
import 'notification_modal.dart';
import '../providers/notification_provider.dart';
import '../providers/booking_provider.dart';
import '../providers/hotel_provider.dart';
import '../providers/currency_provider.dart';
import 'package:provider/provider.dart';
import 'chatbot_bottom_sheet.dart';

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
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      extendBody: true,
      appBar: (showNavbar && showAppBar) ? _buildAppBar(context) : null,
      body: Stack(
        children: [
          Container(
            width: double.infinity,
            height: double.infinity,
            constraints: BoxConstraints(minHeight: MediaQuery.of(context).size.height),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  AppTheme.backgroundColor,
                  AppTheme.accentColor,
                ],
                stops: [0.7, 1.0],
              ),
            ),
            child: isScrollable
                ? SingleChildScrollView(
                    child: Column(
                      children: [
                        child,
                      ],
                    ),
                  )
                : child,
          ),
          if (showNavbar && showBottomNav)
            Positioned(
              right: 16,
              bottom: 86 + MediaQuery.of(context).padding.bottom,
              child: FloatingActionButton(
                onPressed: () => _openChatbot(context),
                backgroundColor: AppTheme.primaryColor,
                elevation: 6,
                child: const Icon(LucideIcons.sparkles, color: Colors.white),
              ),
            ),
        ],
      ),
      bottomNavigationBar: (showNavbar && showBottomNav) ? _buildBottomNav(context) : null,
      floatingActionButton: Navigator.of(context).canPop()
          ? Padding(
              padding: const EdgeInsets.only(top: 16),
              child: FloatingActionButton.small(
                onPressed: () => context.pop(),
                backgroundColor: Colors.white.withOpacity(0.9),
                child: const Icon(LucideIcons.arrowLeft, color: AppTheme.primaryColor),
              ),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.startTop,
    );
  }

  PreferredSizeWidget _buildAppBar(BuildContext context) {
    return AppBar(
      backgroundColor: Colors.white.withOpacity(0.9),
      elevation: 0,
      title: InkWell(
        onTap: () => context.go('/'),
        child: const Text(
          'LuxeStay',
          style: TextStyle(
            color: AppTheme.primaryColor,
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
                  icon: const Icon(LucideIcons.bell, color: AppTheme.primaryColor, size: 22),
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
                      decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
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
                icon: const Icon(LucideIcons.chevronDown, color: AppTheme.primaryColor, size: 16),
                style: const TextStyle(color: AppTheme.primaryColor, fontSize: 13, fontWeight: FontWeight.bold),
                onChanged: (String? newValue) {
                  if (newValue != null) {
                    currencyProvider.setCurrency(newValue);
                  }
                },
                items: CurrencyProvider.rates.keys.map<DropdownMenuItem<String>>((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
              ),
            );
          },
        ),
        IconButton(
          icon: const Icon(LucideIcons.user, color: AppTheme.primaryColor, size: 22),
          onPressed: () => context.go('/profile'),
        ),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildBottomNav(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    int currentIndex = 0;
    if (location == '/') currentIndex = 0;
    else if (location == '/hotels') currentIndex = 1;
    else if (location == '/history') currentIndex = 2;
    else if (location == '/profile') currentIndex = 3;

    return Container(
      height: 70 + MediaQuery.of(context).padding.bottom,
      decoration: BoxDecoration(
        color: Colors.white,
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
            _buildNavItem(context, 0, Icons.home_outlined, Icons.home_rounded, 'Home', currentIndex == 0),
            _buildNavItem(context, 1, Icons.apartment_outlined, Icons.apartment_rounded, 'Hotels', currentIndex == 1),
            _buildNavItem(context, 2, Icons.history_rounded, Icons.manage_history_rounded, 'History', currentIndex == 2),
            _buildNavItem(context, 3, Icons.account_circle_outlined, Icons.account_circle_rounded, 'Profile', currentIndex == 3),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(BuildContext context, int index, IconData outlineIcon, IconData filledIcon, String label, bool isSelected) {
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
              color: isSelected ? AppTheme.primaryColor : Colors.black.withOpacity(0.3),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                color: isSelected ? AppTheme.primaryColor : Colors.black.withOpacity(0.3),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _openChatbot(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const ChatbotBottomSheet(),
    );
  }
}
