import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../core/constants/api_constants.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  ApiClient._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: ApiConstants.baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'accessToken');
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          try {
            final refreshToken = await _storage.read(key: 'refreshToken');
            if (refreshToken == null) {
              handler.reject(error);
              return;
            }
            final response = await Dio().post(
              '${ApiConstants.baseUrl}${ApiConstants.refresh}',
              data: {'refreshToken': refreshToken},
            );
            final newAccess = response.data['data']['accessToken'];
            final newRefresh = response.data['data']['refreshToken'];
            await _storage.write(key: 'accessToken', value: newAccess);
            await _storage.write(key: 'refreshToken', value: newRefresh);
            error.requestOptions.headers['Authorization'] = 'Bearer $newAccess';
            final retryResponse = await _dio.fetch(error.requestOptions);
            handler.resolve(retryResponse);
          } catch (e) {
            await _storage.deleteAll();
            handler.reject(error);
          }
        } else {
          handler.next(error);
        }
      },
    ));
  }

  Dio get dio => _dio;

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) =>
      _dio.get(path, queryParameters: queryParameters);

  Future<Response> post(String path, {dynamic data, Options? options}) =>
      _dio.post(path, data: data, options: options);

  Future<Response> put(String path, {dynamic data}) =>
      _dio.put(path, data: data);

  Future<Response> delete(String path) =>
      _dio.delete(path);
}
