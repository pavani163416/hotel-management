import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_auth_platform_interface/firebase_auth_platform_interface.dart';
import 'dart:convert';
import '../utils/recaptcha_helper.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/entities/user_entity.dart';
import '../../features/auth/data/models/user_model.dart';
import '../constants/app_constants.dart';
import '../../core/errors/failures.dart';
import '../services/push_notifications.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';
import '../network/api_service.dart';
import '../../core/utils/injection_container.dart';
import '../../core/providers/booking_provider.dart';
import '../../core/providers/promo_provider.dart';
import '../../core/providers/favorites_provider.dart';

class AuthProvider extends ChangeNotifier with WidgetsBindingObserver {
  final AuthRepository _authRepository;
  final ApiService? _apiService;
  UserEntity? _user;
  bool _isLoading = false;
  String? _error;
  String? _unverifiedEmail;

  DateTime? _pausedTime;

  AuthProvider(this._authRepository, [this._apiService]) {
    WidgetsBinding.instance.addObserver(this);
    PushNotificationService.onTokenRefresh = (token) {
      if (isAuthenticated) {
        _registerFcmToken();
      }
    };
  }

  UserEntity? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get unverifiedEmail => _unverifiedEmail;
  bool get isAuthenticated => _user != null;

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      _pausedTime = DateTime.now();
    } else if (state == AppLifecycleState.resumed) {
      if (_pausedTime != null) {
        final diff = DateTime.now().difference(_pausedTime!);
        if (diff.inMinutes >= 30) {
          logout();
        }
      }
      _pausedTime = null;
    }
  }

  Future<(String, String)?> fetchCaptcha() async {
    final result = await _authRepository.fetchCaptcha();
    return result.fold((failure) {
      _error = failure.message;
      notifyListeners();
      return null;
    }, (captcha) => captcha);
  }

  /// Registers the device FCM token with the backend so push notifications work.
  Future<void> _registerFcmToken() async {
    if (kIsWeb) return; // FCM tokens not needed on web
    try {
      final token = PushNotificationService.fcmToken;
      if (token == null || token.isEmpty) return;
      await _apiService?.post('/auth/fcm-token', data: {'fcmToken': token});
      debugPrint('[FCM] Token registered with backend');
    } catch (e) {
      debugPrint('[FCM] Token registration failed (non-blocking): $e');
    }
  }

  Future<void> login(
    String email,
    String password, {
    String? captchaId,
    String? captchaAnswer,
  }) async {
    _isLoading = true;
    _error = null;
    _unverifiedEmail = null;
    notifyListeners();

    final result = await _authRepository.login(
      email,
      password,
      captchaId: captchaId,
      captchaAnswer: captchaAnswer,
    );

    await result.fold(
      (failure) async {
        if (failure is UnverifiedEmailFailure) {
          _unverifiedEmail = email;
          _error = failure.message;
        } else if (failure.message.toLowerCase().contains('not verified') ||
            failure.message.toLowerCase().contains('verify')) {
          _unverifiedEmail = email;
          _error = failure.message;
        } else {
          _error = failure.message;
        }

        _isLoading = false;
        notifyListeners();
      },
      (data) async {
        final (user, token) = data;
        _user = user;
        await _saveAuthData(user, token);
        _isLoading = false;
        notifyListeners();
        _registerFcmToken(); // non-blocking
      },
    );
  }

  Future<void> register(
    String name,
    String email,
    String password,
    String phone, {
    String? city,
    String? captchaId,
    String? captchaAnswer,
  }) async {
    _isLoading = true;
    _error = null;
    _unverifiedEmail = null;
    notifyListeners();

    final result = await _authRepository.register(
      name,
      email,
      password,
      phone,
      city: city,
      captchaId: captchaId,
      captchaAnswer: captchaAnswer,
    );

    await result.fold(
      (failure) async {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
      },
      (data) async {
        final (user, token, otp) = data;
        if (token.isEmpty) {
          _unverifiedEmail = email;
        } else {
          _user = user;
          await _saveAuthData(user, token);
          _registerFcmToken(); // non-blocking
        }
        _isLoading = false;
        notifyListeners();
      },
    );
  }

  Future<bool> verifyOtp(String email, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.verifyOtp(email, code);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (data) async {
        final (user, token) = data;
        _user = user;
        _unverifiedEmail = null;
        await _saveAuthData(user, token);
        _isLoading = false;
        notifyListeners();
        _registerFcmToken(); // non-blocking
        return true;
      },
    );
  }

  Future<bool> resendOtp(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.resendOtp(email);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (otp) {
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  /// Sends a phone OTP — same as website's POST /auth/phone/send
  Future<Map<String, dynamic>?> sendPhoneOtp(String fullPhone) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final response = await _apiService!.post(
        'auth/phone/send',
        data: {'phone': fullPhone},
      );
      _isLoading = false;
      notifyListeners();
      final d = response.data is Map
          ? response.data
          : (response.data?['data'] ?? {});
      return d as Map<String, dynamic>?;
    } on DioException catch (e) {
      String message =
          'Unable to send OTP. Please check the number and try again.';
      if (e.response != null) {
        if (e.response?.data is Map) {
          message = e.response?.data['message'] ?? message;
        } else if (e.response?.data is String) {
          message = e.response?.data!;
        }
      }
      _error = message;
      _isLoading = false;
      notifyListeners();
      return null;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return null;
    }
  }

  /// Verifies the phone OTP — same as website's POST /auth/phone/verify
  Future<bool> verifyPhoneOtp(String fullPhone, String code) async {
    _isLoading = true;
    _error = null;
    notifyListeners();
    try {
      final response = await _apiService!.post(
        'auth/phone/verify',
        data: {'phone': fullPhone, 'code': code.trim()},
      );
      final raw = response.data is Map ? response.data : {};
      final d = (raw['data'] ?? raw) as Map<String, dynamic>;
      final token = d['token'] as String?;
      if (token == null || token.isEmpty) {
        _error = 'Verification failed — no token received.';
        _isLoading = false;
        notifyListeners();
        return false;
      }
      final user = UserModel.fromJson(d);
      _user = user;
      _unverifiedEmail = null;
      await _saveAuthData(user, token);
      _isLoading = false;
      notifyListeners();
      _registerFcmToken();
      return true;
    } on DioException catch (e) {
      String message = 'OTP verification failed. Please try again.';
      if (e.response != null) {
        if (e.response?.data is Map) {
          message = e.response?.data['message'] ?? message;
        } else if (e.response?.data is String) {
          message = e.response?.data!;
        }
      }
      _error = message;
      _isLoading = false;
      notifyListeners();
      return false;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> loadCachedAuth() async {
    const storage = FlutterSecureStorage();
    final prefs = await SharedPreferences.getInstance();

    final token = await storage.read(key: AppConstants.tokenKey);
    if (token == null || token.isEmpty) return;

    final userDataString = await storage.read(key: 'user_data');
    if (userDataString != null && userDataString.isNotEmpty) {
      try {
        final userData = jsonDecode(userDataString) as Map<String, dynamic>;
        _user = UserModel.fromJson(userData);
        try {
          sl<FavoritesProvider>().setUserId(_user?.id);
        } catch (_) {}
      } catch (e) {}
    }
  }

  Future<bool> tryAutoLogin() async {
    const storage = FlutterSecureStorage();
    final token = await storage.read(key: AppConstants.tokenKey);

    if (token == null || token.isEmpty) return false;

    // Load cached user data if it exists for instant startup
    final userDataString = await storage.read(key: 'user_data');
    if (userDataString != null && userDataString.isNotEmpty) {
      try {
        final userData = jsonDecode(userDataString) as Map<String, dynamic>;
        _user = UserModel.fromJson(userData);
        try {
          sl<FavoritesProvider>().setUserId(_user?.id);
        } catch (_) {}
        notifyListeners();
      } catch (e) {}
    }

    _isLoading = true;
    notifyListeners();

    try {
      final result = await _authRepository.getMe();

      return await result.fold(
        (failure) async {
          // If it's an explicit auth failure (Unauthorized/Expired), clear the session.
          // Otherwise, keep the cached session so they are not logged out when offline/poor connection.
          final errorMsg = failure.message.toLowerCase();
          final isAuthFailure =
              errorMsg.contains('unauthorized') ||
              errorMsg.contains('token') ||
              errorMsg.contains('invalid') ||
              errorMsg.contains('expired');

          if (isAuthFailure) {
            await storage.delete(key: AppConstants.tokenKey);
            await storage.delete(key: 'user_data');
            _user = null;
            try {
              sl<FavoritesProvider>().setUserId(null);
            } catch (_) {}
            return false;
          } else {
            // Network issue / server unreachable — allow them to continue with cached session
            return _user != null;
          }
        },
        (user) async {
          _user = user;
          // Update local cache
          await _saveAuthData(user, null);
          _registerFcmToken(); // non-blocking
          return true;
        },
      );
    } finally {
      if (_isLoading) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'openid'],
    // On web, clientId drives the OAuth flow; on Android, serverClientId tells
    // Google to embed an ID token that our backend can verify.
    clientId: kIsWeb ? AppConstants.googleWebClientId : null,
    serverClientId: kIsWeb ? null : AppConstants.googleWebClientId,
  );

  void logout() async {
    try {
      try {
        await _apiService?.post('auth/logout');
      } catch (_) {}

      const storage = FlutterSecureStorage();
      await storage.delete(key: AppConstants.tokenKey);
      await storage.delete(key: 'user_data');

      try {
        await sl<FavoritesProvider>().clearFavorites();
        sl<FavoritesProvider>().setUserId(null);
        sl<PromoProvider>().reset();
      } catch (_) {}

      try {
        await _googleSignIn.signOut();
      } catch (_) {}

      if (_user != null) {
        _user = UserEntity(
          id: '',
          name: '',
          email: '',
          phone: '',
          city: '',
          profileImage: '',
          coverImage: '',
          paymentMethods: const [],
        );
      }
      _user = null;

      try {
        sl<BookingProvider>().reset();
      } catch (_) {}

      try {
        await DefaultCacheManager().emptyCache();
      } catch (_) {}
    } catch (e, stack) {
      debugPrint('[AuthProvider] Error during logout: $e\n$stack');
    } finally {
      // GUARANTEE state clears and router redirects even if an exception occurs
      _user = null;
      notifyListeners();
    }
  }

  Future<bool> signInWithGoogle() async {
    try {
      if (kDebugMode) {
        debugPrint('[GoogleSignIn] Starting Google Sign-In flow...');
      }
      _isLoading = true;
      notifyListeners();

      // Sign out from any current session to force account picker
      if (kDebugMode) {
        debugPrint('[GoogleSignIn] Force signing out of previous session...');
      }
      await _googleSignIn.signOut().catchError((_) {});

      if (kDebugMode) {
        debugPrint('[GoogleSignIn] Triggering account chooser picker...');
      }
      final GoogleSignInAccount? account = await _googleSignIn.signIn();
      if (kDebugMode) {
        debugPrint(
          '[GoogleSignIn] Account picker returned: ${account?.email ?? "null"}',
        );
      }

      if (account == null) {
        if (kDebugMode) {
          debugPrint('[GoogleSignIn] User canceled account selection.');
        }
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (kDebugMode) {
        debugPrint('[GoogleSignIn] Retrieving authentication credentials...');
      }
      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;
      if (kDebugMode) {
        debugPrint(
          '[GoogleSignIn] Token retrieved: ${idToken != null ? "YES" : "NO"}',
        );
        debugPrint(
          '[GoogleSignIn] AccessToken present: ${auth.accessToken != null}',
        );
      }

      if (idToken == null || idToken.isEmpty) {
        if (kDebugMode) {
          debugPrint('[GoogleSignIn] Error: Token is null or empty!');
        }
        _error = 'Sign-in failed. Please try again.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (kDebugMode) {
        debugPrint('[GoogleSignIn] Sending token to backend for verification...');
      }
      final res = await _authRepository.signInWithGoogle(idToken);
      if (kDebugMode) {
        debugPrint('[GoogleSignIn] Backend response received.');
      }

      return res.fold(
        (failure) {
          if (kDebugMode) {
            debugPrint(
              '[GoogleSignIn] Backend verification failed: ${failure.message}',
            );
          }
          _error = failure.message;
          _isLoading = false;
          notifyListeners();
          return false;
        },
        (data) async {
          final (user, token) = data;
          if (kDebugMode)
            debugPrint(
              '[GoogleSignIn] Backend verification succeeded! Logged in as: ${user.email}',
            );
          _user = user;
          await _saveAuthData(user, token);
          _isLoading = false;
          notifyListeners();
          return true;
        },
      );
    } catch (e, stack) {
      debugPrint('[GoogleSignIn] Exception caught: $e');
      debugPrint('[GoogleSignIn] Stacktrace: $stack');
      _error = 'Google sign-in error: ${e.toString()}';
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
    String? coverImage,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authRepository.updateProfile(
        name: name,
        phone: phone,
        city: city,
        profileImage: profileImage,
        coverImage: coverImage,
      );

      return await result.fold(
        (failure) {
          _error = failure.message;
          return false;
        },
        (user) async {
          _user = user;
          await _saveAuthData(user, null);
          return true;
        },
      );
    } catch (e) {
      _error = e.toString();
      return false;
    } finally {
      if (_isLoading) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  Future<String?> uploadImage(String base64Image) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authRepository.uploadImage(base64Image);

      return result.fold(
        (failure) {
          _error = failure.message;
          return null;
        },
        (url) {
          return url;
        },
      );
    } catch (e) {
      _error = e.toString();
      return null;
    } finally {
      if (_isLoading) {
        _isLoading = false;
        notifyListeners();
      }
    }
  }

  Future<bool> addPaymentMethod({
    required String type,
    String? brand,
    String? last4,
    String? expiry,
    String? upiId,
    String? bankName,
    bool isDefault = false,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.addPaymentMethod(
      type: type,
      brand: brand,
      last4: last4,
      expiry: expiry,
      upiId: upiId,
      bankName: bankName,
      isDefault: isDefault,
    );

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (paymentMethods) {
        if (_user != null) {
          _user = UserModel(
            id: _user!.id,
            name: _user!.name,
            email: _user!.email,
            phone: _user!.phone,
            city: _user!.city,
            profileImage: _user!.profileImage,
            coverImage: _user!.coverImage,
            paymentMethods: paymentMethods,
          );
        }
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  Future<void> _saveAuthData(UserEntity user, String? token) async {
    const storage = FlutterSecureStorage();
    final prefs = await SharedPreferences.getInstance();
    if (token != null) {
      await storage.write(key: AppConstants.tokenKey, value: token);
    }

    // Set onboarding complete as user is logged in
    await prefs.setBool(AppConstants.onboardingKey, true);

    // Save user entity to cache
    try {
      final userModel = UserModel(
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        paymentMethods:
            const [], // SECURITY (TC-047): Never cache payment methods in app state
      );
      final userJson = jsonEncode(userModel.toJson());
      await storage.write(key: 'user_data', value: userJson);
      try {
        sl<FavoritesProvider>().setUserId(user.id);
      } catch (_) {}
    } catch (e) {}
  }

  Future<bool> changePassword(String oldPassword, String newPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.changePassword(
      oldPassword,
      newPassword,
    );

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (success) {
        _isLoading = false;
        notifyListeners();
        return success;
      },
    );
  }

  Future<bool> signInWithFirebaseToken(String idToken) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.signInWithFirebase(idToken);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (data) async {
        final (user, token) = data;
        _user = user;
        _unverifiedEmail = null;
        await _saveAuthData(user, token);
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  Future<bool> sendFirebaseSignInLink(
    String email,
    String name,
    String phone,
  ) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final acs = ActionCodeSettings(
        url:
            'https://hotel-mgnt-8ffff.firebaseapp.com/firebase-auth?email=$email',
        handleCodeInApp: true,
        androidPackageName: 'com.example.hotelmanag',
        androidInstallApp: true,
        androidMinimumVersion: '12',
      );

      await FirebaseAuth.instance.sendSignInLinkToEmail(
        email: email,
        actionCodeSettings: acs,
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('email_for_link', email);
      await prefs.setString('pending_name', name);
      await prefs.setString('pending_phone', phone);
      await prefs.setString(
        'email_link_timestamp',
        DateTime.now().millisecondsSinceEpoch.toString(),
      );

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signInWithEmailLink(String emailLink) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();

      final timestampStr = prefs.getString('email_link_timestamp');
      if (timestampStr != null) {
        final timestamp = int.tryParse(timestampStr) ?? 0;
        final elapsed = DateTime.now().millisecondsSinceEpoch - timestamp;
        if (elapsed > 24 * 60 * 60 * 1000) {
          // 24 hours
          await prefs.remove('email_for_link');
          await prefs.remove('pending_name');
          await prefs.remove('pending_phone');
          await prefs.remove('email_link_timestamp');
          throw Exception(
            "Verification link has expired. Please request a new one.",
          );
        }
      }

      final email = prefs.getString('email_for_link') ?? '';
      final name = prefs.getString('pending_name');
      final phone = prefs.getString('pending_phone');

      // Wipe immediately upon retrieval to prevent lingering PII in storage
      await prefs.remove('email_for_link');
      await prefs.remove('pending_name');
      await prefs.remove('pending_phone');
      await prefs.remove('email_link_timestamp');

      if (email.isEmpty) {
        throw Exception(
          "No email found for verification link. Please sign up again.",
        );
      }

      if (FirebaseAuth.instance.isSignInWithEmailLink(emailLink)) {
        final userCredential = await FirebaseAuth.instance.signInWithEmailLink(
          email: email,
          emailLink: emailLink,
        );

        final firebaseUser = userCredential.user;
        if (firebaseUser == null) {
          throw Exception("Firebase authentication failed.");
        }

        final idToken = await firebaseUser.getIdToken() ?? '';
        final result = await _authRepository.signInWithFirebase(
          idToken,
          name: name,
          phone: phone,
        );

        return result.fold(
          (failure) {
            _error = failure.message;
            _isLoading = false;
            notifyListeners();
            return false;
          },
          (data) async {
            final (user, token) = data;
            _user = user;
            _unverifiedEmail = null;

            // Clean up cached registration details

            await _saveAuthData(user, token);
            _isLoading = false;
            notifyListeners();
            return true;
          },
        );
      } else {
        throw Exception("Invalid sign-in link.");
      }
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  ConfirmationResult? _webConfirmationResult;

  Future<void> verifyPhoneNumber(
    String phoneNumber, {
    required Function(String verificationId) onCodeSent,
    required Function(String error) onError,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authRepository.sendPhoneOtp(phoneNumber);
      result.fold(
        (failure) {
          _error = failure.message;
          _isLoading = false;
          notifyListeners();
          onError(failure.message);
        },
        (otp) {
          _isLoading = false;
          if (otp != null) {
            notifyListeners();
            onCodeSent(phoneNumber);
          } else {
            notifyListeners();
            onError("Failed to send verification code");
          }
        },
      );
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      onError(e.toString());
    }
  }

  Future<bool> signInWithPhoneOtp(
    String smsCode, {
    required String verificationId,
    required String phoneNumber,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final result = await _authRepository.verifyPhoneOtp(phoneNumber, smsCode);
      return result.fold(
        (failure) {
          _error = failure.message;
          _isLoading = false;
          notifyListeners();
          return false;
        },
        (data) async {
          final (user, token) = data;
          _user = user;
          await _saveAuthData(user, token);
          _isLoading = false;
          notifyListeners();
          return true;
        },
      );
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> forgotPassword(String email) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.forgotPassword(email);
    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (success) {
        _isLoading = false;
        notifyListeners();
        return success;
      },
    );
  }
}
