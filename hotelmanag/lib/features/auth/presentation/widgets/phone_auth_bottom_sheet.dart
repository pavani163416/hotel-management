import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/booking_provider.dart';

// Same country codes as the website's AuthModal
const List<(String, String)> _countryCodes = [
  ('+1',   'USA/Canada'),
  ('+7',   'Kazakhstan'),
  ('+36',  'Hungary'),
  ('+39',  'Italy'),
  ('+44',  'UK'),
  ('+62',  'Indonesia'),
  ('+81',  'Japan'),
  ('+91',  'India'),
  ('+98',  'Iran'),
  ('+224', 'Guinea'),
  ('+245', 'Guinea-Bissau'),
  ('+254', 'Kenya'),
  ('+353', 'Ireland'),
  ('+354', 'Iceland'),
  ('+502', 'Guatemala'),
  ('+504', 'Honduras'),
  ('+509', 'Haiti'),
  ('+590', 'Guadeloupe'),
  ('+592', 'Guyana'),
  ('+686', 'Kiribati'),
  ('+852', 'Hong Kong'),
  ('+962', 'Jordan'),
  ('+964', 'Iraq'),
  ('+971', 'UAE'),
  ('+972', 'Israel'),
];

class PhoneAuthBottomSheet extends StatefulWidget {
  const PhoneAuthBottomSheet({super.key});

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const PhoneAuthBottomSheet(),
    );
  }

  @override
  State<PhoneAuthBottomSheet> createState() => _PhoneAuthBottomSheetState();
}

class _PhoneAuthBottomSheetState extends State<PhoneAuthBottomSheet> {
  final _phoneController = TextEditingController();
  final _otpController   = TextEditingController();

  String _countryCode     = '+91';
  bool   _otpSent         = false;
  String _otpMessage      = '';
  String _error           = '';
  int    _resendCooldown  = 0;
  Timer? _timer;

