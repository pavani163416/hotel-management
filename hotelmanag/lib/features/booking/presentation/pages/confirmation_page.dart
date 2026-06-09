import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/providers/currency_provider.dart';
import '../../../../core/utils/receipt_generator.dart';
import '../../domain/entities/booking_entity.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ConfirmationPage extends StatelessWidget {
  const ConfirmationPage({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();
    final latestBooking = provider.bookings.isNotEmpty ? provider.bookings.first : null;
    final hotel = provider.currentHotel;

    if (hotel == null || latestBooking == null) {
      return const MainLayout(child: Center(child: Text('No booking data found')));
    }

    return MainLayout(
      showNavbar: false,
      child: SingleChildScrollView(
        child: Center(
          child: Container(
            constraints: const BoxConstraints(maxWidth: 500),
            margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 60),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppTheme.mutedColor.withOpacity(0.5)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // ── Success icon ──────────────────────────────
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE5E0D8),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(LucideIcons.check, size: 32, color: AppTheme.primaryColor),
                ),
                const SizedBox(height: 32),
                const Text(
                  'Booking Confirmed!',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
                ),
                const SizedBox(height: 16),
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 13, height: 1.5),
                    children: [
                      const TextSpan(text: 'Your reservation at '),
                      TextSpan(text: hotel.name, style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                      const TextSpan(text: ' is confirmed. Booking ID '),
                      TextSpan(text: '#${latestBooking.id.length > 10 ? latestBooking.id.substring(latestBooking.id.length - 10) : latestBooking.id}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                      const TextSpan(text: ' has been saved to your history.'),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // ── Booking ID card ───────────────────────────
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1EDE6),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Stack(
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('BOOKING ID', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5)),
                          const SizedBox(height: 8),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text(
                              '#${latestBooking.id.length > 12 ? latestBooking.id.substring(latestBooking.id.length - 12) : latestBooking.id}',
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
                            ),
                          ),
                        ],
                      ),
                      const Positioned(
                        right: 0,
                        top: 8,
                        child: Text(
                          'PAYMENT SUCCESSFUL',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black12, letterSpacing: 1),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 24),

                // ── Hotel info ────────────────────────────────
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: CachedNetworkImage(
                        imageUrl: hotel.imageUrl,
                        width: 70,
                        height: 70,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(hotel.name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)), maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(LucideIcons.calendar, size: 12, color: Colors.grey),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  '${DateFormat('MMM dd').format(provider.checkIn)} → ${DateFormat('MMM dd').format(provider.checkOut)} (${provider.nights}n)',
                                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              const Icon(LucideIcons.users, size: 12, color: Colors.grey),
                              const SizedBox(width: 6),
                              Text(
                                '${provider.guests} guest${provider.guests != 1 ? 's' : ''} · ${provider.selectedRoomType}',
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 24),

                // ── Price breakdown ───────────────────────────
                _priceRow('Subtotal', context.watch<CurrencyProvider>().format(provider.subtotal)),
                _priceRow('Service Fee', context.watch<CurrencyProvider>().format(provider.serviceFee)),
                _priceRow('Taxes', context.watch<CurrencyProvider>().format(provider.taxes)),
                if (provider.discountAmount > 0)
                  _priceRow('Discount', '-' + context.watch<CurrencyProvider>().format(provider.discountAmount), valueColor: Colors.green),
                const SizedBox(height: 8),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Paid', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                    Text(
                      context.watch<CurrencyProvider>().format(provider.total),
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // ── Download Receipt button ───────────────────
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _downloadReceipt(context, provider, latestBooking, hotel.location),
                    icon: const Icon(LucideIcons.download, size: 18),
                    label: const Text('Download Receipt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 0,
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // ── Navigation buttons ────────────────────────
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => context.go('/history'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE2DED5),
                          foregroundColor: const Color(0xFF2D3748),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text('History', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () => context.go('/'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE2DED5),
                          foregroundColor: const Color(0xFF2D3748),
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          elevation: 0,
                        ),
                        child: const Text('Browse More', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _priceRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          Text(value, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: valueColor ?? AppTheme.primaryColor)),
        ],
      ),
    );
  }

  void _downloadReceipt(BuildContext context, BookingProvider provider, BookingEntity booking, String hotelLocation) {
    final nights = booking.nights ?? booking.checkOut.difference(booking.checkIn).inDays;
    final sub = booking.subtotal ?? booking.totalAmount;
    final tax = booking.taxes ?? 0;
    final disc = (sub + tax - booking.totalAmount).clamp(0.0, sub + tax);
    final data = ReceiptData(
      bookingId: booking.id,
      hotelName: booking.hotelName,
      hotelLocation: hotelLocation,
      guestName: booking.guestName ?? 'Guest',
      guestId: booking.guestId,
      roomType: booking.roomType ?? provider.selectedRoomType,
      roomNumber: booking.roomNumber ?? provider.selectedRoomType,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      nights: nights,
      guests: 1 + (booking.additionalAdults?.length ?? 0) + (booking.additionalChildren?.length ?? 0),
      pricePerNight: booking.pricePerNight ?? provider.selectedRoomPrice,
      subtotal: sub,
      taxes: tax,
      discount: disc,
      total: booking.totalAmount,
      paymentMethod: booking.paymentMethod ?? 'Card',
      status: booking.status,
      bookedAt: booking.createdAt ?? DateTime.now(),
      additionalAdults: booking.additionalAdults ?? const [],
      additionalChildren: booking.additionalChildren ?? const [],
    );
    downloadReceipt(context, data);
  }
}
