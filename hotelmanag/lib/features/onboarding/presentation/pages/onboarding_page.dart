import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/constants/app_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class OnboardingData {
  final String title;
  final String description;
  final String image;
  final String step;
  final String subtitle;

  OnboardingData({
    required this.title,
    required this.description,
    required this.image,
    required this.step,
    required this.subtitle,
  });
}

class _OnboardingPageState extends State<OnboardingPage> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConstants.onboardingKey, true);
    if (mounted) {
      context.go('/welcome');
    }
  }

  final List<OnboardingData> _pages = [
    OnboardingData(
      subtitle: 'INTRODUCING',
      title: 'A New Standard of Luxury Living',
      description: 'Access an ultra-curated portfolio of the world\'s most architectural masterpieces.',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600',
      step: '1 of 3',
    ),
    OnboardingData(
      subtitle: 'EXCLUSIVE SERVICE',
      title: 'Your Personal Elite Concierge',
      description: 'From private jet charters to exclusive dinner reservations, our team handles every detail of your journey.',
      image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1600',
      step: '2 of 3',
    ),
    OnboardingData(
      subtitle: 'STEP 03',
      title: 'Extraordinary Experiences',
      description: 'Discover hidden gems and once-in-a-lifetime moments curated exclusively for LuxeStay members.',
      image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?q=80&w=1600',
      step: '3 of 3',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          PageView.builder(
            controller: _pageController,
            itemCount: _pages.length,
            onPageChanged: (index) => setState(() => _currentPage = index),
            itemBuilder: (context, index) => _buildPage(_pages[index]),
          ),
          // Top bar with Logo and Skip
          Positioned(
            top: 60,
            left: 24,
            right: 24,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'LUXESTAY',
                  style: TextStyle(
                    color: Color(0xFF6D4C41),
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                  ),
                ),
                if (_currentPage < 2)
                  TextButton(
                    onPressed: _completeOnboarding,
                    child: const Text('SKIP', style: TextStyle(color: Color(0xFF6D4C41), fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPage(OnboardingData data) {
    final bool isLast = _currentPage == 2;

    return Stack(
      children: [
        Positioned.fill(
          child: Image.network(
            data.image,
            fit: BoxFit.cover,
          ),
        ),
        Positioned.fill(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withOpacity(0.5),
                ],
              ),
            ),
          ),
        ),
        Align(
          alignment: Alignment.bottomCenter,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 60),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(24),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                child: Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.8),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withOpacity(0.2)),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data.subtitle,
                        style: const TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF6D4C41),
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        data.title,
                        style: const TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1A1A1A),
                          fontFamily: 'Serif',
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        data.description,
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.black.withOpacity(0.6),
                          height: 1.6,
                        ),
                      ),
                      const SizedBox(height: 40),
                      Row(
                        children: [
                          _buildPageIndicator(),
                          const SizedBox(width: 8),
                          Text(
                            data.step,
                            style: TextStyle(fontSize: 10, color: Colors.black.withOpacity(0.4)),
                          ),
                          const Spacer(),
                          Flexible(
                            child: SizedBox(
                              height: 56,
                              child: ElevatedButton(
                                onPressed: () {
                                  if (isLast) {
                                    _completeOnboarding();
                                  } else {
                                    _pageController.nextPage(
                                      duration: const Duration(milliseconds: 400),
                                      curve: Curves.easeInOut,
                                    );
                                  }
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF6D4C41),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  elevation: 0,
                                ),
                                child: FittedBox(
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        isLast ? 'BEGIN JOURNEY' : 'Continue',
                                        style: const TextStyle(fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(width: 8),
                                      const Icon(LucideIcons.arrowRight, size: 16),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (isLast) ...[
                        const SizedBox(height: 24),
                        Center(
                          child: Text(
                            'Experience the art of living well.',
                            style: TextStyle(fontSize: 11, color: Colors.black.withOpacity(0.4), fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildPageIndicator() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        final isSelected = _currentPage == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          margin: const EdgeInsets.only(right: 8),
          height: 4,
          width: isSelected ? 24 : 4,
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF6D4C41) : Colors.black.withOpacity(0.1),
            borderRadius: BorderRadius.circular(2),
          ),
        );
      }),
    );
  }
}
