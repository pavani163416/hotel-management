import 'package:flutter/material.dart';
import 'dart:async';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_router.dart';
import 'core/providers/favorites_provider.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/hotel_provider.dart';
import 'core/providers/booking_provider.dart';
import 'core/providers/theme_provider.dart';
import 'core/providers/promo_provider.dart';
import 'core/providers/currency_provider.dart';
import 'core/widgets/notification_popup.dart';
import 'dart:ui';
import 'core/utils/injection_container.dart' as di;
import 'core/providers/notification_provider.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'core/services/push_notifications.dart';
import 'dart:io';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Allow Google Fonts to fetch at runtime if not bundled — prevents startup crash
  GoogleFonts.config.allowRuntimeFetching = true;

  try {
    if (Firebase.apps.isEmpty) {
      if (kIsWeb) {
        final apiKey = const String.fromEnvironment('FIREBASE_API_KEY');
        await Firebase.initializeApp(
          options: FirebaseOptions(
            apiKey: apiKey.isEmpty ? 'dummy_key_to_prevent_web_crash' : apiKey,
            appId: '1:239513848879:web:5eeec57c5abcbfc6f30ada',
            messagingSenderId: '239513848879',
            projectId: 'hotel-mgnt-8ffff',
            storageBucket: 'hotel-mgnt-8ffff.firebasestorage.app',
          ),
        );
      } else {
        await Firebase.initializeApp();
      }
    }

    // TC-014, TC-016: Enable Firebase App Check for device attestation
    if (!kIsWeb) {
      await FirebaseAppCheck.instance.activate(
        androidProvider: AndroidProvider.playIntegrity,
        appleProvider: AppleProvider.deviceCheck,
      );
    }
    await PushNotificationService.initialize();
  } catch (e) {
    debugPrint('Firebase Initialization Error: $e');
  }
  await di.init();
  await di.sl<AuthProvider>().loadCachedAuth();

  // TC-020: Root and Frida Detection
  if (!kIsWeb) {
    try {
      bool jailbroken = false;
      bool hasFrida = false;

      if (Platform.isAndroid) {
        final rootPaths = [
          '/system/app/Superuser.apk',
          '/sbin/su',
          '/system/bin/su',
          '/system/xbin/su',
          '/data/local/xbin/su',
          '/data/local/bin/su',
          '/system/sd/xbin/su',
          '/system/bin/failsafe/su',
          '/data/local/su',
        ];

        for (var path in rootPaths) {
          if (File(path).existsSync()) {
            jailbroken = true;
            break;
          }
        }

        try {
          final maps = File('/proc/self/maps').readAsStringSync();
          if (maps.contains('frida') || maps.contains('libfrida')) {
            hasFrida = true;
          }
        } catch (_) {}
      }

      if (jailbroken || hasFrida) {
        debugPrint(
          'Security Violation: Rooted device or Frida detected. Exiting app.',
        );
        SystemNavigator.pop();
        return; // Prevent app execution
      }
    } catch (e) {
      debugPrint('Jailbreak detection error: $e');
    }
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => di.sl<FavoritesProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<AuthProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<HotelProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<BookingProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<NotificationProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<PromoProvider>()),
        ChangeNotifierProvider(create: (_) => CurrencyProvider()),
      ],
      child: const MyApp(),
    ),
  );
}

class MyScrollBehavior extends MaterialScrollBehavior {
  @override
  Set<PointerDeviceKind> get dragDevices => {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.trackpad,
  };
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = context.watch<ThemeProvider>();
    return MaterialApp.router(
      title: 'Athithigriha',
      debugShowCheckedModeBanner: false,
      scrollBehavior: MyScrollBehavior(),
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeProvider.themeMode,
      routerConfig: AppRouter.createRouter(di.sl<AuthProvider>()),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(
          textScaler: MediaQuery.of(context).textScaler.clamp(minScaleFactor: 0.8, maxScaleFactor: 1.1),
        ),
        child: IdleDetector(
          child: NotificationPopupOverlay(
            key: notificationPopupKey,
            child: child ?? const SizedBox.shrink(),
          ),
        ),
      ),
    );
  }
}

class IdleDetector extends StatefulWidget {
  final Widget child;
  const IdleDetector({super.key, required this.child});

  @override
  State<IdleDetector> createState() => _IdleDetectorState();
}

class _IdleDetectorState extends State<IdleDetector> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _resetTimer();
  }

  void _resetTimer() {
    _timer?.cancel();
    _timer = Timer(const Duration(minutes: 15), _logoutUser);
  }

  void _logoutUser() {
    try {
      final router = GoRouter.of(context);
      final path = router.routerDelegate.currentConfiguration.last.matchedLocation;
      if (path == '/payment' ||
          path == '/guest-details' ||
          path == '/booking' ||
          path == '/review') {
        _resetTimer();
        return;
      }
    } catch (_) {}

    final auth = context.read<AuthProvider>();
    if (auth.isAuthenticated) {
      auth.logout();
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      onPointerDown: (_) => _resetTimer(),
      onPointerMove: (_) => _resetTimer(),
      child: widget.child,
    );
  }
}
