import 'package:flutter/material.dart';

// 1. Define the Hotel model
class Hotel {
  final String id;
  final String name;
  final String category;
  final double rating;
  final bool isTopDestination;

  Hotel({
    required this.id,
    required this.name,
    required this.category,
    required this.rating,
    required this.isTopDestination,
  });
}

// 2. Provide the filtering logic functions
List<Hotel> getTopDestinations(List<Hotel> hotels) {
  return hotels.where((hotel) => hotel.isTopDestination).toList();
}

List<Hotel> getHotelsByCategory(List<Hotel> hotels, String category) {
  return hotels.where((hotel) => hotel.category == category).toList();
}

// 3. Integrate into a Flutter widget layout
class HotelExplorePage extends StatefulWidget {
  final List<Hotel> allHotels;

  const HotelExplorePage({super.key, required this.allHotels});

  @override
  State<HotelExplorePage> createState() => _HotelExplorePageState();
}

class _HotelExplorePageState extends State<HotelExplorePage> {
  // Default selected category
  String _selectedCategory = 'Beach';

  // Available categories and their icons
  final List<Map<String, dynamic>> _categories = [
    {'name': 'Beach', 'icon': Icons.beach_access},
    {'name': 'City', 'icon': Icons.location_city},
    {'name': 'Desert', 'icon': Icons.wb_sunny},
    {'name': 'Mountain', 'icon': Icons.landscape},
  ];

  @override
  Widget build(BuildContext context) {
    // Process hotels using the required functions
    final topDestinations = getTopDestinations(widget.allHotels);
    final filteredHotels = getHotelsByCategory(
      widget.allHotels,
      _selectedCategory,
    );

    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        title: const Text('Explore Hotels'),
        elevation: 0,
        backgroundColor: Colors.white,
        foregroundColor: Colors.black,
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // --- TOP DESTINATION SECTION ---
            const Padding(
              padding: EdgeInsets.fromLTRB(16.0, 24.0, 16.0, 16.0),
              child: Text(
                'Top Destinations',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(
              height: 220,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: topDestinations.length,
                itemBuilder: (context, index) {
                  final hotel = topDestinations[index];
                  return _buildHotelCard(
                    hotel,
                    width: 180,
                    isHorizontalLayout: false,
                  );
                },
              ),
            ),

            // --- CATEGORY ICONS SECTION ---
            const Padding(
              padding: EdgeInsets.fromLTRB(16.0, 32.0, 16.0, 16.0),
              child: Text(
                'Categories',
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(
              height: 90,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: _categories.length,
                itemBuilder: (context, index) {
                  final cat = _categories[index];
                  final isSelected = _selectedCategory == cat['name'];

                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedCategory = cat['name'] as String;
                      });
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      width: 85,
                      margin: const EdgeInsets.only(right: 12.0),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.blueAccent : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? Colors.blueAccent
                              : Colors.grey.shade300,
                        ),
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: Colors.blue.withOpacity(0.3),
                                  blurRadius: 8,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : [],
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            cat['icon'] as IconData,
                            color: isSelected ? Colors.white : Colors.black87,
                            size: 28,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            cat['name'] as String,
                            style: TextStyle(
                              color: isSelected ? Colors.white : Colors.black87,
                              fontWeight: isSelected
                                  ? FontWeight.bold
                                  : FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // --- FILTERED HOTELS LIST ---
            Padding(
              padding: const EdgeInsets.fromLTRB(16.0, 32.0, 16.0, 16.0),
              child: Text(
                '$_selectedCategory Hotels',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            if (filteredHotels.isEmpty)
              const Padding(
                padding: EdgeInsets.all(32.0),
                child: Center(child: Text('No hotels found in this category.')),
              )
            else
              ListView.builder(
                // Use NeverScrollableScrollPhysics to scroll together with the main SingleChildScrollView
                physics: const NeverScrollableScrollPhysics(),
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                itemCount: filteredHotels.length,
                itemBuilder: (context, index) {
                  final hotel = filteredHotels[index];
                  return _buildHotelCard(
                    hotel,
                    height: 120,
                    isHorizontalLayout: true,
                  );
                },
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  // A reusable card widget for both the Top Destinations carousel and the vertical list
  Widget _buildHotelCard(
    Hotel hotel, {
    double? width,
    double? height,
    required bool isHorizontalLayout,
  }) {
    return Container(
      width: width,
      height: height,
      margin: EdgeInsets.only(
        right: isHorizontalLayout ? 0 : 16.0,
        bottom: isHorizontalLayout ? 16.0 : 0,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: isHorizontalLayout
          ? Row(
              children: [
                _buildImagePlaceholder(
                  borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(20),
                  ),
                  width: 120,
                ),
                Expanded(child: _buildHotelDetails(hotel, isHorizontalLayout)),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: _buildImagePlaceholder(
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(20),
                    ),
                  ),
                ),
                _buildHotelDetails(hotel, isHorizontalLayout),
              ],
            ),
    );
  }

  // Placeholder for where the hotel image would go
  Widget _buildImagePlaceholder({
    required BorderRadius borderRadius,
    double? width,
  }) {
    return Container(
      width: width,
      decoration: BoxDecoration(
        color: Colors.grey.shade200,
        borderRadius: borderRadius,
      ),
      child: Icon(Icons.image_outlined, size: 40, color: Colors.grey.shade400),
    );
  }

  // The text details of the hotel
  Widget _buildHotelDetails(Hotel hotel, bool isHorizontalLayout) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            hotel.name,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            hotel.category,
            style: TextStyle(color: Colors.grey[600], fontSize: 13),
          ),
          SizedBox(height: isHorizontalLayout ? 12 : 8),
          Row(
            children: [
              const Icon(Icons.star_rounded, color: Colors.amber, size: 18),
              const SizedBox(width: 4),
              Text(
                hotel.rating.toString(),
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
              if (hotel.isTopDestination && isHorizontalLayout) ...[
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.orange.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text(
                    'Top',
                    style: TextStyle(
                      color: Colors.orange,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}
