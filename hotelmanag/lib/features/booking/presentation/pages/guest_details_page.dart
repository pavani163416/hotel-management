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
      _additionalAdults.add({'name': ''});
    });
  }

  void _addChild() {
    setState(() {
      _children.add({'name': ''});
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
              
              const SizedBox(height: 32),
              
              // Additional Adults Section
              _buildDynamicSection(
                title: 'Additional Adults',
                items: _additionalAdults,
                onAdd: _addAdult,
                emptyText: 'No additional adults.',
                addButtonLabel: 'Add Adult',
              ),
              
              const SizedBox(height: 24),
              const Divider(color: AppTheme.mutedColor),
              const SizedBox(height: 24),
              
              // Children Section
              _buildDynamicSection(
                title: 'Children',
                items: _children,
                onAdd: _addChild,
                emptyText: 'No children.',
                addButtonLabel: 'Add Child',
              ),
              
              const SizedBox(height: 48),
              
              // Bottom Action Button
              Align(
                alignment: Alignment.centerRight,
                child: ElevatedButton(
                  onPressed: () => context.push('/payment'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
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
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
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
            maxLines: 4,
          ),
        ],
      ),
    );
  }

  Widget _buildDynamicSection({
    required String title,
    required List<Map<String, String>> items,
    required VoidCallback onAdd,
    required String emptyText,
    required String addButtonLabel,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryColor),
            ),
            TextButton.icon(
              onPressed: onAdd,
              icon: const Icon(LucideIcons.plus, size: 16),
              label: Text(addButtonLabel),
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.primaryColor,
                textStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (items.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              emptyText,
              style: TextStyle(
                color: AppTheme.primaryColor.withOpacity(0.5),
                fontStyle: FontStyle.italic,
                fontSize: 14,
              ),
            ),
          )
        else
          ...items.asMap().entries.map((entry) {
            final index = entry.key;
            return Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Expanded(
                    child: _buildTextField('Guest Name ${index + 1}'),
                  ),
                  IconButton(
                    icon: const Icon(LucideIcons.trash2, size: 18, color: Colors.redAccent),
                    onPressed: () {
                      setState(() {
                        items.removeAt(index);
                      });
                    },
                  ),
                ],
              ),
            );
          }),
      ],
    );
  }

  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontSize: 11,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryColor.withOpacity(0.5),
        letterSpacing: 1,
      ),
    );
  }

  Widget _buildTextField(String hint, {int maxLines = 1}) {
    return TextField(
      maxLines: maxLines,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.grey[400], fontSize: 14),
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.mutedColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.mutedColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: AppTheme.primaryColor, width: 1.5),
        ),
      ),
    );
  }
}
