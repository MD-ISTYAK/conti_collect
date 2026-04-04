import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  const StatusBadge({super.key, required this.status});

  static const Map<String, String> _labels = {
    'CREATED': 'Created', 'APPROVED': 'Approved', 'CFA_ASSIGNED': 'Assigned',
    'PICKED_UP': 'Picked Up', 'RECEIVED_AT_CFA': 'Received', 'VERIFIED': 'Verified',
    'REFUND_PROCESSED': 'Refunded', 'REJECTED': 'Rejected',
  };

  @override
  Widget build(BuildContext context) {
    final color = AppTheme.getStatusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(_labels[status] ?? status, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}
