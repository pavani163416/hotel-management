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
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 32),
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
                style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 14),
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

                  return ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredBookings.length,
                    itemBuilder: (context, index) => BookingListItem(booking: filteredBookings[index]),
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
      runSpacing: 12,
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
                fontSize: 13,
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 700;
        return Container(
          margin: const EdgeInsets.only(bottom: 24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppTheme.mutedColor.withOpacity(0.5)),
          ),
          clipBehavior: Clip.antiAlias,
          child: isWide ? _buildDesktopCard(context) : _buildMobileCard(context),
        );
      },
    );
  }

  Widget _buildDesktopCard(BuildContext context) {
    final df = DateFormat('yyyy-MM-dd');
    final dateString = '${df.format(booking.checkIn)} — ${df.format(booking.checkOut)}';

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            width: 160,
            child: CachedNetworkImage(
              imageUrl: booking.imageUrl ?? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
              fit: BoxFit.cover,
            ),
          ),
          Expanded(
            flex: 3,
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
                  Text(
                    'Booked ${DateFormat('MMM dd, yyyy').format(DateTime.now())}',
                    style: TextStyle(fontSize: 9, color: Colors.grey[400]),
                  ),
                ],
              ),
            ),
          ),
          VerticalDivider(width: 1, thickness: 1, color: AppTheme.mutedColor.withOpacity(0.5)),
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
                    onPressed: () => _showBookingDetails(context),
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
                  if (booking.status != 'Cancelled')
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
    );
  }

  Widget _buildMobileCard(BuildContext context) {
    final df = DateFormat('MM-dd');
    final dateString = '${df.format(booking.checkIn)} → ${df.format(booking.checkOut)}';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            CachedNetworkImage(
              imageUrl: booking.imageUrl ?? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400',
              height: 160,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
            Positioned(
              top: 12,
              right: 12,
              child: _buildStatusBadge(booking.status),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildLabel('PROPERTY'),
                        const SizedBox(height: 4),
                        Text(booking.hotelName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryColor), maxLines: 1, overflow: TextOverflow.ellipsis),
                        Text('guntur', style: TextStyle(fontSize: 11, color: Colors.grey[400])),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      const Text('Total Paid', style: TextStyle(fontSize: 10, color: Colors.grey)),
                      Text('\$${NumberFormat("#,###").format(booking.totalAmount)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('DATES'),
                      const SizedBox(height: 4),
                      Text(dateString, style: TextStyle(fontSize: 13, color: AppTheme.primaryColor.withOpacity(0.7))),
                    ],
                  ),
                  Row(
                    children: [
                      if (booking.status != 'Cancelled')
                        TextButton(
                          onPressed: () => _showCancelDialog(context, booking),
                          child: const Text('Cancel', style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => _showBookingDetails(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFE5E0D8),
                          foregroundColor: AppTheme.primaryColor,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                        child: const Text('Details', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
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
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 5)],
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
    String? selectedReason;
    final reasons = [
      'Change of plans',
      'Found a better deal',
      'Booking error',
      'Personal emergency',
      'Other'
    ];

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('Cancel Booking?', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Are you sure you want to cancel your stay at ${booking.hotelName}?', style: TextStyle(color: Colors.grey[600], fontSize: 14)),
              const SizedBox(height: 24),
              const Text('Please select a reason:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
              const SizedBox(height: 12),
              ...reasons.map((r) => RadioListTile<String>(
                title: Text(r, style: const TextStyle(fontSize: 13)),
                value: r,
                groupValue: selectedReason,
                dense: true,
                contentPadding: EdgeInsets.zero,
                activeColor: AppTheme.primaryColor,
                onChanged: (v) => setDialogState(() => selectedReason = v),
              )),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Keep Booking', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              onPressed: selectedReason == null ? null : () async {
                Navigator.pop(context);
                await context.read<BookingProvider>().cancelBooking(booking.id);
                if (context.mounted) {
                   ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Booking cancelled successfully'), behavior: SnackBarBehavior.floating),
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: const Text('Cancel Now', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }

  void _showBookingDetails(BuildContext context) {
    final df = DateFormat('yyyy-MM-dd');
    final dateString = '${df.format(booking.checkIn)} — ${df.format(booking.checkOut)}';
    final nights = booking.checkOut.difference(booking.checkIn).inDays;
    final createdString = booking.createdAt != null
        ? DateFormat('MMMM dd, yyyy \'at\' hh:mm a').format(booking.createdAt!)
        : DateFormat('MMMM dd, yyyy \'at\' hh:mm a').format(DateTime.now());

    showDialog(
      context: context,
      barrierColor: Colors.black.withOpacity(0.4),
      builder: (context) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: Colors.white,
        child: Container(
          width: 400,
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Stack(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: CachedNetworkImage(
                      imageUrl: booking.imageUrl ?? 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600',
                      height: 180,
                      width: double.infinity,
                      fit: BoxFit.cover,
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: InkWell(
                      onTap: () => Navigator.pop(context),
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Colors.white70,
                        ),
                        child: const Icon(LucideIcons.x, size: 16, color: Colors.black87),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              Text(
                booking.hotelName.toLowerCase(),
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 16),
              const Divider(color: AppTheme.mutedColor, height: 1),
              _buildDetailRow('Booking ID', '#${booking.id}', isId: true),
              _buildDetailRow('Guest', booking.guestName ?? 'Guest'),
              _buildDetailRow('Room', booking.roomNumber ?? booking.roomId),
              _buildDetailRow('Dates', dateString),
              _buildDetailRow('Nights', '$nights'),
              _buildDetailRow('Total Paid', '\$${NumberFormat("#,###").format(booking.totalAmount)}', isBold: true),
              _buildDetailRow('Status', booking.status),
              _buildDetailRow('Confirmed At', createdString),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {bool isId = false, bool isBold = false}) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.mutedColor, width: 0.5)),
      ),
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey[600],
            ),
          ),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.end,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
                color: isId
                    ? const Color(0xFF2C3E50)
                    : isBold
                        ? AppTheme.primaryColor
                        : Colors.black87,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
