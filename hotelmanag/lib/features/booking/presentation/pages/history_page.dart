import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../domain/entities/booking_entity.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key});

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<BookingProvider>().fetchMyBookings());
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Booking History',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
              const SizedBox(height: 8),
              Text(
                'Manage your upcoming stays and review past adventures.',
                style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 16),
              ),
              const SizedBox(height: 32),
              _buildFilters(),
              const SizedBox(height: 32),
              Consumer<BookingProvider>(
                builder: (context, provider, child) {
                  if (provider.isLoading) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (provider.error != null) {
                    return Center(child: Text('Error: ${provider.error}'));
                  }
                  
                  final bookings = provider.bookings;
                  final filteredBookings = _filter == 'all' 
                    ? bookings 
                    : bookings.where((b) => b.status == _filter).toList();

                  if (filteredBookings.isEmpty) {
                    return _buildEmptyState();
                  }

                  return Column(
                    children: filteredBookings.map((b) => BookingListItem(booking: b)).toList(),
                  );
                },
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 60),
          Icon(LucideIcons.calendarX, size: 64, color: AppTheme.mutedColor),
          const SizedBox(height: 16),
          Text('No bookings found', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor.withOpacity(0.5))),
          Text('Try changing your filters', style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.4))),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    final filters = ['all', 'Confirmed', 'Cancelled'];
    return Wrap(
      spacing: 12,
      children: filters.map((f) {
        final isSelected = _filter == f;
        return InkWell(
          onTap: () => setState(() => _filter = f),
          borderRadius: BorderRadius.circular(30),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
            decoration: BoxDecoration(
              color: isSelected ? const Color(0xFFE5E0D8) : AppTheme.mutedColor.withOpacity(0.3),
              borderRadius: BorderRadius.circular(30),
            ),
            child: Text(
              f == 'all' ? 'All Bookings' : f,
              style: TextStyle(
                color: isSelected ? AppTheme.primaryColor : AppTheme.primaryColor.withOpacity(0.7),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                fontSize: 14,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class BookingListItem extends StatelessWidget {
  final BookingEntity booking;
  const BookingListItem({super.key, required this.booking});

  @override
  Widget build(BuildContext context) {
    final isCancelled = booking.status == 'Cancelled';
    final df = DateFormat('yyyy-MM-dd');
    final dateString = '${df.format(booking.checkIn)} — ${df.format(booking.checkOut)}';

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.mutedColor.withOpacity(0.5)),
      ),
      clipBehavior: Clip.antiAlias,
      child: IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hotel Image
            Container(
              width: 140,
              child: CachedNetworkImage(
                imageUrl: booking.imageUrl ?? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
                fit: BoxFit.cover,
              ),
            ),
            
            // Details Section
            Expanded(
              flex: 4,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildLabel('PROPERTY'),
                    const SizedBox(height: 4),
                    Text(booking.hotelName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryColor)),
                    Row(
                      children: [
                        Icon(LucideIcons.mapPin, size: 10, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Text('guntur', style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildLabel('DATES'),
                    const SizedBox(height: 4),
                    Text(dateString, style: TextStyle(fontSize: 13, color: AppTheme.primaryColor.withOpacity(0.7))),
                  ],
                ),
              ),
            ),
            
            // Status Section
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _buildLabel('STATUS'),
                    const SizedBox(height: 8),
                    _buildStatusBadge(booking.status),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(LucideIcons.clock, size: 10, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            'Booked ${DateFormat('MMM dd, yyyy').format(DateTime.now())} at ${DateFormat('hh:mm a').format(DateTime.now())}',
                            style: TextStyle(fontSize: 9, color: Colors.grey[400]),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            // Vertical Divider
            VerticalDivider(width: 1, thickness: 1, color: AppTheme.mutedColor.withOpacity(0.5)),
            
            // Price & Actions Section
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Total', style: TextStyle(fontSize: 10, color: Colors.grey)),
                    Text('\$${NumberFormat("#,###").format(booking.totalAmount)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE5E0D8),
                        foregroundColor: AppTheme.primaryColor,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
                      ),
                      child: const Text('View Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 8),
                    if (!isCancelled)
                      GestureDetector(
                        onTap: () => _showCancelDialog(context, booking),
                        child: const Text('Cancel Booking', style: TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(text, style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 0.5));
  }

  Widget _buildStatusBadge(String status) {
    final isConfirmed = status == 'Confirmed';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(shape: BoxShape.circle, color: isConfirmed ? Colors.green : Colors.red)),
          const SizedBox(width: 6),
          Text(status, style: const TextStyle(color: AppTheme.primaryColor, fontSize: 10, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _showCancelDialog(BuildContext context, BookingEntity booking) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: Text('Are you sure you want to cancel your stay at ${booking.hotelName}?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep Booking')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<BookingProvider>().cancelBooking(booking.id);
            },
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }
}
