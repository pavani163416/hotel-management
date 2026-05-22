import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/providers/favorites_provider.dart';
import '../../../../shared/domain/entities/hotel_entity.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:go_router/go_router.dart';

class FavoritesPage extends StatelessWidget {
  const FavoritesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final favorites = context.watch<FavoritesProvider>().favorites;

    return MainLayout(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'My Favorites',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 8),
            Text(
              'Your curated list of masterpiece stays.',
              style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.6), fontSize: 16),
            ),
            const SizedBox(height: 32),
            if (favorites.isEmpty)
              _buildEmptyState(context)
            else
              Column(
                children: favorites.map((hotel) => Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: _buildFavoriteCard(context, hotel),
                )).toList(),
              ),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    return Center(
      child: Column(
        children: [
          const SizedBox(height: 60),
          Icon(LucideIcons.heart, size: 64, color: AppTheme.mutedColor),
          const SizedBox(height: 16),
          Text('No favorites yet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor.withOpacity(0.5))),
          const SizedBox(height: 8),
          Text('Start exploring and save your favorite hotels.', style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.4))),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () => context.go('/hotels'),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.primaryColor,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Explore Hotels'),
          ),
        ],
      ),
    );
  }

  Widget _buildFavoriteCard(BuildContext context, HotelEntity hotel) {
    return InkWell(
      onTap: () => context.push('/hotel/${hotel.id}'),
      child: Container(
        height: 120,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: AppTheme.mutedColor.withOpacity(0.5)),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4)),
          ],
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(20)),
              child: CachedNetworkImage(
                imageUrl: hotel.imageUrl,
                width: 120,
                height: 120,
                fit: BoxFit.cover,
                memCacheWidth: 240,
                memCacheHeight: 240,
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(hotel.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryColor)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(LucideIcons.mapPin, size: 12, color: Colors.grey[400]),
                        const SizedBox(width: 4),
                        Text(hotel.location, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                      ],
                    ),
                    const Spacer(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('\$${hotel.pricePerNight}/night', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                        Consumer<FavoritesProvider>(
                          builder: (context, provider, child) {
                            final isFav = provider.isFavorite(hotel);
                            return GestureDetector(
                              onTap: () {
                                provider.toggleFavorite(hotel);
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(isFav ? 'Removed from Favorites!' : 'Added to Favorites!'),
                                    behavior: SnackBarBehavior.floating,
                                    duration: const Duration(seconds: 1),
                                  ),
                                );
                              },
                              child: Icon(
                                LucideIcons.heart,
                                size: 18,
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
            ),
          ],
        ),
      ),
    );
  }
}
