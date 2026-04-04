import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:signature/signature.dart';
import 'package:path_provider/path_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/cfa_repository.dart';

class PickupScreen extends StatefulWidget {
  const PickupScreen({super.key});
  @override State<PickupScreen> createState() => _PickupScreenState();
}

class _PickupScreenState extends State<PickupScreen> {
  int _step = 0;
  Map<String, dynamic>? _complaint;
  final List<File> _photos = [];
  final _sigController = SignatureController(penStrokeWidth: 3, penColor: Colors.black);
  File? _signatureFile;
  Position? _position;
  final _dealerNameCtrl = TextEditingController();
  bool _submitting = false;
  bool _locating = false;

  @override void didChangeDependencies() {
    super.didChangeDependencies();
    final arg = ModalRoute.of(context)?.settings.arguments;
    if (arg is Map<String, dynamic>) _complaint = arg;
    _captureLocation();
  }

  Future<void> _captureLocation() async {
    setState(() => _locating = true);
    try {
      final permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) await Geolocator.requestPermission();
      _position = await Geolocator.getCurrentPosition(locationSettings: const LocationSettings(accuracy: LocationAccuracy.high));
    } catch (e) { debugPrint('GPS error: $e'); }
    if (mounted) setState(() => _locating = false);
  }

  Future<void> _pickPhoto() async {
    if (_photos.length >= 10) return;
    final xFile = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80);
    if (xFile != null) setState(() => _photos.add(File(xFile.path)));
  }

  Future<void> _saveSignature() async {
    if (_sigController.isEmpty) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please draw a signature'))); return; }
    final bytes = await _sigController.toPngBytes();
    if (bytes == null) return;
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/signature_${DateTime.now().millisecondsSinceEpoch}.png');
    await file.writeAsBytes(bytes);
    setState(() { _signatureFile = file; _step = 3; });
  }

  Future<void> _submit() async {
    if (_photos.isEmpty || _signatureFile == null || _position == null) return;
    setState(() => _submitting = true);
    try {
      final repo = CfaRepository();
      await repo.submitPickup(
        complaintId: _complaint!['_id'],
        pickupPhotos: _photos,
        signatureImage: _signatureFile!,
        dealerName: _dealerNameCtrl.text,
        lat: _position!.latitude,
        lng: _position!.longitude,
        accuracy: _position!.accuracy,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Pickup confirmed!'), backgroundColor: Colors.green));
      Navigator.pop(context, true);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    } finally { if (mounted) setState(() => _submitting = false); }
  }

  @override void dispose() { _sigController.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Pickup: ${_complaint?['complaintId'] ?? ''}')),
      body: Column(children: [
        Padding(padding: const EdgeInsets.all(16), child: Row(children: List.generate(4, (i) => Expanded(child: Container(
          margin: EdgeInsets.symmetric(horizontal: 2), height: 4,
          decoration: BoxDecoration(color: i <= _step ? AppTheme.primary : Colors.grey.shade200, borderRadius: BorderRadius.circular(2)),
        ))))),
        Expanded(child: [_stepPhotos(), _stepPhotos(), _stepSignature(), _stepGps(), _stepConfirm()][_step.clamp(0, 4)]),
      ]),
      bottomNavigationBar: SafeArea(child: Padding(padding: const EdgeInsets.all(16), child: Row(children: [
        if (_step > 0) Expanded(child: OutlinedButton(onPressed: () => setState(() => _step--), child: const Text('Back'))),
        if (_step > 0) const SizedBox(width: 12),
        Expanded(child: ElevatedButton(
          onPressed: _submitting ? null : _getNextAction(),
          child: _submitting ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text(_step >= 4 ? 'Confirm Pickup' : 'Next'),
        )),
      ]))),
    );
  }

  VoidCallback? _getNextAction() {
    if (_step == 0 && _photos.isEmpty) return null;
    if (_step == 0) return () => setState(() => _step = 2);
    if (_step == 2) return _saveSignature;
    if (_step == 3 && _position != null) return () => setState(() => _step = 4);
    if (_step == 4) return _submit;
    return null;
  }

  Widget _stepPhotos() => Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Pickup Photos', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
    Text('Take photos of the product (min 1, max 10)', style: TextStyle(color: AppTheme.textMuted)),
    const SizedBox(height: 16),
    ElevatedButton.icon(onPressed: _pickPhoto, icon: const Icon(Icons.camera_alt), label: Text('Take Photo (${_photos.length}/10)')),
    const SizedBox(height: 12),
    Expanded(child: GridView.count(crossAxisCount: 3, crossAxisSpacing: 8, mainAxisSpacing: 8, children: _photos.map((f) => Stack(children: [
      ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(f, width: double.infinity, height: double.infinity, fit: BoxFit.cover)),
      Positioned(top: 4, right: 4, child: GestureDetector(onTap: () => setState(() => _photos.remove(f)),
        child: Container(padding: const EdgeInsets.all(4), decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle), child: const Icon(Icons.close, color: Colors.white, size: 14)))),
    ])).toList())),
  ]));

  Widget _stepSignature() => Padding(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Dealer Signature', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
    const SizedBox(height: 8),
    TextField(controller: _dealerNameCtrl, decoration: const InputDecoration(labelText: 'Dealer Name')),
    const SizedBox(height: 12),
    Expanded(child: Container(
      decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade300), borderRadius: BorderRadius.circular(12)),
      child: ClipRRect(borderRadius: BorderRadius.circular(12), child: Signature(controller: _sigController, backgroundColor: Colors.grey.shade50)),
    )),
    const SizedBox(height: 8),
    TextButton.icon(onPressed: () => _sigController.clear(), icon: const Icon(Icons.refresh), label: const Text('Clear')),
  ]));

  Widget _stepGps() => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(_locating ? Icons.gps_not_fixed : Icons.gps_fixed, size: 60, color: _position != null ? AppTheme.success : AppTheme.warning),
    const SizedBox(height: 16),
    Text(_position != null ? '${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}' : 'Capturing location...',
      style: const TextStyle(fontSize: 16)),
    if (_position != null) Text('Accuracy: ${_position!.accuracy.toStringAsFixed(0)}m', style: TextStyle(color: AppTheme.textMuted)),
    const SizedBox(height: 16),
    OutlinedButton.icon(onPressed: _captureLocation, icon: const Icon(Icons.refresh), label: const Text('Recapture')),
  ]));

  Widget _stepConfirm() => SingleChildScrollView(padding: const EdgeInsets.all(16), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Confirm Pickup', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
    const SizedBox(height: 16),
    _check('Photos', '${_photos.length} uploaded', _photos.isNotEmpty),
    _check('Signature', _signatureFile != null ? 'Captured' : 'Missing', _signatureFile != null),
    _check('GPS', _position != null ? '${_position!.latitude.toStringAsFixed(4)}, ${_position!.longitude.toStringAsFixed(4)}' : 'Missing', _position != null),
    _check('Dealer Name', _dealerNameCtrl.text.isEmpty ? 'Missing' : _dealerNameCtrl.text, _dealerNameCtrl.text.isNotEmpty),
  ]));

  Widget _check(String label, String value, bool ok) => ListTile(
    leading: Icon(ok ? Icons.check_circle : Icons.error, color: ok ? AppTheme.success : AppTheme.danger),
    title: Text(label), subtitle: Text(value, style: TextStyle(color: AppTheme.textMuted, fontSize: 12)),
  );
}
