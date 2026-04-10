import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/complaint_repository.dart';
import '../../data/repositories/auth_repository.dart';
import '../shared/status_badge.dart';

class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({super.key});
  @override State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  Map<String, dynamic>? _complaint;
  Map<String, dynamic>? _currentUser;
  bool _loading = true;

  @override void didChangeDependencies() { super.didChangeDependencies(); _load(); }

  Future<void> _load() async {
    final id = ModalRoute.of(context)?.settings.arguments as String?;
    if (id == null) return;
    try {
      final repo = ComplaintRepository();
      final authRepo = AuthRepository();
      final data = await repo.getComplaint(id);
      final user = await authRepo.getStoredUser();
      setState(() { _complaint = data; _currentUser = user; _loading = false; });
    } catch (e) { setState(() => _loading = false); }
  }

  Future<void> _requestReschedule() async {
    final complaint = _complaint;
    if (complaint == null) return;

    // Step 1: Pick a proposed date
    final now = DateTime.now();
    final pickedDate = await showDatePicker(
      context: context,
      initialDate: now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 60)),
      helpText: 'Select proposed pickup date',
    );
    if (pickedDate == null || !mounted) return;

    // Step 2: Pick a time
    final pickedTime = await showTimePicker(
      context: context,
      initialTime: const TimeOfDay(hour: 10, minute: 0),
      helpText: 'Select proposed pickup time',
    );
    if (pickedTime == null || !mounted) return;

    final proposedDateTime = DateTime(
      pickedDate.year, pickedDate.month, pickedDate.day,
      pickedTime.hour, pickedTime.minute,
    );

    // Step 3: Submit
    try {
      showDialog(context: context, barrierDismissible: false, builder: (c) => const Center(child: CircularProgressIndicator()));
      await ComplaintRepository().requestReschedule(
        complaint['_id'],
        proposedDate: proposedDateTime.toIso8601String(),
      );
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: const Text('Reschedule requested successfully!'), backgroundColor: Colors.green.shade600, behavior: SnackBarBehavior.floating));
      _load();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      String errorMsg = 'Failed to request reschedule.';
      if (e is DioException) {
        errorMsg = e.response?.data?['message'] ?? e.message ?? errorMsg;
      }
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $errorMsg'), backgroundColor: Colors.red.shade600, behavior: SnackBarBehavior.floating));
    }
  }

  Future<void> _proposePickup() async {
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
      pickedDate.year, pickedDate.month, pickedDate.day,
      pickedTime.hour, pickedTime.minute,
    );

    try {
      showDialog(context: context, barrierDismissible: false, builder: (c) => const Center(child: CircularProgressIndicator()));
      await ComplaintRepository().proposePickup(_complaint!['_id'], proposedDateTime.toIso8601String());
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pickup date proposed!'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
      _load();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red, behavior: SnackBarBehavior.floating));
    }
  }

  Future<void> _confirmPickup() async {
    try {
      showDialog(context: context, barrierDismissible: false, builder: (c) => const Center(child: CircularProgressIndicator()));
      await ComplaintRepository().confirmPickup(_complaint!['_id']);
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pickup date confirmed!'), backgroundColor: Colors.green, behavior: SnackBarBehavior.floating));
      _load();
    } catch (e) {
      if (mounted) Navigator.pop(context);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red, behavior: SnackBarBehavior.floating));
    }
  }

  @override
  Widget build(BuildContext context) {
    final isRescheduleEligible = _complaint != null &&
        ['APPROVED', 'CFA_ASSIGNED'].contains(_complaint!['status']) &&
        _complaint!['estimatedPickupDate'] != null &&
        DateTime.parse(_complaint!['estimatedPickupDate']).isBefore(DateTime.now());

    return Scaffold(
      appBar: AppBar(
        title: Text(_complaint?['complaintId'] ?? 'Details'),
        actions: [
          if (isRescheduleEligible)
            TextButton.icon(
              onPressed: _requestReschedule,
              icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
              label: const Text('Reschedule', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: _loading ? const Center(child: CircularProgressIndicator())
        : _complaint == null ? const Center(child: Text('Not found'))
        : SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Center(child: StatusBadge(status: _complaint!['status'] ?? '')),
            const SizedBox(height: 16),
            _Section('Product Details', [
              _InfoRow('Type', _complaint!['productType']),
              _InfoRow('Name', _complaint!['productName']),
              _InfoRow('Quantity', '${_complaint!['quantity']}'),
              _InfoRow('Reason', _complaint!['reason']),
              if (_complaint!['description'] != null) _InfoRow('Description', _complaint!['description']),
            ]),
            _buildScheduleSection(),
            if (_complaint!['rejectionReason'] != null) Container(
              margin: const EdgeInsets.only(top: 12), padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.red.shade50, borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('Rejection Reason', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.red)),
                const SizedBox(height: 4),
                Text(_complaint!['rejectionReason'], style: const TextStyle(color: Colors.red)),
              ]),
            ),
            if (_complaint!['refundAmount'] != null) Container(
              margin: const EdgeInsets.only(top: 12), padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('💰 Refund', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.green)),
                Text('₹${_complaint!['refundAmount']}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.green)),
                if (_complaint!['refundReference'] != null) Text('Ref: ${_complaint!['refundReference']}', style: TextStyle(color: Colors.green.shade700)),
              ]),
            ),
            const SizedBox(height: 16),
            const Text('Timeline', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(height: 8),
            ...(_complaint!['timeline'] as List? ?? []).map((e) => _TimelineEntry(e)),
          ])),
    );
  }

  Widget _buildScheduleSection() {
    if (_complaint == null) return const SizedBox.shrink();
    
    final status = _complaint!['status'];
    if (!['APPROVED', 'CFA_ASSIGNED'].contains(status)) return const SizedBox.shrink();

    final scheduleStatus = _complaint!['pickupScheduleStatus'] ?? 'NOT_SCHEDULED';
    final proposedBy = _complaint!['pickupProposedBy'];
    final isProposer = _currentUser != null && proposedBy != null && proposedBy == _currentUser!['_id'];
    final proposedDate = _complaint!['proposedPickupDate'] != null ? DateTime.parse(_complaint!['proposedPickupDate']) : null;
    final confirmedDate = _complaint!['estimatedPickupDate'] != null ? DateTime.parse(_complaint!['estimatedPickupDate']) : null;

    String statusText = 'Not Scheduled';
    Color statusColor = AppTheme.textMuted;
    List<Widget> actions = [];

    if (scheduleStatus == 'CONFIRMED' && confirmedDate != null) {
      statusText = 'Confirmed for ${confirmedDate.day}/${confirmedDate.month}/${confirmedDate.year}';
      statusColor = AppTheme.success;
      actions.add(OutlinedButton(onPressed: _proposePickup, child: const Text('Change Schedule')));
    } else if (scheduleStatus == 'PROPOSED' && proposedDate != null) {
      if (isProposer) {
        statusText = 'Waiting for response...';
        statusColor = AppTheme.warning;
        actions.add(OutlinedButton(onPressed: _proposePickup, child: const Text('Edit Proposal')));
      } else {
        final otherRole = _currentUser?['role'] == 'dealer' ? 'CFA' : 'Dealer';
        statusText = '$otherRole proposed ${proposedDate.day}/${proposedDate.month}/${proposedDate.year}';
        statusColor = AppTheme.primary;
        actions.add(ElevatedButton(onPressed: _confirmPickup, child: const Text('Confirm Schedule')));
        actions.add(const SizedBox(height: 8));
        actions.add(OutlinedButton(onPressed: _proposePickup, child: const Text('Propose Different Date')));
      }
    } else {
      actions.add(ElevatedButton(onPressed: _proposePickup, child: const Text('Schedule Pickup')));
    }

    return _Section('Pickup Schedule', [
      Row(children: [
        Icon(Icons.calendar_today, size: 16, color: statusColor),
        const SizedBox(width: 8),
        Text(statusText, style: TextStyle(color: statusColor, fontWeight: FontWeight.w600)),
      ]),
      if (actions.isNotEmpty) ...[
        const SizedBox(height: 12),
        ...actions,
      ]
    ]);
  }
}

class _Section extends StatelessWidget {
  final String title; final List<Widget> children;
  const _Section(this.title, this.children);
  @override Widget build(BuildContext context) => Card(child: Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
    const Divider(), ...children,
  ])));
}

class _InfoRow extends StatelessWidget {
  final String label; final String? value;
  const _InfoRow(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Row(children: [
    SizedBox(width: 100, child: Text(label, style: const TextStyle(color: AppTheme.textMuted, fontSize: 13))),
    Expanded(child: Text(value ?? '—', style: const TextStyle(fontWeight: FontWeight.w500))),
  ]));
}

class _TimelineEntry extends StatelessWidget {
  final Map<String, dynamic> entry;
  const _TimelineEntry(this.entry);
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 8), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Column(children: [Container(width: 12, height: 12, decoration: BoxDecoration(color: AppTheme.primary, shape: BoxShape.circle)), Container(width: 2, height: 30, color: Colors.grey.shade200)]),
    const SizedBox(width: 12),
    Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      StatusBadge(status: entry['status'] ?? ''),
      const SizedBox(height: 2),
      if (entry['note'] != null) Text(entry['note'], style: const TextStyle(fontSize: 12, color: AppTheme.textMuted)),
    ])),
  ]));
}
