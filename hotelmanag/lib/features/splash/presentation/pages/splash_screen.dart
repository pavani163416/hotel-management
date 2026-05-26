import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:provider/provider.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/constants/app_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.6, curve: Curves.easeIn)),
    );

    _scaleAnimation = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.6, curve: Curves.easeOutBack)),
    );

    _controller.forward();

    _checkAuthAndNavigate();
  }

  void _checkAuthAndNavigate() async {
    await Future.delayed(const Duration(milliseconds: 3000));
    if (!mounted) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final isLoggedIn = await authProvider.tryAutoLogin();

    if (mounted) {
      if (isLoggedIn) {
        context.go('/');
      } else {
        final prefs = await SharedPreferences.getInstance();
        final hasSeenOnboarding = prefs.getBool(AppConstants.onboardingKey) ?? false;
        if (hasSeenOnboarding) {
          context.go('/welcome');
        } else {
          context.go('/onboarding');
        }
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Image
          Positioned.fill(
            child: Image.network(
              'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600',
              fit: BoxFit.cover,
            ),
          ),
          // Gradient Overlay
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.2),
                    Colors.black.withOpacity(0.4),
                    Colors.black.withOpacity(0.6),
                  ],
                ),
              ),
            ),
          ),
          // Content
          Positioned.fill(
            child: AnimatedBuilder(
              animation: _controller,
              builder: (context, child) {
                return FadeTransition(
                  opacity: _fadeAnimation,
                  child: ScaleTransition(
                    scale: _scaleAnimation,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const SizedBox(height: 100),
                        // Diamond Icon
                        const Icon(
                          LucideIcons.diamond,
                          size: 60,
                          color: Color(0xFFD4A373),
                        ),
                        const SizedBox(height: 24),
                        // Title
                        Text(
                          'LUXESTAY',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 54,
                            fontWeight: FontWeight.w300,
                            letterSpacing: 10,
                            fontFamily: 'Serif',
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'EXCEPTIONAL LIVING',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.8),
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 4,
                          ),
                        ),
                        const Spacer(),
                        // CTA Button
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 40),
                          child: ElevatedButton(
                            onPressed: () async {
                              final auth = Provider.of<AuthProvider>(context, listen: false);
                              if (auth.isAuthenticated) {
                                context.go('/');
                              } else {
                                final prefs = await SharedPreferences.getInstance();
                                final hasSeenOnboarding = prefs.getBool(AppConstants.onboardingKey) ?? false;
                                if (hasSeenOnboarding) {
                                  context.go('/welcome');
                                } else {
                                  context.go('/onboarding');
                                }
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFD4A373),
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 56),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: const Text('EXPLORE COLLECTION', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
                          ),
                        ),
                        const SizedBox(height: 24),
                        Text(
                          'GLOBAL CURATORS',
                          style: TextStyle(
                            color: Colors.white.withOpacity(0.4),
                            fontSize: 10,
                            letterSpacing: 2,
                          ),
                        ),
                        const SizedBox(height: 48),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
          // Small Details
          Positioned(
            top: 60,
            left: 40,
            child: Text(
              'EST. 2024',
              style: TextStyle(
                color: Colors.white.withOpacity(0.3),
                fontSize: 10,
                letterSpacing: 1,
              ),
            ),
          ),
          Positioned(
            bottom: 120,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(3, (index) => Container(
                margin: const EdgeInsets.symmetric(horizontal: 4),
                width: 4,
                height: 4,
                decoration: BoxDecoration(
                  color: index == 0 ? const Color(0xFFD4A373) : Colors.white.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
              )),
            ),
          ),
        ],
      ),
    );
  }
}
