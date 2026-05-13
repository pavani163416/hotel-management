import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';
import '../../../../core/widgets/custom_text_field.dart';

class GuestDetailsPage extends StatelessWidget {
  const GuestDetailsPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const StepperWidget(currentStep: 1),
            const Text(
              'Guest Details',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 8),
            Text(
              'Please provide the information of the primary guest.',
              style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 14),
            ),
            const SizedBox(height: 32),
            _buildGuestForm(context),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildGuestForm(BuildContext context) {
    return Column(
      children: [
        const CustomTextField(label: 'Full Name', hint: 'Enter guest name'),
        const SizedBox(height: 16),
        const CustomTextField(label: 'Email Address', hint: 'Enter email address'),
        const SizedBox(height: 16),
        const CustomTextField(label: 'Phone Number', hint: 'Enter phone number'),
        const SizedBox(height: 16),
        const CustomTextField(label: 'Special Requests', hint: 'Any special requirements?'),
        const SizedBox(height: 32),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => context.push('/payment'),
            icon: const Icon(LucideIcons.arrowRight, size: 18),
            label: const Text('Continue to Payment'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 18),
            ),
          ),
        ),
      ],
    );
  }
}
