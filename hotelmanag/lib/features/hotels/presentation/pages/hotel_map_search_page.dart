import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../core/providers/currency_provider.dart';
import '../../../../shared/domain/entities/hotel_entity.dart';
import 'package:cached_network_image/cached_network_image.dart';

class HotelMapSearchPage extends StatefulWidget {
  const HotelMapSearchPage({super.key});

  @override
  State<HotelMapSearchPage> createState() => _HotelMapSearchPageState();
}

class _HotelMapSearchPageState extends State<HotelMapSearchPage> {
  final MapController _mapController = MapController();
  final PageController _pageController = PageController(viewportFraction: 0.82);
  List<HotelEntity> _mapHotels = [];
  int _selectedHotelIndex = 0;
  LatLng _center = const LatLng(48.8566, 2.3522); // Default to Paris

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final hotels = Provider.of<HotelProvider>(context, listen: false).hotels;
      // Filter hotels with valid coordinates
      final validHotels = hotels
          .where(
            (h) =>
                h.coords.length == 2 &&
                (h.coords[0] != 0.0 || h.coords[1] != 0.0),
          )
          .toList();

      if (validHotels.isNotEmpty) {
        setState(() {
          _mapHotels = validHotels;
          _center = LatLng(
            validHotels.first.coords[0],
            validHotels.first.coords[1],
          );
        });
        _mapController.move(_center, 13.0);
      }
    });
  }

  @override
  void dispose() {
    _mapController.dispose();
    _pageController.dispose();
    super.dispose();
  }

  void _onHotelSelected(int index) {
    if (index < 0 || index >= _mapHotels.length) return;
    setState(() {
      _selectedHotelIndex = index;
    });

    final hotel = _mapHotels[index];
    final targetLatLng = LatLng(hotel.coords[0], hotel.coords[1]);

    // Animate map camera to focus on coordinates
    _mapController.move(targetLatLng, 13.5);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyProvider = Provider.of<CurrencyProvider>(context);

    return Scaffold(
      body: Stack(
        children: [
          // Flutter Map Layer
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: 12.0,
              minZoom: 2.0,
              maxZoom: 18.0,
              onTap: (_, __) {
                // Do nothing
              },
            ),
            children: [
              // High fidelity, free vector/raster map tiles via OpenStreetMap
              TileLayer(
                urlTemplate: isDark
                    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
                userAgentPackageName: 'com.example.hotelmanag',
              ),
              // Marker Layer
              MarkerLayer(
                markers: List.generate(_mapHotels.length, (index) {
                  final hotel = _mapHotels[index];
                  final isSelected = index == _selectedHotelIndex;
                  final latLng = LatLng(hotel.coords[0], hotel.coords[1]);

                  return Marker(
                    point: latLng,
                    width: 90.0,
                    height: 45.0,
                    child: GestureDetector(
                      onTap: () {
                        _onHotelSelected(index);
                        _pageController.animateToPage(
                          index,
                          duration: const Duration(milliseconds: 350),
                          curve: Curves.easeInOut,
                        );
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppTheme.primaryColor
                              : (isDark
                                    ? const Color(0xFF253040)
                                    : Colors.white),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                            color: isSelected
                                ? Colors.white
                                : AppTheme.primaryColor.withOpacity(0.5),
                            width: isSelected ? 2.0 : 1.0,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(
                                isSelected ? 0.25 : 0.1,
                              ),
                              blurRadius: isSelected ? 8 : 4,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          currencyProvider.format(hotel.pricePerNight),
                          style: TextStyle(
                            color: isSelected
                                ? Colors.white
                                : (isDark
                                      ? Colors.white
                                      : AppTheme.primaryColor),
                            fontSize: 12.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          ),

          // Header Overlay with Back Button & Title
          Positioned(
            top: MediaQuery.of(context).padding.top + 12,
            left: 16,
            right: 16,
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: isDark
                      ? const Color(0xFF19222E)
                      : Colors.white,
                  child: IconButton(
                    icon: Icon(
                      LucideIcons.arrowLeft,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    onPressed: () => context.pop(),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF19222E) : Colors.white,
                      borderRadius: BorderRadius.circular(25),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.08),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    alignment: Alignment.centerLeft,
                    child: Row(
                      children: [
                        Icon(
                          LucideIcons.mapPin,
                          size: 16,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _mapHotels.isNotEmpty
                              ? 'Interactive Stays: ${_mapHotels.length} Found'
                              : 'Searching map...',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Horizontal Hotel Carousel Overlay at Bottom
          if (_mapHotels.isNotEmpty)
            Positioned(
              bottom: 24,
              left: 0,
              right: 0,
              child: SizedBox(
                height: 145,
                child: PageView.builder(
                  controller: _pageController,
                  itemCount: _mapHotels.length,
                  onPageChanged: _onHotelSelected,
                  itemBuilder: (context, index) {
                    final hotel = _mapHotels[index];
                    return _buildHotelCarouselCard(hotel);
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHotelCarouselCard(HotelEntity hotel) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyProvider = Provider.of<CurrencyProvider>(context);

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19222E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.12),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () => context.push('/hotel/${hotel.id}'),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Row(
            children: [
              // Hotel Image
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: CachedNetworkImage(
                  imageUrl: hotel.imageUrl,
                  width: 110,
                  height: double.infinity,
                  fit: BoxFit.cover,
                  placeholder: (context, url) =>
                      Container(color: Colors.grey[200]),
                ),
              ),
              const SizedBox(width: 12),
              // Details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      hotel.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13.5,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Row(
                      children: [
                        const Icon(
                          LucideIcons.mapPin,
                          size: 10,
                          color: Colors.grey,
                        ),
                        const SizedBox(width: 2),
                        Expanded(
                          child: Text(
                            hotel.city,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: Colors.grey[500],
                              fontSize: 10,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(
                          LucideIcons.star,
                          size: 10,
                          color: Colors.amber,
                          fill: 1,
                        ),
                        const SizedBox(width: 2),
                        Text(
                          hotel.rating.toString(),
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 10.5,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${currencyProvider.format(hotel.pricePerNight)}/night',
                          style: const TextStyle(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                        const Icon(
                          LucideIcons.arrowRight,
                          size: 14,
                          color: AppTheme.primaryColor,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
