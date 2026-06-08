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
import '../../../../core/providers/promo_provider.dart';
import 'package:cached_network_image/cached_network_image.dart';

class ReviewPage extends StatefulWidget {
  const ReviewPage({super.key});

  @override
  State<ReviewPage> createState() => _ReviewPageState();
}

class _ReviewPageState extends State<ReviewPage> {
  final _promoController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _promoController.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final bookingProvider = context.read<BookingProvider>();
      final isFirstTime = bookingProvider.bookings.isEmpty;
      context.read<PromoProvider>().fetchCoupons(
        isFirstTimeUser: isFirstTime,
        onNewOffer: (coupon) {},
      );
    });
  }

  @override
  void dispose() {
    _promoController.dispose();
    super.dispose();
  }

  void _applyPromo(BookingProvider provider, PromoProvider promoProvider) {
    if (_promoController.text.isEmpty) return;
    
    bool success = provider.applyPromoCode(_promoController.text, promoProvider.validCoupons);
    if (success) {
      _promoController.clear();
      // Success message is now shown in UI
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'Invalid promo code'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();
    final promoProvider = context.watch<PromoProvider>();
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
                          child: _buildPriceSummary(context, provider, promoProvider),
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
                      child: _buildPriceSummary(context, provider, promoProvider),
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
                    Wrap(
                      spacing: 16,
                      runSpacing: 8,
                      children: [
                        _buildSummaryItem('Check-in', DateFormat('yyyy-MM-dd').format(provider.checkIn)),
                        _buildSummaryItem('Check-out', DateFormat('yyyy-MM-dd').format(provider.checkOut)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 16,
                      runSpacing: 8,
                      children: [
                        _buildSummaryItem('Room', 'Standard'),
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

  Widget _buildPriceSummary(BuildContext context, BookingProvider provider, PromoProvider promoProvider) {
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
          const SizedBox(height: 24),
          _buildPriceRow('Standard (${provider.nights} nights)', context.read<CurrencyProvider>().format(provider.subtotal)),
          _buildPriceRow('Service Fee', context.read<CurrencyProvider>().format(provider.serviceFee)),
          _buildPriceRow('Taxes', context.read<CurrencyProvider>().format(provider.taxes)),
          if (provider.discountAmount > 0)
            _buildPriceRow('Discount (${provider.appliedPromoCode})', '-' + context.read<CurrencyProvider>().format(provider.discountAmount), isDiscount: true),
          
          const SizedBox(height: 16),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          
          Row(
            children: [
              Icon(LucideIcons.tag, size: 14, color: AppTheme.primaryColor.withOpacity(0.6)),
              const SizedBox(width: 8),
              const Text('PROMO CODE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryColor, letterSpacing: 1)),
            ],
          ),
          const SizedBox(height: 12),
          const SizedBox(height: 12),
          InkWell(
            onTap: () async {
              final selectedCode = await context.push<String>('/promo-codes');
              if (selectedCode != null && selectedCode.isNotEmpty) {
                _promoController.text = selectedCode;
                _applyPromo(provider, promoProvider);
              }
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              height: 54,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: provider.appliedPromoCode != null 
                    ? const Color(0xFFF0FDF4) // Light mint green
                    : Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: provider.appliedPromoCode != null 
                      ? const Color(0xFF4ADE80) // Mint green border
                      : Colors.grey[300]!,
                  width: 1,
                ),
                boxShadow: [
                  if (provider.appliedPromoCode == null)
                    BoxShadow(
                      color: Colors.black.withOpacity(0.02),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: provider.appliedPromoCode != null 
                          ? const Color(0xFF4ADE80).withOpacity(0.15)
                          : Colors.grey[100],
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      LucideIcons.tag, 
                      size: 16, 
                      color: provider.appliedPromoCode != null ? const Color(0xFF16A34A) : Colors.black87,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          provider.appliedPromoCode != null 
                              ? provider.appliedPromoCode! 
                              : 'Add Promo Code',
                          style: TextStyle(
                            color: provider.appliedPromoCode != null ? const Color(0xFF16A34A) : Colors.black87,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        if (provider.appliedPromoCode == null)
                          Text(
                            'Save on your booking',
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 10,
                            ),
                          ),
                      ],
                    ),
                  ),
                  Text(
                    provider.appliedPromoCode != null ? 'Applied' : 'Apply',
                    style: TextStyle(
                      color: provider.appliedPromoCode != null ? const Color(0xFF16A34A) : AppTheme.primaryColor, // Matching app theme
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          if (provider.appliedPromoCode != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Row(
                children: [
                  const Icon(Icons.check, size: 14, color: Color(0xFF38A169)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      '${provider.appliedPromoCode} applied — ${provider.promoDescription ?? 'discount applied'}!',
                      style: const TextStyle(color: Color(0xFF38A169), fontSize: 11, fontWeight: FontWeight.w500),
                    ),
                  ),
                  InkWell(
                    onTap: () {
                      provider.removePromoCode();
                      _promoController.clear();
                    },
                    child: const Padding(
                      padding: EdgeInsets.all(4.0),
                      child: Icon(LucideIcons.x, size: 16, color: Colors.grey),
                    ),
                  ),
                ],
              ),
            ),
          
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 32),
          
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total Amount', style: TextStyle(fontSize: 14, color: AppTheme.primaryColor)),
              Text(context.read<CurrencyProvider>().format(provider.total), style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
            ],
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/payment'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF4A5568),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
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
          Text(label, style: TextStyle(fontSize: 14, color: isDiscount ? Colors.grey[400] : AppTheme.primaryColor.withOpacity(0.6))),
          Text(value, style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: isDiscount ? Colors.grey[400] : AppTheme.primaryColor)),
        ],
      ),
    );
  }

  Widget _buildPromoChip(String code, BookingProvider provider) {
    bool isApplied = provider.appliedPromoCode == code || _promoController.text == code;
    return GestureDetector(
      onTap: () {
        setState(() {
          _promoController.text = code;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isApplied ? const Color(0xFFF7FAFC) : AppTheme.mutedColor.withOpacity(0.2),
          borderRadius: BorderRadius.circular(6),
          border: isApplied ? Border.all(color: AppTheme.mutedColor) : null,
        ),
        child: Text(
          code,
          style: TextStyle(
            fontSize: 10,
            color: isApplied ? AppTheme.primaryColor : AppTheme.primaryColor.withOpacity(0.6),
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
