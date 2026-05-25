import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/splash/presentation/pages/splash_screen.dart';
import '../../features/onboarding/presentation/pages/onboarding_page.dart';
import '../../features/auth/presentation/pages/welcome_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/otp_page.dart';
import '../../features/hotels/presentation/pages/hotels_page.dart';
import '../../features/hotels/presentation/pages/hotel_details_page.dart';
import '../../features/booking/presentation/pages/history_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/booking/presentation/pages/booking_page.dart';
import '../../features/booking/presentation/pages/guest_details_page.dart';
import '../../features/booking/presentation/pages/payment_page.dart';
import '../../features/booking/presentation/pages/review_page.dart';
import '../../features/booking/presentation/pages/confirmation_page.dart';
import '../../features/profile/presentation/pages/favorites_page.dart';

import '../utils/injection_container.dart' as di;
import '../providers/auth_provider.dart';

class AppRouter {
  static const String splash = '/splash';
  static const String onboarding = '/onboarding';
  static const String welcome = '/welcome';
  static const String root = '/';
  static const String login = '/login';
  static const String register = '/register';
  static const String hotels = '/hotels';
  static const String history = '/history';
  static const String profile = '/profile';
  static const String booking = '/booking';
  static const String guestDetails = '/guest-details';
  static const String review = '/review';
  static const String payment = '/payment';
  static const String confirmation = '/confirmation';
  static const String favorites = '/favorites';
  static const String otp = '/otp';

  static final GoRouter router = GoRouter(
    initialLocation: splash,
    refreshListenable: di.sl<AuthProvider>(),
    redirect: (context, state) {
      final auth = di.sl<AuthProvider>();

      final bool isLoggingIn = state.matchedLocation == login || 
                               state.matchedLocation == register || 
                               state.matchedLocation == welcome || 
                               state.matchedLocation == onboarding ||
                               state.matchedLocation == splash ||
                               state.matchedLocation == otp;

      // If user is NOT authenticated
      if (!auth.isAuthenticated) {
        // Only allow access to public pages (splash, welcome, onboarding, login, register, otp)
        return isLoggingIn ? null : login;
      }

      // If user IS authenticated
      // Redirect them to home if they attempt to access public authentication/splash pages
      if (auth.isAuthenticated && isLoggingIn && state.matchedLocation != splash) {
        return root;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: onboarding,
        builder: (context, state) => const OnboardingPage(),
      ),
      GoRoute(
        path: welcome,
        builder: (context, state) => const WelcomePage(),
      ),
      GoRoute(
        path: root,
        builder: (context, state) => const HomePage(),
      ),
      GoRoute(
        path: login,
        builder: (context, state) => const LoginPage(),
      ),
      GoRoute(
        path: register,
        builder: (context, state) => const RegisterPage(),
      ),
      GoRoute(
        path: otp,
        builder: (context, state) {
          final email = state.extra as String? ?? '';
          return OtpPage(email: email);
        },
      ),
      GoRoute(
        path: hotels,
        builder: (context, state) => const HotelsPage(),
      ),
      GoRoute(
        path: history,
        builder: (context, state) => const HistoryPage(),
      ),
      GoRoute(
        path: profile,
        builder: (context, state) => const ProfilePage(),
      ),
      GoRoute(
        path: booking,
        builder: (context, state) => const BookingPage(),
      ),
      GoRoute(
        path: guestDetails,
        builder: (context, state) => const GuestDetailsPage(),
      ),
      GoRoute(
        path: review,
        builder: (context, state) => const ReviewPage(),
      ),
      GoRoute(
        path: payment,
        builder: (context, state) => const PaymentPage(),
      ),
      GoRoute(
        path: confirmation,
        builder: (context, state) => const ConfirmationPage(),
      ),
      GoRoute(
        path: '/hotel/:id',
        builder: (context, state) {
          final id = state.pathParameters['id'] ?? '';
          return HotelDetailsPage(id: id);
        },
      ),
      GoRoute(
        path: favorites,
        builder: (context, state) => const FavoritesPage(),
      ),
    ],
  );
}
