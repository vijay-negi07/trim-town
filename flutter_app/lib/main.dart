// flutter_app/lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/api/api_service.dart';
import 'core/api/socket_service.dart';
import 'core/constants/app_constants.dart';
import 'features/auth/auth_screen.dart';
import 'features/home/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));

  runApp(const TrimTownApp(userRole: 'CUSTOMER'));
}

class TrimTownApp extends StatelessWidget {
  final String userRole;
  const TrimTownApp({super.key, this.userRole = 'CUSTOMER'});

  @override
  Widget build(BuildContext context) {
    final isBarber = userRole == 'BARBER';

    return MaterialApp(
      title: isBarber ? 'TrimTown Partner' : AppConstants.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: SplashScreen(userRole: userRole),
    );
  }
}

class SplashScreen extends StatefulWidget {
  final String userRole;
  const SplashScreen({super.key, required this.userRole});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this, duration: const Duration(milliseconds: 800));
  late final Animation<double> _fade = CurvedAnimation(parent: _ctrl, curve: Curves.easeIn);
  late final Animation<double> _scale = Tween(begin: 0.85, end: 1.0)
    .animate(CurvedAnimation(parent: _ctrl, curve: Curves.easeOutBack));

  @override
  void initState() {
    super.initState();
    _ctrl.forward();
    _checkAuth();
  }

  // lib/main.dart (Only updating _checkAuth method)

Future<void> _checkAuth() async {
  await Future.delayed(const Duration(milliseconds: 1500));
  final loggedIn = await ApiService().isLoggedIn();

  if (loggedIn) {
    SocketService().connect();
  }

  if (mounted) {
    Navigator.pushReplacement(
      context,
      PageRouteBuilder(
        pageBuilder: (_, __, ___) => loggedIn 
            ? HomeScreen(userRole: widget.userRole) 
            : AuthScreen(userRole: widget.userRole), // <-- Pass userRole here
        transitionDuration: const Duration(milliseconds: 400),
        transitionsBuilder: (_, anim, __, child) =>
          FadeTransition(opacity: anim, child: child),
      ),
    );
  }
}

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final isBarber = widget.userRole == 'BARBER';

    return Scaffold(
      backgroundColor: AppColors.dark,
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [BoxShadow(
                      color: AppColors.primary.withOpacity(0.4),
                      blurRadius: 24, offset: const Offset(0, 8),
                    )],
                  ),
                  child: Center(
                    child: Text(
                      isBarber ? '💈' : '✂️',
                      style: const TextStyle(fontSize: 36),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  isBarber ? 'TrimTown Partner' : 'TrimTown',
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 6),
                Text(
                  isBarber ? 'Manage your salon. Grow your business.' : 'Your barber. Ready when you are.',
                  style: const TextStyle(fontSize: 14, color: Colors.white54),
                ),
                const SizedBox(height: 60),
                const SizedBox(
                  width: 24, height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white38),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}