import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/utils/validators.dart';
import '../widgets/phone_auth_bottom_sheet.dart';
import 'dart:math';

/// Country codes — mirrors web AuthModal COUNTRY_CODES list.
const _countryCodes = [
  ('+1', 'USA/Canada'),
  ('+7', 'Kazakhstan'),
  ('+36', 'Hungary'),
  ('+39', 'Italy'),
  ('+44', 'UK'),
  ('+62', 'Indonesia'),
  ('+81', 'Japan'),
  ('+91', 'India'),
  ('+98', 'Iran'),
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

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  final _cityController = TextEditingController();
  final _captchaController = TextEditingController();

  bool _obscurePassword = true;
  String _countryCode = '+91';
  String? _passwordError;

  // CAPTCHA state
  String _captchaId = '';
  String _captchaChallenge = '';
  bool _captchaLoading = false;

  @override
  void initState() {
    super.initState();
    _fetchCaptcha();
    _passwordController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _passwordController.dispose();
    _cityController.dispose();
    _captchaController.dispose();
    super.dispose();
  }

  Future<void> _fetchCaptcha() async {
    setState(() {
      _captchaLoading = true;
      _captchaController.clear();
    });
    final auth = Provider.of<AuthProvider>(context, listen: false);
    final result = await auth.fetchCaptcha();
    if (result != null) {
      setState(() {
        _captchaId = result.$1;
        _captchaChallenge = result.$2;
        _captchaLoading = false;
      });
    } else {
      setState(() {
        _captchaChallenge = 'ERROR';
        _captchaId = '';
        _captchaLoading = false;
      });
    }
  }

  String? _validatePhone(String phone, String cc) {
    final clean = phone.replaceAll(RegExp(r'[\s\-()]'), '');
    if (clean.isEmpty) return 'Phone number is required.';
    if (!RegExp(r'^\d+$').hasMatch(clean))
      return 'Phone number must contain only digits.';
    if (clean.length != 10) return 'Phone number must be exactly 10 digits.';
    return null;
  }

  Future<void> _handleRegister() async {
    setState(() {
      _passwordError = null;
    });

    final name = _nameController.text.trim();
    final email = _emailController.text.trim().toLowerCase();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text;
    final city = _cityController.text.trim();

    // ── Validation (centralized) ────────────────────────────────
    final nameErr = AppValidators.validateName(name);
    if (nameErr != null) {
      _showSnack(nameErr);
      return;
    }

    final emailErr = AppValidators.validateEmail(email);
    if (emailErr != null) {
      _showSnack(emailErr);
      return;
    }

    if (password.length < 8) {
      setState(() {
        _passwordError = 'Password must be at least 8 characters.';
      });
      _showSnack('Password must be at least 8 characters.');
      return;
    }

    final passErr = AppValidators.validatePassword(password);
    if (passErr != null) {
      setState(() {
        _passwordError = passErr;
      });
      _showSnack(passErr);
      return;
    }

    final phoneErr = AppValidators.validatePhone(phone);
    if (phoneErr != null) {
      _showSnack(phoneErr);
      return;
    }

    if (_captchaId.isEmpty || _captchaController.text.trim().isEmpty) {
      _showSnack('Please complete the security check.');
      return;
    }

    final fullPhone =
        '$_countryCode${phone.replaceAll(RegExp(r'[\s\-()]'), '')}';
    final auth = context.read<AuthProvider>();

    await auth.register(
      name,
      email,
      password,
      fullPhone,
      city: city.isEmpty ? null : city,
      captchaId: _captchaId.isNotEmpty ? _captchaId : null,
      captchaAnswer: _captchaController.text.trim().isNotEmpty
          ? _captchaController.text.trim()
          : null,
    );

    if (!mounted) return;

    if (auth.isAuthenticated) {
      context.read<BookingProvider>().fetchMyBookings();
      context.go('/');
    } else if (auth.unverifiedEmail != null) {
      context.push('/otp', extra: auth.unverifiedEmail);
    } else if (auth.error != null) {
      _showSnack(auth.error!);
      _fetchCaptcha(); // refresh captcha after failure
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(msg), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pw = _passwordController.text;
    final bool lenOk = pw.length >= 8 && pw.length <= 15;
    final bool upperOk = RegExp(r'[A-Z]').hasMatch(pw);
    final bool numberOk = RegExp(r'[0-9]').hasMatch(pw);
    final bool specialOk = RegExp(r'[^A-Za-z0-9]').hasMatch(pw);

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
              icon: const Icon(
                Icons.chevron_left,
                color: AppTheme.primaryColor,
                size: 24,
              ),
              onPressed: () => context.go('/welcome'),
            ),
          ),
        ),
      ),
      body: AutofillGroup(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Logo ─────────────────────────────────
              Center(
                child: Text(
                  'Athithigriha',
                  style: TextStyle(
                    fontFamily: 'Cinzel',
                    color: AppTheme.primaryColor,
                    fontSize: 30,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 12),
              const Center(
                child: Text(
                  'Create an Account',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ── Full Name ─────────────────────────────
              _fieldLabel('Full Name', required: true),
              _textField(
                controller: _nameController,
                hint: 'John Doe',
                autofillHints: const [AutofillHints.name],
                keyboardType: TextInputType.name,
              ),
              const SizedBox(height: 16),

              // ── Email ─────────────────────────────────
              _fieldLabel('Email Address', required: true),
              _textField(
                controller: _emailController,
                hint: 'name@example.com',
                autofillHints: const [AutofillHints.email],
                keyboardType: TextInputType.emailAddress,
              ),
              const SizedBox(height: 16),

              // ── Password ──────────────────────────────
              _fieldLabel('Password', required: true),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                autofillHints: const [AutofillHints.newPassword],
                decoration: InputDecoration(
                  errorText: _passwordError,
                  hintText: '8–15 characters',
                  hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide(color: Colors.grey.shade300),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(
                      color: AppTheme.accentColor,
                      width: 1.5,
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 14,
                  ),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off_outlined
                          : Icons.visibility_outlined,
                      color: AppTheme.primaryColor.withOpacity(0.5),
                      size: 20,
                    ),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),
              // Password strength indicators (same 4 as web)
              const SizedBox(height: 8),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 6,
                mainAxisSpacing: 4,
                crossAxisSpacing: 4,
                children: [
                  _strengthCheck(lenOk, '8–15 characters'),
                  _strengthCheck(upperOk, '1 capital letter'),
                  _strengthCheck(numberOk, '1 number'),
                  _strengthCheck(specialOk, '1 special character'),
                ],
              ),
              const SizedBox(height: 16),

              // ── Phone (with country code) ──────────────
              _fieldLabel('Phone', required: true),
              Row(
                children: [
                  // Country code dropdown
                  Container(
                    height: 52,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _countryCode,
                        isDense: true,
                        items: _countryCodes
                            .map(
                              (c) => DropdownMenuItem(
                                value: c.$1,
                                child: Text(
                                  '${c.$1}',
                                  style: const TextStyle(fontSize: 13),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (v) =>
                            setState(() => _countryCode = v ?? '+91'),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextFormField(
                      controller: _phoneController,
                      maxLength: 10,
                      buildCounter:
                          (
                            context, {
                            required currentLength,
                            required isFocused,
                            maxLength,
                          }) => null,
                      autofillHints: const [AutofillHints.telephoneNumber],
                      keyboardType: TextInputType.phone,
                      decoration: InputDecoration(
                        hintText: '555 000 0000',
                        hintStyle: TextStyle(
                          color: Colors.grey[400],
                          fontSize: 14,
                        ),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(color: Colors.grey.shade300),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(
                            color: AppTheme.accentColor,
                            width: 1.5,
                          ),
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 14,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // ── City (optional) ───────────────────────
              _fieldLabel('City'),
              _textField(
                controller: _cityController,
                hint: 'New York',
                autofillHints: const [AutofillHints.addressCity],
                keyboardType: TextInputType.text,
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

              // ── Submit ────────────────────────────────
              const SizedBox(height: 8),
              Consumer<AuthProvider>(
                builder: (context, auth, _) => SizedBox(
                  width: double.infinity,
                  height: 54,
                  child: ElevatedButton(
                    onPressed: auth.isLoading ? null : _handleRegister,
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
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              color: Colors.white,
                              strokeWidth: 2.5,
                            ),
                          )
                        : const Text(
                            'Create Account',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // ── Divider ───────────────────────────────
              Row(
                children: [
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: Text(
                      'Or continue with',
                      style: TextStyle(
                        fontSize: 13,
                        color: Colors.grey.shade500,
                      ),
                    ),
                  ),
                  Expanded(child: Divider(color: Colors.grey.shade300)),
                ],
              ),
              const SizedBox(height: 16),

              // ── Google Sign-In ────────────────────────
              Consumer<AuthProvider>(
                builder: (context, auth, _) => SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    icon: _googleIcon(),
                    label: const Text(
                      'Continue with Google',
                      style: TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 15,
                      ),
                    ),
                    onPressed: auth.isLoading
                        ? null
                        : () async {
                            final ok = await auth.signInWithGoogle();
                            if (ok && mounted) {
                              context.read<BookingProvider>().fetchMyBookings();
                              context.go('/');
                            } else if (!ok && auth.error != null && mounted) {
                              _showSnack(auth.error!);
                            }
                          },
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppTheme.primaryColor,
                      side: BorderSide(color: Colors.grey.shade300),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // ── Phone Sign-In ─────────────────────────
              SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.smartphone_outlined, size: 18),
                  label: const Text(
                    'Continue with Phone Number',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  onPressed: () => PhoneAuthBottomSheet.show(context),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryColor,
                    side: BorderSide(color: Colors.grey.shade300),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ── Sign In link ──────────────────────────
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'Already have an account? ',
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 14,
                      ),
                    ),
                    GestureDetector(
                      onTap: () => context.go('/login'),
                      child: const Text(
                        'Sign In',
                        style: TextStyle(
                          color: AppTheme.accentColor,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────

  Widget _fieldLabel(String label, {bool required = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: AppTheme.primaryColor,
          ),
          children: [
            TextSpan(text: label),
            if (required)
              const TextSpan(
                text: ' *',
                style: TextStyle(color: Colors.red),
              ),
          ],
        ),
      ),
    );
  }

  Widget _textField({
    required TextEditingController controller,
    required String hint,
    List<String>? autofillHints,
    TextInputType? keyboardType,
  }) {
    return TextFormField(
      controller: controller,
      autofillHints: autofillHints,
      keyboardType: keyboardType,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.accentColor, width: 1.5),
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 14,
        ),
      ),
    );
  }

  Widget _strengthCheck(bool ok, String label) {
    return Row(
      children: [
        Container(
          width: 14,
          height: 14,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: ok ? Colors.green : Colors.transparent,
            border: Border.all(color: ok ? Colors.green : Colors.grey.shade400),
          ),
          child: ok
              ? const Icon(Icons.check, size: 10, color: Colors.white)
              : null,
        ),
        const SizedBox(width: 6),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: ok ? Colors.green : Colors.grey.shade500,
            fontWeight: ok ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }

  Widget _googleIcon() {
    return SizedBox(
      width: 20,
      height: 20,
      child: CustomPaint(painter: _GoogleIconPainter()),
    );
  }
}

class _GoogleIconPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;
    const paths = [
      (
        '#4285F4',
        'M 20 12.25 c 0 -0.78 -0.07 -1.53 -0.2 -2.25 H 10 v 4.26 h 5.92 c -0.26 1.37 -1.04 2.53 -2.21 3.31 v 2.77 h 3.57 c 2.08 -1.92 3.28 -4.74 3.28 -8.09 z',
      ),
    ];
    // Simple flat Google G — just paint 4 coloured arcs
    _drawG(canvas, size);
  }

  void _drawG(Canvas canvas, Size size) {
    final r = size.width / 2;
    final cx = r, cy = r;
    final paint = Paint()..style = PaintingStyle.fill;

    // Blue (right)
    paint.color = const Color(0xFF4285F4);
    final blueRect = Rect.fromCircle(center: Offset(cx, cy), radius: r);
    canvas.drawArc(blueRect, -0.35, 1.75, true, paint);

    // Green (bottom)
    paint.color = const Color(0xFF34A853);
    canvas.drawArc(blueRect, 1.4, 1.75, true, paint);

    // Yellow (left)
    paint.color = const Color(0xFFFBBC05);
    canvas.drawArc(blueRect, 3.14, 1.75, true, paint);

    // Red (top)
    paint.color = const Color(0xFFEA4335);
    canvas.drawArc(blueRect, 4.89, 1.75, true, paint);

    // White center circle
    paint.color = Colors.white;
    canvas.drawCircle(Offset(cx, cy), r * 0.6, paint);

    // White "G" gap
    paint.color = Colors.white;
    final gRect = Rect.fromLTWH(cx, cy - r * 0.15, r * 0.9, r * 0.3);
    canvas.drawRect(gRect, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
