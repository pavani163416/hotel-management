import 'dart:async';
import 'dart:typed_data';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:intl/intl.dart';
import 'package:gal/gal.dart';
import 'package:printing/printing.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';

/// All data needed to generate a receipt
class ReceiptData {
  final String bookingId;
  final String hotelName;
  final String hotelLocation;
  final String guestName;
  final String? guestId;
  final String roomType;
  final String roomNumber;
  final DateTime checkIn;
  final DateTime checkOut;
  final int nights;
  final int guests;
  final double pricePerNight;
  final double subtotal;
  final double taxes;
  final double discount;
  final double total;
  final String paymentMethod;
  final String status;
  final DateTime bookedAt;
  final List<Map<String, dynamic>> additionalAdults;
  final List<Map<String, dynamic>> additionalChildren;

  const ReceiptData({
    required this.bookingId,
    required this.hotelName,
    required this.hotelLocation,
    required this.guestName,
    this.guestId,
    required this.roomType,
    required this.roomNumber,
    required this.checkIn,
    required this.checkOut,
    required this.nights,
    required this.guests,
    required this.pricePerNight,
    required this.subtotal,
    required this.taxes,
    required this.discount,
    required this.total,
    required this.paymentMethod,
    required this.status,
    required this.bookedAt,
    this.additionalAdults = const [],
    this.additionalChildren = const [],
  });
}

/// Download receipt triggers showing a premium popup dialog preview.
/// The user can see the details of all guests and print/share it as a PNG image.
Future<void> downloadReceipt(BuildContext context, ReceiptData data) async {
  await showDialog(
    context: context,
    barrierDismissible: true,
    builder: (context) => ReceiptPreviewDialog(data: data),
  );
}

class ReceiptPreviewDialog extends StatefulWidget {
  final ReceiptData data;
  const ReceiptPreviewDialog({super.key, required this.data});

  @override
  State<ReceiptPreviewDialog> createState() => _ReceiptPreviewDialogState();
}

class _ReceiptPreviewDialogState extends State<ReceiptPreviewDialog> {
  final GlobalKey _boundaryKey = GlobalKey();
  bool _isCapturing = false;

  Future<void> _shareReceiptAsPng({bool share = false}) async {
    try {
      setState(() => _isCapturing = true);
      // Give a tiny delay for state and layout synchronization
      await Future.delayed(const Duration(milliseconds: 150));

      final boundary = _boundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) {
        throw Exception('Render boundary is not initialized yet');
      }

      final image = await boundary.toImage(pixelRatio: 3.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData == null) {
        throw Exception('Failed to convert image into byte array');
      }

      final pngBytes = byteData.buffer.asUint8List();

      final ref = widget.data.bookingId.length > 5
          ? widget.data.bookingId.substring(widget.data.bookingId.length - 5).toUpperCase()
          : widget.data.bookingId.toUpperCase();

      if (share || kIsWeb) {
        await Printing.sharePdf(
          bytes: pngBytes,
          filename: 'LuxeStay_Receipt_LS-$ref.png',
        );
      } else {
        await Gal.putImageBytes(pngBytes, name: 'LuxeStay_Receipt_LS-$ref');
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Receipt downloaded to your gallery!'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (e) {
      debugPrint('Error generating PNG receipt: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error generating receipt image: $e'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isCapturing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currencyFmt = NumberFormat('\$#,###.00');
    final dateFmt = DateFormat('dd MMM yyyy');
    final bookingRef = widget.data.bookingId.length > 5
        ? 'LS-${widget.data.bookingId.substring(widget.data.bookingId.length - 5).toUpperCase()}'
        : 'LS-${widget.data.bookingId.toUpperCase()}';

    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: isDark ? const Color(0xFF1E2633) : Colors.grey[100],
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // --- Header bar ---
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Receipt Preview',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'Serif',
                      color: AppTheme.primaryColor,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // --- Scrollable receipt boundary ---
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Center(
                  child: RepaintBoundary(
                    key: _boundaryKey,
                    child: Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey[200]!),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.04),
                            blurRadius: 10,
                            offset: const Offset(0, 4),
                          )
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // LuxeStay Title & Booking Ref
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'LuxeStay',
                                    style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.bold,
                                      fontFamily: 'Serif',
                                      color: Color(0xFF2D3748),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    'Premium Hotel Reservation',
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.grey[500],
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1EDE6),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      bookingRef,
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF2D3748),
                                        letterSpacing: 0.5,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Date: ${dateFmt.format(widget.data.bookedAt)}',
                                    style: TextStyle(fontSize: 9, color: Colors.grey[600]),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Container(height: 1, color: Colors.grey[200]),
                          const SizedBox(height: 16),

