import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/auth/domain/entities/user_entity.dart';
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
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.tokenKey, token);
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
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(AppConstants.tokenKey, token);
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
    _user = null;
    notifyListeners();
  }

  Future<bool> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    final result = await _authRepository.updateProfile(
      name: name,
      phone: phone,
      city: city,
      profileImage: profileImage,
    );

    return result.fold(
      (failure) {
        _error = failure.message;
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
}
