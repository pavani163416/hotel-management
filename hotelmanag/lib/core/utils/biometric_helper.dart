import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../utils/injection_container.dart';

class BiometricHelper {
  static final LocalAuthentication auth = LocalAuthentication();

  static Future<bool> authenticate({
    required String reason,
    BuildContext? context,
  }) async {
    if (kIsWeb) {
      if (context != null) {
        return await _showPasswordFallbackDialog(context, reason);
      }
      return true;
    }

    try {
      final bool canAuthenticateWithBiometrics = await auth.canCheckBiometrics;
      final bool canAuthenticate =
          canAuthenticateWithBiometrics || await auth.isDeviceSupported();

      if (!canAuthenticate) {
        if (context != null) {
          return await _showPasswordFallbackDialog(context, reason);
        }
        return true;
      }

      final bool didAuthenticate = await auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
      return didAuthenticate;
    } on PlatformException catch (e) {
      debugPrint('Biometric Error: $e');
      if (context != null) {
        return await _showPasswordFallbackDialog(context, reason);
      }
      return false;
    }
  }

  static Future<bool> _showPasswordFallbackDialog(
    BuildContext context,
    String reason,
  ) async {
    final passwordController = TextEditingController();
    bool isLoading = false;
    String? errorMessage;

    final result = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Text(
                'Security Verification',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    reason,
                    style: const TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Account Password',
                      errorText: errorMessage,
                      border: const OutlineInputBorder(),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: isLoading
                      ? null
                      : () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  onPressed: isLoading
                      ? null
                      : () async {
                          setState(() {
                            isLoading = true;
                            errorMessage = null;
                          });

                          try {
                            final authProvider = context.read<AuthProvider>();
                            final email = authProvider.user?.email ?? '';
                            final password = passwordController.text;

                            if (email.isEmpty) {
                              setState(() {
                                errorMessage = 'No logged in user found';
                                isLoading = false;
                              });
                              return;
                            }

                            final repository = sl<AuthRepository>();
                            final verificationResult = await repository.login(email, password);
                            
                            final verified = verificationResult.isRight();
                            if (verified) {
                              Navigator.of(context).pop(true);
                            } else {
                              setState(() {
                                errorMessage = 'Incorrect password';
                                isLoading = false;
                              });
                            }
                          } catch (e) {
                            setState(() {
                              errorMessage = 'Verification error';
                              isLoading = false;
                            });
                          }
                        },
                  child: isLoading
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Verify'),
                ),
              ],
            );
          },
        );
      },
    );
    return result ?? false;
  }
}
