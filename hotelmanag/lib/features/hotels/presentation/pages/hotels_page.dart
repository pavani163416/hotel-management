import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../shared/domain/entities/hotel_entity.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';

class HotelsPage extends StatefulWidget {
  const HotelsPage({super.key});

  @override
  State<HotelsPage> createState() => _HotelsPageState();
}

class _HotelsPageState extends State<HotelsPage> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<HotelProvider>().fetchHotels());
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 1000;
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isWide) _buildSidebar(context),
              Expanded(
                child: SingleChildScrollView(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildTopDeals(context),
                        const SizedBox(height: 48),
                        _buildMainListHeader(context),
                        const SizedBox(height: 24),
                        _buildMainList(context),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSidebar(BuildContext context) {
    final provider = context.watch<HotelProvider>();
    return Container(
      width: 300,
      decoration: BoxDecoration(
        color: const Color(0xFFFBFBFB),
        border: Border(right: BorderSide(color: AppTheme.mutedColor.withOpacity(0.5))),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMapPlaceholder(),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Filters', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                TextButton(onPressed: provider.clearFilters, child: const Text('Clear all', style: TextStyle(fontSize: 12, color: Colors.grey))),
              ],
            ),
            const SizedBox(height: 24),
            _buildPriceFilter(provider),
            const SizedBox(height: 32),
            _buildPropertyTypeFilter(provider),
            const SizedBox(height: 32),
            _buildRatingFilter(provider),
            const SizedBox(height: 32),
            _buildAmenitiesFilter(provider),
          ],
        ),
      ),
    );
  }

  Widget _buildMapPlaceholder() {
    return Container(
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.mutedColor),
        image: const DecorationImage(
          image: NetworkImage('https://static.vecteezy.com/system/resources/previews/007/317/373/original/world-map-modern-gray-color-style-vector.jpg'),
          fit: BoxFit.cover,
          opacity: 0.5,
        ),
      ),
      child: Stack(
        children: [
          Center(child: Icon(LucideIcons.mapPin, color: AppTheme.primaryColor.withOpacity(0.5), size: 32)),
          Positioned(
            bottom: 12,
            right: 12,
            left: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppTheme.mutedColor)),
              child: const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(LucideIcons.maximize2, size: 12, color: AppTheme.primaryColor),
                  SizedBox(width: 8),
                  Text('Explore Map', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPriceFilter(HotelProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Price Range', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('\$${provider.priceRange.start.toInt()}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            Text('\$${provider.priceRange.end.toInt()}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        RangeSlider(
          values: provider.priceRange,
          min: 0,
          max: 5000,
          activeColor: AppTheme.primaryColor,
          inactiveColor: AppTheme.mutedColor,
          onChanged: (values) => provider.updatePriceRange(values),
        ),
      ],
    );
  }

  Widget _buildPropertyTypeFilter(HotelProvider provider) {
    final types = ['Any', 'Hotel', 'Resort', 'Villa', 'Suite'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Property Type', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: types.map((type) {
            final active = provider.propertyType == type;
            return GestureDetector(
              onTap: () => provider.updatePropertyType(type),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: active ? Colors.white : Colors.white,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.mutedColor),
                  boxShadow: active ? [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10)] : null,
                ),
                child: Text(type, style: TextStyle(fontSize: 12, color: active ? AppTheme.primaryColor : Colors.grey, fontWeight: active ? FontWeight.bold : FontWeight.normal)),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildRatingFilter(HotelProvider provider) {
    final ratings = [
      {'label': 'Any', 'value': 0.0},
      {'label': '3+ stars', 'value': 3.0},
      {'label': '4+ stars', 'value': 4.0},
      {'label': '4.5+ stars', 'value': 4.5},
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Minimum Rating', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        const SizedBox(height: 8),
        ...ratings.map((r) => RadioListTile<double>(
          value: r['value'] as double,
          groupValue: provider.minRating,
          onChanged: (v) => provider.updateMinRating(v!),
          title: Text(r['label'] as String, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          contentPadding: EdgeInsets.zero,
          dense: true,
          activeColor: AppTheme.primaryColor,
        )),
      ],
    );
  }

  Widget _buildAmenitiesFilter(HotelProvider provider) {
    final amenities = ['Free WiFi', 'Pool', 'Spa', 'Gym', 'Restaurant', 'Bar', 'Beach Access'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Amenities', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        const SizedBox(height: 12),
        ...amenities.map((a) => CheckboxListTile(
          value: provider.selectedAmenities.contains(a),
          onChanged: (v) => provider.toggleAmenity(a),
          title: Text(a, style: const TextStyle(fontSize: 13, color: Colors.grey)),
          contentPadding: EdgeInsets.zero,
          dense: true,
          activeColor: AppTheme.primaryColor,
          controlAffinity: ListTileControlAffinity.leading,
        )),
      ],
    );
  }

  Widget _buildTopDeals(BuildContext context) {
    final provider = context.watch<HotelProvider>();
    final deals = provider.allHotels.take(3).toList();
    
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(LucideIcons.flame, size: 16, color: Colors.orange[400]),
                      const SizedBox(width: 8),
                      const Text('Top Deals', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                    ],
                  ),
                  const Text('Limited-time premium offers', style: TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
              Row(
                children: [
                  _buildNavBtn(LucideIcons.chevronLeft, () {}),
                  const SizedBox(width: 8),
                  _buildNavBtn(LucideIcons.chevronRight, () {}),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: deals.map((hotel) => _buildDealCard(context, hotel)).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(border: Border.all(color: AppTheme.mutedColor), shape: BoxShape.circle),
        child: Icon(icon, size: 16, color: AppTheme.primaryColor),
      ),
    );
  }

  Widget _buildDealCard(BuildContext context, HotelEntity hotel) {
    return Container(
      width: 250,
      margin: const EdgeInsets.only(right: 24),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                child: CachedNetworkImage(imageUrl: hotel.imageUrl, height: 150, width: double.infinity, fit: BoxFit.cover),
              ),
              Positioned(top: 10, left: 10, child: _buildBadge('TOP DEAL', const Color(0xFFF7FAFC))),
              Positioned(top: 10, right: 10, child: _buildBadge('-20%', Colors.black.withOpacity(0.5), textColor: Colors.white)),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(child: Text(hotel.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14))),
                    Row(children: [const Icon(LucideIcons.star, size: 10, color: Colors.orange, fill: 1), const SizedBox(width: 4), Text(hotel.rating.toString(), style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold))]),
                  ],
                ),
                Text(hotel.location, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                         Text('\$${(hotel.pricePerNight * 1.2).toInt()}', style: const TextStyle(fontSize: 10, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                         Text('\$${hotel.pricePerNight.toInt()}/night', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () => context.push('/hotel/${hotel.id}'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFE5E0D8),
                        foregroundColor: AppTheme.primaryColor,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        elevation: 0,
                      ),
                      child: const Text('Book Now', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
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

  Widget _buildBadge(String text, Color color, {Color textColor = AppTheme.primaryColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4)),
      child: Text(text, style: TextStyle(color: textColor, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
    );
  }

  Widget _buildMainListHeader(BuildContext context) {
    final provider = context.watch<HotelProvider>();
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('All Premium Stays', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppTheme.primaryColor, fontFamily: 'Serif')),
            Text('Showing ${provider.hotels.length} curated properties', style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
        Row(
          children: [
            _buildIconBtn(LucideIcons.list, true),
            const SizedBox(width: 8),
            _buildIconBtn(LucideIcons.layoutGrid, false),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(border: Border.all(color: AppTheme.mutedColor), borderRadius: BorderRadius.circular(8)),
              child: const Row(
                children: [
                  Text('Top Rated', style: TextStyle(fontSize: 12, color: AppTheme.primaryColor)),
                  SizedBox(width: 8),
                  Icon(LucideIcons.chevronDown, size: 14),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildIconBtn(IconData icon, bool active) {
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: active ? AppTheme.primaryColor : Colors.white,
        border: Border.all(color: active ? AppTheme.primaryColor : AppTheme.mutedColor),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, size: 16, color: active ? Colors.white : AppTheme.primaryColor),
    );
  }

  Widget _buildMainList(BuildContext context) {
    final provider = context.watch<HotelProvider>();
    if (provider.isLoading) return const Center(child: CircularProgressIndicator());
    return Column(
      children: provider.hotels.map((hotel) => _buildHotelCard(context, hotel)).toList(),
    );
  }

  Widget _buildHotelCard(BuildContext context, HotelEntity hotel) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Stack(
            children: [
              CachedNetworkImage(imageUrl: hotel.imageUrl, width: 280, height: 180, fit: BoxFit.cover),
              Positioned(top: 12, left: 12, child: _buildBadge('TOP DEAL', Colors.white.withOpacity(0.9))),
            ],
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(hotel.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                      Row(
                        children: [
                          const Icon(LucideIcons.star, size: 14, color: Colors.orange, fill: 1),
                          const SizedBox(width: 4),
                          Text('${hotel.rating} (852)', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Icon(LucideIcons.mapPin, size: 12, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(hotel.location, style: TextStyle(fontSize: 12, color: Colors.grey[400])),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Wrap(
                    spacing: 8,
                    children: [
                      _buildAmenityChip('Free WiFi'),
                      _buildAmenityChip('Spa'),
                      _buildAmenityChip('Pool'),
                      _buildAmenityChip('Restaurant'),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'A timeless masterpiece of French art de vivre, offering panoramic views of the city\'s most iconic landmarks.',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600], height: 1.5),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ),
          Container(
            width: 180,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(border: Border(left: BorderSide(color: AppTheme.mutedColor.withOpacity(0.5)))),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Starting from', style: TextStyle(fontSize: 10, color: Colors.grey)),
                Text('\$${(hotel.pricePerNight * 1.25).toInt()}', style: const TextStyle(fontSize: 12, color: Colors.grey, decoration: TextDecoration.lineThrough)),
                const SizedBox(height: 4),
                Text('\$${hotel.pricePerNight.toInt()}', style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                const Text('per night', style: TextStyle(fontSize: 10, color: Colors.grey)),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: () => context.push('/hotel/${hotel.id}'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFE5E0D8),
                    foregroundColor: AppTheme.primaryColor,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 0,
                  ),
                  child: const Text('View Details', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmenityChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: const Color(0xFFF7FAFC), borderRadius: BorderRadius.circular(6), border: Border.all(color: AppTheme.mutedColor)),
      child: Text(text, style: const TextStyle(fontSize: 10, color: AppTheme.primaryColor, fontWeight: FontWeight.w500)),
    );
  }
}