  @override
  void dispose() {
    _phoneController.dispose();
    _otpController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startResendTimer() {
    _timer?.cancel();
    setState(() => _resendCooldown = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_resendCooldown <= 1) {
        t.cancel();
        setState(() => _resendCooldown = 0);
      } else {
        setState(() => _resendCooldown--);
      }
    });
  }

  String? _validatePhone() {
    final clean = _phoneController.text.trim().replaceAll(RegExp(r'[\s\-()]'), '');
    if (clean.isEmpty) return 'Phone number is required.';
    if (!RegExp(r'^\d+$').hasMatch(clean)) return 'Phone number must contain only digits.';
    if (_countryCode == '+91') {
      if (clean.length != 10) return 'Indian phone numbers must be exactly 10 digits.';
      if (!RegExp(r'^[6-9]').hasMatch(clean)) return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
    } else {
      if (clean.length < 7 || clean.length > 15) return 'Phone number must be between 7 and 15 digits.';
    }
    return null;
  }

  Future<void> _sendOtp() async {
    setState(() => _error = '');
    final validationError = _validatePhone();
    if (validationError != null) {
      setState(() => _error = validationError);
      return;
    }

    final phone = _countryCode + _phoneController.text.trim().replaceAll(RegExp(r'[\s\-()]'), '');
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.sendPhoneOtp(phone);

    if (!mounted) return;

    if (result != null) {
      setState(() {
        _otpSent = true;
        _otpController.clear();
        // In dev mode the backend returns the OTP — auto-fill for convenience
        final devOtp = (result['otp'] ?? result['data']?['otp'])?.toString();
        if (devOtp != null && devOtp.isNotEmpty) {
          _otpController.text = devOtp;
          _otpMessage = 'DEV MODE: Your phone verification code is $devOtp';
        } else {
          _otpMessage = 'OTP sent. Please check your phone and enter the code below.';
        }
        _error = '';
      });
      _startResendTimer();
    } else {
      setState(() => _error = auth.error ?? 'Unable to send OTP. Please try again.');
    }
  }

  Future<void> _verifyOtp() async {
    setState(() => _error = '');

    // TC-FE-028: Guard 1 — field must not be empty
    if (_otpController.text.trim().isEmpty) {
      setState(() => _error = 'OTP is required');
      return;
    }
    // TC-FE-028: Guard 2 — enforce exactly 6 digits before any API call
    if (_otpController.text.trim().length < 6) {
      setState(() => _error = 'OTP must be 6 digits');
      return;
    }

    final phone = _countryCode + _phoneController.text.trim().replaceAll(RegExp(r'[\s\-()]'), '');
    final auth  = Provider.of<AuthProvider>(context, listen: false);
    final success = await auth.verifyPhoneOtp(phone, _otpController.text.trim());

    if (!mounted) return;

    if (success) {
      Provider.of<BookingProvider>(context, listen: false).fetchMyBookings();
      Navigator.pop(context);
      // TC-FE-022: Removed imperative context.go('/'), relying on GoRouter redirect logic.
    } else {
      setState(() => _error = auth.error ?? 'OTP verification failed. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final auth = Provider.of<AuthProvider>(context);

    return Container(
      padding: EdgeInsets.only(left: 24, right: 24, top: 24, bottom: 24 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft:  Radius.circular(28),
          topRight: Radius.circular(28),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Drag handle
          Center(
            child: Container(
              width: 48, height: 5,
              decoration: BoxDecoration(color: Colors.grey[300], borderRadius: BorderRadius.circular(10)),
            ),
          ),
          const SizedBox(height: 24),

          // Title
          Text(
            _otpSent ? 'Verify Phone Number' : 'Continue with Phone',
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
          ),
          const SizedBox(height: 8),
          Text(
            _otpSent
                ? 'We sent a verification SMS to $_countryCode${_phoneController.text.trim()}'
                : 'Enter your mobile number with country code to sign in.',
            style: TextStyle(fontSize: 14, color: Colors.grey[600]),
          ),
          const SizedBox(height: 24),

          // ── PHONE INPUT ──────────────────────────────
          if (!_otpSent) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Country code picker
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  decoration: BoxDecoration(
                    border: Border.all(color: AppTheme.mutedColor),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      value: _countryCode,
                      items: _countryCodes
                          .map((e) => DropdownMenuItem(
                                value: e.$1,
                                child: Text('${e.$1} ${e.$2}',
                                    style: const TextStyle(fontSize: 13, color: AppTheme.primaryColor)),
                              ))
                          .toList(),
                      onChanged: (v) => setState(() => _countryCode = v ?? '+91'),
                      style: const TextStyle(fontSize: 14, color: AppTheme.primaryColor),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _phoneController,
                    keyboardType: TextInputType.phone,
                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                    decoration: InputDecoration(
                      hintText: 'Mobile number',
                      hintStyle: TextStyle(color: AppTheme.primaryColor.withOpacity(0.4)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppTheme.mutedColor),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppTheme.mutedColor),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
          ],

          // ── OTP INPUT ────────────────────────────────
          if (_otpSent) ...[
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              maxLength: 6,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              style: const TextStyle(fontSize: 20, letterSpacing: 8, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              decoration: InputDecoration(
                labelText: 'OTP Code',
                hintText: '••••••',
                counterText: '',
                prefixIcon: const Icon(LucideIcons.lock, color: AppTheme.accentColor),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppTheme.primaryColor, width: 2),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // OTP message / dev hint
            if (_otpMessage.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Text(_otpMessage, style: TextStyle(fontSize: 13, color: Colors.grey[700])),
              ),
            // Resend row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton(
                  onPressed: () => setState(() {
                    _otpSent = false;
                    _otpController.clear();
                    _otpMessage = '';
                    _error = '';
                    _timer?.cancel();
                    _resendCooldown = 0;
                  }),
                  child: const Text('Change Number', style: TextStyle(color: Colors.grey, fontSize: 13)),
                ),
                TextButton(
                  onPressed: _resendCooldown > 0 || auth.isLoading ? null : _sendOtp,
                  child: Text(
                    _resendCooldown > 0 ? 'Resend in ${_resendCooldown}s' : 'Resend SMS',
                    style: TextStyle(
                      color: (_resendCooldown > 0 || auth.isLoading) ? Colors.grey : AppTheme.accentColor,
                      fontSize: 13, fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
          ],

          // ── ERROR ─────────────────────────────────────
          if (_error.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error, style: const TextStyle(color: Colors.red, fontSize: 13, fontWeight: FontWeight.w500)),
            ),
          ],

          // ── ACTION BUTTON ─────────────────────────────
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton(
              onPressed: auth.isLoading ? null : (_otpSent ? _verifyOtp : _sendOtp),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: auth.isLoading
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : Text(
                      _otpSent ? 'Verify & Sign In' : 'Send OTP',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
            ),
          ),
          const SizedBox(height: 16),

          // ── BACK LINK ─────────────────────────────────
          Center(
            child: TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Prefer email? Sign in', style: TextStyle(color: AppTheme.primaryColor, fontSize: 13)),
            ),
          ),
        ],
      ),
    );
  }
}
