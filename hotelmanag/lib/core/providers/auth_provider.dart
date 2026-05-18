import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'dart:convert';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/entities/user_entity.dart';
import '../../features/auth/data/models/user_model.dart';
import '../constants/app_constants.dart';

class AuthProvider extends ChangeNotifier {
  final AuthRepository _authRepository;
  UserEntity? _user;
  bool _isLoading = false;
  String? _error;

  AuthProvider(this._authRepository);

  UserEntity? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isAuthenticated => _user != null;

  Future<void> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.login(email, password);

    result.fold(
      (failure) {
        _error = failure.message;
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
    notifyListeners();

    final result = await _authRepository.register(name, email, password, phone);

    result.fold(
      (failure) {
        _error = failure.message;
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

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
    await prefs.remove('user_favorites'); // Clear favorites on logout
    await prefs.remove('user_data'); // Clear cached user details
    await GoogleSignIn().signOut(); // Also sign out from Google
    _user = null;
    notifyListeners();
  }

  Future<bool> signInWithGoogle() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final GoogleSignIn googleSignIn = GoogleSignIn();
      final GoogleSignInAccount? account = await googleSignIn.signIn();
      
      if (account == null) {
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final GoogleSignInAuthentication auth = await account.authentication;
      final String? idToken = auth.idToken;

      if (idToken == null) {
        _error = "Could not get ID Token from Google";
        _isLoading = false;
        notifyListeners();
        return false;
      }

      final result = await _authRepository.signInWithGoogle(idToken);

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
}
