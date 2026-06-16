import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../theme/app_theme.dart';

class StepperWidget extends StatelessWidget {
  final int currentStep;
  const StepperWidget({super.key, required this.currentStep});

  static const List<String> steps = [
    "Selection",
    "Guest Details",
    "Review",
    "Payment",
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: List.generate(steps.length, (index) {
          return Expanded(
            child: Row(
              children: [
                _buildStepCircle(
                  index,
                  index < currentStep,
                  index == currentStep,
                ),
                if (index < steps.length - 1)
                  Expanded(child: _buildConnector(index < currentStep)),
              ],
            ),
          );
        }),
      ),
    );
  }

  Widget _buildStepCircle(int index, bool isDone, bool isActive) {
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isDone || isActive
                ? AppTheme.accentColor
                : AppTheme.mutedColor.withOpacity(0.3),
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isDone
                ? const Icon(
                    LucideIcons.check,
                    size: 16,
                    color: AppTheme.primaryColor,
                  )
                : Text(
                    '${index + 1}',
                    style: TextStyle(
                      color: isDone || isActive
                          ? AppTheme.primaryColor
                          : Colors.grey,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          steps[index],
          style: TextStyle(
            fontSize: 10,
            fontWeight: isActive ? FontWeight.bold : FontWeight.normal,
            color: isActive ? AppTheme.primaryColor : Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildConnector(bool isDone) {
    return Container(
      height: 1,
      margin: const EdgeInsets.symmetric(horizontal: 8).copyWith(bottom: 18),
      color: isDone ? AppTheme.accentColor : AppTheme.mutedColor,
    );
  }
}
