import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/favorites_provider.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../shared/domain/entities/hotel_entity.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ScrollController _featuredController = ScrollController();
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(() => context.read<HotelProvider>().fetchHotels());
  }

  @override
  void dispose() {
    _featuredController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: Column(
        children: [
          _buildHero(context),
          Transform.translate(
            offset: const Offset(0, -60), // Adjusted overlap
            child: _buildCategories(),
          ),
          Transform.translate(
            offset: const Offset(0, -40),
            child: Column(
              children: [
                _buildTopCities(context),
                _buildFeaturedSection(context),
                _buildSpecialOffers(context),
                _buildFavorites(context),
                _buildRecommendedSection(context),
                _buildTrustStrip(context),
              ],
            ),
          ),
          const SizedBox(height: 100),
        ],
      ),
    );
  }

  Widget _buildTopCities(BuildContext context) {
    final cities = [
      {'name': 'London', 'image': 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=400', 'count': '120+ Stays'},
      {'name': 'Paris', 'image': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=400', 'count': '85+ Stays'},
      {'name': 'New York', 'image': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=400', 'count': '150+ Stays'},
      {'name': 'Tokyo', 'image': 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=400', 'count': '90+ Stays'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 24),
          child: Text(
            'Top Visited Cities',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 140,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: cities.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final city = cities[index];
              return InkWell(
                onTap: () => context.push('/hotels'),
                child: Column(
                  children: [
                    Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: ClipOval(
                        child: CachedNetworkImage(
                          imageUrl: city['image']!,
                          fit: BoxFit.cover,
                          memCacheWidth: 160, // Optimize memory for small circles
                          memCacheHeight: 160,
                          placeholder: (context, url) => Shimmer.fromColors(
                            baseColor: Colors.grey[300]!,
                            highlightColor: Colors.grey[100]!,
                            child: Container(color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(city['name']!, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    Text(city['count']!, style: TextStyle(fontSize: 10, color: Colors.grey[500])),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildFavorites(BuildContext context) {
    final favorites = context.watch<FavoritesProvider>().favorites;

    if (favorites.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Your Favorites',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
              TextButton(
                onPressed: () {},
                child: const Text('View All', style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 280,
          child: ListView.separated(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: favorites.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) {
              final item = favorites[index];
              return Container(
                width: 220,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 8)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Hero(
                      tag: 'hotel_image_fav_${item.id}',
                      child: ClipRRect(
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                        child: CachedNetworkImage(
                          imageUrl: item.imageUrl,
                          height: 140,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          memCacheWidth: 440, // Reduced resolution for memory
                          placeholder: (context, url) => Shimmer.fromColors(
                            baseColor: Colors.grey[300]!,
                            highlightColor: Colors.grey[100]!,
                            child: Container(color: Colors.white),
                          ),
                        ),
                      ),
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14), maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              Icon(LucideIcons.mapPin, size: 10, color: Colors.grey[400]),
                              const SizedBox(width: 4),
                              Text(item.location, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('\$${item.pricePerNight}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                              GestureDetector(
                                onTap: () => context.read<FavoritesProvider>().toggleFavorite(item),
                                child: const Icon(LucideIcons.heart, size: 16, color: Colors.red, fill: 1),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _buildHero(BuildContext context) {
    return Stack(
      children: [
        // Premium Background Image
        Container(
          height: 500, // Balanced height to avoid overflow
          width: double.infinity,
          foregroundDecoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Colors.black.withOpacity(0.3),
                Colors.transparent,
                AppTheme.backgroundColor.withOpacity(0.9),
                AppTheme.backgroundColor,
              ],
              stops: const [0.0, 0.4, 0.8, 1.0], // Adjusted stops for quicker fade
            ),
          ),
          child: CachedNetworkImage(
            imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600',
            fit: BoxFit.cover,
            placeholder: (context, url) => Container(color: AppTheme.primaryColor),
          ),
        ),
        // Hero Content
        Positioned.fill(
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: 10),
                  // Welcome Message
                  InkWell(
                    onTap: () => context.push('/profile'),
                    borderRadius: BorderRadius.circular(50),
                    child: Row(
                      children: [
                        Consumer<AuthProvider>(
                          builder: (context, auth, _) {
                            final profileImage = auth.user?.profileImage;
                            final name = auth.user?.name ?? 'Guest';
                            return Container(
                              padding: const EdgeInsets.all(2),
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 2),
                              ),
                              child: CircleAvatar(
                                radius: 18,
                                backgroundImage: (profileImage != null && profileImage.isNotEmpty)
                                    ? CachedNetworkImageProvider(profileImage)
                                    : CachedNetworkImageProvider('https://ui-avatars.com/api/?name=$name&background=F5E6CA&color=2C3E50') as ImageProvider,
                              ),
                            );
                          },
                        ),
                        const SizedBox(width: 12),
                        Consumer<AuthProvider>(
                          builder: (context, auth, _) {
                            final name = auth.user?.name ?? 'Guest';
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Welcome back,',
                                  style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 12),
                                ),
                                Text(
                                  name,
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                              ],
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Main Headline
                  ClipRRect(
                    borderRadius: BorderRadius.circular(24),
                    child: BackdropFilter(
                      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                      child: Container(
                        padding: const EdgeInsets.all(16), // Further reduced padding
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.white.withOpacity(0.2)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min, // Allow container to shrink
                          children: [
                            Text(
                              'Find Your Next',
                              style: TextStyle(
                                color: Colors.white.withOpacity(0.9),
                                fontSize: 18, // Slightly smaller
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 4),
                            const Text(
                              'Masterpiece Stay',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 28, // Slightly smaller
                                fontWeight: FontWeight.bold,
                                height: 1.1,
                              ),
                            ),
                            const SizedBox(height: 8),
                            _buildIntegratedSearch(context),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildIntegratedSearch(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () => _showLocationPicker(context),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(LucideIcons.search, size: 20, color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('LOCATION', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 1)),
                        const Text('Where are you going?', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1, indent: 48),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () => _showDatePicker(context),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('DATES', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 1)),
                        const Text('Add Dates', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
                Container(height: 30, width: 1, color: Colors.grey[200]),
                const SizedBox(width: 16),
                Expanded(
                  child: InkWell(
                    onTap: () => _showGuestPicker(context),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('GUESTS', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.grey[400], letterSpacing: 1)),
                        const Text('Add Guests', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1, indent: 24, endIndent: 24),
          InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Finding hotels near you...'), behavior: SnackBarBehavior.floating),
              );
              context.push('/hotels');
            },
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(LucideIcons.navigation, size: 18, color: AppTheme.primaryColor),
                  const SizedBox(width: 12),
                  const Text('Find Premium Hotels', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primaryColor)),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Icon(LucideIcons.arrowRight, size: 16, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategories() {
    final categories = [
      {'icon': LucideIcons.palmtree, 'label': 'Beach'},
      {'icon': LucideIcons.mountain, 'label': 'Mountain'},
      {'icon': LucideIcons.building2, 'label': 'City'},
      {'icon': LucideIcons.tent, 'label': 'Desert'},
      {'icon': LucideIcons.sparkles, 'label': 'Luxury'},
    ];

    return Container(
      height: 100,
      margin: const EdgeInsets.only(top: 8),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final cat = categories[index];
          return InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Exploring ${cat['label']} stays...'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
              context.push('/hotels');
            },
            borderRadius: BorderRadius.circular(50),
            child: Container(
              margin: const EdgeInsets.only(right: 32),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Icon(cat['icon'] as IconData, size: 24, color: AppTheme.primaryColor),
                  ),
                  const SizedBox(height: 8),
                  Text(cat['label'] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildSpecialOffers(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      height: 160,
      width: double.infinity,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          colors: [AppTheme.primaryColor, Color(0xFF2C3E50)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(color: AppTheme.primaryColor.withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8)),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            bottom: -20,
            child: Icon(LucideIcons.sparkles, size: 120, color: Colors.white.withOpacity(0.1)),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppTheme.accentColor, borderRadius: BorderRadius.circular(6)),
                  child: const Text('LIMITED OFFER', style: TextStyle(color: AppTheme.primaryColor, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 1)),
                ),
                const SizedBox(height: 12),
                const Text('Get 25% Off\nOn Your First Booking', style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold, height: 1.2)),
                const SizedBox(height: 12),
                const Text('Use Code: WELCOME25', style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecommendedSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Text('Recommended for You', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        ),
        const SizedBox(height: 8),
        Consumer<HotelProvider>(
          builder: (context, provider, child) {
            if (provider.isLoading && provider.hotels.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            }
            final items = provider.hotels.skip(3).take(3).toList();
            if (items.isEmpty) {
              return const SizedBox.shrink();
            }
            return ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              itemCount: items.length,
              separatorBuilder: (context, index) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final item = items[index];
                return InkWell(
                  onTap: () => context.push('/hotel/${item.id}'),
                  child: Container(
                    height: 120,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
                      ],
                    ),
                    child: Row(
                      children: [
                        Hero(
                          tag: 'hotel_image_rec_${item.id}',
                          child: ClipRRect(
                            borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)),
                            child: CachedNetworkImage(
                              imageUrl: item.imageUrl,
                              width: 120,
                              height: 120,
                              fit: BoxFit.cover,
                              memCacheWidth: 240,
                              memCacheHeight: 240,
                              placeholder: (context, url) => Shimmer.fromColors(
                                baseColor: Colors.grey[300]!,
                                highlightColor: Colors.grey[100]!,
                                child: Container(color: Colors.white),
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryColor)),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(LucideIcons.mapPin, size: 12, color: Colors.grey[400]),
                                    const SizedBox(width: 4),
                                    Text(item.location, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text('\$${item.pricePerNight}/night', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                                    Row(
                                      children: [
                                        const Icon(LucideIcons.star, size: 12, color: AppTheme.accentColor, fill: 1),
                                        const SizedBox(width: 4),
                                        Text(item.rating.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                      ],
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }

  void _showLocationPicker(BuildContext context) {
    final hotelProvider = context.read<HotelProvider>();
    final locations = hotelProvider.allHotels.map((h) => h.location).toSet().toList();
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          return DraggableScrollableSheet(
            initialChildSize: 0.7,
            minChildSize: 0.5,
            maxChildSize: 0.95,
            expand: false,
            builder: (context, scrollController) => Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Where are you going?', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                  const SizedBox(height: 20),
                  TextField(
                    autofocus: true,
                    decoration: InputDecoration(
                      hintText: 'Search city or hotel location...',
                      prefixIcon: const Icon(LucideIcons.search, size: 20),
                      filled: true,
                      fillColor: Colors.grey[100],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    ),
                    onChanged: (v) {
                      setModalState(() {
                        // filtering is handled by the ListView below
                      });
                    },
                    controller: _searchController,
                  ),
                  const SizedBox(height: 24),
                  const Text('SUGGESTED DESTINATIONS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1)),
                  const SizedBox(height: 16),
                  Expanded(
                    child: ListView.separated(
                      controller: scrollController,
                      itemCount: locations.where((l) => l.toLowerCase().contains(_searchController.text.toLowerCase())).length,
                      separatorBuilder: (context, index) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final filtered = locations.where((l) => l.toLowerCase().contains(_searchController.text.toLowerCase())).toList();
                        final loc = filtered[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.05), borderRadius: BorderRadius.circular(12)),
                            child: const Icon(LucideIcons.mapPin, size: 18, color: AppTheme.primaryColor),
                          ),
                          title: Text(loc, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                          subtitle: const Text('Top destination', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          onTap: () {
                            hotelProvider.updateSearch(loc);
                            Navigator.pop(context);
                            context.push('/hotels');
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showDatePicker(BuildContext context) {
    showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
  }

  void _showGuestPicker(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Select Guests', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Adults'),
                Row(
                  children: [
                    IconButton(icon: const Icon(LucideIcons.minusCircle), onPressed: () {}),
                    const Text('2', style: TextStyle(fontWeight: FontWeight.bold)),
                    IconButton(icon: const Icon(LucideIcons.plusCircle), onPressed: () {}),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Apply'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTrustStrip(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.accentColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _CompactTrustItem(icon: LucideIcons.shieldCheck, label: 'Secure'),
          _CompactTrustItem(icon: LucideIcons.sparkles, label: 'Curated'),
          _CompactTrustItem(icon: LucideIcons.headphones, label: '24/7 Care'),
          _CompactTrustItem(icon: LucideIcons.creditCard, label: 'Best Price'),
        ],
      ),
    );
  }

  Widget _buildFeaturedSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Top Destinations',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              TextButton(
                onPressed: () => context.push('/hotels'),
                child: const Text('View all', style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          height: 380,
          child: Consumer<HotelProvider>(
            builder: (context, provider, child) {
              if (provider.isLoading && provider.hotels.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }
              final hotels = provider.hotels.take(3).toList();
              if (hotels.isEmpty) {
                return const Center(child: Text('No destinations found'));
              }
              return ListView.separated(
                controller: _featuredController,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                itemCount: hotels.length,
                separatorBuilder: (context, index) => const SizedBox(width: 20),
                itemBuilder: (context, index) {
                  return FeaturedCard(hotel: hotels[index]);
                },
              );
            },
          ),
        ),
      ],
    );
  }
}

class _CompactTrustItem extends StatelessWidget {
  final IconData icon;
  final String label;
  const _CompactTrustItem({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, size: 20, color: AppTheme.primaryColor),
        const SizedBox(height: 8),
        Text(label, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
      ],
    );
  }
}

class StatItem extends StatelessWidget {
  final String value;
  final String label;
  const StatItem({super.key, required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
        Text(label, style: TextStyle(fontSize: 10, color: AppTheme.primaryColor.withOpacity(0.6), letterSpacing: 1)),
      ],
    );
  }
}

class SearchField extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  const SearchField({super.key, required this.icon, required this.label, required this.value, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppTheme.primaryColor.withOpacity(0.5)),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label.toUpperCase(), style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppTheme.primaryColor.withOpacity(0.4), letterSpacing: 1)),
                const SizedBox(height: 2),
                Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppTheme.primaryColor)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class FeaturedCard extends StatelessWidget {
  final HotelEntity hotel;

  const FeaturedCard({
    super.key,
    required this.hotel,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 280,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => context.push('/hotel/${hotel.id}'),
        borderRadius: BorderRadius.circular(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Hero(
              tag: 'hotel_image_${hotel.id}',
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                child: CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  memCacheWidth: 560, // Optimize memory for wide cards
                  placeholder: (context, url) => Shimmer.fromColors(
                    baseColor: Colors.grey[300]!,
                    highlightColor: Colors.grey[100]!,
                    child: Container(color: Colors.white),
                  ),
                ),
              ),
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
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Row(
                        children: [
                          const Icon(LucideIcons.star, size: 12, color: AppTheme.accentColor, fill: 1),
                          const SizedBox(width: 4),
                          Text(hotel.rating.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(LucideIcons.mapPin, size: 12, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(hotel.location, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      RichText(
                        text: TextSpan(
                          children: [
                            TextSpan(text: '\$${hotel.pricePerNight}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                            TextSpan(text: ' / night', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                          ],
                        ),
                      ),
                      Consumer<FavoritesProvider>(
                        builder: (context, provider, child) {
                          final isFav = provider.isFavorite(hotel);
                          return InkWell(
                            onTap: () {
                              provider.toggleFavorite(hotel);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(isFav ? 'Removed from favorites' : 'Added to favorites!'),
                                  behavior: SnackBarBehavior.floating,
                                  duration: const Duration(seconds: 1),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(50),
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isFav ? Colors.red.withOpacity(0.1) : AppTheme.primaryColor.withOpacity(0.05),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                LucideIcons.heart,
                                size: 16,
                                color: isFav ? Colors.red : AppTheme.primaryColor,
                                fill: isFav ? 1 : 0,
                              ),
                            ),
                          );
                        },
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
}
