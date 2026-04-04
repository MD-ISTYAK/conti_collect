import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/cfa_repository.dart';
import '../shared/status_badge.dart';

class CfaDashboard extends StatefulWidget {
  const CfaDashboard({super.key});
  @override State<CfaDashboard> createState() => _CfaDashboardState();
}

class _CfaDashboardState extends State<CfaDashboard> {
  Map<String, dynamic>? _user;
  List<dynamic> _assigned = [];
  bool _loading = true;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final authRepo = AuthRepository();
      final cfaRepo = CfaRepository();
      _user = await authRepo.getStoredUser();
      _assigned = await cfaRepo.getAssigned();
    } catch (e) { debugPrint('Load error: $e'); }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final pending = _assigned.where((c) => c['status'] == 'CFA_ASSIGNED').toList();
    final pickedUp = _assigned.where((c) => c['status'] == 'PICKED_UP').toList();

    return Scaffold(
      appBar: AppBar(
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${_user?['name'] ?? 'CFA Agent'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
          Text('CFA Dashboard', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () => Navigator.pushNamed(context, '/notifications')),
          IconButton(icon: const Icon(Icons.logout), onPressed: () async { await AuthRepository().logout(); if (context.mounted) Navigator.pushReplacementNamed(context, '/login'); }),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading ? const Center(child: CircularProgressIndicator())
          : ListView(padding: const EdgeInsets.all(16), children: [
              // Stats
              Row(children: [
                _StatCard(label: 'Pending Pickup', value: pending.length, color: AppTheme.warning),
                const SizedBox(width: 12),
                _StatCard(label: 'In Transit', value: pickedUp.length, color: AppTheme.info),
              ]),
              const SizedBox(height: 24),

              if (pending.isNotEmpty) ...[
                const Text('Pending Pickups', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...pending.map((c) => _AssignmentCard(complaint: c, onPickup: () => Navigator.pushNamed(context, '/cfa/pickup', arguments: c).then((_) => _load()))),
                const SizedBox(height: 16),
              ],

              if (pickedUp.isNotEmpty) ...[
                const Text('Awaiting Warehouse Receipt', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
                const SizedBox(height: 8),
                ...pickedUp.map((c) => _AssignmentCard(complaint: c, onPickup: () => Navigator.pushNamed(context, '/cfa/receive', arguments: c).then((_) => _load()))),
              ],

              if (_assigned.isEmpty) Center(child: Padding(padding: const EdgeInsets.all(40), child: Column(children: [
                Icon(Icons.check_circle_outline, size: 60, color: AppTheme.success),
                const SizedBox(height: 12),
                const Text('No pending assignments', style: TextStyle(color: AppTheme.textSecondary)),
              ]))),
            ]),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label; final int value; final Color color;
  const _StatCard({required this.label, required this.value, required this.color});
  @override Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(16)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('$value', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w800, color: color)),
      Text(label, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w500)),
    ]),
  ));
}

class _AssignmentCard extends StatelessWidget {
  final Map<String, dynamic> complaint; final VoidCallback onPickup;
  const _AssignmentCard({required this.complaint, required this.onPickup});
  @override Widget build(BuildContext context) {
    final dealer = complaint['dealerId'] as Map<String, dynamic>?;
    return Card(margin: const EdgeInsets.only(bottom: 8), child: InkWell(onTap: onPickup, borderRadius: BorderRadius.circular(16), child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(complaint['complaintId'] ?? '', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
        StatusBadge(status: complaint['status'] ?? ''),
      ]),
      const SizedBox(height: 8),
      Text('${complaint['productName']} · x${complaint['quantity']}', style: const TextStyle(fontWeight: FontWeight.w500)),
      if (dealer != null) ...[
        const SizedBox(height: 4),
        Text('Dealer: ${dealer['name']}', style: TextStyle(fontSize: 13, color: AppTheme.textSecondary)),
        if (dealer['address'] != null) Text('${dealer['address']['city'] ?? ''}, ${dealer['address']['state'] ?? ''}', style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
      ],
    ]))));
  }
}
