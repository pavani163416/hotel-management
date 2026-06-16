import 'package:flutter/material.dart';
import '../../../../core/providers/currency_provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../core/providers/favorites_provider.dart';
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
  @override
  void initState() {
    super.initState();
    // Only fetch if we have no data yet — avoids a loading flash on every navigation
    Future.microtask(() {
      final provider = context.read<HotelProvider>();
      if (provider.allHotels.isEmpty) {
        provider.fetchHotels();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      isScrollable: false,
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
                    padding: EdgeInsets.all(isWide ? 32 : 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildTopDeals(context, isWide),
                        const SizedBox(height: 32),
                        _buildMainListHeader(context, isWide),
                        const SizedBox(height: 24),
                        _buildMainList(context, isWide),
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
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Container(
      width: 300,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : const Color(0xFFFBFBFB),
        border: Border(
          right: BorderSide(
            color: isDark
                ? Colors.white10
                : AppTheme.mutedColor.withOpacity(0.5),
          ),
        ),
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
                Text(
                  'Filters',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                TextButton(
                  onPressed: provider.clearFilters,
                  child: const Text(
                    'Clear all',
                    style: TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ),
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
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return InkWell(
      onTap: () => context.push('/map-search'),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 200,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.white10 : AppTheme.mutedColor,
          ),
          image: const DecorationImage(
            image: NetworkImage(
              'https://static.vecteezy.com/system/resources/previews/007/317/373/original/world-map-modern-gray-color-style-vector.jpg',
            ),
            fit: BoxFit.cover,
            opacity: 0.5,
          ),
        ),
        child: Stack(
          children: [
            Center(
              child: Icon(
                LucideIcons.mapPin,
                color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
                size: 32,
              ),
            ),
            Positioned(
              bottom: 12,
              right: 12,
              left: 12,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF19222E) : Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isDark ? Colors.white10 : AppTheme.mutedColor,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      LucideIcons.maximize2,
                      size: 12,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Explore Map',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceFilter(HotelProvider provider) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Price Range',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              context.watch<CurrencyProvider>().format(
                provider.priceRange.start,
              ),
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            Text(
              context.watch<CurrencyProvider>().format(provider.priceRange.end),
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
        RangeSlider(
          values: provider.priceRange,
          min: 0,
          max: 5000,
          activeColor: Theme.of(context).colorScheme.primary,
          inactiveColor: isDark ? Colors.white12 : AppTheme.mutedColor,
          onChanged: (values) => provider.updatePriceRange(values),
        ),
      ],
    );
  }

  Widget _buildPropertyTypeFilter(HotelProvider provider) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final types = ['Any', 'Hotel', 'Resort', 'Villa', 'Suite'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Property Type',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: types.map((type) {
            final active = provider.propertyType == type;
            return GestureDetector(
              onTap: () => provider.updatePropertyType(type),
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 8,
                ),
                decoration: BoxDecoration(
                  color: active
                      ? Theme.of(context).colorScheme.primary
                      : (isDark ? const Color(0xFF19222E) : Colors.white),
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(
                    color: active
                        ? Theme.of(context).colorScheme.primary
                        : (isDark ? Colors.white10 : AppTheme.mutedColor),
                  ),
                  boxShadow: active
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 10,
                          ),
                        ]
                      : null,
                ),
                child: Text(
                  type,
                  style: TextStyle(
                    fontSize: 12,
                    color: active
                        ? Colors.white
                        : (isDark ? Colors.grey[400] : Colors.grey[600]),
                    fontWeight: active ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildRatingFilter(HotelProvider provider) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final ratings = [
      {'label': 'Any', 'value': 0.0},
      {'label': '3+ stars', 'value': 3.0},
      {'label': '4+ stars', 'value': 4.0},
      {'label': '4.5+ stars', 'value': 4.5},
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Minimum Rating',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        ...ratings.map(
          (r) => RadioListTile<double>(
            value: r['value'] as double,
            groupValue: provider.minRating,
            onChanged: (v) => provider.updateMinRating(v!),
            title: Text(
              r['label'] as String,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            contentPadding: EdgeInsets.zero,
            dense: true,
            activeColor: Theme.of(context).colorScheme.primary,
          ),
        ),
      ],
    );
  }

  Widget _buildAmenitiesFilter(HotelProvider provider) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final amenities = [
      'Free WiFi',
      'Pool',
      'Spa',
      'Gym',
      'Restaurant',
      'Bar',
      'Beach Access',
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Amenities',
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 12),
        ...amenities.map(
          (a) => CheckboxListTile(
            value: provider.selectedAmenities.contains(a),
            onChanged: (v) => provider.toggleAmenity(a),
            title: Text(
              a,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? Colors.grey[400] : Colors.grey[600],
              ),
            ),
            contentPadding: EdgeInsets.zero,
            dense: true,
            activeColor: Theme.of(context).colorScheme.primary,
            controlAffinity: ListTileControlAffinity.leading,
          ),
        ),
      ],
    );
  }

  Widget _buildTopDeals(BuildContext context, bool isWide) {
    // Use select so this section only rebuilds when the first 3 hotels change
    // Use the provider's filtered hotels so Premium is location-aware.
    final deals = context.select<HotelProvider, List<HotelEntity>>(
      (p) => List<HotelEntity>.from(p.hotels),
    );
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;

    final topRated = List<HotelEntity>.from(deals);
    topRated.sort((a, b) => b.rating.compareTo(a.rating));

    return Container(
      padding: EdgeInsets.all(isWide ? 24 : 16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor,
        ),
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
                      Icon(
                        LucideIcons.flame,
                        size: 16,
                        color: Colors.orange[400],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Premium',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    'Top rated hotels for a premium stay',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey[400] : Colors.grey,
                    ),
                  ),
                ],
              ),
              if (isWide)
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
              children: topRated
                  .take(3)
                  .map((hotel) => _buildDealCard(context, hotel))
                  .toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavBtn(IconData icon, VoidCallback onTap) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          border: Border.all(
            color: isDark ? Colors.white10 : AppTheme.mutedColor,
          ),
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          size: 16,
          color: Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildDealCard(BuildContext context, HotelEntity hotel) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final hasDiscount = hotel.discountPct > 0 && hotel.originalPrice != null;
    return Container(
      width: 250,
      margin: const EdgeInsets.only(right: 20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19222E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
                child: CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  memCacheWidth: 400,
                  memCacheHeight: 280,
                ),
              ),
              if (hotel.isDeal)
                Positioned(
                  top: 10,
                  left: 10,
                  child: _buildBadge(
                    'TOP DEAL',
                    isDark ? const Color(0xFF253040) : const Color(0xFFF7FAFC),
                  ),
                ),
              if (hasDiscount)
                Positioned(
                  top: 10,
                  right: 10,
                  child: _buildBadge(
                    '-${hotel.discountPct.toInt()}%',
                    Colors.black.withOpacity(0.5),
                    textColor: Colors.white,
                  ),
                ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        hotel.name,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (hotel.rating > 0)
                      Row(
                        children: [
                          const Icon(
                            LucideIcons.star,
                            size: 10,
                            color: Colors.orange,
                            fill: 1,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            hotel.rating.toString(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
                Text(
                  hotel.location,
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.grey[400] : Colors.grey,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        if (hasDiscount)
                          Text(
                            context.watch<CurrencyProvider>().format(
                              hotel.originalPrice!,
                            ),
                            style: TextStyle(
                              fontSize: 9,
                              color: isDark ? Colors.grey[500] : Colors.grey,
                              decoration: TextDecoration.lineThrough,
                            ),
                          ),
                        Text(
                          '${context.watch<CurrencyProvider>().format(hotel.pricePerNight)}/night',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () => context.push('/hotel/${hotel.id}'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: isDark
                            ? const Color(0xFF253040)
                            : const Color(0xFFE5E0D8),
                        foregroundColor: Theme.of(context).colorScheme.primary,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'Book',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
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

  Widget _buildBadge(String text, Color color, {Color? textColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        text,
        style: TextStyle(
          color: textColor ?? Theme.of(context).colorScheme.primary,
          fontSize: 8,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
    );
  }

  Widget _buildMainListHeader(BuildContext context, bool isWide) {
    final provider = context.watch<HotelProvider>();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'All Premium Stays',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                      fontFamily: 'Serif',
                    ),
                  ),
                  Text(
                    'Showing ${provider.hotels.length} curated properties',
                    style: TextStyle(
                      fontSize: 11,
                      color:
                          Theme.of(context).colorScheme.brightness ==
                              Brightness.dark
                          ? Colors.grey[400]
                          : Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
            if (isWide)
              Row(
                children: [
                  _buildIconBtn(LucideIcons.list, true),
                  const SizedBox(width: 8),
                  _buildIconBtn(LucideIcons.layoutGrid, false),
                  const SizedBox(width: 16),
                  _buildSortDropdown(),
                ],
              ),
          ],
        ),
        if (!isWide) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _buildSortDropdown()),
              const SizedBox(width: 12),
              _buildIconBtn(
                LucideIcons.map,
                false,
                onTap: () => context.push('/map-search'),
              ),
              const SizedBox(width: 12),
              _buildIconBtn(
                LucideIcons.slidersHorizontal,
                false,
                onTap: () => _showMobileFilters(context),
              ),
            ],
          ),
        ],
      ],
    );
  }

  Widget _buildSortDropdown() {
    final provider = context.watch<HotelProvider>();
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;

    return PopupMenuButton<String>(
      tooltip: 'Sort Stays',
      onSelected: (value) => provider.updateSortBy(value),
      itemBuilder: (context) => [
        const PopupMenuItem(
          value: 'Top Rated',
          child: Text('Top Rated', style: TextStyle(fontSize: 12)),
        ),
        const PopupMenuItem(
          value: 'Price: Low to High',
          child: Text('Price: Low to High', style: TextStyle(fontSize: 12)),
        ),
        const PopupMenuItem(
          value: 'Price: High to Low',
          child: Text('Price: High to Low', style: TextStyle(fontSize: 12)),
        ),
      ],
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19222E) : Colors.white,
          border: Border.all(
            color: isDark ? Colors.white10 : AppTheme.mutedColor,
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              provider.sortBy,
              style: TextStyle(
                fontSize: 12,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              LucideIcons.chevronDown,
              size: 14,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildIconBtn(IconData icon, bool active, {VoidCallback? onTap}) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: active
              ? Theme.of(context).colorScheme.primary
              : (isDark ? const Color(0xFF19222E) : Colors.white),
          border: Border.all(
            color: active
                ? Theme.of(context).colorScheme.primary
                : (isDark ? Colors.white10 : AppTheme.mutedColor),
          ),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(
          icon,
          size: 16,
          color: active ? Colors.white : Theme.of(context).colorScheme.primary,
        ),
      ),
    );
  }

  Widget _buildMainList(BuildContext context, bool isWide) {
    final provider = context.watch<HotelProvider>();
    if (provider.isLoading && provider.hotels.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    final hotels = provider.hotels;
    if (hotels.isEmpty) {
      return const EmptyHotelsWidget();
    }
    // Use ListView.builder for virtualized rendering — only visible cards are built
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: hotels.length,
      itemBuilder: (context, index) =>
          _buildHotelCard(context, hotels[index], isWide),
    );
  }

  Widget _buildHotelCard(BuildContext context, HotelEntity hotel, bool isWide) {
    if (!isWide) return _buildMobileHotelCard(context, hotel);
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final cardAmenities = hotel.amenities.isNotEmpty
        ? hotel.amenities.take(4).toList()
        : <String>[];
    final hasDiscount = hotel.discountPct > 0 && hotel.originalPrice != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Row(
        children: [
          Stack(
            children: [
              CachedNetworkImage(
                imageUrl: hotel.imageUrl,
                width: 280,
                height: 180,
                fit: BoxFit.cover,
                memCacheWidth: 500,
                memCacheHeight: 350,
              ),
              if (hotel.isDeal)
                Positioned(
                  top: 12,
                  left: 12,
                  child: _buildBadge(
                    'TOP DEAL',
                    isDark ? const Color(0xFF253040) : const Color(0xFFE5E0D8),
                  ),
                ),
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
                      Expanded(
                        child: Text(
                          hotel.name,
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ),
                      if (hotel.rating > 0)
                        Row(
                          children: [
                            const Icon(
                              LucideIcons.star,
                              size: 14,
                              color: Colors.orange,
                              fill: 1,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '${hotel.rating}${hotel.reviewCount > 0 ? ' (${hotel.reviewCount})' : ''}',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(width: 10),
                      Consumer<FavoritesProvider>(
                        builder: (context, provider, child) {
                          final isFav = provider.isFavorite(hotel);
                          return InkWell(
                            onTap: () => provider.toggleFavorite(hotel),
                            borderRadius: BorderRadius.circular(50),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isFav
                                    ? Colors.red.withOpacity(0.1)
                                    : AppTheme.primaryColor.withOpacity(0.05),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                LucideIcons.heart,
                                size: 16,
                                color: isFav
                                    ? Colors.red
                                    : AppTheme.primaryColor,
                                fill: isFav ? 1 : 0,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      Icon(
                        LucideIcons.mapPin,
                        size: 12,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          hotel.location,
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  if (cardAmenities.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 8,
                      children: cardAmenities
                          .map((a) => _buildAmenityChip(a))
                          .toList(),
                    ),
                  ],
                  if (hotel.description.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      hotel.description,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? Colors.grey[400] : Colors.grey[600],
                        height: 1.5,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
          ),
          Container(
            width: 180,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(
                  color: isDark
                      ? Colors.white10
                      : AppTheme.mutedColor.withOpacity(0.5),
                ),
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  'Starting from',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.grey[400] : Colors.grey,
                  ),
                ),
                if (hasDiscount)
                  Text(
                    context.watch<CurrencyProvider>().format(
                      hotel.originalPrice!,
                    ),
                    style: TextStyle(
                      fontSize: 11,
                      color: isDark ? Colors.grey[500] : Colors.grey,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                const SizedBox(height: 2),
                Text(
                  context.watch<CurrencyProvider>().format(hotel.pricePerNight),
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                Text(
                  'per night',
                  style: TextStyle(
                    fontSize: 11,
                    color: isDark ? Colors.grey[400] : Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => context.push('/hotel/${hotel.id}'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isDark
                          ? const Color(0xFF19222E)
                          : const Color(0xFFE5E0D8),
                      foregroundColor: Theme.of(context).colorScheme.primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'View Details',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMobileHotelCard(BuildContext context, HotelEntity hotel) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => context.push('/hotel/${hotel.id}'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  memCacheWidth: 500,
                  memCacheHeight: 350,
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: _buildBadge(
                    'TOP DEAL',
                    isDark ? const Color(0xFF253040) : const Color(0xFFE5E0D8),
                  ),
                ),
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
                      Expanded(
                        child: Text(
                          hotel.name,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (hotel.rating > 0)
                        Row(
                          children: [
                            const Icon(
                              LucideIcons.star,
                              size: 12,
                              color: Colors.orange,
                              fill: 1,
                            ),
                            const SizedBox(width: 4),
                            Text(
                              hotel.rating.toString(),
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      const SizedBox(width: 10),
                      Consumer<FavoritesProvider>(
                        builder: (context, provider, child) {
                          final isFav = provider.isFavorite(hotel);
                          return InkWell(
                            onTap: () => provider.toggleFavorite(hotel),
                            borderRadius: BorderRadius.circular(50),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isFav
                                    ? Colors.red.withOpacity(0.1)
                                    : AppTheme.primaryColor.withOpacity(0.05),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                LucideIcons.heart,
                                size: 16,
                                color: isFav
                                    ? Colors.red
                                    : AppTheme.primaryColor,
                                fill: isFav ? 1 : 0,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        LucideIcons.mapPin,
                        size: 10,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          hotel.location,
                          style: TextStyle(
                            fontSize: 11,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Starting from',
                            style: TextStyle(
                              fontSize: 9,
                              color: isDark ? Colors.grey[400] : Colors.grey,
                            ),
                          ),
                          Text(
                            context.watch<CurrencyProvider>().format(
                              hotel.pricePerNight,
                            ),
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          Text(
                            'per night',
                            style: TextStyle(
                              fontSize: 9,
                              color: isDark ? Colors.grey[400] : Colors.grey,
                            ),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: () => context.push('/hotel/${hotel.id}'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isDark
                              ? const Color(0xFF19222E)
                              : const Color(0xFFE5E0D8),
                          foregroundColor: Theme.of(
                            context,
                          ).colorScheme.primary,
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 10,
                          ),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          elevation: 0,
                        ),
                        child: const Text(
                          'View Details',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAmenityChip(String text) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isDark
            ? const Color(0xFF19222E)
            : const Color(0xFFE5E0D8).withOpacity(0.4),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor.withOpacity(0.3),
        ),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          color: isDark ? Colors.grey[300] : Colors.grey[700],
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  void _showMobileFilters(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) => Consumer<HotelProvider>(
          builder: (context, provider, child) => SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Filters',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.pop(context),
                      icon: Icon(
                        LucideIcons.x,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
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
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 18),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: const Text(
                      'Apply Filters',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class EmptyHotelsWidget extends StatelessWidget {
  const EmptyHotelsWidget({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            LucideIcons.searchX,
            size: 64,
            color: isDark ? Colors.white24 : AppTheme.mutedColor,
          ),
          const SizedBox(height: 24),
          Text(
            'No hotels found',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            'We couldn\'t find any properties matching your current filters. Try adjusting your search criteria.',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: isDark ? Colors.grey[400] : Colors.grey[600],
            ),
          ),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () {
              context.read<HotelProvider>().clearFilters();
            },
            icon: const Icon(LucideIcons.refreshCcw, size: 16),
            label: const Text(
              'Clear Filters',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Theme.of(context).colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
