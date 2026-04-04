import 'package:flutter/material.dart';
import '../../data/repositories/auth_repository.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  bool _showPassword = false;
  String? _error;

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      final repo = AuthRepository();
      final user = await repo.login(_emailCtrl.text.trim(), _passwordCtrl.text);
      if (!mounted) return;
      final role = user['role'];
      if (role == 'dealer') {
        Navigator.pushReplacementNamed(context, '/dealer');
      } else if (role == 'cfa') {
        Navigator.pushReplacementNamed(context, '/cfa');
      } else {
        setState(() { _error = 'This app is for dealers and CFA agents only.'; });
      }
    } catch (e) {
      setState(() {
        _error = e.toString().contains('401') ? 'Invalid email or password' :
                 e.toString().contains('403') ? 'Account deactivated' :
                 e.toString().contains('429') ? 'Too many attempts. Try later.' : 'Login failed';
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF0F172A), Color(0xFF1E3A5F), Color(0xFF0F172A)])),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Form(
                key: _formKey,
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Container(
                    width: 80, height: 80,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)]),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: const Color(0xFF2563EB).withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))],
                    ),
                    child: const Icon(Icons.local_shipping_rounded, size: 40, color: Colors.white),
                  ),
                  const SizedBox(height: 24),
                  const Text('RLTS', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w800, letterSpacing: 3)),
                  const SizedBox(height: 4),
                  Text('Return Logistics Tracking', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 13)),
                  const SizedBox(height: 40),

                  if (_error != null) Container(
                    width: double.infinity, padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(color: Colors.red.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.red.withValues(alpha: 0.2))),
                    child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                  ),

                  TextFormField(
                    controller: _emailCtrl, keyboardType: TextInputType.emailAddress, autocorrect: false,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Email', hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
                      prefixIcon: Icon(Icons.email_outlined, color: Colors.white.withValues(alpha: 0.4)),
                      filled: true, fillColor: Colors.white.withValues(alpha: 0.05),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
                    ),
                    validator: (v) => v != null && v.contains('@') ? null : 'Enter valid email',
                  ),
                  const SizedBox(height: 16),

                  TextFormField(
                    controller: _passwordCtrl, obscureText: !_showPassword,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Password', hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
                      prefixIcon: Icon(Icons.lock_outlined, color: Colors.white.withValues(alpha: 0.4)),
                      suffixIcon: IconButton(
                        icon: Icon(_showPassword ? Icons.visibility_off : Icons.visibility, color: Colors.white.withValues(alpha: 0.4)),
                        onPressed: () => setState(() => _showPassword = !_showPassword),
                      ),
                      filled: true, fillColor: Colors.white.withValues(alpha: 0.05),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2)),
                    ),
                    validator: (v) => v != null && v.length >= 8 ? null : 'Min 8 characters',
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    width: double.infinity, height: 52,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF2563EB),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: _loading
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Sign In', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('Conti Collect © ${DateTime.now().year}', style: TextStyle(color: Colors.white.withValues(alpha: 0.2), fontSize: 12)),
                ]),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
