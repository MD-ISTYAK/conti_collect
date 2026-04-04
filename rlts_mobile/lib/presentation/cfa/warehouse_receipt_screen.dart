import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../data/repositories/cfa_repository.dart';

class WarehouseReceiptScreen extends StatefulWidget {
  const WarehouseReceiptScreen({super.key});
  @override State<WarehouseReceiptScreen> createState() => _WarehouseReceiptScreenState();
}

class _WarehouseReceiptScreenState extends State<WarehouseReceiptScreen> {
  Map<String, dynamic>? _complaint;
  final List<File> _photos = [];
  final _qtyCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  bool _submitting = false;

  @override void didChangeDependencies() {
    super.didChangeDependencies();
    final arg = ModalRoute.of(context)?.settings.arguments;
    if (arg is Map<String, dynamic>) {
      _complaint = arg;
      _qtyCtrl.text = '${arg['quantity'] ?? 0}';
    }
  }

  Future<void> _pickPhoto() async {
    if (_photos.length >= 10) return;
    final xFile = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80);
    if (xFile != null) setState(() => _photos.add(File(xFile.path)));
  }

  Future<void> _submit() async {
    if (_photos.isEmpty) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add at least 1 photo'))); return; }
    setState(() => _submitting = true);
    try {
      await CfaRepository().submitReceive(
        complaintId: _complaint!['_id'],
        warehousePhotos: _photos,
        receivedQuantity: int.parse(_qtyCtrl.text),
        conditionNotes: _notesCtrl.text.isEmpty ? null : _notesCtrl.text,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Receipt submitted!'), backgroundColor: Colors.green));
      Navigator.pop(context, true);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally { if (mounted) setState(() => _submitting = false); }
  }

  @override
  Widget build(BuildContext context) {
    final expectedQty = _complaint?['quantity'] ?? 0;
    final enteredQty = int.tryParse(_qtyCtrl.text) ?? 0;
    final mismatch = enteredQty != expectedQty && _qtyCtrl.text.isNotEmpty;

    return Scaffold(
      appBar: AppBar(title: Text('Receipt: ${_complaint?['complaintId'] ?? ''}')),
      body: SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Warehouse Receipt', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 16),

        ElevatedButton.icon(onPressed: _pickPhoto, icon: const Icon(Icons.camera_alt), label: Text('Take Photo (${_photos.length}/10)')),
        if (_photos.isNotEmpty) ...[const SizedBox(height: 12), SizedBox(height: 100, child: ListView(scrollDirection: Axis.horizontal, children: _photos.map((f) => Container(margin: const EdgeInsets.only(right: 8), child: ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(f, width: 100, height: 100, fit: BoxFit.cover)))).toList()))],

        const SizedBox(height: 20),
        TextField(controller: _qtyCtrl, decoration: InputDecoration(labelText: 'Received Quantity', helperText: 'Expected: $expectedQty'), keyboardType: TextInputType.number, onChanged: (_) => setState(() {})),
        if (mismatch) Container(margin: const EdgeInsets.only(top: 8), padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.orange.shade50, borderRadius: BorderRadius.circular(12)),
          child: Row(children: [const Icon(Icons.warning, color: Colors.orange, size: 20), const SizedBox(width: 8), Expanded(child: Text('Quantity mismatch! Expected $expectedQty, entered $enteredQty', style: TextStyle(color: Colors.orange.shade800, fontSize: 13)))])),

        const SizedBox(height: 16),
        TextField(controller: _notesCtrl, decoration: InputDecoration(labelText: mismatch ? 'Condition Notes (required)' : 'Condition Notes (optional)'), maxLines: 3),

        const SizedBox(height: 24),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _submitting ? null : _submit,
          child: _submitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Submit Receipt'),
        )),
      ])),
    );
  }
}
