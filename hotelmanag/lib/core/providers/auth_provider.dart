import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
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

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository;
  UserEntity? _user;
  bool _isLoading = false;
  String? _error;
  String? _unverifiedEmail;

  AuthProvider(this._authRepository);

  UserEntity? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get unverifiedEmail => _unverifiedEmail;
  bool get isAuthenticated => _user != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    _unverifiedEmail = null;
    notifyListeners();

    final result = await _authRepository.login(email, password);

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
      },
    );
  }

  Future<void> register(String name, String email, String password, String phone) async {
    _isLoading = true;
    _error = null;
    _unverifiedEmail = null;
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
        notifyListeners();
      } catch (e) {
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
          await storage.delete(key: AppConstants.tokenKey);
          await storage.delete(key: 'user_data');
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

  // Native Google Sign-In helper. Using the Web Client ID of the hotel-mgmt project.
  // We use clientId on Web and serverClientId on mobile.
  final GoogleSignIn _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile', 'openid'],
    clientId: kIsWeb ? '70312411330-8givsb0ktr8f09u8ullo157vkppkoqqv.apps.googleusercontent.com' : null,
    serverClientId: kIsWeb ? null : '70312411330-8givsb0ktr8f09u8ullo157vkppkoqqv.apps.googleusercontent.com',
  );

  void logout() async {
    const storage = FlutterSecureStorage();
    final prefs = await SharedPreferences.getInstance();
    await storage.delete(key: AppConstants.tokenKey);
    await prefs.remove('user_favorites');
    await storage.delete(key: 'user_data');
    await _googleSignIn.signOut();
    _user = null;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    try {
      _isLoading = true;
      notifyListeners();

      // Sign out from any current session to force account picker
      await _googleSignIn.signOut().catchError((_) {});

      final GoogleSignInAccount? account = await _googleSignIn.signIn();

      if (account == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken ?? auth.accessToken;

      if (idToken == null || idToken.isEmpty) {
        _error = 'Google sign-in failed: no token received.';
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final res = await _authRepository.signInWithGoogle(idToken);

      return res.fold(
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
      await storage.write(key: 'user_data', value: userJson);
    } catch (e) {
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
