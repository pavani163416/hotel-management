import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/utils/injection_container.dart';
import '../../../lost_found/presentation/bloc/lost_found_bloc.dart';
import '../../../lost_found/domain/entities/lost_found_entity.dart';

class LostAndFoundPage extends StatelessWidget {
  const LostAndFoundPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => sl<LostFoundBloc>()..add(FetchLostFoundEvent()),
      child: const _LostAndFoundView(),
    );
  }
}

class _LostAndFoundView extends StatefulWidget {
  const _LostAndFoundView();

  @override
  State<_LostAndFoundView> createState() => _LostAndFoundViewState();
}

class _LostAndFoundViewState extends State<_LostAndFoundView>
    with SingleTickerProviderStateMixin {
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

  final List<String> _categories = [
    'Electronics',
    'Clothing',
    'Documents',
    'Jewelry & Watches',
    'Keys/Cards',
    'Other',
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

    final data = {
      'type': _isLostType ? 'Lost' : 'Found',
      'itemName': _itemNameController.text.trim(),
      'category': _selectedCategory,
      'description': _descController.text.trim(),
      'location': _locationController.text.trim(),
      'dateLostFound': _selectedDate.toIso8601String(),
      'contactName': _nameController.text.trim(),
      'contactPhone': _phoneController.text.trim(),
    };

    context.read<LostFoundBloc>().add(SubmitLostFoundEvent(data));
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text(
          'Lost & Found Registry',
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
      body: BlocConsumer<LostFoundBloc, LostFoundState>(
        listener: (context, state) {
          if (state is LostFoundError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          } else if (state is LostFoundSubmitSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Report registered. Our concierge will review this immediately!'),
                behavior: SnackBarBehavior.floating,
                backgroundColor: Colors.green,
              ),
            );
            context.read<LostFoundBloc>().add(FetchLostFoundEvent());
            _itemNameController.clear();
            _descController.clear();
            _locationController.clear();
          }
        },
        builder: (context, state) {
          return SingleChildScrollView(
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
                      border: Border.all(
                        color: isDark ? Colors.white10 : AppTheme.mutedColor,
                  ),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            LucideIcons.edit3,
                            color: AppTheme.accentColor,
                            size: 18,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _isLostType
                                ? 'What did you lose?'
                                : 'What did you find?',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
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
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) =>
                            value!.isEmpty ? 'Please enter your name' : null,
                      ),
                      const SizedBox(height: 16),

                      // Contact Phone
                      TextFormField(
                        controller: _phoneController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Phone Number',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) => value!.isEmpty
                            ? 'Please enter your phone number'
                            : null,
                      ),
                      const SizedBox(height: 16),

                      // Item Title
                      TextFormField(
                        controller: _itemNameController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Item Name / Title',
                          hintText:
                              'e.g. iPhone 15, Wedding ring, Black jacket',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) => value!.isEmpty
                            ? 'Please describe the item title'
                            : null,
                      ),
                      const SizedBox(height: 16),

                      // Category Dropdown
                      DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        items: _categories
                            .map(
                              (cat) => DropdownMenuItem(
                                value: cat,
                                child: Text(
                                  cat,
                                  style: const TextStyle(fontSize: 14),
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (val) =>
                            setState(() => _selectedCategory = val!),
                        decoration: InputDecoration(
                          labelText: 'Category',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Location Lost/Found
                      TextFormField(
                        controller: _locationController,
                        style: const TextStyle(fontSize: 14),
                        decoration: InputDecoration(
                          labelText: _isLostType
                              ? 'Likely Lost Location'
                              : 'Where was it found?',
                          hintText:
                              'e.g. Near the pool deck, Room 304, Lobby cafe',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        validator: (value) =>
                            value!.isEmpty ? 'Please input a location' : null,
                      ),
                      const SizedBox(height: 16),

                      // Date selector
                      InkWell(
                        onTap: () => _selectDate(context),
                        child: InputDecorator(
                          decoration: InputDecoration(
                            labelText: _isLostType ? 'Date Lost' : 'Date Found',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                DateFormat(
                                  'MMMM dd, yyyy',
                                ).format(_selectedDate),
                                style: const TextStyle(fontSize: 14),
                              ),
                              const Icon(
                                LucideIcons.calendar,
                                size: 18,
                                color: AppTheme.primaryColor,
                              ),
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
                          hintText:
                              'Color, brand, distinguishing marks, contents...',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
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
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 0,
                          ),
                          child: state is LostFoundLoading
                              ? const CircularProgressIndicator(color: Colors.white)
                              : Text(
                                  _isLostType ? 'Submit Lost Report' : 'Submit Found Report',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
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
                      const Icon(
                        LucideIcons.clipboardList,
                        color: AppTheme.primaryColor,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Recent Catalog Matches',
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (state is LostFoundLoading && state is! LostFoundLoaded)
                    const Center(child: CircularProgressIndicator())
                  else if (state is LostFoundLoaded || state is LostFoundSubmitSuccess)
                    ...(() {
                      final items = state is LostFoundLoaded
                          ? state.reports
                          : [ (state as LostFoundSubmitSuccess).report ];
                      if (items.isEmpty) return <Widget>[const Text('No reports found.')];
                      return items.map(
                        (c) => Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark
                                ? const Color(0xFF253040)
                                : Colors.white,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isDark
                                  ? Colors.white10
                                  : AppTheme.mutedColor,
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    c.itemName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13.5,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: c.status == 'Resolved' || c.status == 'Found'
                                          ? Colors.green.withOpacity(0.1)
                                          : Colors.amber.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      c.status,
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.bold,
                                        color: c.status == 'Resolved' || c.status == 'Found'
                                            ? Colors.green
                                            : Colors.orange,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                c.description,
                                style: TextStyle(
                                  color: Colors.grey[500],
                                  fontSize: 11.5,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  const Icon(
                                    LucideIcons.mapPin,
                                    size: 10,
                                    color: Colors.grey,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    c.location,
                                    style: TextStyle(
                                      color: Colors.grey[500],
                                      fontSize: 10.5,
                                    ),
                                  ),
                                  const Spacer(),
                                  const Icon(
                                    LucideIcons.calendar,
                                    size: 10,
                                    color: Colors.grey,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    DateFormat('MMM d, yyyy').format(c.dateLostFound),
                                    style: TextStyle(
                                      color: Colors.grey[500],
                                      fontSize: 10.5,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ).toList();
                    })(),
                ],
              ),
            ),
            const SizedBox(height: 60),
          ],
        ),
      );
      }),
    );
  }
}
