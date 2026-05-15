import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';

class BookingPage extends StatefulWidget {
  const BookingPage({super.key});

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> {
  DateTime checkInDate = DateTime(2026, 5, 22);
  DateTime checkOutDate = DateTime(2026, 5, 25);
  int nights = 3;
  int guests = 2;
  final double pricePerNight = 346.0;

  Future<void> _selectDate(BuildContext context, bool isCheckIn) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: isCheckIn ? checkInDate : checkOutDate,
      firstDate: DateTime.now(),
      lastDate: DateTime(2101),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              onSurface: AppTheme.primaryColor,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() {
        if (isCheckIn) {
          checkInDate = picked;
          if (checkOutDate.isBefore(checkInDate.add(const Duration(days: 1)))) {
            checkOutDate = checkInDate.add(const Duration(days: 1));
          }
        } else {
          checkOutDate = picked;
        }
        nights = checkOutDate.difference(checkInDate).inDays;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      showAppBar: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24.0),
        child: Column(
          children: [
            const StepperWidget(currentStep: 0),
            const SizedBox(height: 16),
            const Text(
              'Your Selection',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppTheme.primaryColor, fontFamily: 'Serif'),
            ),
            const SizedBox(height: 8),
            Text(
              'Confirm your stay details before continuing.',
              style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.5), fontSize: 14),
            ),
            const SizedBox(height: 32),
            _buildMainSelectionCard(),
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }

  Widget _buildMainSelectionCard() {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 30,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Hotel Image
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            child: Image.network(
              'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1600',
              height: 250,
              width: double.infinity,
              fit: BoxFit.cover,
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'swagruha hotel',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF2C3E50)),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(LucideIcons.mapPin, size: 14, color: Colors.blue.withOpacity(0.7)),
                    const SizedBox(width: 4),
                    Text(
                      'guntur',
                      style: TextStyle(color: Colors.blue.withOpacity(0.7), fontSize: 14),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Divider(color: Color(0xFFEEEEEE)),
                const SizedBox(height: 24),
                
                // Responsive Row/Column for Details
                LayoutBuilder(
                  builder: (context, constraints) {
                    final bool isWide = constraints.maxWidth > 600;
                    return Wrap(
                      spacing: 32,
                      runSpacing: 24,
                      children: [
                        _buildSection('ROOM', Text('Standard', style: _valueStyle())),
                        _buildSection(
                          'DATES',
                          Column(
                            children: [
                              _buildDateInput(checkInDate, true),
                              const SizedBox(height: 8),
                              _buildDateInput(checkOutDate, false),
                            ],
                          ),
                        ),
                        _buildSection(
                          'DURATION',
                          Column(
                            children: [
                              _buildCounterRow(LucideIcons.moon, '$nights nights', () {
                                if (nights > 1) {
                                  setState(() {
                                    nights--;
                                    checkOutDate = checkInDate.add(Duration(days: nights));
                                  });
                                }
                              }, () {
                                setState(() {
                                  nights++;
                                  checkOutDate = checkInDate.add(Duration(days: nights));
                                });
                              }),
                              const SizedBox(height: 12),
                              _buildCounterRow(LucideIcons.users, '$guests guests', () {
                                if (guests > 1) setState(() => guests--);
                              }, () {
                                setState(() => guests++);
                              }),
                            ],
                          ),
                        ),
                      ],
                    );
                  }
                ),
                
                const SizedBox(height: 32),
                const Divider(color: Color(0xFFEEEEEE)),
                const SizedBox(height: 24),
                
                // Footer: Price and Continue
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Subtotal ($nights nights)', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        Text(
                          '\$${NumberFormat("#,###").format(pricePerNight * nights)}',
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF2C3E50)),
                        ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () => context.push('/guest-details'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF34495E),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Row(
                        children: [
                          Text('Continue', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          SizedBox(width: 8),
                          Icon(LucideIcons.arrowRight, size: 18),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(String label, Widget content) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(_getIconForLabel(label), size: 14, color: Colors.grey),
            const SizedBox(width: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1),
            ),
          ],
        ),
        const SizedBox(height: 12),
        content,
      ],
    );
  }

  IconData _getIconForLabel(String label) {
    switch (label) {
      case 'ROOM': return LucideIcons.bed;
      case 'DATES': return LucideIcons.calendar;
      case 'DURATION': return LucideIcons.clock;
      default: return LucideIcons.info;
    }
  }

  Widget _buildDateInput(DateTime date, bool isCheckIn) {
    return InkWell(
      onTap: () => _selectDate(context, isCheckIn),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFEEEEEE)),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(DateFormat('dd - MM - yyyy').format(date), style: const TextStyle(fontSize: 13, color: Colors.black87)),
            const SizedBox(width: 12),
            const Icon(LucideIcons.calendar, size: 14, color: Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildCounterRow(IconData icon, String text, VoidCallback onMinus, VoidCallback onPlus) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _buildCounterBtn(LucideIcons.minus, onMinus),
        const SizedBox(width: 12),
        SizedBox(
          width: 70,
          child: Text(text, style: const TextStyle(fontSize: 14, color: Colors.black87)),
        ),
        _buildCounterBtn(LucideIcons.plus, onPlus),
      ],
    );
  }

  Widget _buildCounterBtn(IconData icon, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFEEEEEE)),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 12, color: Colors.grey),
      ),
    );
  }

  TextStyle _valueStyle() => const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF2C3E50));
}

