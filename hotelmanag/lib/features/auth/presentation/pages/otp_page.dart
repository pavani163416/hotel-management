import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter/services.dart';
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider;
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';

class OtpPage extends StatefulWidget {
  final String email;

  const OtpPage({super.key, required this.email});

  @override
  State<OtpPage> createState() => _OtpPageState();
}

class _OtpPageState extends State<OtpPage> {
  final List<TextEditingController> _controllers = List.generate(
    6,
    (_) => TextEditingController(),
  );
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _resendCooldown = 0;
  Timer? _cooldownTimer;

  void _startCooldown() {
    setState(() {
      _resendCooldown = 60;
    });
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_resendCooldown > 1) {
        setState(() {
          _resendCooldown--;
        });
      } else {
        setState(() {
          _resendCooldown = 0;
        });
        _cooldownTimer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    for (var c in _controllers) {
      c.dispose();
    }
    for (var f in _focusNodes) {
      f.dispose();
    }
    super.dispose();
  }

  String get _otpCode => _controllers.map((c) => c.text).join('');

  void _verifyOtp() async {
    final code = _otpCode;

    // TC-FE-028: Guard 1 — field must not be empty
    if (code.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('OTP is required')));
      return;
    }

    // TC-FE-028: Guard 2 — enforce exactly 6 digits before any API call
    if (code.length < 6) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('OTP must be 6 digits')));
      return;
    }

    final auth = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyOtp(widget.email, code);

    if (success && mounted) {
      // TC-FE-022: Relies on GoRouter refreshListenable redirect.
      // Removed imperative context.go('/') hack.
    } else if (mounted) {
      // Clear all controllers on verification failure
      for (var c in _controllers) {
        c.clear();
      }
      // Shift focus back to the first box
      _focusNodes[0].requestFocus();

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(auth.error ?? 'Invalid verification code.')),
      );
    }
  }

  void _resendOtp() async {
    if (_resendCooldown > 0) return;
    _startCooldown();
    final auth = Provider.of<AuthProvider>(context, listen: false);

    final success = await auth.resendOtp(widget.email);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
                ? 'A new verification code has been sent to your email.'
                : (auth.error ?? 'Failed to resend code'),
          ),
        ),
      );
    }
  }

  void _onDigitChanged(String value, int index) {
    if (value.isNotEmpty && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    // User must click Verify button manually
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = Provider.of<AuthProvider>(context);

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: Padding(
          padding: const EdgeInsets.only(left: 16.0, top: 8.0),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.grey[100],
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(
                LucideIcons.chevronLeft,
                color: AppTheme.primaryColor,
                size: 22,
              ),
              onPressed: () => context.go('/login'),
            ),
          ),
        ),
      ),
      body: SafeArea(
        child: GestureDetector(
          onTap: () => FocusScope.of(context).unfocus(),
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Beautiful Mail Icon Container
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: AppTheme.primaryColor.withOpacity(0.04),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppTheme.primaryColor.withOpacity(0.08),
                        width: 2,
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryColor.withOpacity(0.08),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        LucideIcons.shieldCheck,
                        size: 40,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Text Headers
                  Text(
                    'Security Verification',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      color: AppTheme.primaryColor,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  RichText(
                    textAlign: TextAlign.center,
                    text: TextSpan(
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: Colors.grey[600],
                        height: 1.5,
                      ),
                      children: [
                        const TextSpan(
                          text: 'We sent a 6-digit confirmation code to\n',
                        ),
                        TextSpan(
                          text: widget.email,
                          style: const TextStyle(
                            color: AppTheme.primaryColor,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Pin fields
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: List.generate(6, (index) {
                      return SizedBox(
                        width: 42,
                        height: 56,
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 150),
                          decoration: BoxDecoration(
                            color: _focusNodes[index].hasFocus
                                ? Colors.white
                                : Colors.grey[50],
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _focusNodes[index].hasFocus
                                  ? AppTheme.primaryColor
                                  : Colors.grey[200]!,
                              width: _focusNodes[index].hasFocus ? 2 : 1,
                            ),
                            boxShadow: [
                              if (_focusNodes[index].hasFocus)
                                BoxShadow(
                                  color: AppTheme.primaryColor.withOpacity(
                                    0.08,
                                  ),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                            ],
                          ),
                          child: Center(
                            child: TextField(
                              controller: _controllers[index],
                              focusNode: _focusNodes[index],
                              keyboardType: TextInputType.text,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                              maxLength: 1,
                              inputFormatters: [
                                FilteringTextInputFormatter.allow(
                                  RegExp(r'[a-zA-Z0-9]'),
                                ),
                              ],
                              decoration: const InputDecoration(
                                counterText: '',
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                              ),
                              onChanged: (val) => _onDigitChanged(val, index),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 40),

                  // Verify button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _verifyOtp,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        elevation: 0,
                      ),
                      child: auth.isLoading
                          ? const SizedBox(
                              height: 24,
                              width: 24,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'Verify Account',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 0.5,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Didn't get code section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        "Didn't receive the code? ",
                        style: TextStyle(color: Colors.grey[600], fontSize: 14),
                      ),
                      GestureDetector(
                        onTap: _resendCooldown > 0 ? null : _resendOtp,
                        child: Text(
                          _resendCooldown > 0
                              ? 'Resend Code in ${_resendCooldown}s'
                              : 'Resend Code',
                          style: TextStyle(
                            color: _resendCooldown > 0
                                ? Colors.grey
                                : AppTheme.accentColor,
                            fontWeight: FontWeight.bold,
                            decoration: _resendCooldown > 0
                                ? TextDecoration.none
                                : TextDecoration.underline,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
