import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';

class BookingPage extends StatelessWidget {
  const BookingPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const StepperWidget(currentStep: 0),
            const Text(
              'Your Selection',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 8),
            Text(
              'Confirm your stay details before continuing.',
              style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 14),
            ),
            const SizedBox(height: 32),
            _buildSelectionCard(context),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectionCard(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            child: Image.network(
              'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000',
              height: 200,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('The Azure Boutique', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(LucideIcons.mapPin, size: 14, color: AppTheme.primaryColor.withOpacity(0.5)),
                    const SizedBox(width: 6),
                    Text('Santorini, Greece', style: TextStyle(fontSize: 14, color: AppTheme.primaryColor.withOpacity(0.6))),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 24),
                _buildInfoRow(LucideIcons.bedDouble, 'Room', 'Deluxe Ocean Suite'),
                const SizedBox(height: 16),
                _buildInfoRow(LucideIcons.calendar, 'Dates', 'Oct 12 - Oct 15, 2025'),
                const SizedBox(height: 16),
                _buildInfoRow(LucideIcons.users, 'Guests', '2 Guests'),
                const SizedBox(height: 32),
                const Divider(color: AppTheme.mutedColor),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Subtotal (3 nights)', style: TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('\$1,350', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                      ],
                    ),
                    ElevatedButton.icon(
                      onPressed: () => context.push('/guest-details'),
                      icon: const Icon(LucideIcons.arrowRight, size: 18),
                      label: const Text('Continue'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: AppTheme.mutedColor.withOpacity(0.3), borderRadius: BorderRadius.circular(8)),
          child: Icon(icon, size: 16, color: AppTheme.primaryColor),
        ),
        const SizedBox(width: 16),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
            Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primaryColor)),
          ],
        ),
      ],
    );
  }
}
