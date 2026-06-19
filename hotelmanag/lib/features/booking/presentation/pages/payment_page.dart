import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'razorpay_web_helper.dart';
import '../../../../core/providers/currency_provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/providers/notification_provider.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../../../../core/network/api_service.dart';
import '../../../../core/utils/injection_container.dart';
import '../../../../core/utils/validators.dart';
import '../../../../core/utils/biometric_helper.dart';
import 'package:dio/dio.dart';

class PaymentPage extends StatefulWidget {
  const PaymentPage({super.key});

  @override
  State<PaymentPage> createState() => _PaymentPageState();
}

class _PaymentPageState extends State<PaymentPage> {
  final _idFormKey = GlobalKey<FormState>();
  final _paymentFormKey = GlobalKey<FormState>();

  String _selectedMethod = 'card';
  String _selectedGuest = 'lead';
  String _selectedIdType = 'Aadhaar Card';
  String? _selectedBank;

  // Track field inputs using persistent controllers to avoid state loss during rebuilds
  late final TextEditingController _cardNumberController;
  late final TextEditingController _upiIdController;
  late final TextEditingController _cardHolderController;
  late final TextEditingController _expiryController;
  late final TextEditingController _cvvController;
  late final TextEditingController _idNumberController;

  late Razorpay _razorpay;
  String? _currentBookingId;
  String? _currentOrderId;

  // TC-FE-034: Guard flag — true from the moment Pay Now is tapped until
  // the Razorpay callback resolves (success or failure).
  bool _isProcessingPayment = false;

