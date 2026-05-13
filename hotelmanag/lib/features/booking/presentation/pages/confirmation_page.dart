import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';

class ConfirmationPage extends StatelessWidget {
  const ConfirmationPage({super.key});

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      showNavbar: false,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 60),
              Container(
                padding: const EdgeInsets.all(24),
                decoration: const BoxDecoration(color: AppTheme.accentColor, shape: BoxShape.circle),
                child: const Icon(LucideIcons.check, size: 48, color: AppTheme.primaryColor),
              ),
              const SizedBox(height: 32),
              const Text(
                'Booking Confirmed!',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
              const SizedBox(height: 12),
              Text(
                'Your stay at The Azure Boutique has been successfully booked. Check your email for the receipt.',
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 16),
              ),
              const SizedBox(height: 48),
              _buildBookingSummary(),
              const SizedBox(height: 48),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => context.go('/history'),
                  child: const Text('View My Bookings'),
                ),
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => context.go('/'),
                child: const Text('Back to Home', style: TextStyle(color: AppTheme.primaryColor)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBookingSummary() {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(color: AppTheme.mutedColor.withOpacity(0.3), borderRadius: BorderRadius.circular(20)),
      child: const Column(
        children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Booking ID', style: TextStyle(color: Colors.grey)), Text('#LX-89231', style: TextStyle(fontWeight: FontWeight.bold))]),
          SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Check-in', style: TextStyle(color: Colors.grey)), Text('Oct 12, 2025')]),
          SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [Text('Check-out', style: TextStyle(color: Colors.grey)), Text('Oct 15, 2025')]),
        ],
      ),
    );
  }
}
