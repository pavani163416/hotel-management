import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/notification_modal.dart';
import '../../../../core/providers/notification_provider.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/providers/favorites_provider.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../shared/domain/entities/hotel_entity.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final ScrollController _featuredController = ScrollController();
  final _searchController = TextEditingController();
  String _location = 'Where are you going?';
  DateTimeRange? _dateRange;
  int _guests = 1;

  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      context.read<HotelProvider>().fetchHotels();
      context.read<BookingProvider>().fetchMyBookings();
    });
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
    return Consumer<HotelProvider>(
      builder: (context, provider, child) {
        if (provider.allHotels.isEmpty) return const SizedBox.shrink();

        // Group hotels by city — use the first hotel's real image for each city
        final Map<String, String> cityImageMap = {};
        for (final hotel in provider.allHotels) {
          final loc = hotel.city.isNotEmpty ? hotel.city : hotel.location;
          final cityName = loc.split(',').first.trim();
          if (cityName.isNotEmpty && !cityImageMap.containsKey(cityName)) {
            // Use the real hotel image from the backend
            if (hotel.imageUrl.isNotEmpty) {
              cityImageMap[cityName] = hotel.imageUrl;
            }
          }
        }

        final cities = cityImageMap.keys.take(6).toList();
        if (cities.isEmpty) return const SizedBox.shrink();

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Explore Destinations',
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
                separatorBuilder: (_, __) => const SizedBox(width: 16),
                itemBuilder: (context, index) {
                  final city = cities[index];
                  final imageUrl = cityImageMap[city]!;
                  return InkWell(
                    onTap: () {
                      provider.updateSearch(city);
                      context.push('/hotels');
                    },
                    child: Column(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 10, offset: const Offset(0, 4)),
                            ],
                          ),
                          child: ClipOval(
                            child: CachedNetworkImage(
                              imageUrl: imageUrl,
                              fit: BoxFit.cover,
                              memCacheWidth: 160,
                              memCacheHeight: 160,
                              placeholder: (context, url) => Shimmer.fromColors(
                                baseColor: Colors.grey[300]!,
                                highlightColor: Colors.grey[100]!,
                                child: Container(color: Colors.white),
                              ),
                              errorWidget: (_, __, ___) => Container(
                                color: AppTheme.mutedColor,
                                child: const Icon(LucideIcons.mapPin, color: AppTheme.primaryColor),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        SizedBox(
                          width: 80,
                          child: Text(
                            city,
                            textAlign: TextAlign.center,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
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
      },
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
                onPressed: () => context.push('/favorites'),
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
              return InkWell(
                onTap: () => context.push('/hotel/${item.id}'),
                borderRadius: BorderRadius.circular(20),
                child: Container(
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
                              Consumer<FavoritesProvider>(
                                builder: (context, provider, child) {
                                  final isFav = provider.isFavorite(item);
                                  return GestureDetector(
                                    onTap: () {
                                      if (isFav) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Already in Favorites!'),
                                            behavior: SnackBarBehavior.floating,
                                            duration: Duration(seconds: 1),
                                          ),
                                        );
                                      } else {
                                        provider.toggleFavorite(item);
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(
                                            content: Text('Added to Favorites!'),
                                            behavior: SnackBarBehavior.floating,
                                            duration: Duration(seconds: 1),
                                          ),
                                        );
                                      }
                                    },
                                    child: Icon(
                                      LucideIcons.heart,
                                      size: 16,
                                      color: isFav ? Colors.red : Colors.grey[400],
                                      fill: isFav ? 1.0 : 0.0,
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
            memCacheWidth: 1000,
            memCacheHeight: 700,
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
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
                                        : CachedNetworkImageProvider(
                                            'https://ui-avatars.com/api/?name=${(name.isEmpty ? 'Guest' : name).toString()}&background=F5E6CA&color=2C3E50',
                                          ),
                                  ),
                                );
                              },
                            ),
                            const SizedBox(width: 12),
                            Consumer<AuthProvider>(
                              builder: (context, auth, _) {
                                final name = (auth.user?.name?.isEmpty ?? true) ? 'Guest' : auth.user!.name;
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
                      Consumer2<NotificationProvider, BookingProvider>(
                        builder: (context, provider, bookingProv, child) {
                          final items = provider.getRealNotifications(bookingProv.bookings);
                          final unreadCount = items.where((i) => i.isNew).length;
                          return Stack(
                            children: [
                              IconButton(
                                icon: const Icon(LucideIcons.bell, color: Colors.white, size: 24),
                                onPressed: () {
                                  showModalBottomSheet(
                                    context: context,
                                    isScrollControlled: true,
                                    backgroundColor: Colors.transparent,
                                    builder: (context) => const NotificationModal(),
                                  );
                                },
                              ),
                              if (unreadCount > 0)
                                Positioned(
                                  top: 4,
                                  right: 4,
                                  child: Container(
                                    padding: const EdgeInsets.all(4),
                                    decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
                                    child: Text(
                                      '$unreadCount',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  // Main Headline
                  RepaintBoundary(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(24),
                      child: BackdropFilter(
                        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Colors.white.withOpacity(0.2)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Find Your Next',
                                style: TextStyle(
                                  color: Colors.white.withOpacity(0.9),
                                  fontSize: 18,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Masterpiece Stay',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 28,
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
                        Text(_location, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
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
                        Text(
                          _dateRange == null 
                            ? 'Add Dates' 
                            : '${DateFormat('MMM dd').format(_dateRange!.start)} - ${DateFormat('MMM dd').format(_dateRange!.end)}',
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                        ),
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
                        Text('$_guests Guests', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
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
              if (_location != 'Where are you going?') {
                context.read<HotelProvider>().updateSearch(_location);
              }
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
              context.read<HotelProvider>().updatePropertyType(cat['label'] as String);
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
            final items = provider.hotels.length > 3
                ? provider.hotels.skip(3).take(3).toList()
                : provider.hotels.take(3).toList();
            if (items.isEmpty) {
              return const SizedBox.shrink();
            }
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 16),
                    child: InkWell(
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
                                        Expanded(
                                          child: Text(
                                            item.location,
                                            style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '\$${item.pricePerNight}/night', 
                                            style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 4),
                                        Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: [
                                            const Icon(LucideIcons.star, size: 12, color: AppTheme.accentColor, fill: 1),
                                            const SizedBox(width: 4),
                                            Text(item.rating.toString(), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                            const SizedBox(width: 8),
                                            Consumer<FavoritesProvider>(
                                              builder: (context, provider, child) {
                                                final isFav = provider.isFavorite(item);
                                                return InkWell(
                                                  onTap: () => provider.toggleFavorite(item),
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
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            );
          },
        ),
      ],
    );
  }

  void _showLocationPicker(BuildContext context) {
    final hotelProvider = context.read<HotelProvider>();
    final locations = hotelProvider.allHotels.map((h) => h.location).toSet().toList();
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) {
          final filtered = locations
              .where((l) => l.toLowerCase().contains(_searchController.text.toLowerCase()))
              .toList();

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
                  Text(
                    'Where are you going?',
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    autofocus: true,
                    controller: _searchController,
                    style: TextStyle(color: Theme.of(context).colorScheme.onSurface),
                    decoration: InputDecoration(
                      hintText: 'Search city or hotel location...',
                      hintStyle: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[500]),
                      prefixIcon: Icon(LucideIcons.search, size: 20, color: Theme.of(context).colorScheme.primary),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF19222E) : Colors.grey[100],
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    ),
                    onChanged: (v) {
                      setModalState(() {});
                    },
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'SUGGESTED DESTINATIONS',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.grey[400] : Colors.grey[600],
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: filtered.isEmpty
                        ? Center(
                            child: SingleChildScrollView(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    LucideIcons.mapPinOff,
                                    size: 56,
                                    color: Theme.of(context).colorScheme.primary.withOpacity(0.4),
                                  ),
                                  const SizedBox(height: 16),
                                  Text(
                                    'Location Not Found',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: Theme.of(context).colorScheme.onSurface,
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 32),
                                    child: Text(
                                      'We couldn\'t find any listings for "${_searchController.text}". Try searching for popular cities like London, Paris, or Tokyo!',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          )
                        : ListView.separated(
                            controller: scrollController,
                            itemCount: filtered.length,
                            separatorBuilder: (context, index) => const Divider(height: 1),
                            itemBuilder: (context, index) {
                              final loc = filtered[index];
                              return ListTile(
                                contentPadding: EdgeInsets.zero,
                                leading: Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    LucideIcons.mapPin,
                                    size: 18,
                                    color: Theme.of(context).colorScheme.primary,
                                  ),
                                ),
                                title: Text(
                                  loc,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    fontSize: 15,
                                    color: Theme.of(context).colorScheme.onSurface,
                                  ),
                                ),
                                subtitle: Text(
                                  'Top destination',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                                  ),
                                ),
                                onTap: () {
                                  setState(() {
                                    _location = loc;
                                  });
                                  Navigator.pop(context);
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
    DateTime tempStart = _dateRange?.start ?? DateTime.now();
    DateTime tempEnd = _dateRange?.end ?? DateTime.now().add(const Duration(days: 3));
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    bool selectingStart = true;
    
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: const EdgeInsets.only(top: 16, left: 24, right: 24, bottom: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white24 : Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Select Stay Dates',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setModalState(() => selectingStart = true),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: selectingStart 
                            ? Theme.of(context).colorScheme.primary.withOpacity(0.1) 
                            : Theme.of(context).colorScheme.primary.withOpacity(0.02),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: selectingStart 
                              ? Theme.of(context).colorScheme.primary 
                              : Theme.of(context).colorScheme.primary.withOpacity(0.1),
                            width: selectingStart ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              selectingStart ? 'CHECK-IN (SELECTING)' : 'CHECK-IN',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('EEE, MMM dd').format(tempStart),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Icon(
                    LucideIcons.arrowRight,
                    color: Theme.of(context).colorScheme.primary.withOpacity(0.5),
                    size: 16,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setModalState(() => selectingStart = false),
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: !selectingStart 
                            ? Theme.of(context).colorScheme.primary.withOpacity(0.1) 
                            : Theme.of(context).colorScheme.primary.withOpacity(0.02),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: !selectingStart 
                              ? Theme.of(context).colorScheme.primary 
                              : Theme.of(context).colorScheme.primary.withOpacity(0.1),
                            width: !selectingStart ? 2 : 1,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              !selectingStart ? 'CHECK-OUT (SELECTING)' : 'CHECK-OUT',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              DateFormat('EEE, MMM dd').format(tempEnd),
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Theme(
                data: Theme.of(context).copyWith(
                  colorScheme: Theme.of(context).colorScheme.copyWith(
                    primary: Theme.of(context).colorScheme.primary,
                    onPrimary: Theme.of(context).colorScheme.onPrimary,
                    surface: isDark ? const Color(0xFF253040) : Colors.white,
                    onSurface: Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                child: CalendarDatePicker(
                  key: ValueKey('calendar_${selectingStart}_${tempStart}_${tempEnd}'),
                  initialDate: selectingStart ? tempStart : tempEnd,
                  firstDate: selectingStart 
                    ? DateTime.now().subtract(const Duration(days: 30)) 
                    : tempStart.add(const Duration(days: 1)),
                  lastDate: DateTime.now().add(const Duration(days: 365)),
                  onDateChanged: (date) {
                    setModalState(() {
                      if (selectingStart) {
                        tempStart = date;
                        if (tempEnd.isBefore(tempStart) || tempEnd.isAtSameMomentAs(tempStart)) {
                          tempEnd = tempStart.add(const Duration(days: 2));
                        }
                        selectingStart = false;
                      } else {
                        if (date.isAfter(tempStart)) {
                          tempEnd = date;
                        }
                      }
                    });
                  },
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      _dateRange = DateTimeRange(start: tempStart, end: tempEnd);
                    });
                    Navigator.pop(context);
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Theme.of(context).colorScheme.onPrimary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: const Text(
                    'Confirm Stay Dates',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showGuestPicker(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'How many guests?', 
                style: TextStyle(
                  fontSize: 22, 
                  fontWeight: FontWeight.bold, 
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Guests', 
                        style: TextStyle(
                          fontSize: 16, 
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      Text(
                        'Number of people in stay', 
                        style: TextStyle(
                          fontSize: 12, 
                          color: isDark ? Colors.grey[400] : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: Icon(LucideIcons.minusCircle, color: Theme.of(context).colorScheme.primary),
                        onPressed: _guests > 1 ? () {
                          setModalState(() => _guests--);
                          setState(() {});
                        } : null,
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '$_guests', 
                        style: TextStyle(
                          fontSize: 18, 
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(width: 12),
                      IconButton(
                        icon: Icon(LucideIcons.plusCircle, color: Theme.of(context).colorScheme.primary),
                        onPressed: _guests < 10 ? () {
                          setModalState(() => _guests++);
                          setState(() {});
                        } : null,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    foregroundColor: Theme.of(context).colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Confirm', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
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
                'Top Deals',
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
              if (provider.isLoading && provider.allHotels.isEmpty) {
                return const Center(child: CircularProgressIndicator());
              }
              final hotels = provider.allHotels.take(3).toList();
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
                          const SizedBox(width: 12),
                          Consumer<FavoritesProvider>(
                            builder: (context, provider, child) {
                              final isFav = provider.isFavorite(hotel);
                              return InkWell(
                                onTap: () => provider.toggleFavorite(hotel),
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
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(LucideIcons.mapPin, size: 12, color: Colors.grey[400]),
                      const SizedBox(width: 4),
                      Text(hotel.location, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                  ),
                  const SizedBox(height: 16),
                  RichText(
                    text: TextSpan(
                      children: [
                        TextSpan(text: '\$${hotel.pricePerNight}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                        TextSpan(text: ' / night', style: TextStyle(fontSize: 11, color: Colors.grey[500])),
                      ],
                    ),
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
