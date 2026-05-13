import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';
import '../../../../core/widgets/custom_text_field.dart';

class PaymentPage extends StatelessWidget {
  const PaymentPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const StepperWidget(currentStep: 3),
            const Text(
              'Secure Payment',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 8),
            Text(
              'Your payment information is encrypted and secure.',
              style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 14),
            ),
            const SizedBox(height: 32),
            _buildPaymentForm(context),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentForm(BuildContext context) {
    return Column(
      children: [
        DropdownButtonFormField<String>(
          decoration: InputDecoration(
            labelText: 'Payment Method',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            filled: true,
            fillColor: Colors.white,
            prefixIcon: const Icon(LucideIcons.creditCard, size: 20),
          ),
          value: 'card',
          items: const [
            DropdownMenuItem(value: 'card', child: Text('Credit/Debit Card')),
            DropdownMenuItem(value: 'upi', child: Text('UPI / Google Pay')),
            DropdownMenuItem(value: 'wallet', child: Text('Digital Wallet')),
          ],
          onChanged: (v) {},
        ),
        const SizedBox(height: 24),
        const CustomTextField(label: 'Card Number', hint: '0000 0000 0000 0000'),
        const SizedBox(height: 16),
        const Row(
          children: [
            Expanded(child: CustomTextField(label: 'Expiry Date', hint: 'MM/YY')),
            SizedBox(width: 16),
            Expanded(child: CustomTextField(label: 'CVC', hint: '000')),
          ],
        ),
        const SizedBox(height: 32),
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: AppTheme.mutedColor.withOpacity(0.3), borderRadius: BorderRadius.circular(16)),
          child: const Column(
            children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Subtotal'), Text('\$1,350')]),
              SizedBox(height: 8),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Tax & Fees'), Text('\$120')]),
              Divider(height: 24, color: AppTheme.mutedColor),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Total', style: TextStyle(fontWeight: FontWeight.bold)), Text('\$1,470', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18))]),
            ],
          ),
        ),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => context.push('/confirmation'),
            icon: const Icon(LucideIcons.lock, size: 18),
            label: const Text('Complete Payment'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 18),
            ),
          ),
        ),
      ],
    );
  }
}
