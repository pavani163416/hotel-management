import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/auth/data/models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponse> login(String email, String password);
  Future<AuthResponse> register(String name, String email, String password, String phone);
  Future<AuthResponse> verifyOtp(String email, String code);
  Future<void> resendOtp(String email);
  Future<AuthResponse> signInWithGoogle(String idToken);
  Future<UserModel> getMe(String token);
  Future<UserModel> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
    String? coverImage,
  });
  Future<String> uploadImage(String base64Image);
  Future<List<PaymentMethodModel>> addPaymentMethod({
    required String type,
    String? brand,
    String? last4,
    String? expiry,
    String? upiId,
    String? bankName,
    bool isDefault = false,
  });
  Future<bool> changePassword(String oldPassword, String newPassword);
}

class AuthResponse {
  final UserModel user;
  final String token;

  AuthResponse({required this.user, required this.token});
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiService _apiService;

  AuthRemoteDataSourceImpl(this._apiService);

  @override
  Future<AuthResponse> login(String email, String password) async {
    final response = await _apiService.post('auth/login', data: {
      'email': email,
      'password': password,
    });

    final data = response.data['data'];
    if (data == null) {
      throw Exception(response.data['message'] ?? 'Invalid response from server');
    }

    // DEBUG: See what the server sent
    print('LOGIN DATA: $data');

    return AuthResponse(
      user: UserModel.fromJson(data),
      token: data['token'] ?? '',
    );
  }

  @override
  Future<AuthResponse> register(String name, String email, String password, String phone) async {
    final response = await _apiService.post('auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
      'phone': phone,
    });

    final data = response.data['data'];
    if (data == null) {
      throw Exception(response.data['message'] ?? 'Registration failed: Invalid response');
    }

    return AuthResponse(
      user: UserModel.fromJson(data),
      token: data['token'] ?? '',
    );
  }

  @override
  Future<AuthResponse> verifyOtp(String email, String code) async {
    final response = await _apiService.post('auth/verify-otp', data: {
      'email': email,
      'code': code,
    });

    final data = response.data['data'];
    if (data == null) {
      throw Exception(response.data['message'] ?? 'OTP Verification failed');
    }

    return AuthResponse(
      user: UserModel.fromJson(data),
      token: data['token'] ?? '',
    );
  }

  @override
  Future<void> resendOtp(String email) async {
    await _apiService.post('auth/resend-otp', data: {
      'email': email,
    });
  }

  @override
  Future<AuthResponse> signInWithGoogle(String idToken) async {
    final response = await _apiService.post('auth/google', data: {
      'idToken': idToken,
    });

    final data = response.data['data'];
    if (data == null) {
      throw Exception(response.data['message'] ?? 'Google login failed');
    }

    return AuthResponse(
      user: UserModel.fromJson(data),
      token: data['token'] ?? '',
    );
  }

  @override
  Future<UserModel> getMe(String token) async {
    final response = await _apiService.get('auth/me');
    return UserModel.fromJson(response.data['data']);
  }

  @override
  Future<UserModel> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
    String? coverImage,
  }) async {
    final response = await _apiService.patch('auth/profile', data: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (city != null) 'city': city,
      if (profileImage != null) 'profileImage': profileImage,
      if (coverImage != null) 'coverImage': coverImage,
    });
    return UserModel.fromJson(response.data['data']);
  }

  @override
  Future<String> uploadImage(String base64Image) async {
    final response = await _apiService.post('upload/image', data: {
      'image': 'data:image/jpeg;base64,$base64Image',
      'folder': 'profiles',
    });
    return response.data['url'];
  }

  @override
  Future<List<PaymentMethodModel>> addPaymentMethod({
    required String type,
    String? brand,
    String? last4,
    String? expiry,
    String? upiId,
    String? bankName,
    bool isDefault = false,
  }) async {
    final response = await _apiService.post('auth/payment-methods', data: {
      'type': type,
      'brand': brand,
      'last4': last4,
      'expiry': expiry,
      'upiId': upiId,
      'bankName': bankName,
      'isDefault': isDefault,
    });

    final List data = response.data['data'];
    return data.map((pm) => PaymentMethodModel.fromJson(pm)).toList();
  }

  @override
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    final response = await _apiService.post('auth/change-password', data: {
      'oldPassword': oldPassword,
      'newPassword': newPassword,
    });
    return response.data['success'] ?? false;
  }
}
