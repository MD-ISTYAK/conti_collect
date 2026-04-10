import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'presentation/auth/splash_screen.dart';
import 'presentation/auth/login_screen.dart';
import 'presentation/dealer/dealer_dashboard.dart';
import 'presentation/dealer/create_complaint_screen.dart';
import 'presentation/dealer/complaint_list_screen.dart';
import 'presentation/dealer/complaint_detail_screen.dart';
import 'presentation/cfa/cfa_dashboard.dart';
import 'presentation/cfa/cfa_dealer_complaints_screen.dart';
import 'presentation/cfa/pickup_screen.dart';
import 'presentation/cfa/warehouse_receipt_screen.dart';
import 'presentation/shared/notification_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const RLTSApp());
}

class RLTSApp extends StatelessWidget {
  const RLTSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Conti Collect - RLTS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/splash',
      routes: {
        '/splash': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/dealer': (context) => const DealerDashboard(),
        '/dealer/create': (context) => const CreateComplaintScreen(),
        '/dealer/complaints': (context) => const ComplaintListScreen(),
        '/dealer/complaint': (context) => const ComplaintDetailScreen(),
        '/cfa': (context) => const CfaDashboard(),
        '/cfa/dealer-complaints': (context) => const CfaDealerComplaintsScreen(),
        '/cfa/pickup': (context) => const PickupScreen(),
        '/cfa/receive': (context) => const WarehouseReceiptScreen(),
        '/notifications': (context) => const NotificationScreen(),
      },
    );
  }
}
