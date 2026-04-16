import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';
import '../../data/repositories/cfa_repository.dart';

class CfaDashboard extends StatefulWidget {
  const CfaDashboard({super.key});
  @override
  State<CfaDashboard> createState() => _CfaDashboardState();
}

class _CfaDashboardState extends State<CfaDashboard> {
  Map<String, dynamic>? _user;
  List<dynamic> _assigned = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final authRepo = AuthRepository();
      final cfaRepo = CfaRepository();
      _user = await authRepo.getStoredUser();
      _assigned = await cfaRepo.getAssigned();
    } catch (e) {
      debugPrint('Load error: $e');
    }
    if (mounted) setState(() => _loading = false);
  }

  /// Group complaints by dealerId to create dealer entries.
  List<Map<String, dynamic>> _getDealerGroups() {
    final Map<String, Map<String, dynamic>> dealerMap = {};

    for (final complaint in _assigned) {
      final dealer = complaint['dealerEntity'] as Map<String, dynamic>?;
      if (dealer == null) continue;
      final dealerId = dealer['_id'] as String? ?? '';
      if (dealerId.isEmpty) continue;

      if (!dealerMap.containsKey(dealerId)) {
        dealerMap[dealerId] = {
          'dealer': dealer,
          'complaints': <dynamic>[],
          'pendingCount': 0,
          'transitCount': 0,
        };
      }

      (dealerMap[dealerId]!['complaints'] as List).add(complaint);
      if (complaint['status'] == 'CFA_ASSIGNED') {
        dealerMap[dealerId]!['pendingCount'] =
            (dealerMap[dealerId]!['pendingCount'] as int) + 1;
      } else if (complaint['status'] == 'PICKED_UP') {
        dealerMap[dealerId]!['transitCount'] =
            (dealerMap[dealerId]!['transitCount'] as int) + 1;
      }
    }

    return dealerMap.values.toList()
      ..sort((a, b) =>
          (b['pendingCount'] as int).compareTo(a['pendingCount'] as int));
  }

  @override
  Widget build(BuildContext context) {
    final pending =
        _assigned.where((c) => c['status'] == 'CFA_ASSIGNED').toList();
    final pickedUp =
        _assigned.where((c) => c['status'] == 'PICKED_UP').toList();
    final dealerGroups = _getDealerGroups();

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${_user?['name'] ?? 'CFA Agent'}',
                style:
                    const TextStyle(fontSize: 20, fontWeight: FontWeight.w700)),
            Text('CFA Dashboard',
                style: TextStyle(fontSize: 12, color: AppTheme.textMuted)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.pushNamed(context, '/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await AuthRepository().logout();
              if (context.mounted) {
                Navigator.pushReplacementNamed(context, '/login');
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Stats row
                  Row(
                    children: [
                      _StatCard(
                          label: 'Pending Pickup',
                          value: pending.length,
                          color: AppTheme.warning),
                      const SizedBox(width: 12),
                      _StatCard(
                          label: 'In Transit',
                          value: pickedUp.length,
                          color: AppTheme.info),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Section header
                  Row(
                    children: [
                      Icon(Icons.storefront_rounded,
                          size: 20, color: AppTheme.primary),
                      const SizedBox(width: 8),
                      const Text(
                        'Dealers',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text(
                          '${dealerGroups.length}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (dealerGroups.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Icon(Icons.check_circle_outline,
                                size: 60, color: AppTheme.success),
                            const SizedBox(height: 12),
                            const Text('No pending assignments',
                                style: TextStyle(
                                    color: AppTheme.textSecondary)),
                          ],
                        ),
                      ),
                    ),

                  // Dealer cards
                  ...dealerGroups.map((group) => _DealerCard(
                        dealer: group['dealer'] as Map<String, dynamic>,
                        complaints: group['complaints'] as List<dynamic>,
                        pendingCount: group['pendingCount'] as int,
                        transitCount: group['transitCount'] as int,
                        onTap: () {
                          Navigator.pushNamed(
                            context,
                            '/cfa/dealer-complaints',
                            arguments: {
                              'dealer': group['dealer'],
                              'complaints': group['complaints'],
                            },
                          ).then((_) => _load());
                        },
                      )),
                ],
              ),
      ),
    );
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final Color color;
  const _StatCard(
      {required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) => Expanded(
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$value',
                  style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      color: color)),
              Text(label,
                  style: TextStyle(
                      fontSize: 12,
                      color: color,
                      fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      );
}

// ─── Dealer Card ──────────────────────────────────────────────────────────────

class _DealerCard extends StatelessWidget {
  final Map<String, dynamic> dealer;
  final List<dynamic> complaints;
  final int pendingCount;
  final int transitCount;
  final VoidCallback onTap;

  const _DealerCard({
    required this.dealer,
    required this.complaints,
    required this.pendingCount,
    required this.transitCount,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final company = dealer['company'];
    final code = dealer['code'];
    final region = dealer['region'] ?? '';
    
    final bool isCompanySameAsCode = company != null && code != null && company.toString().trim() == code.toString().trim();
    final String displayName = (company != null && company.isNotEmpty && !isCompanySameAsCode) 
        ? company 
        : (code != null ? 'AG: $code' : 'Unknown Dealer');
    final String? subText = (code != null && displayName != 'AG: $code') ? 'AG: $code' : null;
    
    final totalComplaints = complaints.length;

    // Check if any complaint has a missed pickup
    final hasMissed = complaints.any((c) {
      if (c['status'] != 'CFA_ASSIGNED') return false;
      final pickup = c['estimatedPickupDate'];
      if (pickup == null) return false;
      return DateTime.parse(pickup).isBefore(DateTime.now());
    });

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: hasMissed
            ? BorderSide(
                color: AppTheme.danger.withValues(alpha: 0.4), width: 1.5)
            : BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top row — name + arrow
              Row(
                children: [
                  // Name + subText
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (subText != null && subText.isNotEmpty && subText != displayName)
                          Text(
                            subText,
                            style: TextStyle(
                              fontSize: 13,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Arrow + complaint count
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '$totalComplaints',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: AppTheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(Icons.chevron_right_rounded,
                          color: AppTheme.textMuted),
                    ],
                  ),
                ],
              ),

              // Location row
              if (region.isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(Icons.location_on_outlined,
                        size: 14, color: AppTheme.textMuted),
                    const SizedBox(width: 4),
                    Text(region,
                        style: TextStyle(
                            fontSize: 12, color: AppTheme.textMuted)),
                  ],
                ),
              ],

              const SizedBox(height: 12),

              // Status chips row
              Row(
                children: [
                  if (pendingCount > 0)
                    _MiniStatusChip(
                      label: '$pendingCount Pending',
                      color: AppTheme.warning,
                    ),
                  if (pendingCount > 0 && transitCount > 0)
                    const SizedBox(width: 8),
                  if (transitCount > 0)
                    _MiniStatusChip(
                      label: '$transitCount In Transit',
                      color: AppTheme.info,
                    ),
                  if (hasMissed) ...[
                    const SizedBox(width: 8),
                    _MiniStatusChip(
                      label: 'Missed',
                      color: AppTheme.danger,
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Mini Status Chip ─────────────────────────────────────────────────────────

class _MiniStatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const _MiniStatusChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      );
}
