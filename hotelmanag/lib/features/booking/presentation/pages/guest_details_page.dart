import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/stepper_widget.dart';

class GuestDetailsPage extends StatefulWidget {
  const GuestDetailsPage({super.key});

  @override
  State<GuestDetailsPage> createState() => _GuestDetailsPageState();
}

class _GuestDetailsPageState extends State<GuestDetailsPage> {
  final List<Map<String, String>> _additionalAdults = [];
  final List<Map<String, String>> _children = [];

  void _addAdult() {
    setState(() {
      _additionalAdults.add({'name': '', 'email': '', 'phone': '', 'requests': ''});
    });
  }

  void _addChild() {
    setState(() {
      _children.add({'name': '', 'age': ''});
    });
  }

  @override
  Widget build(BuildContext context) {
    return MainLayout(
      child: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const StepperWidget(currentStep: 1),
              const SizedBox(height: 24),
              const Text(
                'Guest Details',
                style: TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor,
                  fontFamily: 'Serif',
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Enter the lead guest information for this reservation.',
                style: TextStyle(color: AppTheme.primaryColor.withOpacity(0.5), fontSize: 14),
              ),
              const SizedBox(height: 32),
              
              // Lead Guest Card
              _buildLeadGuestCard(),
              
              const SizedBox(height: 48),
              
              // Additional Adults Section
              _buildAdultsHeader(),
              const SizedBox(height: 16),
              if (_additionalAdults.isEmpty)
                _buildEmptyState('No additional adults.')
              else
                ..._additionalAdults.asMap().entries.map((entry) => _buildAdultCard(entry.key)),
              
              const SizedBox(height: 32),
              const Divider(color: AppTheme.mutedColor),
              const SizedBox(height: 32),
              
              // Children Section
              _buildChildrenHeader(),
              const SizedBox(height: 16),
              if (_children.isEmpty)
                _buildEmptyState('No children.')
              else
                ..._children.asMap().entries.map((entry) => _buildChildRow(entry.key)),
              
              const SizedBox(height: 60),
              
              // Bottom Action Button
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton(
                  onPressed: () => context.push('/review'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 20),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('Continue to Review', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      SizedBox(width: 12),
                      Icon(LucideIcons.arrowRight, size: 18),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLeadGuestCard() {
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
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppTheme.mutedColor.withOpacity(0.3),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.user, size: 18, color: AppTheme.primaryColor),
              ),
              const SizedBox(width: 12),
              const Text(
                'Lead Guest',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(color: AppTheme.mutedColor),
          const SizedBox(height: 24),
          _buildLabel('FULL NAME'),
          const SizedBox(height: 8),
          _buildTextField('e.g. James Wilson'),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('EMAIL ADDRESS'),
                    const SizedBox(height: 8),
                    _buildTextField('you@example.com'),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('PHONE NUMBER'),
                    const SizedBox(height: 8),
                    _buildTextField('+1 (555) 000-0000'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildLabel('SPECIAL REQUESTS (OPTIONAL)'),
          const SizedBox(height: 8),
          _buildTextField(
            'Late check-in, dietary requirements, room preferences...',
            maxLines: 3,
          ),
        ],
      ),
    );
  }

  Widget _buildAdultsHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Additional Adults',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
        ),
        TextButton.icon(
          onPressed: _addAdult,
          icon: const Icon(LucideIcons.plus, size: 16),
          label: const Text('Add Adult'),
          style: TextButton.styleFrom(
            foregroundColor: AppTheme.primaryColor,
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
        ),
      ],
    );
  }

  Widget _buildAdultCard(int index) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 24),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppTheme.mutedColor.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'ADULT ${index + 1}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppTheme.primaryColor.withOpacity(0.6),
                  letterSpacing: 1,
                ),
              ),
              GestureDetector(
                onTap: () => setState(() => _additionalAdults.removeAt(index)),
                child: const Icon(LucideIcons.trash2, size: 18, color: Colors.grey),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildLabel('FULL NAME'),
          const SizedBox(height: 8),
          _buildTextField('Full Name'),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('EMAIL ADDRESS'),
                    const SizedBox(height: 8),
                    _buildTextField('you@example.com'),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildLabel('PHONE NUMBER'),
                    const SizedBox(height: 8),
                    _buildTextField('+1 (555) 000-0000'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildLabel('SPECIAL REQUESTS (OPTIONAL)'),
          const SizedBox(height: 8),
          _buildTextField('Dietary requirements, room preferences...', maxLines: 2),
        ],
      ),
    );
  }

  Widget _buildChildrenHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          'Children',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
        ),
        TextButton.icon(
          onPressed: _addChild,
          icon: const Icon(LucideIcons.plus, size: 16),
          label: const Text('Add Child'),
          style: TextButton.styleFrom(
            foregroundColor: AppTheme.primaryColor,
            textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
          ),
        ),
      ],
    );
  }

  Widget _buildChildRow(int index) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Expanded(
            flex: 3,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildLabel('CHILD ${index + 1} FULL NAME'),
                const SizedBox(height: 8),
                _buildTextField('Full Name'),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            flex: 1,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildLabel('AGE'),
                const SizedBox(height: 8),
                _buildTextField('e.g. 5'),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: IconButton(
              icon: const Icon(LucideIcons.trash2, size: 20, color: Colors.grey),
              onPressed: () => setState(() => _children.removeAt(index)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Text(
        text,
        style: TextStyle(
          color: AppTheme.primaryColor.withOpacity(0.4),
          fontStyle: FontStyle.italic,
          fontSize: 14,
        ),
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

  Widget _buildTextField(String hint, {int maxLines = 1}) {
    return TextField(
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[400], fontSize: 13),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
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
          borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.2),
        ),
      ),
    );
  }
}
