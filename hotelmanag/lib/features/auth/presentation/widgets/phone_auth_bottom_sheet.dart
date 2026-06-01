import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/booking_provider.dart';

class PhoneAuthBottomSheet extends StatefulWidget {
  const PhoneAuthBottomSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const PhoneAuthBottomSheet(),
    );
  }

  @override
  State<PhoneAuthBottomSheet> createState() => _PhoneAuthBottomSheetState();
}

class _PhoneAuthBottomSheetState extends State<PhoneAuthBottomSheet> {
  final _phoneController = TextEditingController();
  final _otpController = TextEditingController();
  
  bool _isOtpSent = false;
  String _verificationId = '';
  int _secondsRemaining = 60;
  Timer? _timer;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer() {
    setState(() {
      _secondsRemaining = 60;
    });
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining == 0) {
        timer.cancel();
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  void _sendVerificationCode() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a valid phone number.')),
      );
      return;
    }

    // Ensure phone has + prefix, default to +91 or +880 if not specified (we can ask users to enter full international format)
    String formattedPhone = phone;
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+$phone';
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    await authProvider.verifyPhoneNumber(
      formattedPhone,
      onCodeSent: (verId) {
        setState(() {
          _verificationId = verId;
          _isOtpSent = true;
        });
        _startTimer();
      },
      onError: (errorMsg) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(errorMsg), backgroundColor: Colors.red),
        );
      },
    );
  }

  void _verifyOtp() async {
    final code = _otpController.text.trim();
    if (code.isEmpty || code.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit OTP code.')),
      );
      return;
    }

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.signInWithPhoneOtp(
      code,
      verificationId: _verificationId,
      phoneNumber: _phoneController.text.trim(),
    );

    if (mounted) {
      if (success) {
        Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
        Navigator.pop(context); // Close sheet
        context.go('/');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Failed to verify OTP code.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final authProvider = Provider.of<AuthProvider>(context);

    return Container(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 24,
        bottom: 24 + bottomInset,
      ),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 48,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            _isOtpSent ? 'Verify Phone Number' : 'Phone Sign In',
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _isOtpSent
                ? 'We sent a verification SMS to ${_phoneController.text}'
                : 'Enter your phone number with country code (e.g., +8801724649510 or +919876543210)',
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 24),
          if (!_isOtpSent) ...[
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Phone Number',
                hintText: '+8801724649510',
                prefixIcon: const Icon(LucideIcons.phone, color: AppTheme.accentColor),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.mutedColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.accentColor, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: authProvider.isLoading ? () {} : _sendVerificationCode,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: authProvider.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Send SMS OTP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ] else ...[
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: InputDecoration(
                labelText: 'Verification Code',
                hintText: '123456',
                counterText: '',
                prefixIcon: const Icon(LucideIcons.lock, color: AppTheme.accentColor),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.mutedColor),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.accentColor, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: () {
                    setState(() {
                      _isOtpSent = false;
                      _otpController.clear();
                    });
                  },
                  child: const Text(
                    'Change Phone Number',
                    style: TextStyle(color: Colors.grey, fontSize: 13),
                  ),
                ),
                TextButton(
                  onPressed: _secondsRemaining > 0 ? null : _sendVerificationCode,
                  child: Text(
                    _secondsRemaining > 0
                        ? 'Resend in ${_secondsRemaining}s'
                        : 'Resend SMS',
                    style: TextStyle(
                      color: _secondsRemaining > 0 ? Colors.grey : AppTheme.accentColor,
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: authProvider.isLoading ? () {} : _verifyOtp,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: authProvider.isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Verify and Sign In', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],

          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
