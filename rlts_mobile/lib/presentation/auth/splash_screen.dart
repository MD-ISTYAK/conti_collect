import 'package:flutter/material.dart';
import '../../data/repositories/auth_repository.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});
  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(milliseconds: 1200), vsync: this);
    _fadeAnim = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _scaleAnim = Tween<double>(begin: 0.8, end: 1).animate(CurvedAnimation(parent: _controller, curve: Curves.elasticOut));
    _controller.forward();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    await Future.delayed(const Duration(seconds: 2));
    final repo = AuthRepository();
    final isAuth = await repo.isAuthenticated();
    if (!mounted) return;
    if (isAuth) {
      final role = await repo.getUserRole();
      if (!mounted) return;
      if (role == 'dealer') {
        Navigator.pushReplacementNamed(context, '/dealer');
      } else if (role == 'cfa') {
        Navigator.pushReplacementNamed(context, '/cfa');
      } else {
        Navigator.pushReplacementNamed(context, '/login');
      }
    } else {
      Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  void dispose() { _controller.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft, end: Alignment.bottomRight,
            colors: [Color(0xFF1E3A5F), Color(0xFF2563EB), Color(0xFF1E3A5F)],
          ),
        ),
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: ScaleTransition(
              scale: _scaleAnim,
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Container(
                  width: 100, height: 100,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                  ),
                  child: const Icon(Icons.local_shipping_rounded, size: 50, color: Colors.white),
                ),
                const SizedBox(height: 24),
                const Text('RLTS', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800, letterSpacing: 4)),
                const SizedBox(height: 8),
                Text('Conti Collect', style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 14, letterSpacing: 3, fontWeight: FontWeight.w400)),
                const SizedBox(height: 40),
                SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white.withValues(alpha: 0.6))),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}
