class ApiConstants {
  static const String baseUrl = 'https://conti-collect.onrender.com/api';
  // static const String baseUrl =
      // 'http://192.168.1.19:5000/api'; // Physical Device / Emulator on same network
  // static const String baseUrl = 'http://10.0.2.2:5000/api'; // Android emulator

  // Auth
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';
  static const String changePassword = '/auth/change-password';
  static const String fcmToken = '/auth/fcm-token';

  // Complaints
  static const String complaints = '/complaints';
  static const String myComplaints = '/complaints/mine';

  // CFA
  static const String cfaAssigned = '/cfa/assigned';
  static String cfaPickup(String id) => '/cfa/pickup/$id';
  static String cfaReceive(String id) => '/cfa/receive/$id';
  static String cfaScan(String complaintId) => '/cfa/scan/$complaintId';

  // Notifications
  static const String notifications = '/notifications';
  static const String readAllNotifications = '/notifications/read-all';
  static String readNotification(String id) => '/notifications/$id/read';

  // Complaint detail helpers
  static String complaintDetail(String id) => '/complaints/$id';
  static String complaintTimeline(String id) => '/complaints/$id/timeline';
  static String complaintProof(String id) => '/complaints/$id/proof';
  static String complaintQr(String id) => '/complaints/$id/qr';
  static String complaintReschedule(String id) =>
      '/complaints/$id/request-reschedule';
  static String proposePickup(String id) => '/complaints/$id/propose-pickup';
  static String confirmPickup(String id) => '/complaints/$id/confirm-pickup';
}

class AppConstants {
  static const String appName = 'Conti Collect';
  static const String googleMapsApiKey =
      'AIzaSyDzCAoTb1j3706Uf-3G2gI1CrJmiMJxd7s';

  static const List<String> productTypes = [
    'tire',
    'glass',
    'motor_part',
    'battery',
    'other'
  ];
  static const List<String> returnReasons = [
    'defective',
    'wrong_item',
    'damaged',
    'expired',
    'other'
  ];

  static const Map<String, String> productTypeLabels = {
    'tire': 'Tire',
    'glass': 'Glass',
    'motor_part': 'Motor Part',
    'battery': 'Battery',
    'other': 'Other',
  };

  static const Map<String, String> reasonLabels = {
    'defective': 'Defective',
    'wrong_item': 'Wrong Item',
    'damaged': 'Damaged',
    'expired': 'Expired',
    'other': 'Other',
  };
}
