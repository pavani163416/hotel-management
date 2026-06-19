import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/network/api_service.dart';
import '../../../../core/utils/injection_container.dart';

class InRoomServicesPage extends StatefulWidget {
  const InRoomServicesPage({super.key});

  @override
  State<InRoomServicesPage> createState() => _InRoomServicesPageState();
}

class _InRoomServicesPageState extends State<InRoomServicesPage> {
  final _roomController = TextEditingController();
  final _descriptionController = TextEditingController();
  bool _requestSubmitted = false;
  String _currentStep = 'Submitted';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final activeBookings = Provider.of<BookingProvider>(
        context,
        listen: false,
      ).bookings;

      if (activeBookings.isNotEmpty) {
        final active = activeBookings
            .where(
              (b) =>
                  b.status.toLowerCase() == 'confirmed' ||
                  b.status.toLowerCase() == 'active',
            )
            .toList();
        final booking = active.isNotEmpty ? active.first : activeBookings.first;
        final roomNo = booking.roomNumber;

        if (roomNo != null && roomNo.trim().isNotEmpty) {
          _roomController.text = roomNo.toLowerCase().contains('room')
              ? roomNo
              : 'Room $roomNo';
        } else {
          final shortId = booking.id.length > 4
              ? booking.id.substring(booking.id.length - 3)
              : '104';
          final parsed = int.tryParse(shortId) ?? 104;
          _roomController.text = 'Room ${200 + (parsed % 300)}';
        }
      }
    });
  }

  @override
  void dispose() {
    _roomController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  void _submitRequest() async {
    if (_roomController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your room number'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    if (_descriptionController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please describe your request'),
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _requestSubmitted = true;
    });

    try {
      final apiService = sl<ApiService>();
      await apiService.post(
        'services/request',
        data: {
          'roomNumber': _roomController.text.trim(),
          'description': _descriptionController.text.trim(),
        },
      );

      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) setState(() => _currentStep = 'Received');
      });
      Future.delayed(const Duration(seconds: 10), () {
        if (mounted) setState(() => _currentStep = 'Dispatched');
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _requestSubmitted = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to submit request: ${e.toString()}'),
            behavior: SnackBarBehavior.floating,
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'In-Room Concierge',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 18,
            color: AppTheme.primaryColor,
          ),
        ),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: AppTheme.primaryColor),
          onPressed: () => context.pop(),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: SafeArea(
        child: AnimatedSwitcher(
          duration: const Duration(milliseconds: 400),
          child: _requestSubmitted
              ? _buildTrackingScreen(isDark)
              : _buildRequestScreen(isDark),
        ),
      ),
    );
  }

  Widget _buildRequestScreen(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 24),
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF253040) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : AppTheme.mutedColor,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryColor.withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    LucideIcons.key,
                    color: AppTheme.primaryColor,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'YOUR ASSIGNED ROOM',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _roomController,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                        decoration: const InputDecoration(
                          hintText: 'Enter room number (e.g. 402)',
                          border: InputBorder.none,
                          isDense: true,
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF253040) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? Colors.white10 : AppTheme.mutedColor,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Enter your request',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: _descriptionController,
                  minLines: 4,
                  maxLines: 8,
                  decoration: const InputDecoration(
                    hintText: 'Enter your request here',
                    border: InputBorder.none,
                    isDense: true,
                    contentPadding: EdgeInsets.zero,
                  ),
                ),
              ],
            ),
          ),
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _submitRequest,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primaryColor,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              child: const Text(
                'Submit Request to Concierge',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackingScreen(bool isDark) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const SizedBox(height: 24),
          const Center(
            child: CircleAvatar(
              radius: 40,
              backgroundColor: Colors.green,
              child: Icon(LucideIcons.check, color: Colors.white, size: 40),
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Request Transmitted!',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Your requests for Room ${_roomController.text} are being handled by our team.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey[500], fontSize: 13.5),
          ),
          const SizedBox(height: 40),
          _buildTrackerStep(
            'Submitted',
            'Request placed successfully',
            'Your concierge ticket has been created.',
            _currentStep == 'Submitted' ||
                _currentStep == 'Received' ||
                _currentStep == 'Dispatched',
          ),
          _buildTrackerStep(
            'Received',
            'Ticket accepted by Concierge',
            'Staff are organizing your requested service.',
            _currentStep == 'Received' || _currentStep == 'Dispatched',
          ),
          _buildTrackerStep(
            'Dispatched',
            'Staff dispatched to your room',
            'Keep an eye out! A concierge staff member is on the way to Room ${_roomController.text}.',
            _currentStep == 'Dispatched',
          ),
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                setState(() {
                  _requestSubmitted = false;
                  _currentStep = 'Submitted';
                });
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.primaryColor),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
              child: const Text(
                'Submit Another Request',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackerStep(
    String title,
    String subtitle,
    String body,
    bool active,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: active ? Colors.green : Colors.grey[300],
              child: active
                  ? const Icon(LucideIcons.check, size: 12, color: Colors.white)
                  : null,
            ),
            Container(
              width: 2,
              height: 60,
              color: active ? Colors.green : Colors.grey[300],
            ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: active ? Colors.green : Colors.grey,
                ),
              ),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: active
                      ? Theme.of(context).colorScheme.onSurface
                      : Colors.grey,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                body,
                style: TextStyle(fontSize: 11.5, color: Colors.grey[500]),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }
}
