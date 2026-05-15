import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:google_sign_in/google_sign_in.dart';
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

    _isLoading = true;
    notifyListeners();

    final result = await _authRepository.getMe();
    
    return result.fold(
      (failure) async {
        await prefs.remove(AppConstants.tokenKey);
        _isLoading = false;
        notifyListeners();
        return false;
      },
      (user) {
        _user = user;
        _isLoading = false;
        notifyListeners();
        return true;
      },
    );
  }

  void logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(AppConstants.tokenKey);
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
    // We only save the token for now as getMe fetches the user on startup.
    // However, keeping _user in memory is enough for the current session.
  }
}
