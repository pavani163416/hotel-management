import 'package:flutter/material.dart';
import '../../../../core/providers/currency_provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../shared/domain/entities/hotel_entity.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/favorites_provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

class _RoomRow {
  final RoomEntity room;
  final int price;
  final bool isSoldOut;
  final int availableCount;

  const _RoomRow({
    required this.room,
    required this.price,
    required this.isSoldOut,
    required this.availableCount,
  });
}

class HotelDetailsPage extends StatefulWidget {
  final String id;
  const HotelDetailsPage({super.key, required this.id});

  @override
  State<HotelDetailsPage> createState() => _HotelDetailsPageState();
}

class _HotelDetailsPageState extends State<HotelDetailsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentMobileImageIndex = 0;

  // Room filter state
  int _capacityFilter = 1;
  String _bedFilter = 'any';
  String _roomSort = 'default';
  bool _breakfastFilter = false;
  bool _cancellationFilter = false;

  final _reviewNameController = TextEditingController();
  final _reviewCommentController = TextEditingController();
  int _reviewRating = 0;
  String? _reviewError;
  bool _isSubmittingReview = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _reviewNameController.dispose();
    _reviewCommentController.dispose();
    super.dispose();
  }

  List<String> _getSecondaryImages(HotelEntity hotel) {
    final List<String> list = [];
    if (hotel.gallery.isNotEmpty) {
      list.addAll(hotel.gallery);
    }

    // Fill remaining with main image to avoid hardcoded fallbacks
    while (list.length < 2) {
      list.add(hotel.imageUrl);
    }

    return list;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final isWide = MediaQuery.of(context).size.width > 900;

    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;
    if (user != null) {
      if (_reviewNameController.text.isEmpty) {
        _reviewNameController.text = user.name;
      }
    } else {
      if (_reviewNameController.text.isNotEmpty) {
        _reviewNameController.clear();
      }
    }

    final hotel = context.select<HotelProvider, HotelEntity>(
      (p) => p.allHotels.cast<HotelEntity>().firstWhere(
        (h) => h.id == widget.id,
        orElse: () => const HotelEntity(
          id: '',
          name: 'Loading...',
          location: '',
          rating: 0,
          pricePerNight: 0,
          imageUrl: '',
          description: '',
        ),
      ),
    );

    if (hotel.id.isEmpty) {
      return MainLayout(
        child: Shimmer.fromColors(
          baseColor: Colors.grey[300]!,
          highlightColor: Colors.grey[100]!,
          child: Column(
            children: [
              Container(height: 300, color: Colors.white),
              const SizedBox(height: 24),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(height: 30, width: 200, color: Colors.white),
                    const SizedBox(height: 12),
                    Container(height: 16, width: 150, color: Colors.white),
                  ],
                ),
              ),
            ],
          ),
        ),
      );
    }

    Future<void> joinWaitlist(HotelEntity h) async {
      final ap = context.read<AuthProvider>();
      if (!ap.isAuthenticated) {
        context.push('/login');
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Joining waitlist...')),
      );
      // final repo = sl<WaitlistRepository>();
      // final result = await repo.joinWaitlist({
      //   'hotelId': h.id,
      //   'checkIn': DateTime.now().add(const Duration(days: 1)).toIso8601String(),
      //   'checkOut': DateTime.now().add(const Duration(days: 2)).toIso8601String(),
      // });
      await Future.delayed(const Duration(seconds: 1));
      if (!mounted) return;
      ScaffoldMessenger.of(context).hideCurrentSnackBar();
      
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Successfully joined waitlist!'), backgroundColor: Colors.green),
      );
      
      // result.fold(
      //   (failure) {
      //     ScaffoldMessenger.of(context).showSnackBar(
      //       SnackBar(content: Text(failure.message), backgroundColor: Colors.red),
      //     );
      //   },
      //   (success) {
      //     ScaffoldMessenger.of(context).showSnackBar(
      //       const SnackBar(content: Text('Successfully joined waitlist!'), backgroundColor: Colors.green),
      //     );
      //   }
      // );
    }

    return MainLayout(
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGallery(context, hotel, isWide),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 12.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context, hotel, isDark),
                  const SizedBox(height: 32),
                  _buildTabBar(hotel),
                  const SizedBox(height: 24),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    child: _buildTabContent(hotel, isWide),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 120),
          ],
        ),
      ),
    );
  }

  Widget _buildGallery(BuildContext context, HotelEntity hotel, bool isWide) {
    final allImages = [hotel.imageUrl, ...hotel.gallery];

    if (!isWide) {
      if (allImages.length <= 1) {
        return Stack(
          children: [
            Hero(
              tag: 'hotel_image_${hotel.id}',
              child: SizedBox(
                height: 250,
                width: double.infinity,
                child: CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  fit: BoxFit.cover,
                  memCacheWidth: 800,
                  memCacheHeight: 500,
                  placeholder: (context, url) =>
                      Container(color: Colors.grey[200]),
                ),
              ),
            ),
            Positioned(
              bottom: 16,
              left: 16,
              child: GestureDetector(
                onTap: () => _launchGoogleMaps(context, hotel),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    children: [
                      Icon(LucideIcons.map, size: 14, color: Colors.black87),
                      SizedBox(width: 6),
                      Text(
                        'Google Maps',
                        style: TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
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

      return SizedBox(
        height: 280,
        width: double.infinity,
        child: Stack(
          children: [
            PageView.builder(
              itemCount: allImages.length,
              onPageChanged: (index) {
                setState(() {
                  _currentMobileImageIndex = index;
                });
              },
              itemBuilder: (context, index) {
                final isFirst = index == 0;
                final childImage = CachedNetworkImage(
                  imageUrl: allImages[index],
                  fit: BoxFit.cover,
                  memCacheWidth: 800,
                  memCacheHeight: 560,
                  placeholder: (context, url) =>
                      Container(color: Colors.grey[200]),
                );

                if (isFirst) {
                  return Hero(
                    tag: 'hotel_image_${hotel.id}',
                    child: childImage,
                  );
                }
                return childImage;
              },
            ),
            // Page Number Indicator
            Positioned(
              bottom: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.6),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${_currentMobileImageIndex + 1} / ${allImages.length}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
            // Map Indicator Overlay
            Positioned(
              bottom: 16,
              left: 16,
              child: GestureDetector(
                onTap: () => _launchGoogleMaps(context, hotel),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(
                        color: Colors.black26,
                        blurRadius: 4,
                        offset: Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Row(
                    children: [
                      Icon(LucideIcons.map, size: 14, color: Colors.black87),
                      SizedBox(width: 6),
                      Text(
                        'Google Maps',
                        style: TextStyle(
                          color: Colors.black87,
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            // Dots Indicator
            Positioned(
              bottom: 16,
              left: 0,
              right: 0,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(
                  allImages.length,
                  (index) => Container(
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentMobileImageIndex == index ? 12 : 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: _currentMobileImageIndex == index
                          ? Colors.white
                          : Colors.white.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    final secondaryImgs = _getSecondaryImages(hotel);
    return Container(
      height: 380,
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Hero(
                tag: 'hotel_image_${hotel.id}',
                child: CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  fit: BoxFit.cover,
                  width: double.infinity,
                  height: double.infinity,
                  memCacheWidth: 800,
                  memCacheHeight: 500,
                  placeholder: (context, url) =>
                      Container(color: Colors.grey[200]),
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 1,
            child: Column(
              children: [
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: CachedNetworkImage(
                      imageUrl: secondaryImgs[0],
                      fit: BoxFit.cover,
                      width: double.infinity,
                      memCacheWidth: 400,
                      memCacheHeight: 280,
                      placeholder: (context, url) =>
                          Container(color: Colors.grey[200]),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: Stack(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: CachedNetworkImage(
                          imageUrl: secondaryImgs[1],
                          fit: BoxFit.cover,
                          width: double.infinity,
                          memCacheWidth: 400,
                          memCacheHeight: 280,
                          placeholder: (context, url) =>
                              Container(color: Colors.grey[200]),
                        ),
                      ),
                      Positioned.fill(
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _launchGoogleMaps(context, hotel),
                            child: Container(
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.3),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: const Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    LucideIcons.mapPin,
                                    color: Colors.white,
                                    size: 28,
                                  ),
                                  SizedBox(height: 8),
                                  Text(
                                    'Open in Google Maps',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(BuildContext context, HotelEntity hotel, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                hotel.name,
                style: TextStyle(
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                  fontFamily: 'Serif',
                  height: 1.2,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Consumer<FavoritesProvider>(
              builder: (context, provider, child) {
                final isFav = provider.isFavorite(hotel);
                return InkWell(
                  onTap: () => provider.toggleFavorite(hotel),
                  borderRadius: BorderRadius.circular(50),
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isFav
                          ? Colors.red.withOpacity(0.1)
                          : AppTheme.primaryColor.withOpacity(0.05),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isFav ? Icons.favorite : Icons.favorite_border,
                      size: 18,
                      color: isFav ? Colors.pinkAccent : AppTheme.primaryColor,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Icon(
              LucideIcons.mapPin,
              size: 16,
              color: AppTheme.accentColor,
            ),
            const SizedBox(width: 6),
            Expanded(
              child: Text(
                hotel.location,
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                  fontSize: 14,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 16),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF253040)
                    : const Color(0xFFE5E0D8).withOpacity(0.7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    LucideIcons.star,
                    size: 12,
                    color: Colors.amber[700],
                    fill: 1.0,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${hotel.rating} (${hotel.reviews.length} reviews)',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTabBar(HotelEntity hotel) {
    return Container(
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppTheme.mutedColor)),
      ),
      child: Scrollbar(
        thumbVisibility: true,
        trackVisibility: true,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: TabBar(
            isScrollable: true,
            controller: _tabController,
            labelColor: AppTheme.primaryColor,
            unselectedLabelColor: AppTheme.primaryColor.withOpacity(0.5),
            indicatorColor: AppTheme.accentColor,
            indicatorWeight: 3,
            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            tabs: [
              const Tab(text: 'Rooms'),
              const Tab(text: 'Amenities'),
              Tab(text: 'Reviews (${hotel.reviews.length})'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTabContent(HotelEntity hotel, bool isWide) {
    switch (_tabController.index) {
      case 0:
        return _buildRoomsTab(context, hotel, isWide);
      case 1:
        return _buildAmenitiesTab(hotel);
      case 2:
        return _buildReviewsTab(hotel);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildRoomsTab(BuildContext context, HotelEntity hotel, bool isWide) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;

    // No rooms from backend → clear message, no fake data
    if (hotel.rooms.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Select Your Room',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
              fontFamily: 'Serif',
            ),
          ),
          const SizedBox(height: 24),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF253040) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : AppTheme.mutedColor,
              ),
            ),
            child: Column(
              children: [
                Icon(
                  LucideIcons.bedDouble,
                  size: 48,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withOpacity(0.2),
                ),
                const SizedBox(height: 16),
                Text(
                  'No Rooms Available',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'This hotel has no rooms listed at the moment.\nPlease check back later or choose another property.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: Theme.of(
                      context,
                    ).colorScheme.onSurface.withOpacity(0.4),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    var roomList = hotel.rooms.map((room) {
      double priceFactor = hotel.pricePerNight > 0
          ? room.price / hotel.pricePerNight
          : 1.0;
      return _RoomRow(
        room: room,
        price: (hotel.pricePerNight * priceFactor).toInt(),
        isSoldOut: room.available == 0,
        availableCount: room.available,
      );
    }).where((row) {
      if (row.room.capacity < _capacityFilter) return false;
      if (_bedFilter != 'any' && !row.room.bed.toLowerCase().contains(_bedFilter)) return false;
      if (_breakfastFilter && !row.room.features.any((f) => f.toLowerCase().contains('breakfast'))) return false;
      if (_cancellationFilter && !row.room.features.any((f) => f.toLowerCase().contains('cancel'))) return false;
      return true;
    }).toList();

    if (_roomSort == 'price-asc') {
      roomList.sort((a, b) => a.price.compareTo(b.price));
    } else if (_roomSort == 'price-desc') {
      roomList.sort((a, b) => b.price.compareTo(a.price));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Room Filters — matching website design
        _buildRoomFilters(isDark),
        const SizedBox(height: 16),
        Text(
          'Select Your Room',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Theme.of(context).colorScheme.onSurface,
            fontFamily: 'Serif',
          ),
        ),
        const SizedBox(height: 16),
        if (isWide)
          Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF253040) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : AppTheme.mutedColor,
              ),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                // Table Header
                Container(
                  color: isDark
                      ? const Color(0xFF19222E)
                      : const Color(0xFF34495E),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 14,
                  ),
                  child: Row(
                    children: const [
                      Expanded(
                        flex: 3,
                        child: Text(
                          'ROOM TYPE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 3,
                        child: Text(
                          'KEY FEATURES',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'DAILY PRICE',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          ),
                          textAlign: TextAlign.right,
                        ),
                      ),
                      SizedBox(width: 30),
                      Expanded(
                        flex: 2,
                        child: Text(
                          'ACTION',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            letterSpacing: 0.5,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ],
                  ),
                ),
                // Table Rows
                ...roomList.map((row) {
                  // Availability badge widget
                  Widget badge;
                  if (row.isSoldOut) {
                    badge = Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: Colors.red.withOpacity(0.3)),
                      ),
                      child: const Text(
                        'Sold Out',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.redAccent,
                        ),
                      ),
                    );
                  } else if (row.availableCount == 1) {
                    badge = Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: Colors.orange.withOpacity(0.3),
                        ),
                      ),
                      child: const Text(
                        'Only 1 Room Left',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange,
                        ),
                      ),
                    );
                  } else if (row.availableCount == 2) {
                    badge = Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: Colors.orange.withOpacity(0.3),
                        ),
                      ),
                      child: const Text(
                        'Only 2 Rooms Left',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange,
                        ),
                      ),
                    );
                  } else {
                    badge = const SizedBox.shrink();
                  }

                  return Container(
                    decoration: BoxDecoration(
                      color: row.isSoldOut
                          ? (isDark
                                ? const Color(0xFF1E2A38)
                                : const Color(0xFFF9F9F9))
                          : null,
                      border: Border(
                        bottom: BorderSide(
                          color: isDark
                              ? Colors.white10
                              : AppTheme.mutedColor.withOpacity(0.5),
                        ),
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 20,
                    ),
                    child: Row(
                      children: [
                        // Room Type Info
                        Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                row.room.name,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: row.isSoldOut
                                      ? Theme.of(
                                          context,
                                        ).colorScheme.onSurface.withOpacity(0.4)
                                      : Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Icon(
                                    LucideIcons.bedDouble,
                                    size: 14,
                                    color: Colors.grey[400],
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    row.room.bed.isNotEmpty
                                        ? row.room.bed
                                        : '1 King Bed',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? Colors.grey[400]
                                          : Colors.grey[600],
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Icon(
                                    LucideIcons.users,
                                    size: 14,
                                    color: Colors.grey[400],
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    '${row.room.capacity}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: isDark
                                          ? Colors.grey[400]
                                          : Colors.grey[600],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              badge,
                            ],
                          ),
                        ),
                        // Key Features Chips
                        Expanded(
                          flex: 3,
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: row.room.features
                                .map(
                                  (feat) => Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isDark
                                          ? const Color(0xFF19222E)
                                          : const Color(
                                              0xFFE5E0D8,
                                            ).withOpacity(0.4),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      feat,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark
                                            ? Colors.grey[300]
                                            : Colors.grey[700],
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                        // Daily Price
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                context.watch<CurrencyProvider>().format(
                                  row.price,
                                ),
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: row.isSoldOut
                                      ? Theme.of(context).colorScheme.onSurface
                                            .withOpacity(0.35)
                                      : Theme.of(context).colorScheme.onSurface,
                                ),
                              ),
                              Text(
                                'per night',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark
                                      ? Colors.grey[400]
                                      : Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 30),
                        // Action Button
                        Expanded(
                          flex: 2,
                          child: row.isSoldOut
                              ? ElevatedButton(
                                  onPressed: null,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.grey.withOpacity(0.15),
                                    foregroundColor: Colors.grey,
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: const Text('Sold Out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                )
                              : ElevatedButton(
                                  onPressed: () {
                                    final bp = context.read<BookingProvider>();
                                    final ap = context.read<AuthProvider>();
                                    bp.startBooking(hotel, user: ap.user);
                                    bp.selectRoom(
                                      row.room.name,
                                      row.price.toDouble(),
                                    );
                                    context.push('/booking');
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: isDark
                                        ? const Color(0xFF19222E)
                                        : const Color(0xFFE5E0D8),
                                    foregroundColor: Theme.of(
                                      context,
                                    ).colorScheme.primary,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 14,
                                      vertical: 10,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    elevation: 0,
                                  ),
                                  child: const Text(
                                    'Select Room',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ],
            ),
          )
        else
          // Mobile responsive list
          Column(
            children: roomList.map((row) {
              Widget badge;
              if (row.isSoldOut) {
                badge = Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: const Text(
                    'Sold Out',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.redAccent,
                    ),
                  ),
                );
              } else if (row.availableCount == 1) {
                badge = Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.orange.withOpacity(0.3)),
                  ),
                  child: const Text(
                    'Only 1 Room Left',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange,
                    ),
                  ),
                );
              } else if (row.availableCount == 2) {
                badge = Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: Colors.orange.withOpacity(0.3)),
                  ),
                  child: const Text(
                    'Only 2 Rooms Left',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange,
                    ),
                  ),
                );
              } else {
                badge = const SizedBox.shrink();
              }

              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: row.isSoldOut
                      ? (isDark
                            ? const Color(0xFF1E2A38)
                            : const Color(0xFFF5F5F5))
                      : (isDark ? const Color(0xFF253040) : Colors.white),
                  borderRadius: BorderRadius.circular(16),
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
                        Expanded(
                          child: Text(
                            row.room.name,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                              color: row.isSoldOut
                                  ? Theme.of(
                                      context,
                                    ).colorScheme.onSurface.withOpacity(0.4)
                                  : Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                        ),
                        badge,
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          LucideIcons.bedDouble,
                          size: 14,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          row.room.bed.isNotEmpty ? row.room.bed : '1 King Bed',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Icon(
                          LucideIcons.users,
                          size: 14,
                          color: Colors.grey[400],
                        ),
                        const SizedBox(width: 4),
                        Text(
                          '${row.room.capacity} Guests',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? Colors.grey[400] : Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: row.room.features
                          .map(
                            (feat) => Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: isDark
                                    ? const Color(0xFF19222E)
                                    : const Color(0xFFE5E0D8).withOpacity(0.4),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                feat,
                                style: TextStyle(
                                  fontSize: 10,
                                  color: isDark
                                      ? Colors.grey[300]
                                      : Colors.grey[700],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    const SizedBox(height: 16),
                    const Divider(height: 1),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              context.watch<CurrencyProvider>().format(
                                row.price,
                              ),
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: row.isSoldOut
                                    ? Theme.of(
                                        context,
                                      ).colorScheme.onSurface.withOpacity(0.35)
                                    : Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                            Text(
                              'per night',
                              style: TextStyle(
                                fontSize: 11,
                                color: isDark
                                    ? Colors.grey[400]
                                    : Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                        row.isSoldOut
                            ? ElevatedButton(
                                onPressed: null,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: Colors.grey.withOpacity(0.15),
                                  foregroundColor: Colors.grey,
                                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: const Text('Sold Out', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              )
                            : ElevatedButton(
                                onPressed: () {
                                  final bp = context.read<BookingProvider>();
                                  final ap = context.read<AuthProvider>();
                                  bp.startBooking(hotel, user: ap.user);
                                  bp.selectRoom(
                                    row.room.name,
                                    row.price.toDouble(),
                                  );
                                  context.push('/booking');
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isDark
                                      ? const Color(0xFF19222E)
                                      : const Color(0xFFE5E0D8),
                                  foregroundColor: Theme.of(
                                    context,
                                  ).colorScheme.primary,
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                    vertical: 12,
                                  ),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  elevation: 0,
                                ),
                                child: const Text(
                                  'Select Room',
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
              );
            }).toList(),
          ),
      ],
    );
  }

  Widget _buildRoomFilters(bool isDark) {
    final cardColor = isDark ? const Color(0xFF253040) : Colors.white;
    final borderColor = isDark ? Colors.white10 : AppTheme.mutedColor;

    Widget filterChip(String label, bool active, VoidCallback onTap) {
      return GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: active
                ? AppTheme.primaryColor.withOpacity(0.12)
                : (isDark ? const Color(0xFF19222E) : const Color(0xFFF7F7F7)),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: active ? AppTheme.primaryColor : borderColor,
            ),
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: active
                  ? AppTheme.primaryColor
                  : (isDark ? Colors.grey[400] : Colors.grey[600]),
            ),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Filter Rooms',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 10),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                // Capacity
                _buildFilterDropdown(
                  isDark: isDark,
                  icon: LucideIcons.users,
                  value: _capacityFilter == 1
                      ? 'Any Capacity'
                      : '$_capacityFilter+ Guests',
                  items: const ['Any Capacity', '2+ Guests', '3+ Guests', '4+ Guests'],
                  onSelected: (val) => setState(() {
                    _capacityFilter = val == 'Any Capacity' ? 1 : int.parse(val[0]);
                  }),
                ),
                const SizedBox(width: 8),
                // Bed type
                _buildFilterDropdown(
                  isDark: isDark,
                  icon: LucideIcons.bedDouble,
                  value: _bedFilter == 'any'
                      ? 'Any Bed'
                      : '${_bedFilter[0].toUpperCase()}${_bedFilter.substring(1)} Bed',
                  items: const ['Any Bed', 'King Bed', 'Queen Bed', 'Twin Beds'],
                  onSelected: (val) => setState(() {
                    _bedFilter = val == 'Any Bed'
                        ? 'any'
                        : val.split(' ')[0].toLowerCase();
                  }),
                ),
                const SizedBox(width: 8),
                // Sort
                _buildFilterDropdown(
                  isDark: isDark,
                  icon: LucideIcons.arrowUpDown,
                  value: _roomSort == 'default'
                      ? 'Default Order'
                      : (_roomSort == 'price-asc'
                          ? 'Price: Low → High'
                          : 'Price: High → Low'),
                  items: const ['Default Order', 'Price: Low → High', 'Price: High → Low'],
                  onSelected: (val) => setState(() {
                    if (val == 'Default Order') _roomSort = 'default';
                    else if (val == 'Price: Low → High') _roomSort = 'price-asc';
                    else _roomSort = 'price-desc';
                  }),
                ),
                const SizedBox(width: 12),
                filterChip('🍳 Breakfast', _breakfastFilter,
                    () => setState(() => _breakfastFilter = !_breakfastFilter)),
                const SizedBox(width: 8),
                filterChip('✓ Free Cancel', _cancellationFilter,
                    () => setState(() => _cancellationFilter = !_cancellationFilter)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterDropdown({
    required bool isDark,
    required IconData icon,
    required String value,
    required List<String> items,
    required ValueChanged<String> onSelected,
  }) {
    return PopupMenuButton<String>(
      onSelected: onSelected,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      itemBuilder: (_) => items
          .map((item) => PopupMenuItem(
                value: item,
                child: Text(item, style: const TextStyle(fontSize: 13)),
              ))
          .toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF19222E) : const Color(0xFFF7F7F7),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? Colors.white10 : AppTheme.mutedColor,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: isDark ? Colors.grey[400] : Colors.grey[600]),
            const SizedBox(width: 6),
            Text(
              value,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isDark ? Colors.grey[300] : Colors.grey[700],
              ),
            ),
            const SizedBox(width: 4),
            Icon(LucideIcons.chevronDown, size: 12,
                color: isDark ? Colors.grey[400] : Colors.grey[600]),
          ],
        ),
      ),
    );
  }

  Widget _buildAmenitiesTab(HotelEntity hotel) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final amenities = hotel.amenities.isNotEmpty
        ? hotel.amenities
        : [
            'Free WiFi',
            'Infinity Pool',
            'Spa & Wellness',
            'Ocean View',
            'Restaurant',
            'Airport Shuttle',
          ];
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: amenities.map((amenity) => Container(
          margin: const EdgeInsets.only(right: 12),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF253040) : Colors.white,
            border: Border.all(
              color: isDark ? Colors.white10 : AppTheme.mutedColor,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(LucideIcons.check, size: 16, color: AppTheme.accentColor),
              const SizedBox(width: 8),
              Text(
                amenity,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
        )).toList(),
      ),
    );
  }

  Future<void> _launchGoogleMaps(
    BuildContext context,
    HotelEntity hotel,
  ) async {
    final query = Uri.encodeComponent('${hotel.name} ${hotel.location}');
    final url = Uri.parse(
      'https://www.google.com/maps/search/?api=1&query=$query',
    );
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not open Google Maps.')),
        );
      }
    }
  }

  Widget _buildAISummaryCard(HotelEntity hotel) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final List<String> positives = [];
    final List<String> negatives = [];

    if (hotel.reviews.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppTheme.primaryColor.withOpacity(0.1)),
        ),
        child: Row(
          children: [
            const Icon(
              LucideIcons.sparkles,
              color: AppTheme.accentColor,
              size: 20,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'AI Summary: No guest reviews yet. Summaries will appear once reviews are submitted.',
                style: TextStyle(
                  fontSize: 12.5,
                  fontStyle: FontStyle.italic,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withOpacity(0.6),
                ),
              ),
            ),
          ],
        ),
      );
    }

    final commentsCombined = hotel.reviews
        .map((r) => r.comment.toLowerCase())
        .join(' ');

    if (commentsCombined.contains('staff') ||
        commentsCombined.contains('service') ||
        commentsCombined.contains('friendly') ||
        commentsCombined.contains('host')) {
      positives.add(
        '🤝 Warm, helpful, and highly professional service from staff.',
      );
    }
    if (commentsCombined.contains('location') ||
        commentsCombined.contains('near') ||
        commentsCombined.contains('close') ||
        commentsCombined.contains('walk')) {
      positives.add(
        '📍 Convenient location, easily walkable to top attractions.',
      );
    }
    if (commentsCombined.contains('clean') ||
        commentsCombined.contains('spotless') ||
        commentsCombined.contains('hygiene')) {
      positives.add('✨ Excellent room cleanliness and housekeeping services.');
    }
    if (commentsCombined.contains('breakfast') ||
        commentsCombined.contains('food') ||
        commentsCombined.contains('dinner') ||
        commentsCombined.contains('delicious')) {
      positives.add(
        '🍳 High-quality culinary experiences and breakfast selections.',
      );
    }
    if (commentsCombined.contains('pool') ||
        commentsCombined.contains('swim')) {
      positives.add(
        '🏊‍♂️ Beautiful, well-maintained swimming pool/spa facilities.',
      );
    }
    if (commentsCombined.contains('quiet') ||
        commentsCombined.contains('peaceful') ||
        commentsCombined.contains('silent')) {
      positives.add('🤫 Peaceful atmosphere and well-soundproofed rooms.');
    }
    if (commentsCombined.contains('view') ||
        commentsCombined.contains('scenery') ||
        commentsCombined.contains('beautiful view')) {
      positives.add('🌅 Breathtaking scenery and room views.');
    }

    if (positives.isEmpty) {
      positives.add(
        '🏨 Comfortable accommodations with good overall guest satisfaction.',
      );
    }

    if (commentsCombined.contains('noise') ||
        commentsCombined.contains('noisy') ||
        commentsCombined.contains('loud') ||
        commentsCombined.contains('street')) {
      negatives.add('🔊 Light sleepers may experience minor street noise.');
    }
    if (commentsCombined.contains('price') ||
        commentsCombined.contains('expensive') ||
        commentsCombined.contains('cost') ||
        commentsCombined.contains('dear')) {
      negatives.add('💰 Premium pricing on dining or on-site services.');
    }
    if (commentsCombined.contains('small') ||
        commentsCombined.contains('narrow') ||
        commentsCombined.contains('cramped')) {
      negatives.add('📐 Standard rooms are cozy and slightly compact.');
    }
    if (commentsCombined.contains('old') ||
        commentsCombined.contains('dated') ||
        commentsCombined.contains('decor')) {
      negatives.add(
        '🛋️ Some elements of decor have a classic, vintage style.',
      );
    }
    if (commentsCombined.contains('slow') ||
        commentsCombined.contains('wait') ||
        commentsCombined.contains('delay')) {
      negatives.add('⏳ Peak hours can result in check-in or service delays.');
    }

    if (negatives.isEmpty) {
      negatives.add('🔒 No notable drawbacks reported by verified guests.');
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.primaryColor.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(
                LucideIcons.sparkles,
                color: AppTheme.accentColor,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'AI Review Summary',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'BETA',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'Analyzing comments from ${hotel.reviews.length} verified stays to summarize key takeaways:',
            style: TextStyle(
              fontSize: 11.5,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 16),
          ...positives.map(
            (p) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.check_circle_outline,
                    color: Colors.green,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(p, style: const TextStyle(fontSize: 12.5)),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
          const SizedBox(height: 12),
          ...negatives.map(
            (n) => Padding(
              padding: const EdgeInsets.only(bottom: 8.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.info_outline,
                    color: Colors.orange,
                    size: 16,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(n, style: const TextStyle(fontSize: 12.5)),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReviewsTab(HotelEntity hotel) {
    final isWide = MediaQuery.of(context).size.width > 900;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 32),
      child: isWide
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (hotel.reviews.isEmpty)
                        _buildEmptyReviewsPlaceholder(context)
                      else
                        ...hotel.reviews
                            .map(
                              (r) => Padding(
                                padding: const EdgeInsets.only(bottom: 16.0),
                                child: ReviewCard(review: r),
                              ),
                            ),
                    ],
                  ),
                ),
                const SizedBox(width: 24),
                SizedBox(width: 360, child: _buildWriteReviewCard(hotel)),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildWriteReviewCard(hotel),
                const SizedBox(height: 32),
                Text(
                  'Guest Reviews (${hotel.reviews.length})',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.onSurface,
                    fontFamily: 'Serif',
                  ),
                ),
                const SizedBox(height: 16),
                if (hotel.reviews.isEmpty)
                  _buildEmptyReviewsPlaceholder(context)
                else
                  Column(
                    children: hotel.reviews
                        .map(
                          (r) => Padding(
                            padding: const EdgeInsets.only(bottom: 16.0),
                            child: ReviewCard(review: r),
                          ),
                        )
                        .toList(),
                  ),
              ],
            ),
    );
  }

  Widget _buildEmptyReviewsPlaceholder(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              LucideIcons.messageSquare,
              size: 48,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2),
            ),
            const SizedBox(height: 16),
            Text(
              'No reviews yet',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.5),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Be the first to share your experience!',
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWriteReviewCard(HotelEntity hotel) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    if (user == null) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF253040) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark ? Colors.white10 : AppTheme.mutedColor,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Write a Review',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface,
                fontFamily: 'Serif',
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'You must be signed in to submit a review for this property.',
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => context.push('/login'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF34495E),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: const Text(
                  'Sign In / Sign Up',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Write a Review',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
              fontFamily: 'Serif',
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reviewNameController,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
            decoration: InputDecoration(
              hintText: 'Your name',
              hintStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 12,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark ? Colors.white10 : AppTheme.mutedColor,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.accentColor),
              ),
              filled: true,
              fillColor: isDark ? const Color(0xFF1C2633) : Colors.grey[50],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: List.generate(5, (index) {
              final starIndex = index + 1;
              final isFilled = starIndex <= _reviewRating;
              return GestureDetector(
                onTap: () {
                  setState(() {
                    _reviewRating = starIndex;
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: Icon(
                    isFilled ? Icons.star : Icons.star_border,
                    color: isFilled ? Colors.amber[600] : Colors.grey[400],
                    size: 28,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reviewCommentController,
            maxLines: 4,
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurface,
              fontSize: 14,
            ),
            decoration: InputDecoration(
              hintText: 'Share your experience...',
              hintStyle: TextStyle(
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
              ),
              contentPadding: const EdgeInsets.all(16),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: isDark ? Colors.white10 : AppTheme.mutedColor,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: AppTheme.accentColor),
              ),
              filled: true,
              fillColor: isDark ? const Color(0xFF1C2633) : Colors.grey[50],
            ),
          ),
          if (_reviewError != null) ...[
            const SizedBox(height: 12),
            Text(
              _reviewError!,
              style: const TextStyle(color: Colors.redAccent, fontSize: 12),
            ),
          ],
          const SizedBox(height: 20),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isSubmittingReview
                  ? null
                  : () => _submitReview(hotel.id),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF34495E),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 0,
              ),
              child: _isSubmittingReview
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                      ),
                    )
                  : const Text(
                      'Submit Review',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submitReview(String hotelId) async {
    final name = _reviewNameController.text.trim();
    final comment = _reviewCommentController.text.trim();

    if (name.isEmpty) {
      setState(() {
        _reviewError = 'Please enter your name.';
      });
      return;
    }
    if (_reviewRating == 0) {
      setState(() {
        _reviewError = 'Please select a rating.';
      });
      return;
    }
    if (comment.isEmpty) {
      setState(() {
        _reviewError = 'Please share your experience.';
      });
      return;
    }

    setState(() {
      _reviewError = null;
      _isSubmittingReview = true;
    });

    final success = await context.read<HotelProvider>().submitReview(
      hotelId: hotelId,
      author: name,
      rating: _reviewRating,
      comment: comment,
    );

    if (mounted) {
      setState(() {
        _isSubmittingReview = false;
      });

      if (success) {
        _reviewNameController.clear();
        _reviewCommentController.clear();
        setState(() {
          _reviewRating = 0;
          _reviewError = null;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Review submitted successfully!'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        setState(() {
          _reviewError =
              context.read<HotelProvider>().error ?? 'Failed to submit review.';
        });
      }
    }
  }
}

class ReviewCard extends StatelessWidget {
  final ReviewEntity review;
  const ReviewCard({super.key, required this.review});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        border: Border.all(
          color: isDark ? Colors.white10 : AppTheme.mutedColor,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                review.author,
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              Row(
                children: List.generate(
                  5,
                  (index) => Icon(
                    LucideIcons.star,
                    color: AppTheme.accentColor,
                    size: 12,
                    fill: index < review.rating ? 1 : 0,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            review.comment,
            style: TextStyle(
              fontSize: 13,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.8),
              height: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            review.date,
            style: TextStyle(
              fontSize: 10,
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
            ),
          ),
        ],
      ),
    );
  }
}
