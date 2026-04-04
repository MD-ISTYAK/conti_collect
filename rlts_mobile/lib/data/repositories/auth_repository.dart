import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../datasources/api_client.dart';
import '../../core/constants/api_constants.dart';

class AuthRepository {
  final ApiClient _api = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _api.post(ApiConstants.login, data: {
      'email': email,
      'password': password,
    });

    final data = response.data['data'];
    await _storage.write(key: 'accessToken', value: data['accessToken']);
    await _storage.write(key: 'refreshToken', value: data['refreshToken']);
    await _storage.write(key: 'user', value: jsonEncode(data['user']));

    return data['user'];
  }

  Future<void> logout() async {
    try {
      await _api.post(ApiConstants.logout);
    } catch (_) {}
    await _storage.deleteAll();
  }

  Future<Map<String, dynamic>?> getStoredUser() async {
    final userStr = await _storage.read(key: 'user');
    if (userStr == null) return null;
    return jsonDecode(userStr) as Map<String, dynamic>;
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: 'accessToken');
    return token != null;
  }

  Future<Map<String, dynamic>> getMe() async {
    final response = await _api.get(ApiConstants.me);
    return response.data['data'];
  }

  Future<String?> getUserRole() async {
    final user = await getStoredUser();
    return user?['role'];
  }
}
