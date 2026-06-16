import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/constants/app_constants.dart';
import '../../../../core/theme/app_theme.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key});

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class OnboardingData {
  final String title;
  final String subtitle;
  final String imagePath;
  final List<Widget>? extraContent;

  OnboardingData({
    required this.title,
    required this.subtitle,
    required this.imagePath,
    this.extraContent,
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

  void _nextPage() {
    if (_currentPage < 2) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 400),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  Widget _buildInfoCard({
    required IconData icon,
    required String title,
    required String desc,
    required BuildContext context,
    bool isRoundedRect = false,
  }) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.withOpacity(0.15)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.accentColor,
              borderRadius: BorderRadius.circular(isRoundedRect ? 12 : 30),
            ),
            child: Icon(icon, size: 20, color: AppTheme.primaryColor),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  desc,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[700],
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<OnboardingData> get _pages {
    return [
      OnboardingData(
        title: 'Find Your Perfect\nStay.',
        subtitle:
            'Discover luxury hotels and boutique\nstays right in your neighborhood or at\nyour next destination.',
        imagePath: 'assets/images/Onboarding_screen_1.png',
        extraContent: [
          _buildInfoCard(
            icon: LucideIcons.crosshair,
            title: '\'Near Me\' Search',
            desc:
                'Real-time location-based suggestions tailored to your current vicinity.',
            context: context,
          ),
          _buildInfoCard(
            icon: LucideIcons.map,
            title: 'Interactive Maps',
            desc:
                'Explore amenities and surroundings visually with our high-fidelity map interface.',
            context: context,
          ),
        ],
      ),
      OnboardingData(
        title: 'Unlock Elite Benefits',
        subtitle:
            'Access member-only rates, seasonal\npromotions, and curated packages designed for\nthe discerning traveler.',
        imagePath: 'assets/images/Onboarding_screen_2.png',
        extraContent: [
          _buildInfoCard(
            icon: LucideIcons.tag,
            title: 'Member Rates',
            desc: 'Save up to 25% on every booking automatically.',
            context: context,
            isRoundedRect: true,
          ),
          _buildInfoCard(
            icon: LucideIcons.sparkles,
            title: 'Curated Deals',
            desc:
                'Tailored offers based on your preferences and travel history.',
            context: context,
            isRoundedRect: true,
          ),
        ],
      ),
      OnboardingData(
        title: 'Effortless Stay\nManagement.',
        subtitle:
            'Book your suite in seconds and manage\nyour entire experience, from check-in to\ndigital keys, all in one place.',
        imagePath: 'assets/images/Onboarding_screen_3.png',
        extraContent: [
          _buildInfoCard(
            icon: LucideIcons.mousePointer2,
            title: 'Instant Booking',
            desc:
                'Secure your room with a single tap through our streamlined luxury portal.',
            context: context,
            isRoundedRect: true,
          ),
          _buildInfoCard(
            icon: LucideIcons.key,
            title: 'Digital Key',
            desc:
                'Skip the front desk with mobile room access directly from your phone.',
            context: context,
            isRoundedRect: true,
          ),
        ],
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFDFDFD),
      body: SafeArea(
        child: Column(
          children: [
            // Top Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(
                        LucideIcons.bedDouble,
                        size: 24,
                        color: AppTheme.primaryColor,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Athithigriha',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  if (_currentPage < 2)
                    TextButton(
                      onPressed: _completeOnboarding,
                      child: const Text(
                        'SKIP',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Page Content
            Expanded(
              child: PageView.builder(
                physics:
                    const NeverScrollableScrollPhysics(), // Disables swiping
                controller: _pageController,
                itemCount: _pages.length,
                onPageChanged: (index) => setState(() => _currentPage = index),
                itemBuilder: (context, index) {
                  final page = _pages[index];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: SingleChildScrollView(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        children: [
                          // Illustration Image
                          SizedBox(
                            height: MediaQuery.of(context).size.height * 0.35,
                            width: double.infinity,
                            child: Image.asset(
                              page.imagePath,
                              fit: BoxFit.contain,
                            ),
                          ),
                          const SizedBox(height: 24),
                          // Texts
                          Text(
                            page.title,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: AppTheme.primaryColor,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            page.subtitle,
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey[700],
                              height: 1.5,
                            ),
                          ),
                          const SizedBox(height: 24),
                          if (page.extraContent != null) ...page.extraContent!,
                          const SizedBox(height: 24), // Bottom padding
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Bottom Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
              child: _currentPage == 2
                  ? Column(
                      children: [
                        _buildPageIndicator(),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: ElevatedButton(
                            onPressed: _completeOnboarding,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(28),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Get Started',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(
                                  LucideIcons.checkCircle2,
                                  color: Colors.white,
                                  size: 20,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildPageIndicator(),
                        SizedBox(
                          height: 50,
                          child: ElevatedButton(
                            onPressed: _nextPage,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppTheme.primaryColor,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 24,
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(25),
                              ),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  'NEXT',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(
                                  LucideIcons.arrowRight,
                                  color: Colors.white,
                                  size: 16,
                                ),
                              ],
                            ),
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

  Widget _buildPageIndicator() {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        final isSelected = _currentPage == index;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          margin: const EdgeInsets.only(right: 6),
          height: 6,
          width: isSelected ? 24 : 6,
          decoration: BoxDecoration(
            color: isSelected
                ? AppTheme.primaryColor
                : Colors.grey.withOpacity(0.3),
            borderRadius: BorderRadius.circular(3),
          ),
        );
      }),
    );
  }
}
