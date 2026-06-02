import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/booking_provider.dart';
import '../widgets/phone_auth_bottom_sheet.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _rememberMe = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
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
      body: AutofillGroup(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            children: [
              _buildLogo(),
              const SizedBox(height: 24),
              const Text(
                'Welcome Create your new\naccount',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: CustomTextField(
                      label: 'First Name *',
                      hint: 'Md Rahamat',
                      controller: _firstNameController,
                      autofillHints: const [AutofillHints.givenName],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: CustomTextField(
                      label: 'Last Name *',
                      hint: 'Hawlader',
                      controller: _lastNameController,
                      autofillHints: const [AutofillHints.familyName],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Email *',
                hint: 'uirahamat098@gmail.com',
                keyboardType: TextInputType.emailAddress,
                controller: _emailController,
                autofillHints: const [AutofillHints.email],
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Phone *',
                hint: '+919765968585',
                keyboardType: TextInputType.phone,
                controller: _phoneController,
                maxLength: 13,
                autofillHints: const [AutofillHints.telephoneNumber],
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Password *',
                hint: '.......',
                obscureText: _obscurePassword,
                controller: _passwordController,
                autofillHints: const [AutofillHints.newPassword],
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye, color: AppTheme.primaryColor.withOpacity(0.5)),
                  onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                ),
              ),
              const SizedBox(height: 16),
              CustomTextField(
                label: 'Confirm Password *',
                hint: '.......',
                obscureText: _obscureConfirmPassword,
                controller: _confirmPasswordController,
                autofillHints: const [AutofillHints.newPassword],
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirmPassword ? LucideIcons.eyeOff : LucideIcons.eye, color: AppTheme.primaryColor.withOpacity(0.5)),
                  onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Checkbox(
                    value: _rememberMe,
                    onChanged: (v) => setState(() => _rememberMe = v ?? false),
                    activeColor: const Color(0xFFA67C52),
                  ),
                  const Text('Remember me', style: TextStyle(fontSize: 14, color: AppTheme.primaryColor)),
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
                            if (_passwordController.text != _confirmPasswordController.text) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Passwords do not match')),
                              );
                              return;
                            }
                            await auth.register(
                              '${_firstNameController.text} ${_lastNameController.text}',
                              _emailController.text,
                              _passwordController.text,
                              _phoneController.text,
                            );
                            if (auth.isAuthenticated) {
                              if (context.mounted) {
                                context.read<BookingProvider>().fetchMyBookings();
                                context.go('/');
                              }
                            } else if (auth.unverifiedEmail != null) {
                              if (context.mounted) {
                                context.push('/otp', extra: auth.unverifiedEmail);
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
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                        : const Text('Continue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Already have an account? ', style: TextStyle(color: AppTheme.primaryColor)),
                GestureDetector(
                  onTap: () => context.go('/login'),
                  child: const Text(
                    'Sign In',
                    style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text('Or ', style: TextStyle(color: AppTheme.primaryColor)),
                GestureDetector(
                  onTap: () {
                    PhoneAuthBottomSheet.show(context);
                  },
                  child: const Text(
                    'Sign In with Phone Number',
                    style: TextStyle(color: AppTheme.accentColor, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    ));
  }

  Widget _buildLogo() {
    return RichText(
      text: const TextSpan(
        children: [
          TextSpan(text: 'L', style: TextStyle(color: Color(0xFFA67C52), fontSize: 32, fontWeight: FontWeight.bold)),
          TextSpan(text: 'uxeStay-', style: TextStyle(color: AppTheme.primaryColor, fontSize: 32, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
