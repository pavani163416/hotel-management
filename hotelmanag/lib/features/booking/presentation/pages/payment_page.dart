import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key});

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  String _selectedMethod = 'card';
  String _selectedGuest = 'lead';

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const StepperWidget(currentStep: 3),
              const SizedBox(height: 24),
              const Text(
                'Payment',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                  fontFamily: 'Serif',
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(LucideIcons.lock, size: 14, color: AppTheme.primaryColor.withOpacity(0.5)),
                  const SizedBox(width: 8),
                  Text(
                    'Secure 256-bit SSL encrypted',
                    style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.5), fontSize: 13),
                  ),
                ],
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
                            _buildGuestIdentityVerification(),
                            const SizedBox(height: 24),
                            _buildPaymentMethodSelector(),
                            const SizedBox(height: 24),
                            _buildCardForm(),
                          ],
                        ),
                      ),
                      if (isWide) const SizedBox(width: 32),
                      if (isWide)
                        Expanded(
                          flex: 2,
                          child: _buildFinalSummary(context),
                        ),
                    ],
                  );
                }
              ),
              
              // Mobile Summary
              LayoutBuilder(
                builder: (context, constraints) {
                  if (constraints.maxWidth <= 800) {
                    return Padding(
                      padding: const EdgeInsets.only(top: 32),
                      child: _buildFinalSummary(context),
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

  Widget _buildGuestIdentityVerification() {
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
          const Row(
            children: [
              Icon(LucideIcons.checkCircle, size: 18, color: Colors.blueAccent),
              SizedBox(width: 12),
              Text('Guest Identity Verification', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Required by Indian hotel regulations (MHA guidelines). Your ID is used for check-in only and is not stored digitally.',
            style: TextStyle(fontSize: 11, color: AppTheme.primaryColor.withOpacity(0.5)),
          ),
          const SizedBox(height: 24),
          Text(
            'PRIMARY GUEST (BILLING RESPONSIBLE)',
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryColor.withOpacity(0.4), letterSpacing: 1),
          ),
          const SizedBox(height: 16),
          _buildGuestOption('lead', 'ABDUL RAHIMA', true),
          const SizedBox(height: 12),
          _buildGuestOption('guest2', '23505A1201 ABDUL RAHIMA', false),
        ],
      ),
    );
  }

  Widget _buildGuestOption(String id, String name, bool isLead) {
    bool isSelected = _selectedGuest == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedGuest = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isSelected ? AppTheme.primaryColor : AppTheme.mutedColor),
        ),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: isSelected ? AppTheme.primaryColor : Colors.grey[400]!),
              ),
              child: isSelected ? Center(child: Container(width: 10, height: 10, decoration: const BoxDecoration(shape: BoxShape.circle, color: AppTheme.primaryColor))) : null,
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryColor))),
            if (isLead)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(color: Colors.grey[100], borderRadius: BorderRadius.circular(4)),
                child: const Text('Lead Guest', style: TextStyle(fontSize: 9, color: Colors.grey)),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentMethodSelector() {
    return Row(
      children: [
        _buildMethodTab('card', LucideIcons.creditCard, 'Card'),
        const SizedBox(width: 12),
        _buildMethodTab('upi', LucideIcons.smartphone, 'UPI'),
        const SizedBox(width: 12),
        _buildMethodTab('bank', LucideIcons.landmark, 'Net Banking'),
      ],
    );
  }

  Widget _buildMethodTab(String id, IconData icon, String label) {
    bool isSelected = _selectedMethod == id;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedMethod = id),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? Colors.grey[50] : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isSelected ? AppTheme.primaryColor : AppTheme.mutedColor),
          ),
          child: Column(
            children: [
              Icon(icon, size: 20, color: isSelected ? AppTheme.primaryColor : Colors.grey),
              const SizedBox(height: 8),
              Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isSelected ? AppTheme.primaryColor : Colors.grey)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardForm() {
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
          _buildLabel('CARD NUMBER'),
          const SizedBox(height: 8),
          _buildTextField('1234 5678 9012 3456'),
          const SizedBox(height: 24),
          _buildLabel('CARDHOLDER NAME'),
          const SizedBox(height: 8),
          _buildTextField('John Doe'),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('EXPIRY'),
                    const SizedBox(height: 8),
                    _buildTextField('MM/YY'),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('CVV'),
                    const SizedBox(height: 8),
                    _buildTextField('123'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => context.push('/confirmation'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7E8A9A),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Pay $1,173', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            ),
          ),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Tip: use any card ending in 0000 to simulate a declined payment',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFinalSummary(BuildContext context) {
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
          const Text('swagruha hotel', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
          Text('Standard - 3 nights', style: TextStyle(fontSize: 13, color: AppTheme.primaryColor.withOpacity(0.6))),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          _buildPriceRow('Subtotal', '$1,038'),
          _buildPriceRow('Service Fee', '$52'),
          _buildPriceRow('Taxes (GST)', '$83'),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total', style: TextStyle(fontSize: 14, color: AppTheme.primaryColor)),
              const Text('$1,173', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
            ],
          ),
          const SizedBox(height: 48),
          const Text('SAVED TO DATABASE ON PAYMENT', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5)),
          const SizedBox(height: 16),
          _buildCheckItem('Guest profile (name, email, phone)'),
          _buildCheckItem('1 additional adult(s)'),
          _buildCheckItem('1 child(ren)'),
          _buildCheckItem('Booking dates & pricing'),
          _buildCheckItem('Room marked as Booked'),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontSize: 14, color: AppTheme.primaryColor.withOpacity(0.6))),
          Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        ],
      ),
    );
  }

  Widget _buildCheckItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(LucideIcons.check, size: 10, color: Colors.orangeAccent),
          const SizedBox(width: 8),
          Text(text, style: const TextStyle(fontSize: 11, color: Colors.grey)),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor.withOpacity(0.5),
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildTextField(String hint) {
    return TextField(
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[300], fontSize: 14),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.mutedColor)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppTheme.mutedColor)),
      ),
    );
  }
}
