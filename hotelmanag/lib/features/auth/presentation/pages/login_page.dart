import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/booking_provider.dart';
import '../widgets/phone_auth_bottom_sheet.dart';
import '../../../../core/utils/validators.dart';
import 'dart:math';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _rememberMe = false;
  bool _obscurePassword = true;
  bool _isLoggingIn = false;
  bool _isGoogleLoggingIn = false;
  String? _passwordError;

  String _captchaChallenge = '';
  String? _captchaId;
  final _captchaController = TextEditingController();
  bool _captchaLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchCaptcha();
  }

  void _fetchCaptcha() async {
    setState(() => _captchaLoading = true);
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.fetchCaptcha();
    if (result != null) {
      setState(() {
        _captchaId = result.$1;
        _captchaChallenge = result.$2;
        _captchaController.clear();
        _captchaLoading = false;
      });
    } else {
      setState(() {
        _captchaChallenge = 'ERROR';
        _captchaId = '';
        _captchaController.clear();
        _captchaLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _captchaController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (_isLoggingIn) return;

    if (_captchaId == null || _captchaController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please complete the security check.')),
      );
      return;
    }
    final email = _emailController.text.trim();
    final emailErr = AppValidators.validateEmail(email);

    setState(() {
      _passwordError = null;
    });

    if (emailErr != null) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(emailErr)));
      return;
    }

    final password = _passwordController.text.trim();
    if (password.isEmpty) {
      setState(() {
        _passwordError = 'Password is required';
      });
      return;
    }

    setState(() => _isLoggingIn = true);

    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      await auth.login(
        email,
        password,
        captchaId: _captchaId,
        captchaAnswer: _captchaController.text.trim(),
      );

      if (auth.isAuthenticated) {
        if (mounted) {
          context.read<BookingProvider>().fetchMyBookings();
          context.go('/');
        }
      } else if (auth.unverifiedEmail != null) {
        if (mounted) {
          context.push('/otp', extra: auth.unverifiedEmail);
        }
      } else if (auth.error != null) {
        if (mounted) {
          _passwordController.clear();
          ScaffoldMessenger.of(
            context,
          ).showSnackBar(SnackBar(content: Text(auth.error!)));
          _fetchCaptcha();
        }
      }
    } finally {
      if (mounted) {
        setState(() => _isLoggingIn = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leadingWidth: 80,
        leading: Padding(
          padding: const EdgeInsets.only(left: 16, top: 8),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              border: Border.all(color: AppTheme.mutedColor),
            ),
            child: IconButton(
              icon: Icon(
                LucideIcons.chevronLeft,
                color: AppTheme.primaryColor,
                size: 20,
              ),
              onPressed: () => context.go('/welcome'),
            ),
          ),
        ),
      ),
      body: AutofillGroup(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              _buildLogo(),
              const SizedBox(height: 32),
              const Text(
                'Welcome back glad to see you',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
              const SizedBox(height: 40),
              CustomTextField(
                label: 'User Name Or Email Address *',
                hint: 'Type your user name',
                controller: _emailController,
                autofillHints: const [
                  AutofillHints.email,
                  AutofillHints.username,
                ],
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Password *',
                hint: '.......',
                obscureText: _obscurePassword,
                controller: _passwordController,
                autofillHints: const [AutofillHints.password],
                errorText: _passwordError,
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye,
                    color: AppTheme.primaryColor.withOpacity(0.5),
                  ),
                  onPressed: () =>
                      setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              const SizedBox(height: 16),

              // ── CAPTCHA ───────────────────────────────
              Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Security Check',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      InkWell(
                        onTap: _captchaLoading ? null : _fetchCaptcha,
                        borderRadius: BorderRadius.circular(4),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 4,
                            vertical: 4,
                          ),
                          child: Row(
                            children: [
                              _captchaLoading
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.black54,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.refresh,
                                      size: 14,
                                      color: Colors.black54,
                                    ),
                              const SizedBox(width: 4),
                              const Text(
                                'New challenge',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.black54,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    height: 64,
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.black.withOpacity(0.05), // match bg-black/5
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: Colors.black.withOpacity(0.1),
                      ), // match border-black/10
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Center(
                        child: _captchaChallenge.trim().startsWith('<svg')
                            ? SvgPicture.string(
                                _captchaChallenge,
                                fit: BoxFit.contain,
                              )
                            : Text(
                                _captchaChallenge == 'ERROR'
                                    ? 'Failed to load CAPTCHA'
                                    : _captchaChallenge,
                                style: TextStyle(
                                  fontFamily: _captchaChallenge == 'ERROR'
                                      ? 'sans-serif'
                                      : 'monospace',
                                  fontSize: _captchaChallenge == 'ERROR'
                                      ? 14
                                      : 24,
                                  letterSpacing: _captchaChallenge == 'ERROR'
                                      ? 0
                                      : 8,
                                  fontWeight: _captchaChallenge == 'ERROR'
                                      ? FontWeight.w500
                                      : FontWeight.w800,
                                  color: _captchaChallenge == 'ERROR'
                                      ? Colors.red
                                      : Colors.black87,
                                ),
                              ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextFormField(
                    controller: _captchaController,
                    keyboardType: TextInputType.text,
                    style: const TextStyle(fontSize: 14, color: Colors.black87),
                    decoration: InputDecoration(
                      hintText: 'Type the characters above',
                      hintStyle: TextStyle(
                        color: Colors.black.withOpacity(0.4),
                        fontSize: 14,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 14,
                      ),
                      fillColor: Colors.white.withOpacity(
                        0.5,
                      ), // match bg-white/50
                      filled: true,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Colors.black.withOpacity(0.1),
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(
                          color: Colors.black.withOpacity(0.1),
                        ),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: Colors.black,
                        ), // match focus:border-black
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Checkbox(
                        value: _rememberMe,
                        onChanged: (v) =>
                            setState(() => _rememberMe = v ?? false),
                        activeColor: AppTheme.primaryColor,
                      ),
                      const Text(
                        'Remember me',
                        style: TextStyle(
                          fontSize: 14,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ],
                  ),
                  Flexible(
                    child: TextButton(
                      style: TextButton.styleFrom(
                        padding: EdgeInsets.zero,
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      onPressed: () async {
                        final email = _emailController.text.trim();
                        if (email.isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Please enter your email first in the UserName/Email field.',
                              ),
                            ),
                          );
                          return;
                        }
                        final auth = Provider.of<AuthProvider>(
                          context,
                          listen: false,
                        );
                        final success = await auth.forgotPassword(email);
                        if (mounted) {
                          if (success) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'If an account exists, a password reset link has been sent to your email.',
                                ),
                              ),
                            );
                          } else {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  auth.error ?? 'Failed to send reset link',
                                ),
                              ),
                            );
                          }
                        }
                      },
                      child: const Text(
                        'Forgot your password?',
                        style: TextStyle(
                          color: AppTheme.primaryColor,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),
              Consumer<AuthProvider>(
                builder: (context, auth, _) {
                  return SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: (_isLoggingIn || _isGoogleLoggingIn)
                          ? null
                          : _handleLogin,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: _isLoggingIn
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2.5,
                              ),
                            )
                          : const Text(
                              'Log In',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  const Expanded(child: Divider(color: AppTheme.mutedColor)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'Or',
                      style: TextStyle(
                        color: AppTheme.primaryColor.withOpacity(0.5),
                      ),
                    ),
                  ),
                  const Expanded(child: Divider(color: AppTheme.mutedColor)),
                ],
              ),
              const SizedBox(height: 32),
              Consumer<AuthProvider>(
                builder: (context, auth, _) => Column(
                  children: [
                    _buildSocialButton(
                      'Continue with Google',
                      LucideIcons.chrome,
                      isLoading: _isGoogleLoggingIn,
                      onTap: (_isLoggingIn || _isGoogleLoggingIn)
                          ? () {}
                          : () async {
                              setState(() => _isGoogleLoggingIn = true);
                              final success = await auth.signInWithGoogle(
                                isRegister: false,
                              );
                              if (mounted) {
                                setState(() => _isGoogleLoggingIn = false);
                              }
                              if (success && context.mounted) {
                                context
                                    .read<BookingProvider>()
                                    .fetchMyBookings();
                                Future.microtask(() {
                                  if (mounted) context.go('/');
                                });
                              } else if (auth.error != null &&
                                  context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(auth.error!)),
                                );
                              }
                            },
                    ),
                    const SizedBox(height: 16),
                    _buildSocialButton(
                      'Continue with Phone Number',
                      LucideIcons.phone,
                      isLoading: false,
                      onTap: (_isLoggingIn || _isGoogleLoggingIn)
                          ? () {}
                          : () {
                              PhoneAuthBottomSheet.show(context);
                            },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text(
                    "Don't have an account? ",
                    style: TextStyle(color: AppTheme.primaryColor),
                  ),
                  GestureDetector(
                    onTap: () => context.go('/register'),
                    child: const Text(
                      'Register',
                      style: TextStyle(
                        color: AppTheme.accentColor,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return const Text(
      'Athithigriha',
      style: TextStyle(
        color: AppTheme.primaryColor,
        fontSize: 32,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Widget _buildSocialButton(
    String label,
    IconData icon, {
    VoidCallback? onTap,
    bool isLoading = false,
  }) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: isLoading
            ? () {}
            : (onTap ??
                  () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('$label coming soon!')),
                    );
                  }),
        icon: isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Icon(icon, size: 20, color: AppTheme.primaryColor),
        label: Text(
          label,
          style: const TextStyle(
            color: AppTheme.primaryColor,
            fontWeight: FontWeight.w600,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppTheme.mutedColor),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
