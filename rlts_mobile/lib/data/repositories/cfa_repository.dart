import 'dart:io';
import 'package:dio/dio.dart';
import '../datasources/api_client.dart';
import '../../core/constants/api_constants.dart';

class CfaRepository {
  final ApiClient _api = ApiClient();

  Future<List<dynamic>> getAssigned() async {
    final response = await _api.get(ApiConstants.cfaAssigned);
    return response.data['data'] as List;
  }

  /// Fetch all complaints assigned to this CFA (all statuses), with optional filter.
  Future<List<dynamic>> getComplaints({String? status}) async {
    final params = <String, dynamic>{'limit': 100};
    if (status != null) params['status'] = status;
    final response = await _api.get(ApiConstants.myComplaints, queryParameters: params);
    return (response.data['data'] as List?) ?? [];
  }

  Future<Map<String, dynamic>> scanQR(String complaintId) async {
    final response = await _api.get(ApiConstants.cfaScan(complaintId));
    return response.data['data'];
  }

  Future<Map<String, dynamic>> submitPickup({
    required String complaintId,
    required List<File> pickupPhotos,
    required File signatureImage,
    required String dealerName,
    required double lat,
    required double lng,
    double? accuracy,
    String? address,
  }) async {
    final formData = FormData.fromMap({
      'dealerName': dealerName,
      'gpsLocation': '{"lat":$lat,"lng":$lng,"accuracy":${accuracy ?? 0},"address":"${address ?? ""}"}',
      'pickupPhotos': pickupPhotos.map((f) => MultipartFile.fromFileSync(f.path)).toList(),
      'signatureImage': MultipartFile.fromFileSync(signatureImage.path),
    });

    final response = await _api.post(
      ApiConstants.cfaPickup(complaintId),
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return response.data;
  }

  Future<Map<String, dynamic>> submitReceive({
    required String complaintId,
    required List<File> warehousePhotos,
    required int receivedQuantity,
    String? conditionNotes,
  }) async {
    final formData = FormData.fromMap({
      'receivedQuantity': receivedQuantity,
      if (conditionNotes != null) 'conditionNotes': conditionNotes,
      'warehousePhotos': warehousePhotos.map((f) => MultipartFile.fromFileSync(f.path)).toList(),
    });

    final response = await _api.post(
      ApiConstants.cfaReceive(complaintId),
      data: formData,
      options: Options(contentType: 'multipart/form-data'),
    );
    return response.data;
  }
}