                          // Status Tag
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'RESERVATION STATUS',
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.grey[400],
                                  letterSpacing: 0.8,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: widget.data.status.toLowerCase() == 'confirmed'
                                      ? const Color(0xFFD1FAE5)
                                      : const Color(0xFFFEE2E2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  widget.data.status.toUpperCase(),
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: widget.data.status.toLowerCase() == 'confirmed'
                                        ? const Color(0xFF065F46)
                                        : const Color(0xFF991B1B),
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Hotel Details
                          const Text(
                            'PROPERTY',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF9CA3AF),
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            widget.data.hotelName,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF2D3748),
                            ),
                          ),
                          Text(
                            widget.data.hotelLocation,
                            style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                          ),
                          const SizedBox(height: 16),

                          // Room & Stay Details
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildReceiptSectionHeader('STAY DETAILS'),
                                    _buildReceiptRow('Check-in', dateFmt.format(widget.data.checkIn)),
                                    _buildReceiptRow('Check-out', dateFmt.format(widget.data.checkOut)),
                                    _buildReceiptRow('Nights', '${widget.data.nights} night${widget.data.nights != 1 ? 's' : ''}'),
                                    _buildReceiptRow('Room Type', widget.data.roomType),
                                    _buildReceiptRow('Room No.', widget.data.roomNumber),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    _buildReceiptSectionHeader('PAYMENT INFO'),
                                    _buildReceiptRow('Method', widget.data.paymentMethod.toUpperCase()),
                                    _buildReceiptRow('Guests Total', '${widget.data.guests} person(s)'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Container(height: 1, color: Colors.grey[200]),
                          const SizedBox(height: 16),

                          // GUEST DETAILS SECTION (MANDATORY REQUIREMENT)
                          _buildReceiptSectionHeader('REGISTERED GUEST(S) & GOVT ID(S)'),
                          const SizedBox(height: 6),
                          
                          // Lead Guest
                          _buildGuestItemRow(
                            widget.data.guestName,
                            'Lead Guest',
                            widget.data.guestId ?? 'Not Provided',
                          ),
                          
                          // Additional Adults
                          ...widget.data.additionalAdults.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final guest = entry.value;
                            final name = guest['name']?.toString() ?? 'Adult ${idx + 1}';
                            final id = guest['id']?.toString() ?? 'Not Provided';
                            return _buildGuestItemRow(name, 'Adult Guest ${idx + 1}', id);
                          }),
                          
                          // Additional Children
                          ...widget.data.additionalChildren.asMap().entries.map((entry) {
                            final idx = entry.key;
                            final guest = entry.value;
                            final name = guest['name']?.toString() ?? 'Child ${idx + 1}';
                            final id = guest['id']?.toString() ?? 'Not Provided';
                            final age = guest['age']?.toString() ?? '';
                            final role = age.isNotEmpty ? 'Child Guest (Age $age)' : 'Child Guest';
                            return _buildGuestItemRow(name, role, id);
                          }),

                          const SizedBox(height: 16),
                          Container(height: 1, color: Colors.grey[200]),
                          const SizedBox(height: 16),

                          // Price Breakdown
                          _buildReceiptSectionHeader('PRICE BREAKDOWN'),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF9F7F4),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              children: [
                                _buildPriceItemRow(
                                  'Room Fare (${currencyFmt.format(widget.data.pricePerNight)} × ${widget.data.nights} night${widget.data.nights != 1 ? 's' : ''})',
                                  currencyFmt.format(widget.data.subtotal),
                                ),
                                if (widget.data.discount > 0)
                                  _buildPriceItemRow(
                                    'Discount Applied',
                                    '-${currencyFmt.format(widget.data.discount)}',
                                    valColor: Colors.green[700],
                                  ),
                                _buildPriceItemRow(
                                  'Taxes & Fees (GST)',
                                  currencyFmt.format(widget.data.taxes),
                                ),
                                const SizedBox(height: 6),
                                Container(height: 1, color: Colors.grey[300]),
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    const Text(
                                      'TOTAL PAID',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF2D3748),
                                      ),
                                    ),
                                    Text(
                                      currencyFmt.format(widget.data.total),
                                      style: const TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF2D3748),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                          
                          const SizedBox(height: 24),
                          Container(height: 1, color: Colors.grey[200]),
                          const SizedBox(height: 8),
                          
                          // Receipt footer message
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Thank you for choosing LuxeStay!',
                                style: TextStyle(fontSize: 9, color: Colors.grey[500], fontStyle: FontStyle.italic),
                              ),
                              Text(
                                'support@luxestay.com',
                                style: TextStyle(fontSize: 9, color: Colors.grey[500]),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),

            // --- Footer bar with actions ---
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(context),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        side: BorderSide(color: Colors.grey[300]!),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        'Close',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF454F5E),
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 1,
                    child: OutlinedButton.icon(
                      onPressed: _isCapturing ? null : () => _shareReceiptAsPng(share: true),
                      icon: const Icon(LucideIcons.share2, size: 14),
                      label: Text(
                        'Share',
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : const Color(0xFF454F5E),
                          fontSize: 12,
                        ),
                        maxLines: 1,
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                        side: BorderSide(color: Colors.grey[300]!),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    flex: 1,
                    child: ElevatedButton.icon(
                      onPressed: _isCapturing ? null : () => _shareReceiptAsPng(share: false),
                      icon: _isCapturing
                          ? const SizedBox(
                              width: 14,
                              height: 14,
                              child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation<Color>(Colors.white)),
                            )
                          : const Icon(LucideIcons.download, size: 14),
                      label: const Text(
                        'Save',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF454F5E),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 0,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReceiptSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6, top: 4),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 9,
          fontWeight: FontWeight.bold,
          color: Color(0xFF9CA3AF),
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 70,
            child: Text(
              label,
              style: TextStyle(fontSize: 10, color: Colors.grey[500], fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF454F5E)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGuestItemRow(String name, String role, String id) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF2D3748)),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  role,
                  style: TextStyle(fontSize: 9, color: Colors.grey[600], fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.grey[100],
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: Colors.grey[300]!, width: 0.5),
            ),
            child: Text(
              'Govt ID: $id',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: Color(0xFF454F5E),
                fontFamily: 'Courier',
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceItemRow(String label, String val, {Color? valColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 11, color: Color(0xFF454F5E)),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          Text(
            val,
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: valColor ?? const Color(0xFF454F5E)),
          ),
        ],
      ),
    );
  }
}
