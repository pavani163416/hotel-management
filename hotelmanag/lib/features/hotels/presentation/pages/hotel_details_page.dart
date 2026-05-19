import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
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

class RoomData {
  final String name;
  final String bedInfo;
  final int guests;
  final List<String> features;
  final double priceFactor;
  final String? warning;

  const RoomData({
    required this.name,
    required this.bedInfo,
    required this.guests,
    required this.features,
    required this.priceFactor,
    this.warning,
  });
}

class HotelDetailsPage extends StatefulWidget {
  final String id;
  const HotelDetailsPage({super.key, required this.id});

  @override
  State<HotelDetailsPage> createState() => _HotelDetailsPageState();
}

class _HotelDetailsPageState extends State<HotelDetailsPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _currentMobileImageIndex = 0;

  final _reviewNameController = TextEditingController();
  final _reviewCommentController = TextEditingController();
  int _reviewRating = 0;
  String? _reviewError;
  bool _isSubmittingReview = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
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
    
    if (list.length < 2) {
      final seed = hotel.name.hashCode;
      final pools = [
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=600&q=80',
      ];
      final interiors = [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80',
      ];
      
      if (list.isEmpty) {
        list.add(pools[seed % pools.length]);
      }
      if (list.length < 2) {
        list.add(interiors[(seed + 1) % interiors.length]);
      }
    }
    
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final isWide = MediaQuery.of(context).size.width > 900;
    
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

    return MainLayout(
      child: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildGallery(context, hotel, isWide),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context, hotel, isDark),
                  const SizedBox(height: 32),
                  _buildTabBar(hotel),
                  const SizedBox(height: 24),
                  _buildTabContent(hotel, isWide),
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
        return Hero(
          tag: 'hotel_image_${hotel.id}',
          child: SizedBox(
            height: 250,
            width: double.infinity,
            child: CachedNetworkImage(
              imageUrl: hotel.imageUrl,
              fit: BoxFit.cover,
              memCacheWidth: 800,
              memCacheHeight: 500,
              placeholder: (context, url) => Container(color: Colors.grey[200]),
            ),
          ),
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
                  placeholder: (context, url) => Container(color: Colors.grey[200]),
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
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                  placeholder: (context, url) => Container(color: Colors.grey[200]),
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
                      placeholder: (context, url) => Container(color: Colors.grey[200]),
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: CachedNetworkImage(
                      imageUrl: secondaryImgs[1],
                      fit: BoxFit.cover,
                      width: double.infinity,
                      memCacheWidth: 400,
                      memCacheHeight: 280,
                      placeholder: (context, url) => Container(color: Colors.grey[200]),
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

  Widget _buildHeader(BuildContext context, HotelEntity hotel, bool isDark) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                hotel.name,
                style: TextStyle(
                  fontSize: 28, 
                  fontWeight: FontWeight.bold, 
                  color: Theme.of(context).colorScheme.onSurface,
                  fontFamily: 'Serif',
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(LucideIcons.mapPin, size: 16, color: Colors.grey[400]),
                  const SizedBox(width: 6),
                  Text(
                    hotel.location, 
                    style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontSize: 14),
                  ),
                ],
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF253040) : const Color(0xFFE5E0D8).withOpacity(0.7), 
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            '${hotel.rating} (${hotel.reviews.length} reviews)', 
            style: TextStyle(
              fontWeight: FontWeight.bold, 
              color: Theme.of(context).colorScheme.primary,
              fontSize: 12,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTabBar(HotelEntity hotel) {
    return Container(
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: AppTheme.mutedColor))),
      child: TabBar(
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
    );
  }

  Widget _buildTabContent(HotelEntity hotel, bool isWide) {
    return SizedBox(
      height: isWide ? 600 : 780,
      child: TabBarView(
        controller: _tabController,
        children: [
          _buildRoomsTab(context, hotel, isWide),
          _buildAmenitiesTab(),
          _buildReviewsTab(hotel),
        ],
      ),
    );
  }

  Widget _buildRoomsTab(BuildContext context, HotelEntity hotel, bool isWide) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    
    final roomList = [
      RoomData(
        name: 'Deluxe King Room',
        bedInfo: '1 King Bed',
        guests: 2,
        features: const ['WiFi', 'Breakfast', 'AC'],
        priceFactor: 1.0,
      ),
      RoomData(
        name: 'Executive Suite',
        bedInfo: '1 King Bed + Sofa',
        guests: 3,
        features: const ['WiFi', 'Breakfast', 'Mini Bar'],
        priceFactor: 1.625,
        warning: 'Only 2 left',
      ),
      RoomData(
        name: 'Panoramic Penthouse',
        bedInfo: '2 King Beds',
        guests: 4,
        features: const ['Butler', 'Private Spa'],
        priceFactor: 3.02,
        warning: 'Only 1 left',
      ),
    ];

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
        const SizedBox(height: 16),
        if (isWide)
          Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF253040) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor),
            ),
            clipBehavior: Clip.antiAlias,
            child: Column(
              children: [
                // Table Header
                Container(
                  color: isDark ? const Color(0xFF19222E) : const Color(0xFF34495E),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  child: Row(
                    children: const [
                      Expanded(flex: 3, child: Text('ROOM TYPE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5))),
                      Expanded(flex: 3, child: Text('KEY FEATURES', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5))),
                      Expanded(flex: 2, child: Text('DAILY PRICE', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5), textAlign: TextAlign.right)),
                      SizedBox(width: 30),
                      Expanded(flex: 2, child: Text('ACTION', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12, letterSpacing: 0.5), textAlign: TextAlign.center)),
                    ],
                  ),
                ),
                // Table Rows
                ...roomList.map((room) {
                  final price = (hotel.pricePerNight * room.priceFactor).toInt();
                  return Container(
                    decoration: BoxDecoration(
                      border: Border(bottom: BorderSide(color: isDark ? Colors.white10 : AppTheme.mutedColor.withOpacity(0.5))),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                    child: Row(
                      children: [
                        // Room Type Info
                        Expanded(
                          flex: 3,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(room.name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Theme.of(context).colorScheme.onSurface)),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  Icon(LucideIcons.bedDouble, size: 14, color: Colors.grey[400]),
                                  const SizedBox(width: 4),
                                  Text(room.bedInfo, style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                                  const SizedBox(width: 12),
                                  Icon(LucideIcons.users, size: 14, color: Colors.grey[400]),
                                  const SizedBox(width: 4),
                                  Text('${room.guests}', style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                                ],
                              ),
                            ],
                          ),
                        ),
                        // Key Features Chips
                        Expanded(
                          flex: 3,
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: room.features.map((feat) => Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: isDark ? const Color(0xFF19222E) : const Color(0xFFE5E0D8).withOpacity(0.4),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(feat, style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[300] : Colors.grey[700], fontWeight: FontWeight.w500)),
                            )).toList(),
                          ),
                        ),
                        // Daily Price
                        Expanded(
                          flex: 2,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('\$$price', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                              Text('per night', style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                            ],
                          ),
                        ),
                        const SizedBox(width: 30),
                        // Action Button
                        Expanded(
                          flex: 2,
                          child: Column(
                            children: [
                              ElevatedButton(
                                onPressed: () {
                                  final bp = context.read<BookingProvider>();
                                  final ap = context.read<AuthProvider>();
                                  bp.startBooking(hotel, user: ap.user);
                                  bp.selectRoom(room.name, price.toDouble());
                                  context.push('/booking');
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isDark ? const Color(0xFF19222E) : const Color(0xFFE5E0D8),
                                  foregroundColor: Theme.of(context).colorScheme.primary,
                                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  elevation: 0,
                                ),
                                child: const Text('Select Room', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              ),
                              if (room.warning != null) ...[
                                const SizedBox(height: 4),
                                Text(room.warning!, style: const TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                              ]
                            ],
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
          Expanded(
            child: ListView(
              physics: const BouncingScrollPhysics(),
              children: roomList.map((room) {
                final price = (hotel.pricePerNight * room.priceFactor).toInt();
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF253040) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(room.name, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Theme.of(context).colorScheme.onSurface)),
                          if (room.warning != null)
                            Text(room.warning!, style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(LucideIcons.bedDouble, size: 14, color: Colors.grey[400]),
                          const SizedBox(width: 4),
                          Text(room.bedInfo, style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                          const SizedBox(width: 16),
                          Icon(LucideIcons.users, size: 14, color: Colors.grey[400]),
                          const SizedBox(width: 4),
                          Text('${room.guests} Guests', style: TextStyle(fontSize: 12, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: room.features.map((feat) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isDark ? const Color(0xFF19222E) : const Color(0xFFE5E0D8).withOpacity(0.4),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(feat, style: TextStyle(fontSize: 10, color: isDark ? Colors.grey[300] : Colors.grey[700], fontWeight: FontWeight.w500)),
                        )).toList(),
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
                              Text('\$$price', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                              Text('per night', style: TextStyle(fontSize: 11, color: isDark ? Colors.grey[400] : Colors.grey[600])),
                            ],
                          ),
                          ElevatedButton(
                            onPressed: () {
                              final bp = context.read<BookingProvider>();
                              final ap = context.read<AuthProvider>();
                              bp.startBooking(hotel, user: ap.user);
                              bp.selectRoom(room.name, price.toDouble());
                              context.push('/booking');
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isDark ? const Color(0xFF19222E) : const Color(0xFFE5E0D8),
                              foregroundColor: Theme.of(context).colorScheme.primary,
                              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              elevation: 0,
                            ),
                            child: const Text('Select Room', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
      ],
    );
  }

  Widget _buildAmenitiesTab() {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
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
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF253040) : Colors.white,
            border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor), 
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(LucideIcons.check, size: 16, color: AppTheme.accentColor),
              const SizedBox(width: 8),
              Text(
                amenities[index], 
                style: TextStyle(
                  fontSize: 13, 
                  fontWeight: FontWeight.w500,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
            ],
          ),
        );
      },
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
                  child: hotel.reviews.isEmpty
                      ? _buildEmptyReviewsPlaceholder(context)
                      : Column(
                          children: hotel.reviews
                              .map((r) => Padding(
                                    padding: const EdgeInsets.only(bottom: 16.0),
                                    child: ReviewCard(review: r),
                                  ))
                              .toList(),
                        ),
                ),
                const SizedBox(width: 24),
                SizedBox(
                  width: 360,
                  child: _buildWriteReviewCard(hotel),
                ),
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
                        .map((r) => Padding(
                              padding: const EdgeInsets.only(bottom: 16.0),
                              child: ReviewCard(review: r),
                            ))
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
            Icon(LucideIcons.messageSquare,
                size: 48,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.2)),
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
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor),
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
            style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Your name',
              hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isDark ? Colors.white10 : AppTheme.mutedColor),
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
                    LucideIcons.star,
                    color: isFilled ? AppTheme.accentColor : Colors.grey[400],
                    size: 24,
                    fill: isFilled ? 1.0 : 0.0,
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reviewCommentController,
            maxLines: 4,
            style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Share your experience...',
              hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4)),
              contentPadding: const EdgeInsets.all(16),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(color: isDark ? Colors.white10 : AppTheme.mutedColor),
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
              onPressed: _isSubmittingReview ? null : () => _submitReview(hotel.id),
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
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
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
          _reviewError = context.read<HotelProvider>().error ?? 'Failed to submit review.';
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
        border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor), 
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
