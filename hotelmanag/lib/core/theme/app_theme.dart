import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Website Colors (Converted from HSL)
  // Website Colors (Converted from HSL)
  // Original Mediterranean Colors
  static const Color primaryColor = Color(0xFF454F5E);
  static const Color accentColor = Color(0xFFF5E6CA);  // Cream
  static const Color backgroundColor = Color(0xFFFFFDF7); // Warm White
  static const Color foregroundColor = Color(0xFF454F5E);
  static const Color mutedColor = Color(0xFFEAE5DC);
  static const Color brownColor = Color(0xFF454F5E);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        onPrimary: Colors.white,
        secondary: accentColor,
        onSecondary: primaryColor,
        surface: backgroundColor,
        onSurface: foregroundColor,
      ),
      scaffoldBackgroundColor: backgroundColor,
      primaryColor: primaryColor,
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: primaryColor,
        selectionColor: primaryColor.withOpacity(0.3),
        selectionHandleColor: primaryColor,
      ),
      textTheme: GoogleFonts.outfitTextTheme().copyWith(
        displayLarge: GoogleFonts.outfit(
          color: primaryColor,
          fontWeight: FontWeight.bold,
          letterSpacing: -1.5,
        ),
        displayMedium: GoogleFonts.outfit(
          color: primaryColor,
          fontWeight: FontWeight.bold,
          letterSpacing: -1.0,
        ),
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        backgroundColor: backgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: primaryColor),
        titleTextStyle: TextStyle(
          color: primaryColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  // Add dark theme if needed based on frontend css
  static ThemeData get darkTheme {
    const Color darkPrimaryColor = Color(0xFFEAE5DC); // Warm Cream/Off-white
    const Color darkBackgroundColor = Color(0xFF19222E); // Sleek dark navy slate
    const Color darkSurfaceColor = Color(0xFF253040); // Card slate
    const Color darkForegroundColor = Color(0xFFFFFDF7);

    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: const ColorScheme.dark(
        primary: darkPrimaryColor,
        onPrimary: darkBackgroundColor,
        secondary: accentColor,
        onSecondary: darkBackgroundColor,
        surface: darkSurfaceColor,
        onSurface: darkForegroundColor,
      ),
      scaffoldBackgroundColor: darkBackgroundColor,
      primaryColor: darkPrimaryColor,
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: darkPrimaryColor,
        selectionColor: darkPrimaryColor.withOpacity(0.3),
        selectionHandleColor: darkPrimaryColor,
      ),
      textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).copyWith(
        displayLarge: GoogleFonts.outfit(
          color: darkForegroundColor,
          fontWeight: FontWeight.bold,
          letterSpacing: -1.5,
        ),
        displayMedium: GoogleFonts.outfit(
          color: darkForegroundColor,
          fontWeight: FontWeight.bold,
          letterSpacing: -1.0,
        ),
      ),
      appBarTheme: const AppBarTheme(
        centerTitle: false,
        backgroundColor: darkBackgroundColor,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: darkForegroundColor),
        titleTextStyle: TextStyle(
          color: darkForegroundColor,
          fontSize: 20,
          fontWeight: FontWeight.bold,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: darkPrimaryColor,
          foregroundColor: darkBackgroundColor,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: const TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 14,
          ),
        ),
      ),
    );
  }
}
