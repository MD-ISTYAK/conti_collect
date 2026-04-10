import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/cfa_repository.dart';
import '../../data/repositories/complaint_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../shared/status_badge.dart';

class CfaDealerComplaintsScreen extends StatefulWidget {
  const CfaDealerComplaintsScreen({super.key});
  @override
  State<CfaDealerComplaintsScreen> createState() =>
      _CfaDealerComplaintsScreenState();
}

class _CfaDealerComplaintsScreenState extends State<CfaDealerComplaintsScreen> {
  List<dynamic> _allComplaints = [];
  List<dynamic> _filtered = [];
  bool _loading = true;
  String _activeFilter = 'All';
  Map<String, dynamic>? _dealer;
  Map<String, dynamic>? _currentUser;

  static const List<String> _filters = [
    'All',
    'Created',
    'Assigned',
    'Picked Up',
    'Not Picked',
    'Scheduled',
    'Not Scheduled',
  ];

  static const Map<String, IconData> _filterIcons = {
    'All': Icons.list_alt_rounded,
    'Created': Icons.add_circle_outline_rounded,
    'Assigned': Icons.assignment_ind_rounded,
    'Picked Up': Icons.local_shipping_rounded,
    'Not Picked': Icons.warning_amber_rounded,
    'Scheduled': Icons.event_available_rounded,
    'Not Scheduled': Icons.event_busy_rounded,
  };

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && _dealer == null) {
      _dealer = args['dealer'];
      _allComplaints = List<dynamic>.from(args['complaints'] ?? []);
      _loadUser();
      _applyFilter();
      setState(() => _loading = false);
    }
  }

  Future<void> _loadUser() async {
    final user = await AuthRepository().getStoredUser();
    if (mounted) setState(() => _currentUser = user);
  }

  void _applyFilter() {
    final now = DateTime.now();
    switch (_activeFilter) {
      case 'Created':
        _filtered = _allComplaints
            .where((c) => c['status'] == 'CREATED' || c['status'] == 'APPROVED')
            .toList();
        break;
      case 'Assigned':
        _filtered = _allComplaints
            .where((c) => c['status'] == 'CFA_ASSIGNED')
            .toList();
        break;
      case 'Picked Up':
        _filtered =
            _allComplaints.where((c) => c['status'] == 'PICKED_UP').toList();
        break;
      case 'Not Picked':
        _filtered = _allComplaints.where((c) {
          if (c['status'] != 'CFA_ASSIGNED') return false;
          final pickup = c['estimatedPickupDate'];
          if (pickup == null) return true;
          return DateTime.parse(pickup).isBefore(now);
        }).toList();
        break;
      case 'Scheduled':
        _filtered = _allComplaints
            .where((c) => c['estimatedPickupDate'] != null)
            .toList();
        break;
      case 'Not Scheduled':
        _filtered = _allComplaints
            .where((c) => c['estimatedPickupDate'] == null)
            .toList();
        break;
      default:
        _filtered = List<dynamic>.from(_allComplaints);
    }
  }

  Future<void> _refresh() async {
    setState(() => _loading = true);
    try {
      final repo = CfaRepository();
      final all = await repo.getAssigned();
      final dealerId = _dealer?['_id'];
      _allComplaints = all.where((c) {
        final d = c['dealerId'];
        if (d is Map) return d['_id'] == dealerId;
        return d == dealerId;
      }).toList();
      _applyFilter();
    } catch (e) {
      // Error handled silently
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _confirmPickup(String id) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (c) => const Center(child: CircularProgressIndicator()),
      );
      await ComplaintRepository().confirmPickup(id);
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Pickup date confirmed!'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ));
      }
      _refresh();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed: $e'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ));
      }
    }
  }

  Future<void> _requestReschedule(String id) async {
    final now = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
      helpText: 'Select proposed pickup date',
    );
    if (pickedDate == null || !mounted) return;

    final pickedTime = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
      helpText: 'Select proposed pickup time',
    );
    if (pickedTime == null || !mounted) return;

    final proposedDateTime = DateTime(
      pickedDate.year,
      pickedDate.month,
      pickedDate.day,
      pickedTime.hour,
      pickedTime.minute,
    );

    try {
      showDialog(
          context: context,
          barrierDismissible: false,
          builder: (c) => const Center(child: CircularProgressIndicator()));
      await ComplaintRepository().proposePickup(
        id,
        proposedDateTime.toIso8601String(),
      );
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
            content: Text('Pickup proposed!'),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating));
      }
      _refresh();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('Failed: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating));
      }
    }
  }

  void _onComplaintTap(Map<String, dynamic> complaint) {
    final status = complaint['status'];
    if (status == 'CFA_ASSIGNED') {
      Navigator.pushNamed(context, '/cfa/pickup', arguments: complaint)
          .then((_) => _refresh());
    } else if (status == 'PICKED_UP') {
      Navigator.pushNamed(context, '/cfa/receive', arguments: complaint)
          .then((_) => _refresh());
    } else {
      Navigator.pushNamed(context, '/dealer/complaint',
              arguments: complaint['_id'])
          .then((_) => _refresh());
    }
  }

  @override
  Widget build(BuildContext context) {
    final dealerName = _dealer?['name'] ?? 'Dealer';
    final businessName = _dealer?['businessName'];

    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(dealerName,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
            if (businessName != null)
              Text(businessName,
                  style:
                      TextStyle(fontSize: 12, color: AppTheme.textSecondary)),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  // Filter Chips Bar
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: AppTheme.surface,
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.04),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: SizedBox(
                      height: 40,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: _filters.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 8),
                        itemBuilder: (context, index) {
                          final filter = _filters[index];
                          final isActive = _activeFilter == filter;
                          final count = _getFilterCount(filter);
                          return _buildFilterChip(filter, isActive, count);
                        },
                      ),
                    ),
                  ),

                  // Results count
                  Padding(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        Text(
                          '${_filtered.length} complaint${_filtered.length != 1 ? 's' : ''}',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const Spacer(),
                        if (_activeFilter != 'All')
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                _activeFilter = 'All';
                                _applyFilter();
                              });
                            },
                            child: Row(
                              children: [
                                Icon(Icons.clear, size: 14, color: AppTheme.primary),
                                const SizedBox(width: 2),
                                Text('Clear filter',
                                    style: TextStyle(
                                        fontSize: 12,
                                        color: AppTheme.primary,
                                        fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),

                  // Complaint List
                  Expanded(
                    child: _filtered.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.inbox_rounded,
                                    size: 56, color: AppTheme.textMuted),
                                const SizedBox(height: 12),
                                Text('No complaints found',
                                    style: TextStyle(
                                        color: AppTheme.textSecondary,
                                        fontSize: 15)),
                                const SizedBox(height: 4),
                                Text('Try changing the filter',
                                    style: TextStyle(
                                        color: AppTheme.textMuted,
                                        fontSize: 13)),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: _filtered.length,
                            itemBuilder: (_, i) => _buildComplaintCard(
                                _filtered[i] as Map<String, dynamic>),
                          ),
                  ),
                ],
              ),
      ),
    );
  }

  int _getFilterCount(String filter) {
    final now = DateTime.now();
    switch (filter) {
      case 'Created':
        return _allComplaints
            .where((c) => c['status'] == 'CREATED' || c['status'] == 'APPROVED')
            .length;
      case 'Assigned':
        return _allComplaints
            .where((c) => c['status'] == 'CFA_ASSIGNED')
            .length;
      case 'Picked Up':
        return _allComplaints
            .where((c) => c['status'] == 'PICKED_UP')
            .length;
      case 'Not Picked':
        return _allComplaints.where((c) {
          if (c['status'] != 'CFA_ASSIGNED') return false;
          final pickup = c['estimatedPickupDate'];
          if (pickup == null) return true;
          return DateTime.parse(pickup).isBefore(now);
        }).length;
      case 'Scheduled':
        return _allComplaints
            .where((c) => c['estimatedPickupDate'] != null)
            .length;
      case 'Not Scheduled':
        return _allComplaints
            .where((c) => c['estimatedPickupDate'] == null)
            .length;
      default:
        return _allComplaints.length;
    }
  }

  Widget _buildFilterChip(String label, bool isActive, int count) {
    final icon = _filterIcons[label] ?? Icons.filter_list;
    return GestureDetector(
      onTap: () {
        setState(() {
          _activeFilter = label;
          _applyFilter();
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isActive
              ? AppTheme.primary
              : AppTheme.primary.withValues(alpha: 0.06),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isActive
                ? AppTheme.primary
                : AppTheme.primary.withValues(alpha: 0.15),
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon,
                size: 15,
                color: isActive ? Colors.white : AppTheme.primary),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: isActive ? Colors.white : AppTheme.primary,
              ),
            ),
            if (count > 0) ...[
              const SizedBox(width: 6),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                decoration: BoxDecoration(
                  color: isActive
                      ? Colors.white.withValues(alpha: 0.25)
                      : AppTheme.primary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  '$count',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: isActive ? Colors.white : AppTheme.primary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildComplaintCard(Map<String, dynamic> complaint) {
    final status = complaint['status'] ?? '';
    final statusColor = AppTheme.getStatusColor(status);
    final isMissed = complaint['estimatedPickupDate'] != null &&
        status == 'CFA_ASSIGNED' &&
        DateTime.parse(complaint['estimatedPickupDate'])
            .isBefore(DateTime.now());

    String? pickupDateStr;
    if (complaint['estimatedPickupDate'] != null) {
      final d = DateTime.parse(complaint['estimatedPickupDate']);
      pickupDateStr =
          '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isMissed
            ? BorderSide(color: AppTheme.danger.withValues(alpha: 0.4), width: 1.5)
            : BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: () => _onComplaintTap(complaint),
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 4,
                        height: 24,
                        decoration: BoxDecoration(
                          color: statusColor,
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Text(
                        complaint['complaintId'] ?? '',
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          letterSpacing: 0.3,
                        ),
                      ),
                    ],
                  ),
                  StatusBadge(status: status),
                ],
              ),
              const SizedBox(height: 10),

              // Product info
              Row(
                children: [
                  Icon(Icons.inventory_2_outlined,
                      size: 16, color: AppTheme.textMuted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${complaint['productName']} · x${complaint['quantity']}',
                      style: const TextStyle(
                          fontWeight: FontWeight.w500, fontSize: 14),
                    ),
                  ),
                ],
              ),

              // Pickup date
              if (pickupDateStr != null) ...[
                const SizedBox(height: 6),
                Row(
                  children: [
                    Icon(
                      isMissed
                          ? Icons.event_busy_rounded
                          : Icons.event_available_rounded,
                      size: 16,
                      color: isMissed ? AppTheme.danger : AppTheme.textMuted,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Pickup: $pickupDateStr',
                      style: TextStyle(
                        fontSize: 12,
                        color: isMissed ? AppTheme.danger : AppTheme.textMuted,
                        fontWeight:
                            isMissed ? FontWeight.w600 : FontWeight.w400,
                      ),
                    ),
                    if (isMissed) ...[
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: AppTheme.danger.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('Missed',
                            style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.danger)),
                      ),
                    ],
                  ],
                ),
              ],

              // Actions
              if (complaint['pickupScheduleStatus'] == 'PROPOSED' &&
                  _currentUser != null &&
                  complaint['pickupProposedBy'] != null &&
                  complaint['pickupProposedBy'] != _currentUser!['_id']) ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _confirmPickup(complaint['_id']),
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Confirm Dealer\'s Schedule'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primary,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ] else if (isMissed || (status == 'CFA_ASSIGNED' && complaint['estimatedPickupDate'] == null)) ...[
                const SizedBox(height: 10),
                SizedBox(
                  height: 36,
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _requestReschedule(complaint['_id']),
                    icon: const Icon(Icons.calendar_month, size: 14),
                    label: Text(isMissed ? 'Request Reschedule' : 'Propose Schedule',
                        style: const TextStyle(fontSize: 12)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primary,
                      side: BorderSide(color: AppTheme.primary.withValues(alpha: 0.3)),
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
