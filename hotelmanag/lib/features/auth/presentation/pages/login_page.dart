import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/booking_provider.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _rememberMe = false;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
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
              icon: const Icon(LucideIcons.chevronLeft, color: AppTheme.primaryColor, size: 20),
              onPressed: () => context.go('/welcome'),
            ),
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            _buildLogo(),
            const SizedBox(height: 32),
            const Text(
              'Welcome back glad to see you',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 40),
            CustomTextField(
              label: 'User Name Or Email Address *',
              hint: 'Type your user name',
              controller: _emailController,
            ),
            const SizedBox(height: 16),
            CustomTextField(
              label: 'Password *',
              hint: '.......',
              obscureText: true,
              controller: _passwordController,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Checkbox(
                      value: _rememberMe,
                      onChanged: (v) => setState(() => _rememberMe = v ?? false),
                      activeColor: AppTheme.primaryColor,
                    ),
                    const Text('Remember me', style: TextStyle(fontSize: 14, color: AppTheme.primaryColor)),
                  ],
                ),
                TextButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Password reset link sent to your email!')),
                    );
                  },
                  child: const Text('Forgot your password?', style: TextStyle(color: AppTheme.primaryColor, fontSize: 13)),
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
                    onPressed: auth.isLoading
                        ? null
                        : () async {
                            await auth.login(_emailController.text, _passwordController.text);
                            if (auth.isAuthenticated) {
                              if (context.mounted) {
                                context.read<BookingProvider>().fetchMyBookings();
                                context.go('/');
                              }
                            } else if (auth.error != null) {
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(content: Text(auth.error!)),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: auth.isLoading
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text('Log In', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
                  child: Text('Or', style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.5))),
                ),
                const Expanded(child: Divider(color: AppTheme.mutedColor)),
              ],
            ),
            const SizedBox(height: 32),
            Consumer<AuthProvider>(
              builder: (context, auth, _) => _buildSocialButton(
                'Continue with Google',
                LucideIcons.chrome,
                isLoading: auth.isLoading,
                onTap: () async {
                  final success = await auth.signInWithGoogle();
                  if (success && context.mounted) {
                    // Fetch user-specific bookings after social sign-in
                    context.read<BookingProvider>().fetchMyBookings();
                    context.go('/');
                  } else if (auth.error != null && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(auth.error!)),
                    );
                  }
                },
              ),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text("Don't have an account? ", style: TextStyle(color: AppTheme.primaryColor)),
                GestureDetector(
                  onTap: () => context.go('/register'),
                  child: const Text(
                    'Register',
                    style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildLogo() {
    return RichText(
      text: const TextSpan(
        children: [
          TextSpan(text: 'L', style: TextStyle(color: AppTheme.primaryColor, fontSize: 32, fontWeight: FontWeight.bold)),
          TextSpan(text: 'uxeStay-', style: TextStyle(color: AppTheme.primaryColor, fontSize: 32, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildSocialButton(String label, IconData icon, {VoidCallback? onTap, bool isLoading = false}) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: isLoading ? null : (onTap ?? () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$label coming soon!')),
          );
        }),
        icon: isLoading 
          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
          : Icon(icon, size: 20, color: AppTheme.primaryColor),
        label: Text(label, style: const TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.w600)),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppTheme.mutedColor),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }
}
