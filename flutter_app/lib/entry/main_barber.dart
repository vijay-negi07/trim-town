// flutter_app/lib/entry/main_customer.dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../main.dart';

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

  runApp(const TrimTownApp(userRole: 'BARBER'));
}