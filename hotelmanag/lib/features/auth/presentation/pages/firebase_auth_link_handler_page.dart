import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/theme/app_theme.dart';

class FirebaseAuthLinkHandlerPage extends StatefulWidget {
  final String emailLink;
  const FirebaseAuthLinkHandlerPage({super.key, required this.emailLink});

  @override
  State<FirebaseAuthLinkHandlerPage> createState() => _FirebaseAuthLinkHandlerPageState();
}

class _FirebaseAuthLinkHandlerPageState extends State<FirebaseAuthLinkHandlerPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _handleEmailLink();
    });
  }

  void _handleEmailLink() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    // Construct the absolute link if GoRouter stripped the host
    String absoluteLink = widget.emailLink;
    if (!absoluteLink.startsWith('https://')) {
      absoluteLink = 'https://hotel-mgnt-8ffff.firebaseapp.com$absoluteLink';
    }

    final success = await authProvider.signInWithEmailLink(absoluteLink);
    
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Email verified successfully! Welcome to LuxeStay.'),
            backgroundColor: Colors.green,
          ),
        );
        context.go('/');
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(authProvider.error ?? 'Failed to verify email link.'),
            backgroundColor: Colors.red,
          ),
        );
        context.go('/login');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const CircularProgressIndicator(
              color: AppTheme.primaryColor,
              strokeWidth: 3,
            ),
            const SizedBox(height: 24),
            Text(
              'Verifying verification link...',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w600,
                color: Colors.grey[800],
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Please wait while we secure your account',
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
