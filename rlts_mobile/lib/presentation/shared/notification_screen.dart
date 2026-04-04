import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/datasources/api_client.dart';
import '../../core/constants/api_constants.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});
  @override State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<dynamic> _notifications = [];
  bool _loading = true;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final res = await ApiClient().get(ApiConstants.notifications);
      setState(() { _notifications = res.data['data'] as List? ?? []; _loading = false; });
    } catch (e) { setState(() => _loading = false); }
  }

  Future<void> _markAllRead() async {
    try {
      await ApiClient().put(ApiConstants.readAllNotifications);
      _load();
    } catch (e) { debugPrint(e.toString()); }
  }

  String _timeAgo(String? dateStr) {
    if (dateStr == null) return '';
    final date = DateTime.tryParse(dateStr);
    if (date == null) return '';
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [TextButton(onPressed: _markAllRead, child: const Text('Mark all read'))],
      ),
      body: _loading ? const Center(child: CircularProgressIndicator())
        : _notifications.isEmpty ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.notifications_none, size: 60, color: AppTheme.textMuted),
            const SizedBox(height: 12),
            const Text('No notifications yet', style: TextStyle(color: AppTheme.textSecondary)),
          ]))
        : RefreshIndicator(onRefresh: _load, child: ListView.separated(
            itemCount: _notifications.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (_, i) {
              final n = _notifications[i];
              final unread = n['isRead'] == false;
              return Container(
                decoration: BoxDecoration(
                  border: unread ? const Border(left: BorderSide(color: AppTheme.primary, width: 3)) : null,
                  color: unread ? AppTheme.primary.withValues(alpha: 0.04) : null,
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  leading: CircleAvatar(
                    backgroundColor: _iconColor(n['type']).withValues(alpha: 0.1),
                    child: Icon(_icon(n['type']), color: _iconColor(n['type']), size: 20),
                  ),
                  title: Text(n['title'] ?? '', style: TextStyle(fontWeight: unread ? FontWeight.w600 : FontWeight.w400, fontSize: 14)),
                  subtitle: Text(n['body'] ?? '', style: TextStyle(fontSize: 12, color: AppTheme.textMuted), maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: Text(_timeAgo(n['createdAt']), style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                ),
              );
            },
          )),
    );
  }

  IconData _icon(String? type) => switch (type) {
    'complaint' => Icons.description,
    'pickup' => Icons.local_shipping,
    'refund' => Icons.payments,
    _ => Icons.notifications,
  };

  Color _iconColor(String? type) => switch (type) {
    'complaint' => AppTheme.info,
    'pickup' => AppTheme.warning,
    'refund' => AppTheme.success,
    _ => AppTheme.textMuted,
  };
}
