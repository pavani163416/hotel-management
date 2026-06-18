import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../constants/app_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../providers/auth_provider.dart';
import '../utils/injection_container.dart';

class ApiService {
  final Dio _dio;

  ApiService(this._dio) {
    _dio.options.baseUrl = AppConstants.apiBaseUrl;
    _dio.options.connectTimeout = const Duration(seconds: 30);
    _dio.options.receiveTimeout = const Duration(seconds: 30);
    _dio.options.sendTimeout = const Duration(seconds: 30); // TC-053 Fix
    _dio.options.headers['Content-Type'] = 'application/json';
    _dio.options.headers['Origin'] =
        'https://hotel-management-frontend-blue-nine.vercel.app';

    if (!kIsWeb) {
      _dio.httpClientAdapter = IOHttpClientAdapter(
        createHttpClient: () {
          final client = HttpClient(context: SecurityContext.defaultContext);
          client.badCertificateCallback =
              (X509Certificate cert, String host, int port) {
                // Do not allow bad certificates in production.
                return false;
              };
          return client;
        },
        validateCertificate: (cert, host, port) {
          // Allow standard Android CA validation to succeed
          return true;
        },
      );
    }

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final storage = const FlutterSecureStorage();
          final token = await storage.read(key: AppConstants.tokenKey);

          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }

          return handler.next(options);
        },
        onError: (DioException e, handler) {
          if (e.response?.statusCode == 401) {
            try {
              if (sl.isRegistered<AuthProvider>()) {
                sl<AuthProvider>().logout();
              }
            } catch (err, stack) {
              debugPrint(
                '[ApiService] Error during 401 unauthorized logout: $err\n$stack',
              );
            }
          }
          // Convert network/timeout errors into a friendlier DioException
          if (e.type == DioExceptionType.connectionError ||
              e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.receiveTimeout) {
            return handler.next(
              DioException(
                requestOptions: e.requestOptions,
                type: e.type,
                error: e.error,
                message:
                    'Unable to connect to the server. Please check your internet connection.',
              ),
            );
          }
          return handler.next(e);
        },
      ),
    );
  }

  Future<Response> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    return await _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) async {
    return await _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) async {
    return await _dio.put(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) async {
    return await _dio.patch(path, data: data);
  }

  Future<Response> delete(String path) async {
    return await _dio.delete(path);
  }
}
