import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository;
  UserEntity? _user;
  bool _isLoading = false;
  String? _error;
  String? _unverifiedEmail;
  String? _devOtp;

  AuthProvider(this._authRepository);

  UserEntity? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get unverifiedEmail => _unverifiedEmail;
  String? get devOtp => _devOtp;
  bool get isAuthenticated => _user != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    _unverifiedEmail = null;
    _devOtp = null;
    notifyListeners();

    final result = await _authRepository.login(email, password);

    await result.fold(
      (failure) async {
        if (failure is UnverifiedEmailFailure) {
          _unverifiedEmail = email;
          _error = failure.message;
          _devOtp = failure.otp;
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
      },
    );
  }

  Future<void> register(String name, String email, String password, String phone) async {
    _isLoading = true;
    _error = null;
    _unverifiedEmail = null;
    _devOtp = null;
    notifyListeners();

    final result = await _authRepository.register(name, email, password, phone);

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
          _devOtp = otp;
        } else {
          _user = user;
          await _saveAuthData(user, token);
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
        _devOtp = null;
        await _saveAuthData(user, token);
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  Future<bool> resendOtp(String email) async {
    _isLoading = true;
    _error = null;
    _devOtp = null;
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
        _devOtp = otp;
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  Future<bool> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(AppConstants.tokenKey);
    
    if (token == null || token.isEmpty) return false;

    // Load cached user data if it exists for instant startup
    final userDataString = prefs.getString('user_data');
    if (userDataString != null && userDataString.isNotEmpty) {
      try {
        final userData = jsonDecode(userDataString) as Map<String, dynamic>;
        _user = UserModel.fromJson(userData);
        notifyListeners();
      } catch (e) {
        debugPrint('Error parsing cached user: $e');
      }
    }

    _isLoading = true;
    notifyListeners();

    final result = await _authRepository.getMe();
    
    return result.fold(
      (failure) async {
        // If it's an explicit auth failure (Unauthorized/Expired), clear the session.
        // Otherwise, keep the cached session so they are not logged out when offline/poor connection.
        final errorMsg = failure.message.toLowerCase();
        final isAuthFailure = errorMsg.contains('unauthorized') || 
                              errorMsg.contains('token') ||
                              errorMsg.contains('invalid') ||
                              errorMsg.contains('expired');
        
        if (isAuthFailure) {
          await prefs.remove(AppConstants.tokenKey);
          await prefs.remove('user_data');
          _user = null;
          _isLoading = false;
          notifyListeners();
          return false;
        } else {
          // Network issue / server unreachable — allow them to continue with cached session
          _isLoading = false;
          notifyListeners();
          return _user != null;
        }
      },
      (user) async {
        _user = user;
        // Update local cache
        await _saveAuthData(user, null);
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  GoogleSignIn get _googleSignIn {
    const clientId = '239513848879-7n631mq8o0due6v807tk58gbli9907mc.apps.googleusercontent.com';
    return GoogleSignIn(
      clientId: kIsWeb ? clientId : null,
      serverClientId: kIsWeb ? null : clientId,
      scopes: ['email', 'profile', 'openid'],
    );
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove('user_favorites'); // Clear favorites on logout
    await prefs.remove('user_data'); // Clear cached user details
    await _googleSignIn.signOut(); // Also sign out from Google
    _user = null;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    print('DEBUG: Google Sign-In button pressed. Initializing flow...');
    try {
      final GoogleSignIn googleSignIn = _googleSignIn;

      // Sign out first to force the account picker to show every time
      print('DEBUG: Signing out from existing session...');
      await googleSignIn.signOut();

      print('DEBUG: Requesting Google Sign-In Dialog...');
      final GoogleSignInAccount? account = await googleSignIn.signIn();

      if (account == null) {
        print('DEBUG: User cancelled the account selection dialog.');
        _isLoading = false;
        notifyListeners();
        return false;
      }

      print('DEBUG: Google Account Selected: ${account.email}');
      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken ?? auth.accessToken;

      print('DEBUG: idToken obtained: ${auth.idToken != null ? "YES" : "NO"}');
      print('DEBUG: accessToken obtained: ${auth.accessToken != null ? "YES" : "NO"}');

      if (idToken == null) {
        print('DEBUG: ERROR - Both idToken and accessToken are NULL!');
        _error = 'Google sign-in failed: could not obtain authentication token.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      print('DEBUG: Sending selected token to LuxeStay backend API...');
      final result = await _authRepository.signInWithGoogle(idToken);

      return result.fold(
        (failure) {
          print('DEBUG: Backend Auth Failed! Error: ${failure.message}');
          _error = failure.message;
          _isLoading = false;
          notifyListeners();
          return false;
        },
        (data) async {
          final (user, token) = data;
          print('DEBUG: Backend Auth SUCCESS! User: ${user.name}, Email: ${user.email}');
          _user = user;
          await _saveAuthData(user, token);
          _isLoading = false;
          notifyListeners();
          return true;
        },
      );
    } catch (e) {
      print('DEBUG: Caught Exception during Google Sign-In flow: ${e.toString()}');
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

    final result = await _authRepository.updateProfile(
      name: name,
      phone: phone,
      city: city,
      profileImage: profileImage,
      coverImage: coverImage,
    );

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (user) async {
        _user = user;
        await _saveAuthData(user, null);
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  Future<String?> uploadImage(String base64Image) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.uploadImage(base64Image);

    return result.fold(
      (failure) {
        _error = failure.message;
        _isLoading = false;
        notifyListeners();
        return null;
      },
      (url) {
        _isLoading = false;
        notifyListeners();
        return url;
      },
    );
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
    final prefs = await SharedPreferences.getInstance();
    if (token != null) {
      await prefs.setString(AppConstants.tokenKey, token);
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
        paymentMethods: user.paymentMethods.map((pm) {
          if (pm is PaymentMethodModel) return pm;
          return PaymentMethodModel(
            type: pm.type,
            brand: pm.brand,
            last4: pm.last4,
            expiry: pm.expiry,
            upiId: pm.upiId,
            bankName: pm.bankName,
            isDefault: pm.isDefault,
          );
        }).toList(),
      );
      final userJson = jsonEncode(userModel.toJson());
      await prefs.setString('user_data', userJson);
    } catch (e) {
      debugPrint('Error caching user data: $e');
    }
  }

  Future<bool> changePassword(String oldPassword, String newPassword) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.changePassword(oldPassword, newPassword);

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

  Future<bool> sendFirebaseSignInLink(String email, String name, String phone) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final acs = ActionCodeSettings(
        url: 'https://hotel-mgnt-8ffff.firebaseapp.com/firebase-auth?email=$email',
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
      final email = prefs.getString('email_for_link') ?? '';
      final name = prefs.getString('pending_name');
      final phone = prefs.getString('pending_phone');

      if (email.isEmpty) {
        throw Exception("No email found for verification link. Please sign up again.");
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
            await prefs.remove('email_for_link');
            await prefs.remove('pending_name');
            await prefs.remove('pending_phone');

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
    _devOtp = null;
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
            if (otp != 'success') {
              _devOtp = otp;
            }
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

  Future<bool> signInWithPhoneOtp(String smsCode, {required String verificationId, required String phoneNumber}) async {
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
