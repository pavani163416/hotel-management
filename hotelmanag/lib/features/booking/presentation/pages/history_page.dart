import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../domain/entities/booking_entity.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

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
            const SizedBox(height: 24),
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

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filteredBookings.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 20),
                  itemBuilder: (context, index) => BookingListItem(booking: filteredBookings[index]),
                );
              },
            ),
            const SizedBox(height: 100),
          ],
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
              color: isSelected ? AppTheme.accentColor : AppTheme.mutedColor.withOpacity(0.3),
              borderRadius: BorderRadius.circular(30),
              border: isSelected ? Border.all(color: AppTheme.primaryColor.withOpacity(0.1)) : null,
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
    final df = DateFormat('MMM dd');
    final dateString = '${df.format(booking.checkIn)} → ${df.format(booking.checkOut)}';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 15, offset: const Offset(0, 8)),
        ],
        border: Border.all(color: AppTheme.mutedColor.withOpacity(0.5)),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 110,
                height: 110,
                decoration: BoxDecoration(
                  image: DecorationImage(
                    image: NetworkImage(booking.imageUrl ?? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400'),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        booking.hotelName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryColor),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          const Icon(LucideIcons.mapPin, size: 10, color: Colors.grey),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              'Room: ${booking.roomId}',
                              style: TextStyle(fontSize: 11, color: AppTheme.primaryColor.withOpacity(0.5)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(LucideIcons.calendar, size: 12, color: AppTheme.primaryColor.withOpacity(0.6)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              dateString,
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppTheme.primaryColor.withOpacity(0.8)),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildStatusBadge(booking.status),
                    const SizedBox(height: 12),
                    Text('\$${booking.totalAmount}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                  ],
                ),
              ),
            ],
          ),
          const Divider(height: 1, color: AppTheme.mutedColor),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              physics: const BouncingScrollPhysics(),
              child: Row(
                children: [
                  _ActionButton(
                    icon: LucideIcons.eye,
                    label: 'Details',
                    onTap: () => context.push('/hotel/${booking.roomId.split('_')[0]}'), // Rough mapping
                  ),
                  _ActionButton(
                    icon: LucideIcons.download,
                    label: 'Invoice',
                    onTap: () => _showInvoice(context, booking),
                  ),
                  _ActionButton(
                    icon: LucideIcons.helpCircle,
                    label: 'Support',
                    onTap: () => _showSupport(context, booking.hotelName),
                  ),
                  if (!isCancelled && booking.status == 'Confirmed')
                    _ActionButton(
                      icon: LucideIcons.xCircle,
                      label: 'Cancel',
                      isDestructive: true,
                      onTap: () => _showCancelDialog(context, booking),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showFeedback(BuildContext context, String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), behavior: SnackBarBehavior.floating),
    );
  }

  void _showInvoice(BuildContext context, BookingEntity booking) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Invoice Details', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                IconButton(onPressed: () => Navigator.pop(context), icon: const Icon(LucideIcons.x, size: 20)),
              ],
            ),
            const SizedBox(height: 24),
            _buildInvoiceRow('Booking Reference', booking.id.toUpperCase()),
            _buildInvoiceRow('Hotel', booking.hotelName),
            _buildInvoiceRow('Total Amount', '\$${booking.totalAmount}'),
            _buildInvoiceRow('Payment Status', 'Paid'),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _showFeedback(context, 'Downloading PDF...');
                },
                icon: const Icon(LucideIcons.download, size: 18),
                label: const Text('Download PDF', style: TextStyle(fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  void _showSupport(BuildContext context, String hotel) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(LucideIcons.helpCircle, size: 48, color: AppTheme.primaryColor),
            const SizedBox(height: 16),
            const Text('Need Help?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
            const SizedBox(height: 8),
            Text('Our team is available 24/7 to assist you with your stay at $hotel.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])),
            const SizedBox(height: 32),
            ListTile(
              leading: const Icon(LucideIcons.messageSquare, color: AppTheme.primaryColor),
              title: const Text('Chat with Agent', style: TextStyle(fontWeight: FontWeight.bold)),
              trailing: const Icon(LucideIcons.chevronRight, size: 18),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(LucideIcons.phone, color: AppTheme.primaryColor),
              title: const Text('Call Helpline', style: TextStyle(fontWeight: FontWeight.bold)),
              trailing: const Icon(LucideIcons.chevronRight, size: 18),
              onTap: () => Navigator.pop(context),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _showCancelDialog(BuildContext context, BookingEntity booking) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Booking?'),
        content: Text('Are you sure you want to cancel your stay at ${booking.hotelName}? This action may incur fees.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Keep Booking')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              final success = await context.read<BookingProvider>().cancelBooking(booking.id);
              if (success) {
                _showFeedback(context, 'Booking cancelled successfully.');
              } else {
                _showFeedback(context, 'Failed to cancel booking.');
              }
            },
            child: const Text('Yes, Cancel', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildInvoiceRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[600])),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    final isConfirmed = status == 'Confirmed';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isConfirmed ? AppTheme.accentColor.withOpacity(0.15) : Colors.red.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: isConfirmed ? AppTheme.primaryColor : Colors.red,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool isDestructive;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: isDestructive ? Colors.red : AppTheme.primaryColor.withOpacity(0.7)),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDestructive ? Colors.red : AppTheme.primaryColor.withOpacity(0.7),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
