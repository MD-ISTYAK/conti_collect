import 'package:flutter/material.dart';
import '../../data/repositories/complaint_repository.dart';
import '../shared/status_badge.dart';

class ComplaintListScreen extends StatefulWidget {
  const ComplaintListScreen({super.key});
  @override State<ComplaintListScreen> createState() => _ComplaintListScreenState();
}

class _ComplaintListScreenState extends State<ComplaintListScreen> {
  List<dynamic> _complaints = [];
  bool _loading = true;
  String? _statusFilter;

  @override void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final repo = ComplaintRepository();
      final res = await repo.getMyComplaints(status: _statusFilter);
      setState(() { _complaints = res['data'] as List? ?? []; _loading = false; });
    } catch (e) { setState(() => _loading = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Complaints')),
      body: Column(children: [
        SizedBox(height: 44, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 12), children: [
          _FilterChip(label: 'All', selected: _statusFilter == null, onTap: () { _statusFilter = null; _load(); }),
          for (final s in ['CREATED','APPROVED','CFA_ASSIGNED','PICKED_UP','RECEIVED_AT_CFA','VERIFIED','REFUND_PROCESSED'])
            _FilterChip(label: s.replaceAll('_', ' '), selected: _statusFilter == s, onTap: () { _statusFilter = s; _load(); }),
        ])),
        Expanded(child: _loading ? const Center(child: CircularProgressIndicator())
          : _complaints.isEmpty ? const Center(child: Text('No complaints found', style: TextStyle(color: Colors.grey)))
          : RefreshIndicator(onRefresh: _load, child: ListView.builder(
              padding: const EdgeInsets.all(16), itemCount: _complaints.length,
              itemBuilder: (_, i) {
                final c = _complaints[i];
                return Card(margin: const EdgeInsets.only(bottom: 8), child: ListTile(
                  onTap: () => Navigator.pushNamed(context, '/dealer/complaint', arguments: c['_id']),
                  title: Text(c['complaintId'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('${c['productName'] ?? ''} · Qty: ${c['quantity']}', style: const TextStyle(fontSize: 13)),
                  trailing: StatusBadge(status: c['status'] ?? ''),
                ));
              },
            ))),
      ]),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label; final bool selected; final VoidCallback onTap;
  const _FilterChip({required this.label, required this.selected, required this.onTap});
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(right: 6), child: ChoiceChip(label: Text(label, style: TextStyle(fontSize: 11)), selected: selected, onSelected: (_) => onTap()));
}
