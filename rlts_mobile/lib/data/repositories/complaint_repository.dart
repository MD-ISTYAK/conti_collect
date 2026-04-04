import 'dart:io';
import 'package:dio/dio.dart';
import '../datasources/api_client.dart';
import '../../core/constants/api_constants.dart';

class ComplaintRepository {
  final ApiClient _api = ApiClient();

  Future<Map<String, dynamic>> getMyComplaints({int page = 1, String? status}) async {
    final params = <String, dynamic>{'page': page, 'limit': 20};
    if (status != null) params['status'] = status;
    final response = await _api.get(ApiConstants.myComplaints, queryParameters: params);
    return response.data;
  }

  Future<Map<String, dynamic>> getComplaint(String id) async {
    final response = await _api.get(ApiConstants.complaintDetail(id));
    return response.data['data'];
  }

  Future<List<dynamic>> getTimeline(String id) async {
    final response = await _api.get(ApiConstants.complaintTimeline(id));
    return response.data['data'] as List;
  }

  Future<Map<String, dynamic>?> getProof(String id) async {
    try {
      final response = await _api.get(ApiConstants.complaintProof(id));
      return response.data['data'];
    } catch (e) {
      return null;
    }
  }

  Future<Map<String, dynamic>> createComplaint({
    required String productType,
    required String productName,
    required int quantity,
    required String reason,
    String? description,
    required List<File> images,
  }) async {
    final formData = FormData.fromMap({
      'productType': productType,
      'productName': productName,
      'quantity': quantity,
      'reason': reason,
      if (description != null) 'description': description,
      'images': images.map((f) => MultipartFile.fromFileSync(f.path, filename: f.path.split('/').last)).toList(),
    });

    final response = await _api.post(
      ApiConstants.complaints,
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return response.data['data'];
  }
}
