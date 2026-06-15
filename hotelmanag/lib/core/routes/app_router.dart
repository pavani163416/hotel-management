import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/splash/presentation/pages/splash_screen.dart';
import '../../features/onboarding/presentation/pages/onboarding_page.dart';
import '../../features/auth/presentation/pages/welcome_page.dart';
import '../../features/home/presentation/pages/home_page.dart';
import '../../features/auth/presentation/pages/login_page.dart';
import '../../features/auth/presentation/pages/register_page.dart';
import '../../features/auth/presentation/pages/otp_page.dart';
import '../../features/auth/presentation/pages/firebase_auth_link_handler_page.dart';
import '../../features/hotels/presentation/pages/hotels_page.dart';
import '../../features/hotels/presentation/pages/hotel_details_page.dart';
import '../../features/booking/presentation/pages/history_page.dart';
import '../../features/profile/presentation/pages/profile_page.dart';
import '../../features/booking/presentation/pages/booking_page.dart';
import '../../features/booking/presentation/pages/guest_details_page.dart';
import '../../features/booking/presentation/pages/payment_page.dart';
import '../../features/booking/presentation/pages/review_page.dart';
import '../../features/booking/presentation/pages/confirmation_page.dart';
import '../../features/booking/presentation/pages/promo_codes_page.dart';
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
  static const String firebaseAuth = '/firebase-auth';
  static const String promoCodes = '/promo-codes';

  static GoRouter createRouter(AuthProvider authProvider) {
    return GoRouter(
      initialLocation: splash,
      refreshListenable: authProvider,
      errorBuilder: (context, state) {
        return Scaffold(
          body: Center(
            child: Text('Oops! We couldn\'t find that page: ${state.uri}'),
          ),
        );
      },
      redirect: (context, state) {
        final path = state.matchedLocation;

      // Pages that don't require authentication
      final bool isPublicPage = path == login    ||
                                path == register  ||
                                path == welcome   ||
                                path == onboarding ||
                                path == splash    ||
                                path == otp       ||
                                path == firebaseAuth;

      // 1. Force unauthenticated users to /login (allow through splash so it
      //    can run its own auth check before navigating)
      if (!authProvider.isAuthenticated && !isPublicPage) {
        return login;
      }

      // 2. TC-FE-033: Prevent redundant logins — redirect authenticated users
      //    away from every public/auth page, including splash.
      if (authProvider.isAuthenticated && isPublicPage) {
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
        path: firebaseAuth,
        builder: (context, state) {
          final link = state.uri.toString();
          return FirebaseAuthLinkHandlerPage(emailLink: link);
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
        path: promoCodes,
        builder: (context, state) => const PromoCodesPage(),
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
}
