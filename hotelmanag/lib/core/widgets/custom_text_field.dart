import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class CustomTextField extends StatelessWidget {
  final String label;
  final String? hint;
  final bool obscureText;
  final TextEditingController? controller;
  final TextInputType keyboardType;
  final IconData? prefixIcon;
  final String? Function(String?)? validator;
  final Iterable<String>? autofillHints;
  final int? maxLength;
  final Widget? suffixIcon;

  const CustomTextField({
    super.key,
    required this.label,
    this.hint,
    this.obscureText = false,
    this.controller,
    this.keyboardType = TextInputType.text,
    this.prefixIcon,
    this.validator,
    this.autofillHints,
    this.maxLength,
    this.suffixIcon,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final textColor = isDark ? Colors.white : Colors.black87;
    final fillColor = isDark ? const Color(0xFF19222E) : Colors.white;
    final borderColor = isDark ? Colors.white24 : AppTheme.primaryColor.withOpacity(0.1);
    final iconColor = isDark ? Colors.white70 : AppTheme.primaryColor;
    final hintColor = isDark ? Colors.white38 : AppTheme.primaryColor.withOpacity(0.3);

    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      validator: validator,
      autofillHints: autofillHints,
      maxLength: maxLength,
      cursorColor: AppTheme.accentColor,
      style: TextStyle(color: textColor),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: isDark ? Colors.white70 : AppTheme.primaryColor),
        hintText: hint,
        hintStyle: TextStyle(color: hintColor),
        prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 20, color: iconColor) : null,
        suffixIcon: suffixIcon,
        counterText: maxLength != null ? '' : null,
        filled: true,
        fillColor: fillColor,
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.accentColor, width: 1.5),
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
    );
  }
}
