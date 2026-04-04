import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../core/theme/app_theme.dart';
import '../../core/constants/api_constants.dart';
import '../../data/repositories/complaint_repository.dart';

class CreateComplaintScreen extends StatefulWidget {
  const CreateComplaintScreen({super.key});
  @override State<CreateComplaintScreen> createState() => _CreateComplaintScreenState();
}

class _CreateComplaintScreenState extends State<CreateComplaintScreen> {
  int _step = 0;
  final _formKey = GlobalKey<FormState>();
  String _productType = 'tire';
  final _productNameCtrl = TextEditingController();
  int _quantity = 1;
  String _reason = 'defective';
  final _descCtrl = TextEditingController();
  final List<File> _images = [];
  bool _submitting = false;

  final _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    if (_images.length >= 5) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Max 5 images'))); return; }
    final xFile = await _picker.pickImage(source: source, imageQuality: 80, maxWidth: 1920);
    if (xFile != null) setState(() => _images.add(File(xFile.path)));
  }

  Future<void> _submit() async {
    setState(() => _submitting = true);
    try {
      final repo = ComplaintRepository();
      final result = await repo.createComplaint(
        productType: _productType, productName: _productNameCtrl.text, quantity: _quantity,
        reason: _reason, description: _descCtrl.text, images: _images,
      );
      if (!mounted) return;
      showDialog(context: context, builder: (ctx) => AlertDialog(
        title: const Text('Complaint Created!'),
        content: Text('ID: ${result['complaintId']}'),
        actions: [TextButton(onPressed: () { Navigator.pop(ctx); Navigator.pop(context, true); }, child: const Text('OK'))],
      ));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: ${e.toString()}')));
    } finally { if (mounted) setState(() => _submitting = false); }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Complaint')),
      body: Column(children: [
        // Step indicator
        Padding(padding: const EdgeInsets.all(16), child: Row(children: List.generate(3, (i) =>
          Expanded(child: Container(
            margin: EdgeInsets.only(left: i > 0 ? 4 : 0, right: i < 2 ? 4 : 0),
            height: 4,
            decoration: BoxDecoration(color: i <= _step ? AppTheme.primary : Colors.grey.shade200, borderRadius: BorderRadius.circular(2)),
          )),
        ))),
        Expanded(child: _buildStep()),
      ]),
      bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        if (_step > 0) Expanded(child: OutlinedButton(onPressed: () => setState(() => _step--), child: const Text('Back'))),
        if (_step > 0) const SizedBox(width: 12),
        Expanded(child: ElevatedButton(
          onPressed: _step == 2 ? (_submitting ? null : _submit) : _validateAndNext,
          child: _submitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(_step == 2 ? 'Submit' : 'Next'),
        )),
      ]))),
    );
  }

  void _validateAndNext() {
    if (_step == 0 && _formKey.currentState!.validate()) { setState(() => _step = 1); }
    else if (_step == 1 && _images.isNotEmpty) { setState(() => _step = 2); }
    else if (_step == 1) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Add at least 1 image'))); }
  }

  Widget _buildStep() {
    switch (_step) {
      case 0: return _buildDetailsStep();
      case 1: return _buildImagesStep();
      case 2: return _buildReviewStep();
      default: return const SizedBox();
    }
  }

  Widget _buildDetailsStep() => SingleChildScrollView(padding: const EdgeInsets.all(16), child: Form(key: _formKey, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Product Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
    const SizedBox(height: 16),
    DropdownButtonFormField<String>(initialValue: _productType, decoration: const InputDecoration(labelText: 'Product Type'),
      items: AppConstants.productTypes.map((t) => DropdownMenuItem(value: t, child: Text(AppConstants.productTypeLabels[t]!))).toList(),
      onChanged: (v) => setState(() => _productType = v!)),
    const SizedBox(height: 12),
    TextFormField(controller: _productNameCtrl, decoration: const InputDecoration(labelText: 'Product Name/Model'), validator: (v) => v?.isEmpty ?? true ? 'Required' : null),
    const SizedBox(height: 12),
    Row(children: [
      const Expanded(child: Text('Quantity', style: TextStyle(fontWeight: FontWeight.w500))),
      IconButton(onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null, icon: const Icon(Icons.remove_circle_outline)),
      Text('$_quantity', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      IconButton(onPressed: () => setState(() => _quantity++), icon: const Icon(Icons.add_circle_outline)),
    ]),
    const SizedBox(height: 12),
    DropdownButtonFormField<String>(initialValue: _reason, decoration: const InputDecoration(labelText: 'Return Reason'),
      items: AppConstants.returnReasons.map((r) => DropdownMenuItem(value: r, child: Text(AppConstants.reasonLabels[r]!))).toList(),
      onChanged: (v) => setState(() => _reason = v!)),
    const SizedBox(height: 12),
    TextFormField(controller: _descCtrl, decoration: InputDecoration(labelText: 'Description (optional)', counterText: '${_descCtrl.text.length}/1000'),
      maxLines: 3, maxLength: 1000, onChanged: (_) => setState(() {})),
  ])));

  Widget _buildImagesStep() => Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Product Images', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
    Text('Min 1, max 5 images', style: TextStyle(color: AppTheme.textMuted, fontSize: 13)),
    const SizedBox(height: 16),
    Row(children: [
      _ImageSourceBtn(icon: Icons.camera_alt, label: 'Camera', onTap: () => _pickImage(ImageSource.camera)),
      const SizedBox(width: 12),
      _ImageSourceBtn(icon: Icons.photo_library, label: 'Gallery', onTap: () => _pickImage(ImageSource.gallery)),
    ]),
    const SizedBox(height: 16),
    Expanded(child: GridView.count(crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8, children: _images.map((f) => Stack(children: [
      ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(f, width: double.infinity, height: double.infinity, fit: BoxFit.cover)),
      Positioned(top: 4, right: 4, child: GestureDetector(onTap: () => setState(() => _images.remove(f)),
        child: Container(padding: const EdgeInsets.all(4), decoration: BoxDecoration(color: Colors.black54, shape: BoxShape.circle), child: const Icon(Icons.close, color: Colors.white, size: 14)))),
    ])).toList())),
  ]));

  Widget _buildReviewStep() => SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Review & Submit', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
    const SizedBox(height: 16),
    _ReviewRow('Product Type', AppConstants.productTypeLabels[_productType]!),
    _ReviewRow('Product Name', _productNameCtrl.text),
    _ReviewRow('Quantity', '$_quantity'),
    _ReviewRow('Reason', AppConstants.reasonLabels[_reason]!),
    if (_descCtrl.text.isNotEmpty) _ReviewRow('Description', _descCtrl.text),
    const SizedBox(height: 12),
    Text('Images (${_images.length})', style: const TextStyle(fontWeight: FontWeight.w600)),
    const SizedBox(height: 8),
    SizedBox(height: 80, child: ListView(scrollDirection: Axis.horizontal, children: _images.map((f) => Container(margin: const EdgeInsets.only(right: 8), child: ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.file(f, width: 80, height: 80, fit: BoxFit.cover)))).toList())),
  ]));
}

class _ImageSourceBtn extends StatelessWidget {
  final IconData icon; final String label; final VoidCallback onTap;
  const _ImageSourceBtn({required this.icon, required this.label, required this.onTap});
  @override Widget build(BuildContext context) => Expanded(child: OutlinedButton.icon(onPressed: onTap, icon: Icon(icon), label: Text(label), style: OutlinedButton.styleFrom(padding: const EdgeInsets.all(16), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)))));
}

class _ReviewRow extends StatelessWidget {
  final String label; final String value;
  const _ReviewRow(this.label, this.value);
  @override Widget build(BuildContext context) => Padding(padding: const EdgeInsets.only(bottom: 12), child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
    SizedBox(width: 120, child: Text(label, style: TextStyle(color: AppTheme.textMuted, fontSize: 13))),
    Expanded(child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500))),
  ]));
}
