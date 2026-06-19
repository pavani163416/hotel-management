import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/hotel_provider.dart';
import '../../../../core/providers/currency_provider.dart';
import '../../../../core/network/api_service.dart';
import '../../../../core/utils/injection_container.dart';

class HallItem {
  final String id;
  final String name;
  final String description;
  final int capacity;
  final double pricePerDay;
  final double pricePerHour;
  final List<String> amenities;

  const HallItem({
    required this.id,
    required this.name,
    required this.description,
    required this.capacity,
    required this.pricePerDay,
    required this.pricePerHour,
    required this.amenities,
  });

  factory HallItem.fromJson(Map<String, dynamic> json) {
    return HallItem(
      id: json['_id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Function Hall',
      description: json['description']?.toString() ?? '',
      capacity: (json['capacity'] as num?)?.toInt() ?? 50,
      pricePerDay: (json['pricePerDay'] as num?)?.toDouble() ?? 0.0,
      pricePerHour: (json['pricePerHour'] as num?)?.toDouble() ?? 0.0,
      amenities: List<String>.from(json['amenities'] ?? []),
    );
  }
}

class HallsBookingPage extends StatefulWidget {
  const HallsBookingPage({super.key});

  @override
  State<HallsBookingPage> createState() => _HallsBookingPageState();
}

class _HallsBookingPageState extends State<HallsBookingPage> {
  String? _selectedHotelId;
  String? _selectedHotelName;
  List<HallItem> _halls = [];
  bool _isLoadingHalls = false;
  String? _hallsError;

  HallItem? _selectedHall;

  // Form Fields
  final _formKey = GlobalKey<FormState>();
  final _eventNameController = TextEditingController();
  final _capacityController = TextEditingController();
  final _notesController = TextEditingController();
  
  DateTime? _selectedDate;
  TimeOfDay? _startTime;
  TimeOfDay? _endTime;

  bool _isSubmitting = false;
  bool _bookingSuccess = false;

