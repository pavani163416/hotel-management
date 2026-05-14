import 'package:hotelmanag/core/network/api_service.dart';
import 'package:hotelmanag/features/auth/data/models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<AuthResponse> login(String email, String password);
  Future<AuthResponse> register(String name, String email, String password, String phone);
  Future<UserModel> getMe(String token);
  Future<UserModel> updateProfile({
    String? name,
    String? phone,
    String? city,
    String? profileImage,
  });
  Future<String> uploadImage(String base64Image);
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
  }) async {
    final response = await _apiService.patch('auth/profile', data: {
      if (name != null) 'name': name,
      if (phone != null) 'phone': phone,
      if (city != null) 'city': city,
      if (profileImage != null) 'profileImage': profileImage,
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
}