  // TC-FE-045: Inline error state — surfaces API booking failures directly
  // in the UI so the user is never left with a silent spinner.
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb) {
      _razorpay = Razorpay();
      _razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess);
      _razorpay.on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError);
      _razorpay.on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
    }

    _cardNumberController = TextEditingController();
    _upiIdController = TextEditingController();
    _cardHolderController = TextEditingController();
    _expiryController = TextEditingController();
    _cvvController = TextEditingController();
    _idNumberController = TextEditingController();
  }

  @override
  void dispose() {
    _cardNumberController.dispose();
    _upiIdController.dispose();
    _cardHolderController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _idNumberController.dispose();
    if (!kIsWeb) _razorpay.clear();
    super.dispose();
  }

  void _handlePaymentSuccess(PaymentSuccessResponse response) async {
    try {
      final api = sl<ApiService>();
      await api.post(
        'payments/verify',
        data: {
          'razorpay_order_id': response.orderId ?? _currentOrderId,
          'razorpay_payment_id': response.paymentId,
          'razorpay_signature': response.signature,
        },
      );
      if (mounted) {
        setState(() => _isProcessingPayment = false);
        try {
          context.read<NotificationProvider>().addNotification(
            'Booking Confirmed! 🎉',
            subtitle: 'Your payment was successful and stay is confirmed.',
            isCancelled: false,
          );
        } catch (_) {}
        context.push('/confirmation');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessingPayment = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment verification failed'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) async {
    if (mounted) setState(() => _isProcessingPayment = false);
    try {
      if (_currentOrderId != null || _currentBookingId != null) {
        final api = sl<ApiService>();
        await api.post(
          'payments/cancel',
          data: {'orderId': _currentOrderId, 'bookingId': _currentBookingId},
        );
      }
    } catch (_) {}
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment failed: ${response.message}'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    // Optional: handle external wallets
  }

  Future<void> _processPayment(BookingProvider provider) async {
    if (provider.isLoading || _isProcessingPayment) return;
    setState(() {
      _isProcessingPayment = true;
      _errorMessage = null; // TC-FE-045: Clear previous error on new attempt
    });

    String selectedGuestId = '';
    if (_selectedGuest == 'lead') {
      selectedGuestId = provider.leadGuest['id']?.trim() ?? '';
    } else if (_selectedGuest.startsWith('adult_')) {
      final index = int.tryParse(_selectedGuest.split('_')[1]);
      if (index != null &&
          index >= 0 &&
          index < provider.additionalAdults.length) {
        selectedGuestId = provider.additionalAdults[index]['id']?.trim() ?? '';
      }
    }

    final hasId = selectedGuestId.isNotEmpty;
    bool isIdValid = hasId ? true : _idFormKey.currentState!.validate();
    bool isPaymentValid = _paymentFormKey.currentState!.validate();

    if (_selectedMethod == 'bank' && _selectedBank == null) {
      isPaymentValid = false;
      setState(() => _isProcessingPayment = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please select your bank'),
          backgroundColor: Colors.redAccent,
        ),
      );
      return;
    }

    if (provider.total > 5000) {
      final authenticated = await BiometricHelper.authenticate(
        reason: 'Confirm your identity for high-value payment',
        context: context,
      );
      if (!authenticated) {
        if (mounted) setState(() => _isProcessingPayment = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Authentication required to proceed with payment'),
            backgroundColor: Colors.redAccent,
          ),
        );
        return;
      }
    }

    if (isIdValid && isPaymentValid) {
      if (_selectedMethod == 'card') {
        final cvv = _cvvController.text;
        if (double.tryParse(cvv) == null) {
          setState(() {
            _isProcessingPayment = false;
            _errorMessage = 'CVV must contain only numbers';
          });
          return;
        }

        final parts = _expiryController.text.split('/');
        if (parts.length == 2) {
          final month = int.tryParse(parts[0]) ?? 0;
          final year = int.tryParse(parts[1]) ?? 0;

          final now = DateTime.now();
          final currentYear = now.year % 100;
          final currentMonth = now.month;

          if (year < currentYear ||
              (year == currentYear && month < currentMonth)) {
            setState(() {
              _isProcessingPayment = false;
              _errorMessage = 'Card has expired. Please use a valid card.';
            });
            return;
          }
        } else {
          setState(() {
            _isProcessingPayment = false;
            _errorMessage = 'Invalid format. Use MM/YY.';
          });
          return;
        }
      }

      if (!hasId) {
        final newId = _idNumberController.text.trim();
        if (_selectedGuest == 'lead') {
          provider.updateLeadGuest({...provider.leadGuest, 'id': newId});
        } else if (_selectedGuest.startsWith('adult_')) {
          final index = int.tryParse(_selectedGuest.split('_')[1]);
          if (index != null &&
              index >= 0 &&
              index < provider.additionalAdults.length) {
            final updatedAdults = List<Map<String, String>>.from(
              provider.additionalAdults,
            );
            updatedAdults[index] = {...updatedAdults[index], 'id': newId};
            provider.setAdditionalGuests(updatedAdults, provider.children);
          }
        }
      }

      final cardNumber = _cardNumberController.text.trim();
      // Handle simulated payment failure tip
      if (_selectedMethod == 'card' && cardNumber.endsWith('0000')) {
        if (mounted) setState(() => _isProcessingPayment = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment Declined: Simulated transaction failure.'),
            backgroundColor: Colors.redAccent,
          ),
        );
        return;
      }

      final booking = await provider.completeBooking(_selectedMethod);

      // If booking creation failed, surface the error and unblock navigation
      if (booking == null) {
        if (mounted) {
          setState(() {
            _isProcessingPayment = false;
            _errorMessage =
                provider.error ??
                'Booking failed. Please check your details and try again.';
          });
          final errorMsg = provider.error ?? 'Booking failed';
          if (errorMsg.toLowerCase().contains('booked') ||
              errorMsg.toLowerCase().contains('occupied') ||
              errorMsg.toLowerCase().contains('dates')) {
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => AlertDialog(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                backgroundColor: Colors.white,
                title: const Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      color: Colors.redAccent,
                      size: 24,
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Dates Already Booked',
                        style: TextStyle(
                          fontFamily: 'Serif',
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
                content: Text(
                  '$errorMsg\n\nWould you like to change your booking dates or select a different room type?',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.primaryColor,
                  ),
                ),
                actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                actions: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          context.go('/booking');
                        },
                        child: const Text(
                          'Change Dates',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          side: const BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () {
                          Navigator.pop(context);
                          context.go('/hotels');
                        },
                        child: const Text(
                          'Select Different Room',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }
        }
        return;
      }
      _cardNumberController.clear();
      _cvvController.clear();
      _expiryController.clear();

      if (booking != null) {
        _currentBookingId = booking.id;
        try {
          final api = sl<ApiService>();
          final res = await api.post(
            'payments/create-order',
            data: {'bookingId': booking.id},
          );
          final data = res.data;

          if (data['success'] == true) {
            _currentOrderId = data['orderId'];

            var prefill = <String, String>{};
            if (provider.leadGuest['phone']?.isNotEmpty == true) {
              prefill['contact'] = provider.leadGuest['phone']!.replaceAll(
                ' ',
                '',
              );
            }
            if (provider.leadGuest['email']?.isNotEmpty == true) {
              prefill['email'] = provider.leadGuest['email']!.trim();
            }
            if (provider.leadGuest['name']?.isNotEmpty == true) {
              prefill['name'] = provider.leadGuest['name']!;
            }

            var options = <String, dynamic>{
              'key': data['key'] ?? 'rzp_test_dummy',
              'amount': (data['amount'] as num).toInt(),
              'currency': data['currency'] ?? 'INR',
              'name': 'Athithigriha',
              'description': 'Booking Payment',
              'order_id': _currentOrderId,
            };

            if (prefill.isNotEmpty) {
              options['prefill'] = prefill;
            }

            if (kIsWeb) {
              try {
                // Open Razorpay Checkout on Web using conditional JS interop
                openRazorpayWeb(
                  options: {
                    'key': data['key'] ?? 'rzp_test_dummy',
                    'amount': (data['amount'] as num).toInt(),
                    'currency': data['currency'] ?? 'INR',
                    'name': 'Athithigriha',
                    'description': 'Booking Payment',
                    'order_id': _currentOrderId,
                    if (prefill.isNotEmpty) 'prefill': prefill,
                    'theme': {'color': '#454F5E'},
                  },
                  onSuccess: (paymentId, orderId, signature) {
                    _handlePaymentSuccess(
                      PaymentSuccessResponse(
                        paymentId,
                        orderId ?? _currentOrderId,
                        signature,
                        null,
                      ),
                    );
                  },
                  onFailure: (message) {
                    _handlePaymentError(
                      PaymentFailureResponse(
                        0,
                        message,
                        null,
                      ),
                    );
                  },
                );
              } catch (e) {
                if (mounted) {
                  setState(() => _isProcessingPayment = false);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Razorpay SDK failed to initialize. Please verify if the gateway script is loaded.'),
                      backgroundColor: Colors.redAccent,
                    ),
                  );
                }
              }
            } else {
              _razorpay.open(options);
            }
          } else {
            throw Exception('Failed to create payment order');
          }
        } catch (e) {
          if (mounted) {
            setState(() => _isProcessingPayment = false);
            String message = 'Could not initialize payment gateway.';
            if (e is DioException) {
              if (e.response != null) {
                if (e.response?.data is Map) {
                  message = e.response?.data['message'] ?? message;
                } else if (e.response?.data is String) {
                  message = e.response?.data as String;
                }
              } else if (e.type == DioExceptionType.connectionError ||
                  e.type == DioExceptionType.connectionTimeout) {
                message = 'Unable to connect to the server. Please check your internet connection.';
              }
            } else if (e is Exception) {
              message = e.toString().replaceFirst('Exception: ', '');
            }
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(message),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
        }
      } else {
        if (mounted) {
          final errorMsg = provider.error ?? 'Booking failed';
          if (errorMsg.toLowerCase().contains('booked') ||
              errorMsg.toLowerCase().contains('occupied') ||
              errorMsg.toLowerCase().contains('dates')) {
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => AlertDialog(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
                backgroundColor: Colors.white,
                title: const Row(
                  children: [
                    Icon(
                      Icons.calendar_today_outlined,
                      color: Colors.redAccent,
                      size: 24,
                    ),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Dates Already Booked',
                        style: TextStyle(
                          fontFamily: 'Serif',
                          fontWeight: FontWeight.bold,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    ),
                  ],
                ),
                content: Text(
                  '$errorMsg\n\nWould you like to change your booking dates or select a different room type?',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppTheme.primaryColor,
                  ),
                ),
                actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                actions: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryColor,
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () {
                          Navigator.pop(context); // Close dialog
                          context.go(
                            '/booking',
                          ); // Navigate back to date selection step
                        },
                        child: const Text(
                          'Change Dates',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          side: const BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: () {
                          Navigator.pop(context); // Close dialog
                          context.go(
                            '/hotels',
                          ); // Navigate to hotels list page to choose another room
                        },
                        child: const Text(
                          'Select Different Room',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          } else {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(errorMsg),
                backgroundColor: Colors.redAccent,
              ),
            );
          }
        }
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please fill in all mandatory fields'),
          backgroundColor: Colors.redAccent,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<BookingProvider>();
    final hotel = provider.currentHotel;

    if (hotel == null) {
      return const MainLayout(child: Center(child: Text('No hotel selected')));
    }

    // TC-FE-034: Block back navigation while payment is in progress.
    return PopScope(
      canPop: !_isProcessingPayment && !provider.isLoading,
      onPopInvoked: (didPop) async {
        if (didPop) return;
        // Show warning dialog instead of silently blocking
        if (!mounted) return;
        await showDialog<void>(
          context: context,
          barrierDismissible: false,
          builder: (ctx) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            backgroundColor: Colors.white,
            title: const Row(
              children: [
                Icon(
                  Icons.warning_amber_rounded,
                  color: Colors.orange,
                  size: 28,
                ),
                SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Payment In Progress',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: AppTheme.primaryColor,
                    ),
                  ),
                ),
              ],
            ),
            content: const Text(
              'A payment is currently being processed.\n\n'
              'Leaving this screen now may result in you being charged without seeing a confirmation. '
              'Please wait for the payment to complete.',
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.primaryColor,
                height: 1.5,
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text(
                  'Stay on Page',
                  style: TextStyle(
                    color: AppTheme.primaryColor,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        );
      },
      child: Stack(
        children: [
          MainLayout(
            child: SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 24.0,
                  vertical: 32,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const StepperWidget(currentStep: 3),
                    const SizedBox(height: 24),
                    const Text(
                      'Payment',
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryColor,
                        fontFamily: 'Serif',
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          LucideIcons.lock,
                          size: 14,
                          color: AppTheme.primaryColor.withOpacity(0.5),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Secure 256-bit SSL encrypted',
                            style: TextStyle(
                              color: AppTheme.primaryColor.withOpacity(0.5),
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),

                    if (_errorMessage != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        margin: const EdgeInsets.only(bottom: 24),
                        decoration: BoxDecoration(
                          color: Colors.redAccent.withOpacity(0.1),
                          border: Border.all(color: Colors.redAccent),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: Colors.redAccent,
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(
                                  color: Colors.redAccent,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isWide = constraints.maxWidth > 800;
                        if (!isWide) {
                          return Column(
                            children: [
                              Form(
                                key: _idFormKey,
                                child: _buildGuestIdentityVerification(
                                  provider,
                                ),
                              ),
                              const SizedBox(height: 24),
                              _buildPaymentMethodSelector(),
                              const SizedBox(height: 24),
                              Form(
                                key: _paymentFormKey,
                                child: Column(
                                  children: [
                                    if (_selectedMethod == 'card')
                                      _buildCardForm(provider),
                                    if (_selectedMethod == 'upi')
                                      _buildUpiForm(provider),
                                    if (_selectedMethod == 'bank')
                                      _buildNetBankingForm(provider),
                                  ],
                                ),
                              ),
                            ],
                          );
                        }
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(
                              flex: 3,
                              child: Column(
                                children: [
                                  Form(
                                    key: _idFormKey,
                                    child: _buildGuestIdentityVerification(
                                      provider,
                                    ),
                                  ),
                                  const SizedBox(height: 24),
                                  _buildPaymentMethodSelector(),
                                  const SizedBox(height: 24),
                                  Form(
                                    key: _paymentFormKey,
                                    child: Column(
                                      children: [
                                        if (_selectedMethod == 'card')
                                          _buildCardForm(provider),
                                        if (_selectedMethod == 'upi')
                                          _buildUpiForm(provider),
                                        if (_selectedMethod == 'bank')
                                          _buildNetBankingForm(provider),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 32),
                            Expanded(
                              flex: 2,
                              child: _buildFinalSummary(context, provider),
                            ),
                          ],
                        );
                      },
                    ),

                    LayoutBuilder(
                      builder: (context, constraints) {
                        if (constraints.maxWidth <= 800) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 32),
                            child: _buildFinalSummary(context, provider),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            ),
          ),
          if (provider.isLoading)
            Positioned.fill(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: Container(
                  color: Colors.black.withOpacity(0.55),
                  child: Center(
                    child: Container(
                      margin: const EdgeInsets.symmetric(horizontal: 32),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 36),
                      decoration: BoxDecoration(
                        color: const Color(0xFF182232).withOpacity(0.95),
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.08),
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.4),
                            blurRadius: 30,
                            offset: const Offset(0, 15),
                          ),
                        ],
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Glowing Indicator
                          Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: AppTheme.accentColor.withOpacity(0.1),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppTheme.accentColor.withOpacity(0.2),
                                      blurRadius: 20,
                                      spreadRadius: 2,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(
                                width: 64,
                                height: 64,
                                child: CircularProgressIndicator(
                                  strokeWidth: 3,
                                  valueColor: AlwaysStoppedAnimation<Color>(AppTheme.accentColor),
                                ),
                              ),
                              const Icon(
                                LucideIcons.shieldCheck,
                                color: AppTheme.accentColor,
                                size: 32,
                              ),
                            ],
                          ),
                          const SizedBox(height: 28),
                          const Text(
                            'Processing Payment',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                              fontFamily: 'Serif',
                            ),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'Please do not close the app, lock your screen, or press the back button while we secure your transaction.',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.7),
                              fontSize: 13,
                              height: 1.5,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 28),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Colors.white.withOpacity(0.05),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  LucideIcons.lock,
                                  color: Colors.white.withOpacity(0.6),
                                  size: 14,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  'Secure 256-Bit SSL Connection',
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.6),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildGuestIdentityVerification(BookingProvider provider) {
    final leadName = provider.leadGuest['name'] ?? 'Guest';

    String selectedGuestId = '';
    if (_selectedGuest == 'lead') {
      selectedGuestId = provider.leadGuest['id']?.trim() ?? '';
    } else if (_selectedGuest.startsWith('adult_')) {
      final index = int.tryParse(_selectedGuest.split('_')[1]);
      if (index != null &&
          index >= 0 &&
          index < provider.additionalAdults.length) {
        selectedGuestId = provider.additionalAdults[index]['id']?.trim() ?? '';
      }
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(LucideIcons.checkCircle, size: 18, color: Colors.blueAccent),
              SizedBox(width: 12),
              Expanded(
                child: Text(
                  'Guest Identity Verification',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.primaryColor,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Required by Indian hotel regulations (MHA guidelines). Your ID is used for check-in only and is not stored digitally.',
            style: TextStyle(
              fontSize: 11,
              color: AppTheme.primaryColor.withOpacity(0.5),
            ),
          ),
          Text(
            'SELECT GUEST FOR VERIFICATION *',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor.withOpacity(0.4),
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 16),
          _buildGuestOption('lead', leadName.toUpperCase(), true),
          const SizedBox(height: 12),

          ...provider.additionalAdults.asMap().entries.map((entry) {
            final index = entry.key;
            final guest = entry.value;
            final name = guest['name']?.isNotEmpty == true
                ? guest['name']!
                : 'ADULT ${index + 1}';
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _buildGuestOption(
                'adult_$index',
                name.toUpperCase(),
                false,
              ),
            );
          }),

          if (selectedGuestId.isNotEmpty) ...[
            _buildLabel('GOVT ID ON FILE'),
            const SizedBox(height: 8),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppTheme.mutedColor.withOpacity(0.6)),
              ),
              child: Text(
                selectedGuestId,
                style: const TextStyle(
                  fontSize: 14,
                  color: AppTheme.primaryColor,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'ID already entered in guest details, so no extra Government ID input is required here.',
              style: TextStyle(
                fontSize: 10,
                color: AppTheme.primaryColor.withOpacity(0.6),
              ),
            ),
            const SizedBox(height: 12),
          ] else ...[
            _buildLabel('ID TYPE *'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                border: Border.all(color: AppTheme.mutedColor),
                borderRadius: BorderRadius.circular(10),
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  isExpanded: true,
                  value: _selectedIdType,
                  items: ['Aadhaar Card', 'PAN Card', 'Voter ID', 'Passport']
                      .map((String value) {
                        return DropdownMenuItem<String>(
                          value: value,
                          child: Text(
                            value,
                            style: const TextStyle(
                              fontSize: 14,
                              color: AppTheme.primaryColor,
                            ),
                          ),
                        );
                      })
                      .toList(),
                  onChanged: (v) => setState(() {
                    _selectedIdType = v!;
                    _idNumberController.clear(); // clear previous tracking
                  }),
                ),
              ),
            ),
            const SizedBox(height: 24),
            _buildLabel('${_selectedIdType.toUpperCase()} NUMBER *'),
            const SizedBox(height: 8),
            _buildTextField(
              _selectedIdType == 'Aadhaar Card'
                  ? 'XXXX XXXX XXXX'
                  : 'Enter your $_selectedIdType number',
              required: true,
              controller: _idNumberController,
            ),
            const SizedBox(height: 12),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  LucideIcons.info,
                  size: 12,
                  color: AppTheme.primaryColor.withOpacity(0.4),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'As per Ministry of Home Affairs guidelines, hotels are required to collect a valid government-issued photo ID at check-in.',
                    style: TextStyle(
                      fontSize: 10,
                      color: AppTheme.primaryColor.withOpacity(0.4),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildGuestOption(String id, String name, bool isLead) {
    bool isSelected = _selectedGuest == id;
    return GestureDetector(
      onTap: () => setState(() => _selectedGuest = id),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : AppTheme.mutedColor,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(
                  color: isSelected ? AppTheme.primaryColor : Colors.grey[400]!,
                ),
              ),
              child: isSelected
                  ? Center(
                      child: Container(
                        width: 10,
                        height: 10,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppTheme.primaryColor,
                        ),
                      ),
                    )
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                name,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
            if (isLead)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(4),
                ),
                child: const Text(
                  'Lead Guest',
                  style: TextStyle(fontSize: 9, color: Colors.grey),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildPaymentMethodSelector() {
    return Row(
      children: [
        _buildMethodTab('card', LucideIcons.creditCard, 'Card'),
        const SizedBox(width: 12),
        _buildMethodTab('upi', LucideIcons.smartphone, 'UPI'),
        const SizedBox(width: 12),
        _buildMethodTab('bank', LucideIcons.landmark, 'Net Banking'),
      ],
    );
  }

  Widget _buildMethodTab(String id, IconData icon, String label) {
    bool isSelected = _selectedMethod == id;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setState(() {
            _selectedMethod = id;
            // Clear prior validation errors when switching tabs
            _paymentFormKey.currentState?.reset();
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            color: isSelected ? Colors.grey[50] : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? AppTheme.primaryColor : AppTheme.mutedColor,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                size: 20,
                color: isSelected ? AppTheme.primaryColor : Colors.grey,
              ),
              const SizedBox(height: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? AppTheme.primaryColor : Colors.grey,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCardForm(BookingProvider provider) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel('CARD NUMBER *'),
          const SizedBox(height: 8),
          _buildTextField(
            '1234 5678 9012 3456',
            required: true,
            controller: _cardNumberController,
            customValidator: AppValidators.validateCardNumber,
          ),
          const SizedBox(height: 24),
          _buildLabel('CARDHOLDER NAME *'),
          const SizedBox(height: 8),
          _buildTextField(
            'John Doe',
            required: true,
            controller: _cardHolderController,
          ),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('EXPIRY *'),
                    const SizedBox(height: 8),
                    _buildTextField(
                      'MM/YY',
                      required: true,
                      controller: _expiryController,
                      customValidator: AppValidators.validateExpiry,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('CVV *'),
                    const SizedBox(height: 8),
                    _buildTextField(
                      '123',
                      required: true,
                      controller: _cvvController,
                      customValidator: AppValidators.validateCVV,
                      keyboardType: TextInputType.number,
                      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                      maxLength: 4,
                      counterText: '',
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          _buildPayButton(provider),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Tip: use any card ending in 0000 to simulate a declined payment',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpiForm(BookingProvider provider) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel('UPI ID *'),
          const SizedBox(height: 8),
          _buildTextField(
            'yourname@bank',
            required: true,
            controller: _upiIdController,
          ),
          const SizedBox(height: 32),
          _buildPayButton(provider),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Tip: use any card ending in 0000 to simulate a declined payment',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNetBankingForm(BookingProvider provider) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildLabel('SELECT BANK *'),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              border: Border.all(
                color: _selectedBank == null
                    ? Colors.redAccent.withOpacity(0.5)
                    : AppTheme.mutedColor,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: _selectedBank,
                hint: const Text(
                  'Choose your bank',
                  style: TextStyle(fontSize: 14, color: Colors.grey),
                ),
                items:
                    [
                      'State Bank of India',
                      'HDFC Bank',
                      'ICICI Bank',
                      'Axis Bank',
                    ].map((String value) {
                      return DropdownMenuItem<String>(
                        value: value,
                        child: Text(
                          value,
                          style: const TextStyle(
                            fontSize: 14,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                      );
                    }).toList(),
                onChanged: (v) => setState(() => _selectedBank = v),
              ),
            ),
          ),
          const SizedBox(height: 32),
          _buildPayButton(provider),
          const SizedBox(height: 16),
          const Center(
            child: Text(
              'Tip: use any card ending in 0000 to simulate a declined payment',
              style: TextStyle(fontSize: 10, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPayButton(BookingProvider provider) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: provider.isLoading ? null : () => _processPayment(provider),
        style: ElevatedButton.styleFrom(
          backgroundColor: isDark
              ? const Color(0xFFEAE5DC)
              : const Color(0xFF454F5E),
          foregroundColor: isDark ? const Color(0xFF19222E) : Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 20),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          elevation: 2,
        ),
        child: provider.isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(Colors.grey),
                ),
              )
            : Text(
                'Pay ${context.watch<CurrencyProvider>().format(provider.total)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                ),
              ),
      ),
    );
  }

  Widget _buildFinalSummary(BuildContext context, BookingProvider provider) {
    final hotel = provider.currentHotel!;
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.mutedColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            hotel.name,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
          Text(
            '${provider.selectedRoomType} · ${provider.nights} nights',
            style: TextStyle(
              fontSize: 13,
              color: AppTheme.primaryColor.withOpacity(0.6),
            ),
          ),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          _buildPriceRow(
            'Subtotal',
            context.watch<CurrencyProvider>().format(provider.subtotal),
          ),
          _buildPriceRow(
            'Service Fee',
            context.watch<CurrencyProvider>().format(provider.serviceFee),
          ),
          _buildPriceRow(
            'Taxes (GST)',
            context.watch<CurrencyProvider>().format(provider.taxes),
          ),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Expanded(
                child: Text(
                  'Total',
                  style: TextStyle(fontSize: 14, color: AppTheme.primaryColor),
                ),
              ),
              const SizedBox(width: 16),
              Text(
                context.watch<CurrencyProvider>().format(provider.total),
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 48),
          const Text(
            'SAVED TO DATABASE ON PAYMENT',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 16),
          _buildCheckItem('Guest profile (name, email, phone)'),
          if (provider.additionalAdults.isNotEmpty)
            _buildCheckItem(
              '${provider.additionalAdults.length} additional adult(s)',
            ),
          if (provider.children.isNotEmpty)
            _buildCheckItem('${provider.children.length} child(ren)'),
          _buildCheckItem('Booking dates & pricing'),
          _buildCheckItem('Room marked as Booked'),
        ],
      ),
    );
  }

  Widget _buildPriceRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                color: AppTheme.primaryColor.withOpacity(0.6),
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(width: 16),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCheckItem(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          const Icon(LucideIcons.check, size: 10, color: Colors.orangeAccent),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 10,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor.withOpacity(0.5),
        letterSpacing: 0.5,
      ),
    );
  }

  Widget _buildTextField(
    String hint, {
    bool required = false,
    TextEditingController? controller,
    String? Function(String?)? customValidator,
    TextInputType? keyboardType,
    List<TextInputFormatter>? inputFormatters,
    int? maxLength,
    String? counterText,
  }) {
    return TextFormField(
      key: ValueKey(
        hint,
      ), // Forces Flutter to preserve unique state per textfield hint
      controller: controller,
      keyboardType: keyboardType,
      inputFormatters: inputFormatters,
      maxLength: maxLength,
      validator: (value) {
        if (required && (value == null || value.trim().isEmpty)) {
          return 'This field is required';
        }
        if (customValidator != null) {
          return customValidator(value);
        }
        return null;
      },
      decoration: InputDecoration(
        counterText: counterText,
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[300], fontSize: 14),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.mutedColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: AppTheme.mutedColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(
            color: AppTheme.primaryColor,
            width: 1.2,
          ),
        ),
        errorStyle: const TextStyle(fontSize: 10, color: Colors.redAccent),
      ),
    );
  }
}