  @override
  void initState() {
    super.initState();
    // Fetch hotels on page load
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<HotelProvider>(context, listen: false).fetchHotels(silent: true);
    });
  }

  @override
  void dispose() {
    _eventNameController.dispose();
    _capacityController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _fetchHalls(String hotelId) async {
    debugPrint('[HallsBookingPage] _fetchHalls called for hotelId: $hotelId');
    setState(() {
      _isLoadingHalls = true;
      _hallsError = null;
      _selectedHall = null;
      _halls = [];
    });

    try {
      final apiService = sl<ApiService>();
      final url = 'hotels/$hotelId/halls';
      debugPrint('[HallsBookingPage] Querying API: $url');
      final response = await apiService.get(url);
      
      debugPrint('[HallsBookingPage] API response status: ${response.statusCode}');
      debugPrint('[HallsBookingPage] API response payload: ${response.data}');
      
      final List dataList = response.data['data'] ?? [];
      
      setState(() {
        _halls = dataList.map((e) => HallItem.fromJson(e)).toList();
        _isLoadingHalls = false;
      });
      debugPrint('[HallsBookingPage] Successfully mapped ${_halls.length} function halls.');
    } catch (e) {
      debugPrint('[HallsBookingPage] Exception during _fetchHalls: $e');
      String errorMsg = e.toString();
      if (e is DioException) {
        final resData = e.response?.data;
        if (resData is Map && resData.containsKey('message')) {
          errorMsg = resData['message'] ?? errorMsg;
        } else if (e.message != null) {
          errorMsg = e.message!;
        }
      }
      setState(() {
        _hallsError = 'Failed to load function halls: $errorMsg';
        _isLoadingHalls = false;
      });
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppTheme.primaryColor,
              onPrimary: Colors.white,
              onSurface: AppTheme.primaryColor,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  Future<void> _selectTime(BuildContext context, bool isStart) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: isStart 
          ? (_startTime ?? const TimeOfDay(hour: 9, minute: 0)) 
          : (_endTime ?? const TimeOfDay(hour: 17, minute: 0)),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
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
        if (isStart) {
          _startTime = picked;
        } else {
          _endTime = picked;
        }
      });
    }
  }

  String _formatTimeOfDay(TimeOfDay tod) {
    final hour = tod.hour.toString().padLeft(2, '0');
    final minute = tod.minute.toString().padLeft(2, '0');
    return '$hour:$minute';
  }

  Future<void> _submitBooking() async {
    if (_formKey.currentState!.validate()) {
      if (_selectedDate == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select an event date'), behavior: SnackBarBehavior.floating),
        );
        return;
      }
      if (_startTime == null || _endTime == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select start and end times'), behavior: SnackBarBehavior.floating),
        );
        return;
      }

      final startMinutes = _startTime!.hour * 60 + _startTime!.minute;
      final endMinutes = _endTime!.hour * 60 + _endTime!.minute;

      if (startMinutes >= endMinutes) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('End time must be after start time'), behavior: SnackBarBehavior.floating),
        );
        return;
      }

      final capacityVal = int.tryParse(_capacityController.text) ?? 0;
      if (_selectedHall != null && capacityVal > _selectedHall!.capacity) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Capacity cannot exceed hall capacity of ${_selectedHall!.capacity}'),
            behavior: SnackBarBehavior.floating,
          ),
        );
        return;
      }

      setState(() {
        _isSubmitting = true;
      });

      try {
        final apiService = sl<ApiService>();
        final payload = {
          'eventName': _eventNameController.text.trim(),
          'date': _selectedDate!.toIso8601String(),
          'startTime': _formatTimeOfDay(_startTime!),
          'endTime': _formatTimeOfDay(_endTime!),
          'capacity': capacityVal,
          'notes': _notesController.text.trim(),
        };

        final url = 'hotels/$_selectedHotelId/halls/${_selectedHall!.id}/book';
        debugPrint('[HallsBookingPage] Submitting booking request to: $url with payload: $payload');
        
        final response = await apiService.post(
          url,
          data: payload,
        );

        debugPrint('[HallsBookingPage] Booking request success. Response: ${response.data}');

        setState(() {
          _bookingSuccess = true;
          _isSubmitting = false;
        });
      } catch (e) {
        debugPrint('[HallsBookingPage] Booking request error: $e');
        setState(() {
          _isSubmitting = false;
        });
        String message = e.toString();
        if (e is DioException) {
          final resData = e.response?.data;
          if (resData is Map && resData.containsKey('message')) {
            message = resData['message'] ?? message;
          } else if (e.message != null) {
            message = e.message!;
          }
        } else if (e is Map && e.containsKey('message')) {
          message = e['message'];
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to request booking: $message'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currencyProvider = Provider.of<CurrencyProvider>(context);
    final hotelProvider = Provider.of<HotelProvider>(context);

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'Function Halls',
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
          duration: const Duration(milliseconds: 300),
          child: _bookingSuccess
              ? _buildSuccessScreen()
              : _buildMainContent(hotelProvider, isDark, currencyProvider),
        ),
      ),
    );
  }

  Widget _buildSuccessScreen() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircleAvatar(
              radius: 40,
              backgroundColor: Colors.green,
              child: Icon(LucideIcons.check, color: Colors.white, size: 40),
            ),
            const SizedBox(height: 24),
            const Text(
              'Booking Request Sent!',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Your request for ${_eventNameController.text} in ${_selectedHall?.name} has been sent successfully.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 12),
            Text(
              'The hotel manager and admin have been notified and will review your request.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[500], fontSize: 13),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  context.pop();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text('Back to Profile', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMainContent(HotelProvider hotelProvider, bool isDark, CurrencyProvider currencyProvider) {
    final hotels = hotelProvider.allHotels;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Select Hotel dropdown card
          _buildCard(
            isDark: isDark,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'SELECT HOTEL',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                    letterSpacing: 1,
                  ),
                ),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: _selectedHotelId,
                  hint: const Text('Choose a hotel'),
                  isExpanded: true,
                  decoration: InputDecoration(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: isDark ? Colors.white24 : Colors.grey[300]!),
                    ),
                  ),
                  items: hotels.map((hotel) {
                    return DropdownMenuItem<String>(
                      value: hotel.id,
                      child: Text(hotel.name),
                    );
                  }).toList(),
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _selectedHotelId = val;
                        final hotel = hotels.firstWhere((h) => h.id == val);
                        _selectedHotelName = hotel.name;
                      });
                      _fetchHalls(val);
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_isLoadingHalls)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40.0),
                child: CircularProgressIndicator(),
              ),
            )
          else if (_hallsError != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 30.0),
                child: Text(_hallsError!, style: const TextStyle(color: Colors.red)),
              ),
            )
          else if (_selectedHotelId != null && _halls.isEmpty)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 30.0),
                child: Text('No function halls available in this hotel.'),
              ),
            )
          else if (_selectedHotelId != null) ...[
            const Text(
              'Available Halls',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 10),
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _halls.length,
              itemBuilder: (context, index) {
                final hall = _halls[index];
                final isSelected = _selectedHall?.id == hall.id;

                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _selectedHall = hall;
                    });
                  },
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF253040) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? AppTheme.primaryColor : (isDark ? Colors.white10 : Colors.grey[200]!),
                        width: isSelected ? 2 : 1,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                hall.name,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ),
                            Text(
                              hall.pricePerDay > 0 
                                  ? '${currencyProvider.format(hall.pricePerDay)}/day'
                                  : '${currencyProvider.format(hall.pricePerHour)}/hour',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          hall.description,
                          style: TextStyle(color: Colors.grey[600], fontSize: 13),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(LucideIcons.users, size: 14, color: Colors.grey),
                            const SizedBox(width: 6),
                            Text(
                              'Up to ${hall.capacity} guests',
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                        if (hall.amenities.isNotEmpty) ...[
                          const SizedBox(height: 10),
                          Wrap(
                            spacing: 6,
                            runSpacing: 6,
                            children: hall.amenities.map((amenity) {
                              return Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: AppTheme.primaryColor.withOpacity(0.06),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  amenity,
                                  style: const TextStyle(fontSize: 11, color: AppTheme.primaryColor),
                                ),
                              );
                            }).toList(),
                          ),
                        ]
                      ],
                    ),
                  ),
                );
              },
            ),
          ],

          if (_selectedHall != null) ...[
            const SizedBox(height: 16),
            const Text(
              'Request Booking',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            const SizedBox(height: 10),
            _buildBookingForm(isDark),
          ],
        ],
      ),
    );
  }

  Widget _buildCard({required bool isDark, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? Colors.white10 : Colors.grey[200]!),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _buildBookingForm(bool isDark) {
    return Form(
      key: _formKey,
      child: _buildCard(
        isDark: isDark,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Event Name
            const Text('Event Name', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            TextFormField(
              controller: _eventNameController,
              decoration: InputDecoration(
                hintText: 'Wedding, conference, party',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Please enter event name';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Date picker
            const Text('Event Date', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            InkWell(
              onTap: () => _selectDate(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _selectedDate == null 
                          ? 'Select Date' 
                          : DateFormat('dd-MM-yyyy').format(_selectedDate!),
                    ),
                    const Icon(LucideIcons.calendar, size: 18, color: Colors.grey),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Start & End Time Row
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Start Time', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () => _selectTime(context, true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_startTime == null ? '--:--' : _startTime!.format(context)),
                              const Icon(LucideIcons.clock, size: 18, color: Colors.grey),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('End Time', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      const SizedBox(height: 6),
                      InkWell(
                        onTap: () => _selectTime(context, false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_endTime == null ? '--:--' : _endTime!.format(context)),
                              const Icon(LucideIcons.clock, size: 18, color: Colors.grey),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Capacity
            const Text('Expected Guests / Capacity', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            TextFormField(
              controller: _capacityController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                hintText: 'Number of guests',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              validator: (val) {
                if (val == null || val.trim().isEmpty) {
                  return 'Please enter capacity';
                }
                final numVal = int.tryParse(val);
                if (numVal == null || numVal <= 0) {
                  return 'Capacity must be a positive number';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),

            // Notes
            const Text('Additional Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 6),
            TextFormField(
              controller: _notesController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Catering, seating arrangements, etc.',
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Submit Button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitBooking,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primaryColor,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: _isSubmitting 
                    ? const SizedBox(
                        height: 20, 
                        width: 20, 
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Submit Request', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
