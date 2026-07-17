import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/auth/data/models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponse> login(
    String email,
    String password, {
    String? captchaId,
    String? captchaAnswer,
  });
  Future<AuthResponse> register(
    String name,
    String email,
    String password,
    String phone, {
    String? city,
    String? captchaId,
    String? captchaAnswer,
  });
  Future<AuthResponse> verifyOtp(String email, String code);
  Future<String?> resendOtp(String email);
  Future<AuthResponse> signInWithGoogle(String idToken);
  Future<AuthResponse> signInWithFirebase(
    String idToken, {
    String? name,
    String? phone,
  });
  Future<UserModel> getMe(String token);
  Future<UserModel> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
    String? coverImage,
  });
  Future<bool> updatePreferences({
    required bool emailUpdates,
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
  Future<bool> forgotPassword(String email);

  Future<(String, String)?> fetchCaptcha();
}

class AuthResponse {
  final UserModel user;
  final String token;
  final String? otp;

  AuthResponse({required this.user, required this.token, this.otp});
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiService _apiService;

  AuthRemoteDataSourceImpl(this._apiService);

  @override
  Future<(String, String)?> fetchCaptcha() async {
    final response = await _apiService.get('auth/captcha');
    if (response.data != null && response.data['success'] == true) {
      final d = response.data['data'];
      if (d != null) {
        String challenge = d['challenge']?.toString() ?? '';
        // flutter_svg does not support percentage width/height in rect tags.
        challenge = challenge.replaceAll('width="100%"', 'width="150"');
        challenge = challenge.replaceAll('height="100%"', 'height="50"');
        // flutter_svg crashes on comma-separated viewBox values
        challenge = challenge.replaceAll(
          'viewBox="0,0,200,60"',
          'viewBox="0 0 200 60"',
        );
        challenge = challenge.replaceAll(
          'viewBox="0,0,150,50"',
          'viewBox="0 0 150 50"',
        );
        return (d['captchaId']?.toString() ?? '', challenge);
      }
    }
    return null;
  }



  @override
  Future<bool> forgotPassword(String email) async {
    final response = await _apiService.post(
      'auth/forgot-password',
      data: {'email': email},
    );
    return response.data['success'] ?? false;
  }

  @override
  Future<AuthResponse> login(
    String email,
    String password, {
    String? captchaId,
    String? captchaAnswer,
  }) async {
    final response = await _apiService.post(
      'auth/login',
      data: {
        'email': email,
        'password': password,
        if (captchaId != null) 'captchaId': captchaId,
        if (captchaAnswer != null) 'captchaAnswer': captchaAnswer,
      },
    );

    final data = response.data['data'];
    if (data == null) {
      throw Exception(
        response.data['message'] ?? 'Invalid response from server',
      );
    }

    return AuthResponse(
      user: UserModel.fromJson(data),
      token: data['token'] ?? '',
    );
  }

  @override
  Future<AuthResponse> register(
    String name,
    String email,
    String password,
    String phone, {
    String? city,
    String? captchaId,
    String? captchaAnswer,
  }) async {
    final response = await _apiService.post(
      'auth/register',
      data: {
        'name': name,
        'email': email,
        'password': password,
        'phone': phone,
        if (city != null) 'city': city,
        if (captchaId != null) 'captchaId': captchaId,
        if (captchaAnswer != null) 'captchaAnswer': captchaAnswer,
      },
    );

    final data = response.data['data'];
    if (data == null) {
      throw Exception(
        response.data['message'] ?? 'Registration failed: Invalid response',
      );
    }

    return AuthResponse(
      user: UserModel.fromJson(data),
      token: data['token'] ?? '',
      otp: response.data['otp']?.toString(),
    );
  }

  @override
  Future<AuthResponse> verifyOtp(String email, String code) async {
    final response = await _apiService.post(
      'auth/verify-otp',
      data: {'email': email, 'code': code},
    );

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
  Future<String?> resendOtp(String email) async {
    final response = await _apiService.post(
      'auth/resend-otp',
      data: {'email': email},
    );
    return response.data['otp']?.toString();
  }

  @override
  Future<AuthResponse> signInWithGoogle(String idToken) async {
    final response = await _apiService.post(
      'auth/google',
      data: {'idToken': idToken},
    );

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
  Future<AuthResponse> signInWithFirebase(
    String idToken, {
    String? name,
    String? phone,
  }) async {
    final response = await _apiService.post(
      'auth/firebase',
      data: {
        'idToken': idToken,
        if (name != null) 'name': name,
        if (phone != null) 'phone': phone,
      },
    );

    final data = response.data['data'];
    if (data == null) {
      throw Exception(response.data['message'] ?? 'Firebase sign-in failed');
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
    final response = await _apiService.patch(
      'auth/profile',
      data: {
        if (name != null) 'name': name,
        if (phone != null) 'phone': phone,
        if (city != null) 'city': city,
        if (profileImage != null) 'profileImage': profileImage,
        if (coverImage != null) 'coverImage': coverImage,
      },
    );
    return UserModel.fromJson(response.data['data']);
  }

  @override
  Future<bool> updatePreferences({
    required bool emailUpdates,
  }) async {
    final response = await _apiService.patch(
      'auth/preferences',
      data: {
        'emailUpdates': emailUpdates,
      },
    );
    return response.data['success'] == true;
  }

  @override
  Future<String> uploadImage(String base64Image) async {
    String mimeType = 'image/jpeg';
    if (base64Image.startsWith('iVBOR')) {
      mimeType = 'image/png';
    } else if (base64Image.startsWith('UklGR')) {
      mimeType = 'image/webp';
    }

    final response = await _apiService.post(
      'upload/image',
      data: {
        'image': 'data:$mimeType;base64,$base64Image',
        'folder': 'profiles',
      },
    );
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
    final response = await _apiService.post(
      'auth/payment-methods',
      data: {
        'type': type,
        'brand': brand,
        'last4': last4,
        'expiry': expiry,
        'upiId': upiId,
        'bankName': bankName,
        'isDefault': isDefault,
      },
    );

    final List data = response.data['data'];
    return data.map((pm) => PaymentMethodModel.fromJson(pm)).toList();
  }

  @override
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    final response = await _apiService.post(
      'auth/change-password',
      data: {'oldPassword': oldPassword, 'newPassword': newPassword},
    );
    return response.data['success'] ?? false;
  }
}
