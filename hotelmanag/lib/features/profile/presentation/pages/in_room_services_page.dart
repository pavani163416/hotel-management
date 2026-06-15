import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/booking_provider.dart';
import '../../../../core/providers/currency_provider.dart';

class ServiceItem {
  final String id;
  final String name;
  final String description;
  final double price;
  final IconData icon;

  const ServiceItem({
    required this.id,
    required this.name,
    required this.description,
    required this.price,
    required this.icon,
  });
}

class InRoomServicesPage extends StatefulWidget {
  const InRoomServicesPage({super.key});

  @override
  State<InRoomServicesPage> createState() => _InRoomServicesPageState();
}

class _InRoomServicesPageState extends State<InRoomServicesPage> {
  final _roomController = TextEditingController();
  String _selectedCategory = 'Housekeeping';
  final List<ServiceItem> _cart = [];
  bool _requestSubmitted = false;
  String _currentStep = 'Submitted';

  final Map<String, List<ServiceItem>> _services = {
    'Housekeeping': [
      const ServiceItem(id: 'h1', name: 'Fresh Towels Set', description: '2 bath towels, 2 hand towels', price: 0.0, icon: LucideIcons.wind),
      const ServiceItem(id: 'h2', name: 'Extra Feather Pillows', description: 'Set of 2 luxury pillows', price: 5.0, icon: LucideIcons.box),
      const ServiceItem(id: 'h3', name: 'Room Turn-Down Service', description: 'Bed making, fresh water, tidying', price: 15.0, icon: LucideIcons.sparkles),
      const ServiceItem(id: 'h4', name: 'Premium Toiletries Pack', description: 'L\'Occitane soap, shampoo, lotion', price: 8.0, icon: LucideIcons.smile),
    ],
    'In-Room Dining': [
      const ServiceItem(id: 'd1', name: 'Continental Breakfast', description: 'Croissant, juice, coffee, eggs', price: 20.0, icon: LucideIcons.coffee),
      const ServiceItem(id: 'd2', name: 'Club Sandwich & Fries', description: 'Classic double decker chicken sandwich', price: 18.0, icon: LucideIcons.chefHat),
      const ServiceItem(id: 'd3', name: 'Fresh Fruit Platter', description: 'Seasonal sliced fruits and berries', price: 12.0, icon: LucideIcons.apple),
      const ServiceItem(id: 'd4', name: 'Sparkling Mineral Water', description: '750ml premium San Pellegrino', price: 6.0, icon: LucideIcons.glassWater),
    ],
    'Maintenance': [
      const ServiceItem(id: 'm1', name: 'AC Temperature Check', description: 'AC not cooling / heating correctly', price: 0.0, icon: LucideIcons.thermometer),
      const ServiceItem(id: 'm2', name: 'WiFi Trouble', description: 'Slow connection or login issues', price: 0.0, icon: LucideIcons.wifi),
      const ServiceItem(id: 'm3', name: 'Lightbulb Replacement', description: 'Broken bulb in bedroom or bathroom', price: 0.0, icon: LucideIcons.lightbulb),
      const ServiceItem(id: 'm4', name: 'TV Remote / Channel Setup', description: 'Remote control not working', price: 0.0, icon: LucideIcons.tv),
    ],
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final activeBookings = Provider.of<BookingProvider>(context, listen: false).bookings;
      if (activeBookings.isNotEmpty) {
        // Find the first confirmed/active booking
        final active = activeBookings.where((b) => b.status.toLowerCase() == 'confirmed' || b.status.toLowerCase() == 'active').toList();
        final booking = active.isNotEmpty ? active.first : activeBookings.first;
        final roomNo = booking.roomNumber;
        if (roomNo != null && roomNo.trim().isNotEmpty) {
          _roomController.text = roomNo.toLowerCase().contains('room') ? roomNo : 'Room $roomNo';
        } else {
          // If room number is not allocated yet, generate a dynamic number based on booking ID hash
          final shortId = booking.id.length > 4 ? booking.id.substring(booking.id.length - 3) : '104';
          final parsed = int.tryParse(shortId) ?? 104;
          _roomController.text = 'Room ${200 + (parsed % 300)}';
        }
      }
    });
  }

  @override
  void dispose() {
    _roomController.dispose();
    super.dispose();
  }

  double get _totalPrice => _cart.fold(0, (sum, item) => sum + item.price);

  void _submitRequest() {
    if (_roomController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your room number'), behavior: SnackBarBehavior.floating),
      );
      return;
    }
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one service'), behavior: SnackBarBehavior.floating),
      );
      return;
    }

    setState(() {
      _requestSubmitted = true;
    });

    // Simulate concierge live status steps
    Future.delayed(const Duration(seconds: 4), () {
      if (mounted) setState(() => _currentStep = 'Received');
    });
    Future.delayed(const Duration(seconds: 10), () {
      if (mounted) setState(() => _currentStep = 'Dispatched');
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyProvider = Provider.of<CurrencyProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('In-Room Concierge', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryColor)),
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
              : _buildRequestScreen(isDark, currencyProvider),
        ),
      ),
    );
  }

  Widget _buildRequestScreen(bool isDark, CurrencyProvider currencyProvider) {
    return Column(
      children: [
        // Room Number Input Card
        Container(
          margin: const EdgeInsets.all(16),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF253040) : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.primaryColor.withOpacity(0.08),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.key, color: AppTheme.primaryColor, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('YOUR ASSIGNED ROOM', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    TextField(
                      controller: _roomController,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
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

        // Category Selection Tab Bar
        Container(
          height: 44,
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: _services.keys.map((cat) {
              final active = _selectedCategory == cat;
              return Container(
                margin: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(cat, style: TextStyle(fontWeight: active ? FontWeight.bold : FontWeight.normal, color: active ? Colors.white : (isDark ? Colors.grey[400] : Colors.grey[800]))),
                  selected: active,
                  onSelected: (val) => setState(() => _selectedCategory = cat),
                  selectedColor: AppTheme.primaryColor,
                  backgroundColor: isDark ? const Color(0xFF253040) : Colors.grey[100],
                  side: BorderSide.none,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              );
            }).toList(),
          ),
        ),

        // Services List
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _services[_selectedCategory]!.length,
            itemBuilder: (context, index) {
              final item = _services[_selectedCategory]![index];
              final inCart = _cart.any((i) => i.id == item.id);

              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF253040) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: inCart ? AppTheme.primaryColor : (isDark ? Colors.white10 : AppTheme.mutedColor)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(color: AppTheme.primaryColor.withOpacity(0.06), borderRadius: BorderRadius.circular(12)),
                      child: Icon(item.icon, color: AppTheme.primaryColor, size: 20),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.5)),
                          const SizedBox(height: 2),
                          Text(item.description, style: TextStyle(fontSize: 11.5, color: Colors.grey[500])),
                          const SizedBox(height: 6),
                          Text(
                            item.price == 0 ? 'Complimentary' : currencyProvider.format(item.price),
                            style: TextStyle(
                              fontSize: 12.5,
                              fontWeight: FontWeight.bold,
                              color: item.price == 0 ? Colors.green : AppTheme.primaryColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: Icon(inCart ? LucideIcons.minusCircle : LucideIcons.plusCircle, color: inCart ? Colors.red : AppTheme.primaryColor),
                      onPressed: () {
                        setState(() {
                          if (inCart) {
                            _cart.removeWhere((i) => i.id == item.id);
                          } else {
                            _cart.add(item);
                          }
                        });
                      },
                    ),
                  ],
                ),
              );
            },
          ),
        ),

        // Checkout Section
        if (_cart.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF19222E) : Colors.white,
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, -4))],
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${_cart.length} Request items selected', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                    Text('Total: ${currencyProvider.format(_totalPrice)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _submitRequest,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    child: const Text('Submit Request to Concierge', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
      ],
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
          const Text('Request Transmitted!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text('Your requests for Room ${_roomController.text} are being handled by our team.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[500], fontSize: 13.5)),
          const SizedBox(height: 40),
          
          // Live Tracker Status Cards
          _buildTrackerStep('Submitted', 'Request placed successfully', 'Your concierge ticket #LS-8291 has been created.', _currentStep == 'Submitted' || _currentStep == 'Received' || _currentStep == 'Dispatched'),
          _buildTrackerStep('Received', 'Ticket accepted by Concierge', 'Staff are organizing your requested service items.', _currentStep == 'Received' || _currentStep == 'Dispatched'),
          _buildTrackerStep('Dispatched', 'Staff dispatched to your room', 'Keep an eye out! A concierge staff member is on the way to Room ${_roomController.text}.', _currentStep == 'Dispatched'),
          
          const SizedBox(height: 40),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () {
                setState(() {
                  _cart.clear();
                  _requestSubmitted = false;
                  _currentStep = 'Submitted';
                });
              },
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppTheme.primaryColor),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
              child: const Text('Submit Another Request', style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryColor)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackerStep(String title, String subtitle, String body, bool active) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: active ? Colors.green : Colors.grey[300],
              child: active ? const Icon(LucideIcons.check, size: 12, color: Colors.white) : null,
            ),
            Container(width: 2, height: 60, color: active ? Colors.green : Colors.grey[300]),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: active ? Colors.green : Colors.grey)),
              Text(subtitle, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: active ? Theme.of(context).colorScheme.onSurface : Colors.grey)),
              const SizedBox(height: 4),
              Text(body, style: TextStyle(fontSize: 11.5, color: Colors.grey[500])),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ],
    );
  }
}
