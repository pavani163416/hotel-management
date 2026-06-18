import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hotelmanag/core/utils/injection_container.dart';
import 'package:hotelmanag/features/analytics/presentation/bloc/analytics_bloc.dart';
import 'package:hotelmanag/core/providers/auth_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';

class OwnerDashboardScreen extends StatelessWidget {
  const OwnerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<AnalyticsBloc>()..add(const FetchWeeklyAnalyticsEvent('all')), // 'all' or actual hotelId
      child: const OwnerDashboardView(),
    );
  }
}

class OwnerDashboardView extends StatefulWidget {
  const OwnerDashboardView({super.key});

  @override
  State<OwnerDashboardView> createState() => _OwnerDashboardViewState();
}

class _OwnerDashboardViewState extends State<OwnerDashboardView> {
  String _timeframe = 'weekly';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Owner Dashboard'),
        actions: [
          PopupMenuButton<String>(
            onSelected: (val) {
              setState(() => _timeframe = val);
              if (val == 'weekly') {
                context.read<AnalyticsBloc>().add(const FetchWeeklyAnalyticsEvent('all'));
              } else {
                context.read<AnalyticsBloc>().add(const FetchMonthlyAnalyticsEvent('all'));
              }
            },
            itemBuilder: (ctx) => [
              const PopupMenuItem(value: 'weekly', child: Text('Weekly')),
              const PopupMenuItem(value: 'monthly', child: Text('Monthly')),
            ],
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  Text(_timeframe == 'weekly' ? 'Weekly' : 'Monthly', style: const TextStyle(fontWeight: FontWeight.bold)),
                  const Icon(LucideIcons.chevronDown),
                ],
              ),
            ),
          ),
        ],
      ),
      body: BlocConsumer<AnalyticsBloc, AnalyticsState>(
        listener: (context, state) {
          if (state is AnalyticsError) {
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(state.message), backgroundColor: Colors.red));
          }
        },
        builder: (context, state) {
          if (state is AnalyticsLoading) {
            return const Center(child: CircularProgressIndicator());
          } else if (state is AnalyticsLoaded) {
            final data = state.analytics;
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(child: _buildMetricCard('Revenue', '\$${data.totalRevenue}', LucideIcons.dollarSign, Colors.green)),
                      const SizedBox(width: 16),
                      Expanded(child: _buildMetricCard('Bookings', '${data.totalBookings}', LucideIcons.calendarCheck, Colors.blue)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(child: _buildMetricCard('Occupancy', '${data.averageOccupancyRate}%', LucideIcons.home, Colors.orange)),
                      const SizedBox(width: 16),
                      Expanded(child: _buildMetricCard('Avg Rating', '${data.averageRating}', LucideIcons.star, Colors.amber)),
                    ],
                  ),
                  const SizedBox(height: 24),
                  const Text('Revenue Trend', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  // Simple placeholder for chart
                  Container(
                    height: 200,
                    width: double.infinity,
                    decoration: BoxDecoration(color: Colors.grey.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(LucideIcons.barChart, size: 48, color: Colors.grey),
                        const SizedBox(height: 8),
                        Text('${data.revenueByDay.length} data points', style: const TextStyle(color: Colors.grey)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text('Bookings by Status', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ...data.bookingsByStatus.map((b) => ListTile(
                        title: Text(b.status),
                        trailing: Text('${b.count}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      )),
                ],
              ),
            );
          }
          return const Center(child: Text('Failed to load analytics.'));
        },
      ),
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color),
          const SizedBox(height: 12),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
          Text(title, style: TextStyle(fontSize: 12, color: color.withOpacity(0.8))),
        ],
      ),
    );
  }
}
