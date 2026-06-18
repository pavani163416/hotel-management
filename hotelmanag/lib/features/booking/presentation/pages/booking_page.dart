import 'package:flutter/material.dart';
import '../../../../core/providers/currency_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';
import '../../../../core/providers/booking_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class BookingPage extends StatefulWidget {
  const BookingPage({super.key});

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> {
  Future<void> _selectDate(BuildContext context, bool isCheckIn) async {
    final provider = context.read<BookingProvider>();
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? provider.checkIn : provider.checkOut,
      firstDate: isCheckIn
          ? DateTime.now()
          : provider.checkIn.add(const Duration(days: 1)),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              onSurface: AppTheme.primaryColor,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      if (isCheckIn) {
        DateTime newCheckOut = provider.checkOut;
        if (newCheckOut.isBefore(picked.add(const Duration(days: 1)))) {
          newCheckOut = picked.add(const Duration(days: 1));
        }
        provider.updateDates(picked, newCheckOut);
      } else {
        provider.updateDates(provider.checkIn, picked);
      }
    }
  }

  /// TC-FE-043: Validates chronological date order before navigating to guest
  /// details. Blocks the API call if checkout is on or before checkin.
  void _confirmDates(BookingProvider provider) {
    final checkIn = provider.checkIn;
    final checkOut = provider.checkOut;

    // Guard 1: checkout must not be before checkin
    if (checkOut.isBefore(checkIn)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Check-out must be after check-in'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // Guard 2: same-day checkout is not allowed (minimum 1 night stay)
    final isSameDay =
        checkOut.year == checkIn.year &&
        checkOut.month == checkIn.month &&
        checkOut.day == checkIn.day;
    if (isSameDay) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Check-out cannot be the same day as check-in'),
          backgroundColor: Colors.redAccent,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    // Validation passed — proceed to guest details
    context.push('/guest-details');
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();
    final hotel = provider.currentHotel;

    if (hotel == null) {
      return const MainLayout(child: Center(child: Text('No hotel selected')));
    }

    return MainLayout(
      showAppBar: true,
      isScrollable: false,
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24.0, 0, 24.0, 140.0),
          child: Column(
            children: [
              const StepperWidget(currentStep: 0),
              const SizedBox(height: 16),
              const Text(
                'Your Selection',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                  fontFamily: 'Serif',
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Confirm your stay details before continuing.',
                style: TextStyle(
                  color: AppTheme.primaryColor.withOpacity(0.5),
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 32),
              _buildMainSelectionCard(provider),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMainSelectionCard(BookingProvider provider) {
    final hotel = provider.currentHotel!;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            child: CachedNetworkImage(
              imageUrl: hotel.imageUrl,
              height: 250,
              width: double.infinity,
              fit: BoxFit.cover,
              memCacheWidth: 600,
              memCacheHeight: 380,
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  hotel.name,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      LucideIcons.mapPin,
                      size: 14,
                      color: AppTheme.primaryColor.withOpacity(0.6),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      hotel.location,
                      style: TextStyle(
                        color: AppTheme.primaryColor.withOpacity(0.6),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 24),

                LayoutBuilder(
                  builder: (context, constraints) {
                    return Wrap(
                      spacing: 32,
                      runSpacing: 24,
                      children: [
                        _buildSection(
                          'ROOM',
                          Text(provider.selectedRoomType, style: _valueStyle()),
                        ),
                        _buildSection(
                          'DATES',
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildDateInput(provider.checkIn, true),
                              const SizedBox(height: 8),
                              _buildDateInput(provider.checkOut, false),
                            ],
                          ),
                        ),
                        _buildSection(
                          'DURATION',
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildCounterRow(
                                LucideIcons.moon,
                                '${provider.nights} nights',
                                () {
                                  if (provider.nights > 1) {
                                    provider.updateDates(
                                      provider.checkIn,
                                      provider.checkOut.subtract(
                                        const Duration(days: 1),
                                      ),
                                    );
                                  }
                                },
                                () {
                                  provider.updateDates(
                                    provider.checkIn,
                                    provider.checkOut.add(
                                      const Duration(days: 1),
                                    ),
                                  );
                                },
                              ),
                              const SizedBox(height: 12),
                              _buildCounterRow(
                                LucideIcons.users,
                                '${provider.guests} guests',
                                () {
                                  if (provider.guests > 1)
                                    provider.updateGuests(provider.guests - 1);
                                },
                                () {
                                  final maxG = provider.currentHotel?.maxGuests ?? 8;
                                  if (provider.guests < maxG) {
                                    provider.updateGuests(provider.guests + 1);
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Maximum $maxG guests allowed',
                                        ),
                                        behavior: SnackBarBehavior.floating,
                                      ),
                                    );
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  },
                ),

                const SizedBox(height: 32),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 24),

                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Subtotal (${provider.nights} nights)',
                            style: const TextStyle(
                              fontSize: 12,
                              color: Colors.grey,
                            ),
                          ),
                          Text(
                            context.watch<CurrencyProvider>().format(
                              provider.subtotal,
                            ),
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    ElevatedButton(
                      onPressed: () => _confirmDates(provider),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 32,
                          vertical: 20,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Row(
                        children: [
                          Text(
                            'Continue',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                          SizedBox(width: 8),
                          Icon(LucideIcons.arrowRight, size: 18),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String label, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(
              _getIconForLabel(label),
              size: 14,
              color: AppTheme.primaryColor.withOpacity(0.4),
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryColor.withOpacity(0.4),
                letterSpacing: 1,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        content,
      ],
    );
  }

  IconData _getIconForLabel(String label) {
    switch (label) {
      case 'ROOM':
        return LucideIcons.bed;
      case 'DATES':
        return LucideIcons.calendar;
      case 'DURATION':
        return LucideIcons.clock;
      default:
        return LucideIcons.info;
    }
  }

  Widget _buildDateInput(DateTime date, bool isCheckIn) {
    return InkWell(
      onTap: () => _selectDate(context, isCheckIn),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.mutedColor),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              DateFormat('dd - MM - yyyy').format(date),
              style: const TextStyle(
                fontSize: 13,
                color: AppTheme.primaryColor,
              ),
            ),
            const SizedBox(width: 12),
            Icon(
              LucideIcons.calendar,
              size: 14,
              color: AppTheme.primaryColor.withOpacity(0.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCounterRow(
    IconData icon,
    String text,
    VoidCallback? onMinus,
    VoidCallback? onPlus, {
    bool isReadOnly = false,
  }) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (!isReadOnly) _buildCounterBtn(LucideIcons.minus, onMinus!),
        if (isReadOnly)
          Icon(icon, size: 14, color: AppTheme.primaryColor.withOpacity(0.4)),
        const SizedBox(width: 12),
        SizedBox(
          width: 70,
          child: Text(
            text,
            style: const TextStyle(fontSize: 14, color: AppTheme.primaryColor),
          ),
        ),
        if (!isReadOnly) _buildCounterBtn(LucideIcons.plus, onPlus!),
      ],
    );
  }

  Widget _buildCounterBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          border: Border.all(color: AppTheme.mutedColor),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 12,
          color: AppTheme.primaryColor.withOpacity(0.4),
        ),
      ),
    );
  }

  TextStyle _valueStyle() => const TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: AppTheme.primaryColor,
  );
}
