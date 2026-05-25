import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'core/routes/app_router.dart';
import 'core/providers/favorites_provider.dart';
import 'core/providers/auth_provider.dart';
import 'core/providers/hotel_provider.dart';
import 'core/providers/booking_provider.dart';
import 'core/providers/theme_provider.dart';
import 'core/providers/promo_provider.dart';
import 'core/widgets/notification_popup.dart';
import 'dart:ui';
import 'core/utils/injection_container.dart' as di;
import 'core/providers/notification_provider.dart';
import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'core/services/push_notifications.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (kIsWeb) {
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: 'AIzaSyBi6icwlduwBjJjue-uDXJDiXm9icrV_Wo',
        appId: '1:239513848879:web:5eeec57c5abcbfc6f30ada',
        messagingSenderId: '239513848879',
        projectId: 'hotel-mgnt-8ffff',
        storageBucket: 'hotel-mgnt-8ffff.firebasestorage.app',
      ),
    );
  } else {
    await Firebase.initializeApp();
  }
  await PushNotificationService.initialize();
  await di.init();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => FavoritesProvider()),
        ChangeNotifierProvider(create: (_) => di.sl<AuthProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<HotelProvider>()),
        ChangeNotifierProvider(create: (_) => di.sl<BookingProvider>()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => di.sl<PromoProvider>()),
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
    final themeProvider = Provider.of<ThemeProvider>(context);
    return MaterialApp.router(
      title: 'HotelManag',
      debugShowCheckedModeBanner: false,
      scrollBehavior: MyScrollBehavior(),
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: themeProvider.themeMode,
      routerConfig: AppRouter.router,
      builder: (context, child) => NotificationPopupOverlay(
        key: notificationPopupKey,
        child: child ?? const SizedBox.shrink(),
      ),
    );
  }
}
