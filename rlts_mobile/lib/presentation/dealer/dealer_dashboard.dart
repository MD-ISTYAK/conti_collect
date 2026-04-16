import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/complaint_repository.dart';
import '../shared/status_badge.dart';

class DealerDashboard extends StatefulWidget {
  const DealerDashboard({super.key});
  @override State<DealerDashboard> createState() => _DealerDashboardState();
}

class _DealerDashboardState extends State<DealerDashboard> {
  Map<String, dynamic>? _user;
  List<dynamic> _complaints = [];
  bool _loading = true;
  Map<String, int> _stats = {'total': 0, 'pending': 0, 'inProgress': 0, 'completed': 0};

  @override
  void initState() { super.initState(); _loadData(); }

  Future<void> _loadData() async {
    try {
      final authRepo = AuthRepository();
      final complaintRepo = ComplaintRepository();
      _user = await authRepo.getStoredUser();
      final res = await complaintRepo.getMyComplaints();
      final data = res['data'] as List? ?? [];
      setState(() {
        _complaints = data;
        _stats = {
          'total': data.length,
          'pending': data.where((c) => c['status'] == 'CREATED').length,
          'inProgress': data.where((c) => ['APPROVED','CFA_ASSIGNED','PICKED_UP','RECEIVED_AT_CFA','VERIFIED'].contains(c['status'])).length,
          'completed': data.where((c) => c['status'] == 'REFUND_PROCESSED').length,
        };
        _loading = false;
      });
    } catch (e) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Hello, ${_user?['name']?.split(' ').first ?? 'Dealer'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          Text('Welcome back', style: TextStyle(fontSize: 12, color: AppTheme.textMuted, fontWeight: FontWeight.w400)),
        ]),
        actions: [
          Stack(children: [
            IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () => Navigator.pushNamed(context, '/notifications')),
          ]),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await AuthRepository().logout();
              if (mounted) {
                Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
              }
            },
            tooltip: 'Logout',
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: _loading 
          ? const Center(child: CircularProgressIndicator())
          : ListView(padding: const EdgeInsets.all(16), children: [
              // Stats
              GridView.count(crossAxisCount: 2, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(), mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 1.35, children: [
                _StatCard(label: 'Total', value: _stats['total']!, color: AppTheme.primary, icon: Icons.folder_outlined),
                _StatCard(label: 'Pending', value: _stats['pending']!, color: AppTheme.warning, icon: Icons.pending_outlined),
                _StatCard(label: 'In Progress', value: _stats['inProgress']!, color: AppTheme.info, icon: Icons.autorenew),
                _StatCard(label: 'Completed', value: _stats['completed']!, color: AppTheme.success, icon: Icons.check_circle_outline),
              ]),
              const SizedBox(height: 24),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                const Text('Recent Complaints', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                TextButton(onPressed: () => Navigator.pushNamed(context, '/dealer/complaints'), child: const Text('View All')),
              ]),
              const SizedBox(height: 8),
              if (_complaints.isEmpty)
                Container(padding: const EdgeInsets.all(40), child: Column(children: [
                  Icon(Icons.inbox_outlined, size: 60, color: AppTheme.textMuted),
                  const SizedBox(height: 12),
                  const Text('No complaints yet', style: TextStyle(color: AppTheme.textSecondary)),
                ]))
              else
                ..._complaints.take(5).map((c) => _ComplaintCard(complaint: c, onTap: () => Navigator.pushNamed(context, '/dealer/complaint', arguments: c['_id']))),
            ]),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/dealer/create'),
        icon: const Icon(Icons.add),
        label: const Text('New Complaint'),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label; final int value; final Color color; final IconData icon;
  const _StatCard({required this.label, required this.value, required this.color, required this.icon});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(16), border: Border.all(color: color.withValues(alpha: 0.15))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(height: 8),
        Text('$value', style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800, color: color)),
        Text(label, style: TextStyle(fontSize: 12, color: color.withValues(alpha: 0.7), fontWeight: FontWeight.w500)),
      ]),
    );
  }
}

class _ComplaintCard extends StatelessWidget {
  final Map<String, dynamic> complaint; final VoidCallback onTap;
  const _ComplaintCard({required this.complaint, required this.onTap});
  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        title: Text(complaint['complaintId'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(complaint['productName'] ?? '', style: const TextStyle(fontSize: 13)),
        trailing: StatusBadge(status: complaint['status'] ?? ''),
      ),
    );
  }
}
