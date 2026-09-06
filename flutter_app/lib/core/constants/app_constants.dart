import 'package:flutter/material.dart';

// ─── API ─────────────────────────────────────────────────────────────────────

class AppConstants {
  static const String baseUrl = 'http://localhost:3000/api';
  static const String wsUrl = 'http://localhost:3000';
  static const String appName = 'TrimTown';
  static const String tagline = 'Your barber. Ready when you are.';
  static const double defaultSearchRadius = 5.0; // km

  // Haldwani center coords (fallback)
  static const double defaultLat = 29.2183;
  static const double defaultLng = 79.5130;
}

// ─── COLORS ───────────────────────────────────────────────────────────────────

class AppColors {
  static const Color primary = Color(0xFF4F46E5);
  static const Color primaryDark = Color(0xFF4338CA);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color background = Color(0xFFF8F8FC);
  static const Color border = Color(0xFFE5E7EB);
  static const Color text = Color(0xFF111827);
  static const Color textMuted = Color(0xFF6B7280);
  static const Color textLight = Color(0xFF9CA3AF);
  static const Color dark = Color(0xFF0F0F23);

  static const Color available = Color(0xFF22C55E);
  static const Color busy = Color(0xFFEAB308);
  static const Color closed = Color(0xFFEF4444);

  static const Color availableBg = Color(0xFFDCFCE7);
  static const Color busyBg = Color(0xFFFEF9C3);
  static const Color closedBg = Color(0xFFFEE2E2);

  static const Color availableText = Color(0xFF166534);
  static const Color busyText = Color(0xFF854D0E);
  static const Color closedText = Color(0xFF991B1B);
}

// ─── THEME ────────────────────────────────────────────────────────────────────

class AppTheme {
  static ThemeData get light => ThemeData(
        useMaterial3: true,
        fontFamily: 'Inter',
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primary,
          background: AppColors.background,
          surface: AppColors.surface,
        ),
        scaffoldBackgroundColor: AppColors.background,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.dark,
          foregroundColor: Colors.white,
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontFamily: 'Inter',
            fontSize: 18,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),

        // Flutter 3.44+
        cardTheme: CardThemeData(
          color: AppColors.surface,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: AppColors.border),
          ),
        ),

        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: AppColors.surface,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: AppColors.border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide:
                const BorderSide(color: AppColors.primary, width: 1.5),
          ),
        ),

        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.symmetric(vertical: 14),
            textStyle: const TextStyle(
              fontFamily: 'Inter',
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
            elevation: 0,
          ),
        ),

        textTheme: const TextTheme(
          displayLarge: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.w700,
            color: AppColors.text,
          ),
          headlineMedium: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w600,
            color: AppColors.text,
          ),
          titleLarge: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.text,
          ),
          titleMedium: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w500,
            color: AppColors.text,
          ),
          bodyLarge: TextStyle(
            fontSize: 15,
            color: AppColors.text,
          ),
          bodyMedium: TextStyle(
            fontSize: 13,
            color: AppColors.textMuted,
          ),
          labelSmall: TextStyle(
            fontSize: 11,
            color: AppColors.textLight,
          ),
        ),
      );
}