import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../core/theme/app_theme.dart';
import 'package:lucide_icons/lucide_icons.dart';

class CustomRecaptcha extends StatefulWidget {
  final String captchaChallenge;
  final bool isLoading;
  final VoidCallback onRefresh;
  final Function(String) onSolved;
  final String? errorText;

  const CustomRecaptcha({
    super.key,
    required this.captchaChallenge,
    required this.isLoading,
    required this.onRefresh,
    required this.onSolved,
    this.errorText,
  });

  @override
  State<CustomRecaptcha> createState() => _CustomRecaptchaState();
}

class _CustomRecaptchaState extends State<CustomRecaptcha>
    with SingleTickerProviderStateMixin {
  bool _isChecked = false;
  bool _isVerified = false;
  bool _isChallengeVisible = false;
  final TextEditingController _answerController = TextEditingController();

  late AnimationController _spinController;

  @override
  void initState() {
    super.initState();
    _spinController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );
  }

  @override
  void dispose() {
    _answerController.dispose();
    _spinController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(CustomRecaptcha oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.captchaChallenge != oldWidget.captchaChallenge) {
      setState(() {
        _isChecked = false;
        _isVerified = false;
        _isChallengeVisible = false;
        _answerController.clear();
      });
    }
  }

  void _handleCheckboxTap() async {
    if (_isVerified) return;

    setState(() {
      _isChecked = true;
    });

    _spinController.repeat();

    // Simulate network delay for checking risk score
    await Future.delayed(const Duration(milliseconds: 800));

    if (mounted) {
      _spinController.stop();
      setState(() {
        _isChallengeVisible = true;
      });
    }
  }

  void _submitAnswer() {
    if (_answerController.text.trim().isEmpty) return;

    widget.onSolved(_answerController.text.trim());
    setState(() {
      _isChallengeVisible = false;
      _isVerified = true;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // The reCAPTCHA style main box
        InkWell(
          onTap: _isChallengeVisible ? null : _handleCheckboxTap,
          borderRadius: BorderRadius.circular(3),
          child: Container(
            height: 74,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFAFAFA),
              border: Border.all(color: const Color(0xFFD3D3D3), width: 1),
              borderRadius: BorderRadius.circular(3),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 2,
                  offset: const Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              children: [
                // Checkbox area
                Container(
                  width: 28,
                  height: 28,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    border: Border.all(
                      color: _isVerified
                          ? Colors.transparent
                          : const Color(0xFFC1C1C1),
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(2),
                  ),
                  child: _isVerified
                      ? const Icon(
                          Icons.check,
                          color: Color(0xFF009E55),
                          size: 24,
                        )
                      : _isChecked && !_isChallengeVisible
                      ? RotationTransition(
                          turns: _spinController,
                          child: const Padding(
                            padding: EdgeInsets.all(2.0),
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Color(0xFF4285F4),
                              ),
                            ),
                          ),
                        )
                      : null,
                ),
                const SizedBox(width: 12),

                // Label
                const Text(
                  "I'm not a robot",
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF555555),
                  ),
                ),

                const Spacer(),

                // Right side reCAPTCHA logo
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Mock reCAPTCHA logo loop
                    SizedBox(
                      height: 32,
                      width: 32,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Icon(
                            LucideIcons.refreshCw,
                            size: 24,
                            color: const Color(0xFF4285F4).withOpacity(0.8),
                          ),
                          Icon(
                            LucideIcons.shieldCheck,
                            size: 12,
                            color: const Color(0xFF0F9D58).withOpacity(0.9),
                          ),
                        ],
                      ),
                    ),
                    const Text(
                      'reCAPTCHA',
                      style: TextStyle(
                        fontSize: 10,
                        color: Color(0xFF555555),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Text(
                      'Privacy - Terms',
                      style: TextStyle(fontSize: 8, color: Color(0xFF999999)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),

        if (widget.errorText != null && widget.errorText!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8.0, left: 4.0),
            child: Text(
              widget.errorText!,
              style: const TextStyle(color: Colors.red, fontSize: 12),
            ),
          ),

        // Challenge Expansion Box
        AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          height: _isChallengeVisible ? 200 : 0,
          margin: EdgeInsets.only(top: _isChallengeVisible ? 12 : 0),
          decoration: BoxDecoration(
            color: Colors.white,
            border: Border.all(
              color: _isChallengeVisible
                  ? const Color(0xFF4285F4)
                  : Colors.transparent,
            ),
            borderRadius: BorderRadius.circular(3),
            boxShadow: _isChallengeVisible
                ? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : [],
          ),
          child: ClipRect(
            child: SingleChildScrollView(
              physics: const NeverScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      color: const Color(0xFF4285F4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Solve the challenge below',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          InkWell(
                            onTap: widget.isLoading ? null : widget.onRefresh,
                            child: widget.isLoading
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Icon(
                                    Icons.refresh,
                                    color: Colors.white,
                                    size: 20,
                                  ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      height: 60,
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0EBE1),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: widget.captchaChallenge.trim().startsWith('<svg')
                          ? SvgPicture.string(
                              widget.captchaChallenge,
                              fit: BoxFit.contain,
                            )
                          : Center(
                              child: Text(
                                widget.captchaChallenge,
                                style: const TextStyle(
                                  fontFamily: 'monospace',
                                  fontSize: 24,
                                  letterSpacing: 8,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _answerController,
                            decoration: const InputDecoration(
                              hintText: 'Enter characters',
                              isDense: true,
                              contentPadding: EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 12,
                              ),
                              border: OutlineInputBorder(),
                            ),
                            onSubmitted: (_) => _submitAnswer(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: _submitAnswer,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF4285F4),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              vertical: 12,
                              horizontal: 16,
                            ),
                          ),
                          child: const Text('Verify'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
