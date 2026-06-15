import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';

class LostFoundItem {
  final String title;
  final String description;
  final String location;
  final String date;
  final String status;

  const LostFoundItem({
    required this.title,
    required this.description,
    required this.location,
    required this.date,
    required this.status,
  });
}

class LostAndFoundPage extends StatefulWidget {
  const LostAndFoundPage({super.key});

  @override
  State<LostAndFoundPage> createState() => _LostAndFoundPageState();
}

class _LostAndFoundPageState extends State<LostAndFoundPage> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _formKey = GlobalKey<FormState>();
  
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _itemNameController = TextEditingController();
  final _locationController = TextEditingController();
  final _descController = TextEditingController();
  
  DateTime _selectedDate = DateTime.now();
  String _selectedCategory = 'Electronics';
  bool _isLostType = true;
  bool _submitted = false;

  final List<String> _categories = ['Electronics', 'Clothing', 'Documents', 'Jewelry & Watches', 'Keys/Cards', 'Other'];

  final List<LostFoundItem> _catalog = [
    const LostFoundItem(title: 'Black Leather Wallet', description: 'Contains ID card under name J. Doe, plus credit cards', location: 'Poolside Deck Chair', date: 'June 14, 2026', status: 'Found by Staff'),
    const LostFoundItem(title: 'Apple iPhone Charger', description: 'White USB-C charging adapter and cable', location: 'Lobby seating area near piano', date: 'June 13, 2026', status: 'Returned to Guest'),
    const LostFoundItem(title: 'Gold Wedding Ring', description: 'Engraved with initials A&B, polished finish', location: 'Gym locker rooms', date: 'June 15, 2026', status: 'Lost / Pending Match'),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      setState(() {
        _isLostType = _tabController.index == 0;
      });
    });

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = Provider.of<AuthProvider>(context, listen: false).user;
      if (user != null) {
        _nameController.text = user.name;
        _phoneController.text = user.phone ?? '';
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    _itemNameController.dispose();
    _locationController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2026, 1),
      lastDate: DateTime.now(),
    );
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
      });
    }
  }

  void _handleSubmit() {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitted = true;
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Report registered. Our concierge will review this immediately!'),
        behavior: SnackBarBehavior.floating,
        backgroundColor: Colors.green,
      ),
    );

    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) context.pop();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Lost & Found Registry', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: AppTheme.primaryColor)),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft, color: AppTheme.primaryColor),
          onPressed: () => context.pop(),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppTheme.primaryColor,
          unselectedLabelColor: Colors.grey,
          indicatorColor: AppTheme.accentColor,
          tabs: const [
            Tab(text: 'Report Lost Item'),
            Tab(text: 'Report Found Item'),
          ],
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Form Section
            Padding(
              padding: const EdgeInsets.all(16),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF253040) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(LucideIcons.edit3, color: AppTheme.accentColor, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            _isLostType ? 'What did you lose?' : 'What did you find?',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      
                      // Contact Name
                      TextFormField(
                        controller: _nameController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Contact Name',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value!.isEmpty ? 'Please enter your name' : null,
                      ),
                      const SizedBox(height: 16),
                      
                      // Contact Phone
                      TextFormField(
                        controller: _phoneController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Phone Number',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value!.isEmpty ? 'Please enter your phone number' : null,
                      ),
                      const SizedBox(height: 16),

                      // Item Title
                      TextFormField(
                        controller: _itemNameController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Item Name / Title',
                          hintText: 'e.g. iPhone 15, Wedding ring, Black jacket',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value!.isEmpty ? 'Please describe the item title' : null,
                      ),
                      const SizedBox(height: 16),

                      // Category Dropdown
                      DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        items: _categories.map((cat) => DropdownMenuItem(value: cat, child: Text(cat, style: const TextStyle(fontSize: 14)))).toList(),
                        onChanged: (val) => setState(() => _selectedCategory = val!),
                        decoration: InputDecoration(
                          labelText: 'Category',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Location Lost/Found
                      TextFormField(
                        controller: _locationController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: _isLostType ? 'Likely Lost Location' : 'Where was it found?',
                          hintText: 'e.g. Near the pool deck, Room 304, Lobby cafe',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => value!.isEmpty ? 'Please input a location' : null,
                      ),
                      const SizedBox(height: 16),

                      // Date selector
                      InkWell(
                        onTap: () => _selectDate(context),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: _isLostType ? 'Date Lost' : 'Date Found',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(DateFormat('MMMM dd, yyyy').format(_selectedDate), style: const TextStyle(fontSize: 14)),
                              const Icon(LucideIcons.calendar, size: 18, color: AppTheme.primaryColor),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Description
                      TextFormField(
                        controller: _descController,
                        maxLines: 3,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Additional Details / Description',
                          hintText: 'Color, brand, distinguishing marks, contents...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _handleSubmit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryColor,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            elevation: 0,
                          ),
                          child: Text(_isLostType ? 'Submit Lost Report' : 'Submit Found Report', style: const TextStyle(fontWeight: FontWeight.bold)),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

            // Live Catalog Matches
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(LucideIcons.clipboardList, color: AppTheme.primaryColor, size: 18),
                      const SizedBox(width: 8),
                      Text('Recent Catalog Matches', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._catalog.map((c) => Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF253040) : Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isDark ? Colors.white10 : AppTheme.mutedColor),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(c.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: c.status.contains('Staff') ? Colors.green.withOpacity(0.1) : Colors.amber.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                c.status,
                                style: TextStyle(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                  color: c.status.contains('Staff') ? Colors.green : Colors.orange,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(c.description, style: TextStyle(color: Colors.grey[500], fontSize: 11.5)),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            const Icon(LucideIcons.mapPin, size: 10, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text(c.location, style: TextStyle(color: Colors.grey[500], fontSize: 10.5)),
                            const Spacer(),
                            const Icon(LucideIcons.calendar, size: 10, color: Colors.grey),
                            const SizedBox(width: 4),
                            Text(c.date, style: TextStyle(color: Colors.grey[500], fontSize: 10.5)),
                          ],
                        ),
                      ],
                    ),
                  )).toList(),
                ],
              ),
            ),
            const SizedBox(height: 60),
          ],
        ),
      ),
    );
  }
}
