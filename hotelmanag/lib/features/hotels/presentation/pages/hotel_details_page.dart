import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';

class HotelDetailsPage extends StatefulWidget {
  final String id;
  const HotelDetailsPage({super.key, required this.id});

  @override
  State<HotelDetailsPage> createState() => _HotelDetailsPageState();
}

class _HotelDetailsPageState extends State<HotelDetailsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGallery(),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(),
                  const SizedBox(height: 32),
                  _buildTabBar(),
                  const SizedBox(height: 24),
                  _buildTabContent(),
                ],
              ),
            ),
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }

  Widget _buildGallery() {
    return SizedBox(
      height: 300,
      width: double.infinity,
      child: Image.network(
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000',
        fit: BoxFit.cover,
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'The Azure Boutique',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(LucideIcons.mapPin, size: 16, color: AppTheme.primaryColor.withOpacity(0.5)),
                      const SizedBox(width: 6),
                      Text('Santorini, Greece', style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 14)),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: AppTheme.mutedColor.withOpacity(0.3), borderRadius: BorderRadius.circular(12)),
              child: const Row(
                children: [
                  Icon(LucideIcons.star, color: AppTheme.accentColor, size: 16, fill: 1),
                  SizedBox(width: 4),
                  Text('4.9', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTabBar() {
    return Container(
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppTheme.mutedColor))),
      child: TabBar(
        controller: _tabController,
        labelColor: AppTheme.primaryColor,
        unselectedLabelColor: AppTheme.primaryColor.withOpacity(0.5),
        indicatorColor: AppTheme.accentColor,
        indicatorWeight: 3,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        tabs: const [
          Tab(text: 'Rooms'),
          Tab(text: 'Amenities'),
          Tab(text: 'Reviews'),
        ],
      ),
    );
  }

  Widget _buildTabContent() {
    return SizedBox(
      height: 600,
      child: TabBarView(
        controller: _tabController,
        children: [
          _buildRoomsTab(),
          _buildAmenitiesTab(),
          _buildReviewsTab(),
        ],
      ),
    );
  }

  Widget _buildRoomsTab() {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 3,
      separatorBuilder: (context, index) => const SizedBox(height: 16),
      itemBuilder: (context, index) => const RoomCard(),
    );
  }

  Widget _buildAmenitiesTab() {
    final amenities = ['Free WiFi', 'Infinity Pool', 'Spa & Wellness', 'Ocean View', 'Restaurant', 'Airport Shuttle'];
    return GridView.builder(
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 3,
      ),
      itemCount: amenities.length,
      itemBuilder: (context, index) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(border: Border.all(color: AppTheme.mutedColor), borderRadius: BorderRadius.circular(12)),
          child: Row(
            children: [
              const Icon(LucideIcons.check, size: 16, color: AppTheme.accentColor),
              const SizedBox(width: 8),
              Text(amenities[index], style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildReviewsTab() {
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      itemCount: 4,
      separatorBuilder: (context, index) => const SizedBox(height: 16),
      itemBuilder: (context, index) => const ReviewCard(),
    );
  }
}

class RoomCard extends StatelessWidget {
  const RoomCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(border: Border.all(color: AppTheme.mutedColor), borderRadius: BorderRadius.circular(20)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Deluxe Ocean Suite', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildRoomFeature(LucideIcons.bedDouble, '1 King Bed'),
              const SizedBox(width: 16),
              _buildRoomFeature(LucideIcons.users, '2 Guests'),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('\$450', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                  Text('per night', style: TextStyle(fontSize: 11, color: AppTheme.primaryColor.withOpacity(0.5))),
                ],
              ),
              ElevatedButton(
                onPressed: () => context.push('/booking'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.accentColor,
                  foregroundColor: AppTheme.primaryColor,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                ),
                child: const Text('Select Room'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRoomFeature(IconData icon, String text) {
    return Row(
      children: [
        Icon(icon, size: 14, color: AppTheme.primaryColor.withOpacity(0.5)),
        const SizedBox(width: 6),
        Text(text, style: TextStyle(fontSize: 12, color: AppTheme.primaryColor.withOpacity(0.6))),
      ],
    );
  }
}

class ReviewCard extends StatelessWidget {
  const ReviewCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(border: Border.all(color: AppTheme.mutedColor), borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Sarah Johnson', style: TextStyle(fontWeight: FontWeight.bold)),
              Row(
                children: [
                  Icon(LucideIcons.star, color: AppTheme.accentColor, size: 12, fill: 1),
                  Icon(LucideIcons.star, color: AppTheme.accentColor, size: 12, fill: 1),
                  Icon(LucideIcons.star, color: AppTheme.accentColor, size: 12, fill: 1),
                  Icon(LucideIcons.star, color: AppTheme.accentColor, size: 12, fill: 1),
                  Icon(LucideIcons.star, color: AppTheme.accentColor, size: 12, fill: 1),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'An absolutely breathtaking experience. The view from the infinity pool is unlike anything I have ever seen.',
            style: TextStyle(fontSize: 13, color: AppTheme.primaryColor.withOpacity(0.7), height: 1.5),
          ),
          const SizedBox(height: 8),
          Text('2 weeks ago', style: TextStyle(fontSize: 10, color: AppTheme.primaryColor.withOpacity(0.4))),
        ],
      ),
    );
  }
}
