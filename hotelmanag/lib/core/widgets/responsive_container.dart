import 'package:flutter/material.dart';

/// A helper widget that constrains its child to a reasonable maximum width
/// while keeping it centered. This prevents UI elements from stretching too
/// far on large screens (e.g., tablets) and eliminates pixel‑level overflow
/// artifacts.
class ResponsiveContainer extends StatelessWidget {
  final Widget child;
  const ResponsiveContainer({required this.child, super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final maxWidth = constraints.maxWidth > 600
            ? 600.0
            : constraints.maxWidth;
        return Center(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: child,
          ),
        );
      },
    );
  }
}
