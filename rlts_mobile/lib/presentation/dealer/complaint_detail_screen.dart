import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/complaint_repository.dart';
import '../shared/status_badge.dart';

class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({super.key});
  @override State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  Map<String, dynamic>? _complaint;
  bool _loading = true;

  @override void didChangeDependencies() { super.didChangeDependencies(); _load(); }

  Future<void> _load() async {
    final id = ModalRoute.of(context)?.settings.arguments as String?;
    if (id == null) return;
    try {
      final repo = ComplaintRepository();
      final data = await repo.getComplaint(id);
      setState(() { _complaint = data; _loading = false; });
    } catch (e) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_complaint?['complaintId'] ?? 'Details')),
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
