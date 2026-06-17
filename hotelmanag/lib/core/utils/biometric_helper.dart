import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter/foundation.dart';

class BiometricHelper {
  static final LocalAuthentication auth = LocalAuthentication();

  static Future<bool> authenticate({required String reason}) async {
    // Biometrics usually only work on mobile devices (iOS/Android)
    if (kIsWeb)
      return true; // Bypass on web if not supported or needed, or handle appropriately

    try {
      final bool canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
      final bool canAuthenticate =
          canAuthenticateWithBiometrics || await auth.isDeviceSupported();

      if (!canAuthenticate)
        return true; // If device has no biometrics, we skip or fallback

      final bool didAuthenticate = await auth.authenticate(
        localizedReason: reason,
        biometricOnly: true,
        persistAcrossBackgrounding: true,
      );
      return didAuthenticate;
    } on PlatformException catch (e) {
      debugPrint('Biometric Error: $e');
      return false;
    }
  }
}
