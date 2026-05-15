import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';
import '../../../../core/providers/booking_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ReviewPage extends StatefulWidget {
  const ReviewPage({super.key});

  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage> {
  final _promoController = TextEditingController();

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  void _applyPromo(BookingProvider provider) {
    if (_promoController.text.isEmpty) return;
    
    bool success = provider.applyPromoCode(_promoController.text);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Promo code "${provider.appliedPromoCode}" applied!'),
          backgroundColor: Colors.green,
        ),
      );
      _promoController.clear();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Invalid promo code'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();
    final hotel = provider.currentHotel;

    if (hotel == null) {
      return const MainLayout(child: Center(child: Text('No hotel selected')));
    }

    return MainLayout(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const StepperWidget(currentStep: 2),
              const SizedBox(height: 24),
              const Text(
                'Review Your Booking',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primaryColor, fontFamily: 'Serif'),
              ),
              const SizedBox(height: 8),
              Text(
                'Please confirm your details before proceeding to payment.',
                style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.5), fontSize: 14),
              ),
              const SizedBox(height: 32),
              
              LayoutBuilder(
                builder: (context, constraints) {
                  final isWide = constraints.maxWidth > 800;
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        flex: 3,
                        child: Column(
                          children: [
                            _buildStaySummary(provider),
                            const SizedBox(height: 24),
                            _buildGuestInformation(provider),
                          ],
                        ),
                      ),
                      if (isWide) const SizedBox(width: 32),
                      if (isWide)
                        Expanded(
                          flex: 2,
                          child: _buildPriceSummary(context, provider),
                        ),
                    ],
                  );
                }
              ),
              
              // Mobile Price Summary
              LayoutBuilder(
                builder: (context, constraints) {
                  if (constraints.maxWidth <= 800) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 32),
                      child: _buildPriceSummary(context, provider),
                    );
                  }
                  return const SizedBox.shrink();
                }
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStaySummary(BookingProvider provider) {
    final hotel = provider.currentHotel!;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Stay Summary', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
          const SizedBox(height: 20),
          Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  width: 100,
                  height: 100,
                  fit: BoxFit.cover,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(hotel.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                    Text(hotel.location, style: TextStyle(fontSize: 12, color: AppTheme.primaryColor.withOpacity(0.5))),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildSummaryItem('Check-in', DateFormat('yyyy-MM-dd').format(provider.checkIn)),
                        const SizedBox(width: 32),
                        _buildSummaryItem('Check-out', DateFormat('yyyy-MM-dd').format(provider.checkOut)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _buildSummaryItem('Room', 'Standard'),
                        const SizedBox(width: 32),
                        _buildSummaryItem('Guests', '${provider.guests} - ${provider.nights} nights'),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primaryColor.withOpacity(0.4), letterSpacing: 1)),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppTheme.primaryColor)),
      ],
    );
  }

  Widget _buildGuestInformation(BookingProvider provider) {
    final lead = provider.leadGuest;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Guest Information', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
          const SizedBox(height: 20),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildInfoBlock('Name', lead['name'] ?? 'Not set'),
              const Spacer(),
              _buildInfoBlock('Email', lead['email'] ?? 'Not set'),
            ],
          ),
          const SizedBox(height: 20),
          _buildInfoBlock('Phone', lead['phone'] ?? 'Not set'),
        ],
      ),
    );
  }

  Widget _buildInfoBlock(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(fontSize: 10, color: AppTheme.primaryColor.withOpacity(0.4))),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
      ],
    );
  }

  Widget _buildPriceSummary(BuildContext context, BookingProvider provider) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('PRICE SUMMARY', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryColor, letterSpacing: 1)),
          const SizedBox(height: 20),
          _buildPriceRow('Standard (${provider.nights} nights)', '\$${NumberFormat("#,###").format(provider.subtotal)}'),
          if (provider.discountAmount > 0)
            _buildPriceRow('Discount (${provider.appliedPromoCode})', '-\$${NumberFormat("#,###").format(provider.discountAmount)}', isDiscount: true),
          _buildPriceRow('Service Fee', '\$${NumberFormat("#,###").format(provider.serviceFee)}'),
          _buildPriceRow('Taxes', '\$${NumberFormat("#,###").format(provider.taxes)}'),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          
          const Text('PROMO CODE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryColor, letterSpacing: 1)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _promoController,
                  decoration: InputDecoration(
                    hintText: 'Enter code...',
                    hintStyle: TextStyle(color: Colors.grey[300], fontSize: 13),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.mutedColor)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                onPressed: () => _applyPromo(provider),
                style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryColor, foregroundColor: Colors.white, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
                child: const Text('Apply'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            children: [
              _buildPromoChip('LUXE10', provider),
              _buildPromoChip('WELCOME15', provider),
              _buildPromoChip('VIP20', provider),
              const Padding(padding: EdgeInsets.symmetric(vertical: 4), child: Text('— click to apply', style: TextStyle(fontSize: 10, color: Colors.grey))),
            ],
          ),
          
          const SizedBox(height: 32),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Amount', style: TextStyle(fontSize: 14, color: AppTheme.primaryColor)),
              Text('\$${NumberFormat("#,###").format(provider.total)}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/payment'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text('Continue to Payment', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  SizedBox(width: 12),
                  Icon(LucideIcons.arrowRight, size: 18),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value, {bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: isDiscount ? Colors.green : AppTheme.primaryColor.withOpacity(0.6))),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isDiscount ? Colors.green : AppTheme.primaryColor)),
        ],
      ),
    );
  }

  Widget _buildPromoChip(String code, BookingProvider provider) {
    bool isApplied = provider.appliedPromoCode == code;
    return GestureDetector(
      onTap: () {
        provider.applyPromoCode(code);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Promo code "$code" applied!'), backgroundColor: Colors.green),
        );
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isApplied ? Colors.green.withOpacity(0.1) : AppTheme.mutedColor.withOpacity(0.3),
          borderRadius: BorderRadius.circular(6),
          border: isApplied ? Border.all(color: Colors.green.withOpacity(0.5)) : null,
        ),
        child: Text(
          code,
          style: TextStyle(
            fontSize: 10,
            color: isApplied ? Colors.green : AppTheme.primaryColor.withOpacity(0.6),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
