import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io' as io;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'dart:convert';
import '../../../../core/theme/app_theme.dart';
import '../../../../core/widgets/main_layout.dart';
import '../../../../core/widgets/custom_text_field.dart';
import '../../../../core/providers/auth_provider.dart';
import '../../../../core/providers/theme_provider.dart';
import '../../../../core/utils/performance_utils.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  String _profileImageUrl = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=200';
  String _coverImageUrl = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1000';
  XFile? _profileImageFile;
  XFile? _coverImageFile;
  final ImagePicker _picker = ImagePicker();

  late TextEditingController _nameController;
  late TextEditingController _emailController;
  late TextEditingController _phoneController;

  String _currentLanguage = 'English (US)';
  String _currentTheme = 'System Default';

  bool _pushNotifications = true;
  bool _emailUpdates = true;
  bool _promotions = false;

  final TextEditingController _cardNumberController = TextEditingController();
  final TextEditingController _expiryController = TextEditingController();
  final TextEditingController _cvvController = TextEditingController();
  final TextEditingController _cardNameController = TextEditingController();
  final TextEditingController _upiIdController = TextEditingController();
  final TextEditingController _bankNameController = TextEditingController();
  String _selectedPaymentType = 'card';

  @override
  void initState() {
    super.initState();
    final user = Provider.of<AuthProvider>(context, listen: false).user;
    _nameController = TextEditingController(text: user?.name ?? '');
    _emailController = TextEditingController(text: user?.email ?? '');
    _phoneController = TextEditingController(text: user?.phone ?? '');
    
    if (user?.profileImage != null && user!.profileImage!.isNotEmpty) {
      _profileImageUrl = user.profileImage!;
    } else {
      _profileImageUrl = 'https://ui-avatars.com/api/?name=${user?.name ?? 'User'}&background=F5E6CA&color=2C3E50';
    }

    if (user?.coverImage != null && user!.coverImage!.isNotEmpty) {
      _coverImageUrl = user.coverImage!;
    } else {
      _coverImageUrl = 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1000';
    }

    _nameController.addListener(() {
      if (mounted) setState(() {});
    });

    // Fetch fresh profile data on entry
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshProfile();
    });
  }

  Future<void> _refreshProfile() async {
    final auth = Provider.of<AuthProvider>(context, listen: false);
    await auth.tryAutoLogin();
    if (mounted) {
      final user = auth.user;
      if (user != null) {
        setState(() {
          _nameController.text = user.name;
          _emailController.text = user.email;
          _phoneController.text = user.phone ?? '';
          if (user.profileImage != null && user.profileImage!.isNotEmpty) {
            _profileImageUrl = user.profileImage!;
          }
          if (user.coverImage != null && user.coverImage!.isNotEmpty) {
            _coverImageUrl = user.coverImage!;
          }
        });
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _cardNumberController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    _cardNameController.dispose();
    _upiIdController.dispose();
    _bankNameController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    _currentTheme = themeProvider.themeModeName;
    return MainLayout(
      child: Column(
        children: [
          _buildHeader(),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 100), // Spacing to account for overlapping profile header
                _buildSectionTitle('Account Settings'),
                const SizedBox(height: 16),
                _buildSettingItem(
                  LucideIcons.user,
                  'Personal Information',
                  'Name, Email, Phone',
                  onTap: () => _showPersonalInfo(context),
                ),
                _buildSettingItem(
                  LucideIcons.heart,
                  'My Favorites',
                  'Your saved masterpiece stays',
                  onTap: () => context.push('/favorites'),
                ),
                _buildSettingItem(
                  LucideIcons.creditCard,
                  'Payment Methods',
                  'Manage your cards',
                  onTap: () => _showPaymentMethods(context),
                ),
                _buildSettingItem(
                  LucideIcons.bell,
                  'Notifications',
                  'Alerts, Emails, SMS',
                  onTap: () => _showNotifications(context),
                ),
                _buildSettingItem(
                  LucideIcons.shield,
                  'Security',
                  'Password, 2FA',
                  onTap: () => _showSecurity(context),
                ),
                const SizedBox(height: 32),
                _buildSectionTitle('Preferences'),
                const SizedBox(height: 16),
                _buildSettingItem(
                  LucideIcons.moon,
                  'Modes & Themes',
                  _currentTheme,
                  onTap: () => _showThemePicker(context),
                ),
                const SizedBox(height: 32),
                _buildSectionTitle('Support & Help'),
                const SizedBox(height: 16),
                _buildCustomerSupportCard(context),
                const SizedBox(height: 24),
                _buildLogoutButton(),
                const SizedBox(height: 120),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerSupportCard(BuildContext context) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF253040) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(
          color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  LucideIcons.phoneCall,
                  size: 20,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Customer Support',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    Text(
                      '24/7 Dedicated Concierge Care',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          _buildSupportInfoRow(context, LucideIcons.userCheck, 'Admin Name', 'Alex Rivera (Chief Concierge)'),
          const SizedBox(height: 12),
          _buildSupportInfoRow(context, LucideIcons.phone, 'Support Phone', '+1 (800) 555-0199'),
          const SizedBox(height: 12),
          _buildSupportInfoRow(context, LucideIcons.mail, 'Support Email', 'concierge@luxestay.com'),
        ],
      ),
    );
  }

  Widget _buildSupportInfoRow(BuildContext context, IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(
          icon,
          size: 16,
          color: Theme.of(context).colorScheme.primary.withOpacity(0.7),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label.toUpperCase(),
              style: TextStyle(
                fontSize: 8,
                fontWeight: FontWeight.bold,
                color: Theme.of(context).colorScheme.onSurface.withOpacity(0.4),
                letterSpacing: 1,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHeader() {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) {
        final user = auth.user;
        final displayName = user?.name ?? 'Guest';
        final displayCity = user?.city ?? 'Set your location';
        final profileUrl = (user?.profileImage != null && user!.profileImage!.isNotEmpty)
            ? user.profileImage!
            : 'https://ui-avatars.com/api/?name=$displayName&background=F5E6CA&color=2C3E50';
        final coverUrl = (user?.coverImage != null && user!.coverImage!.isNotEmpty)
            ? user.coverImage!
            : 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=1000';

        return Stack(
          clipBehavior: Clip.none,
          children: [
            // Cover Image
            InkWell(
              onTap: () => _showCoverImageOptions(context),
              child: Container(
                height: 200,
                width: double.infinity,
                decoration: BoxDecoration(
                  image: DecorationImage(
                    image: _coverImageFile != null
                        ? (kIsWeb
                            ? NetworkImage(_coverImageFile!.path)
                            : FileImage(io.File(_coverImageFile!.path)) as ImageProvider)
                        : CachedNetworkImageProvider(coverUrl),
                    fit: BoxFit.cover,
                  ),
                ),
                child: Stack(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withOpacity(0.4),
                            Colors.transparent,
                          ],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 16,
                      right: 16,
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.black.withOpacity(0.4),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white24),
                        ),
                        child: const Row(
                          children: [
                            Text('Change Cover', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            // Profile Info
            Positioned(
              bottom: -80,
              left: 24,
              right: 24,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Stack(
                    children: [
                      Stack(
                        children: [
                          InkWell(
                            onTap: () => _showImageUploadOptions(context),
                            borderRadius: BorderRadius.circular(50),
                            child: Container(
                              width: 100,
                              height: 100,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white, width: 4),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 5)),
                                ],
                                image: DecorationImage(
                                  image: _profileImageFile != null
                                      ? (kIsWeb
                                          ? NetworkImage(_profileImageFile!.path)
                                          : FileImage(io.File(_profileImageFile!.path)) as ImageProvider)
                                      : CachedNetworkImageProvider(profileUrl),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: GestureDetector(
                              onTap: () => _showImageUploadOptions(context),
                              child: Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.primary,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                ),
                                child: const Icon(LucideIcons.camera, color: Colors.white, size: 16),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    displayName,
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                      Icon(LucideIcons.mapPin, size: 12, color: Theme.of(context).colorScheme.primary),
                      const SizedBox(width: 4),
                      Text(
                        displayCity,
                        style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7), fontSize: 13),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildLoyaltyCard() {
    return Container(
      margin: const EdgeInsets.only(top: 180),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: AppTheme.primaryColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryColor.withOpacity(0.3),
            blurRadius: 20,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('PLATINUM', style: TextStyle(color: AppTheme.accentColor, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 2)),
                  SizedBox(height: 4),
                  Text('Loyalty Status', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                ],
              ),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(LucideIcons.award, color: AppTheme.accentColor, size: 24),
              ),
            ],
          ),
          const SizedBox(height: 32),
          const Text('2,850', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.bold)),
          Text('Available Points', style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13)),
          const SizedBox(height: 24),
          ClipRRect(
            borderRadius: BorderRadius.circular(10),
            child: LinearProgressIndicator(
              value: 0.78,
              backgroundColor: Colors.white.withOpacity(0.1),
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.accentColor),
              minHeight: 8,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            '550 points to Diamond Status',
            style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 11, fontWeight: FontWeight.w500),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Text(
      title.toUpperCase(),
      style: TextStyle(
        fontSize: 12,
        fontWeight: FontWeight.bold,
        letterSpacing: 1.5,
        color: isDark
            ? const Color(0xFFEAE5DC)   // full-strength cream — clearly visible on dark bg
            : const Color(0xFF454F5E).withOpacity(0.55),
      ),
    );
  }

  Widget _buildSettingItem(IconData icon, String title, String subtitle, {VoidCallback? onTap}) {
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    final cardColor   = isDark ? const Color(0xFF253040) : Colors.white;
    final iconBg      = isDark
        ? const Color(0xFF19222E)
        : AppTheme.primaryColor.withOpacity(0.05);
    final iconColor   = isDark ? const Color(0xFFEAE5DC) : AppTheme.primaryColor;
    final titleColor  = isDark ? const Color(0xFFEAE5DC) : AppTheme.primaryColor;
    final subColor    = isDark ? const Color(0xFFB0A898) : Colors.grey[500]!;
    final arrowColor  = isDark ? const Color(0xFF6B7A8D) : Colors.grey[400]!;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        boxShadow: isDark
            ? []
            : [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: iconBg,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, size: 20, color: iconColor),
        ),
        title: Text(title,
            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: titleColor)),
        subtitle: Text(subtitle,
            style: TextStyle(color: subColor, fontSize: 12)),
        trailing: Icon(LucideIcons.chevronRight, size: 18, color: arrowColor),
        onTap: onTap ??
            () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('Opening $title settings...'),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
      ),
    );
  }

  void _showFeedback(BuildContext context, String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$feature settings will be available in the next update.'),
        behavior: SnackBarBehavior.floating,
        action: SnackBarAction(label: 'OK', textColor: AppTheme.accentColor, onPressed: () {}),
      ),
    );
  }

  void _showPersonalInfo(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, top: 24, left: 24, right: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Personal Information', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
            const SizedBox(height: 24),
            CustomTextField(label: 'Full Name', hint: 'Alex Johnson', prefixIcon: LucideIcons.user, controller: _nameController),
            const SizedBox(height: 16),
            CustomTextField(label: 'Email Address', hint: 'alex.j@example.com', prefixIcon: LucideIcons.mail, keyboardType: TextInputType.emailAddress, controller: _emailController),
            const SizedBox(height: 16),
            CustomTextField(label: 'Phone Number', hint: '+1 234 567 890', prefixIcon: LucideIcons.phone, keyboardType: TextInputType.phone, controller: _phoneController),
            const SizedBox(height: 32),
            _buildSaveButton(context),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _showLanguagePicker(BuildContext context) {
    final languages = ['English (US)', 'Spanish', 'French', 'German', 'Chinese'];
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Text('Select Language', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
            ),
            const Divider(),
            ...languages.map((lang) => ListTile(
                  title: Text(lang, style: TextStyle(color: Theme.of(context).colorScheme.onSurface)),
                  trailing: _currentLanguage == lang ? Icon(LucideIcons.check, color: Theme.of(context).colorScheme.primary) : null,
                  onTap: () {
                    setState(() => _currentLanguage = lang);
                    Navigator.pop(context);
                  },
                )),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  void _showThemePicker(BuildContext context) {
    // Capture brightness BEFORE the sheet opens — the builder's context
    // may not reflect the correct theme, causing invisible text in dark mode.
    final appIsDark =
        Theme.of(context).colorScheme.brightness == Brightness.dark;

    // Explicit colors — never rely on Theme.of inside the builder
    final sheetBg     = appIsDark ? const Color(0xFF253040) : Colors.white;
    final titleColor  = appIsDark ? const Color(0xFFEAE5DC) : const Color(0xFF454F5E);
    final subColor    = appIsDark ? const Color(0xFFB0A898) : const Color(0xFF8A8A8A);
    final handleColor = appIsDark ? const Color(0xFF4A5568) : const Color(0xFFDDDDDD);
    final divColor    = appIsDark ? const Color(0xFF3A4A5C) : const Color(0xFFEEEEEE);
    final tileBg      = appIsDark ? const Color(0xFF19222E) : const Color(0xFFF5F5F5);
    final selectedBg  = appIsDark ? const Color(0xFF2E3D50) : const Color(0xFFECEAE4);
    final checkBg     = appIsDark ? const Color(0xFFEAE5DC) : const Color(0xFF454F5E);
    final checkIcon   = appIsDark ? const Color(0xFF253040) : Colors.white;

    final themeOptions = [
      {'label': 'Light',          'value': 'Light',          'icon': LucideIcons.sun,     'sub': 'Always use light appearance'},
      {'label': 'Dark',           'value': 'Dark',           'icon': LucideIcons.moon,    'sub': 'Always use dark appearance'},
    ];

    showModalBottomSheet(
      context: context,
      backgroundColor: sheetBg,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => StatefulBuilder(
        builder: (ctx, setSheetState) => Container(
          padding: const EdgeInsets.symmetric(vertical: 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Handle bar
              Container(
                width: 40, height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: handleColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              // Title
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    Icon(LucideIcons.palette, size: 20, color: titleColor),
                    const SizedBox(width: 12),
                    Text('Modes & Themes',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: titleColor)),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Choose how LuxeStay looks to you',
                      style: TextStyle(fontSize: 12, color: subColor)),
                ),
              ),
              const SizedBox(height: 16),
              Divider(height: 1, color: divColor),
              const SizedBox(height: 4),
              // Options
              ...themeOptions.map((opt) {
                final isSelected = _currentTheme == opt['value'];
                return ListTile(
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 2),
                  leading: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSelected ? selectedBg : tileBg,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      opt['icon'] as IconData,
                      size: 20,
                      color: isSelected ? titleColor : subColor,
                    ),
                  ),
                  title: Text(
                    opt['label'] as String,
                    style: TextStyle(
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                      fontSize: 15,
                      color: titleColor,
                    ),
                  ),
                  subtitle: Text(
                    opt['sub'] as String,
                    style: TextStyle(fontSize: 11, color: subColor),
                  ),
                  trailing: isSelected
                      ? Container(
                          padding: const EdgeInsets.all(4),
                          decoration: BoxDecoration(
                            color: checkBg,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(LucideIcons.check, size: 14, color: checkIcon),
                        )
                      : null,
                  onTap: () {
                    setState(() => _currentTheme = opt['value'] as String);
                    Provider.of<ThemeProvider>(context, listen: false)
                        .setTheme(opt['value'] as String);
                    Navigator.pop(ctx);
                  },
                );
              }),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }

  void _showPaymentMethods(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Consumer<AuthProvider>(
        builder: (context, auth, _) {
          final paymentMethods = auth.user?.paymentMethods ?? [];
          
          return Container(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Payment Methods', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 24),
                if (paymentMethods.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: Text('No payment methods saved', style: TextStyle(color: Colors.grey[500])),
                    ),
                  )
                else
                  ...paymentMethods.map((pm) {
                    String title;
                    String subtitle;
                    if (pm.type == 'upi') {
                      title = 'UPI';
                      subtitle = pm.upiId ?? '';
                    } else if (pm.type == 'netbanking') {
                      title = pm.bankName ?? 'Bank';
                      subtitle = 'Net Banking';
                    } else {
                      title = pm.brand ?? 'Card';
                      subtitle = '**** **** **** ${pm.last4}';
                    }
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: _buildPaymentCard(pm.type, title, subtitle, pm.isDefault),
                    );
                  }),
                const SizedBox(height: 12),
                _buildAddButton(context, 'Add Payment Method'),
                const SizedBox(height: 32),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showSecurity(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Security Settings', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
            const SizedBox(height: 24),
            _buildSettingItem(LucideIcons.lock, 'Change Password', 'Update your password regularly', onTap: () {
              Navigator.pop(context);
              _showChangePasswordDialog(context);
            }),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  void _showChangePasswordDialog(BuildContext context) {
    final oldPasswordController = TextEditingController();
    final newPasswordController = TextEditingController();
    final confirmPasswordController = TextEditingController();
    final formKey = GlobalKey<FormState>();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 32,
            top: 32,
            left: 24,
            right: 24,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Change Password',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                ),
                const SizedBox(height: 24),
                CustomTextField(
                  label: 'Current Password',
                  hint: 'Enter current password',
                  obscureText: true,
                  prefixIcon: LucideIcons.lock,
                  controller: oldPasswordController,
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Current password is required';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'New Password',
                  hint: 'Enter new password (min. 6 characters)',
                  obscureText: true,
                  prefixIcon: LucideIcons.lock,
                  controller: newPasswordController,
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'New password is required';
                    if (val.length < 6) return 'Password must be at least 6 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'Confirm New Password',
                  hint: 'Confirm your new password',
                  obscureText: true,
                  prefixIcon: LucideIcons.lock,
                  controller: confirmPasswordController,
                  validator: (val) {
                    if (val != newPasswordController.text) return 'Passwords do not match';
                    return null;
                  },
                ),
                const SizedBox(height: 32),
                Consumer<AuthProvider>(
                  builder: (context, auth, _) => SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: auth.isLoading
                          ? null
                          : () async {
                              if (formKey.currentState?.validate() ?? false) {
                                final success = await auth.changePassword(
                                  oldPasswordController.text,
                                  newPasswordController.text,
                                );
                                if (context.mounted) {
                                  if (success) {
                                    Navigator.pop(context);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Password updated successfully!'),
                                        behavior: SnackBarBehavior.floating,
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(auth.error ?? 'Failed to update password'),
                                        behavior: SnackBarBehavior.floating,
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                }
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).colorScheme.primary,
                        foregroundColor: Theme.of(context).colorScheme.onPrimary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: auth.isLoading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Text('Update Password', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showNotifications(BuildContext context) {
    // Local copies so changes inside the modal are isolated until Save is tapped
    bool localPush = _pushNotifications;
    bool localEmail = _emailUpdates;
    bool localPromo = _promotions;

    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark
          ? const Color(0xFF253040)
          : Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          final isDark = Theme.of(ctx).colorScheme.brightness == Brightness.dark;

          Widget notifTile(
              String title, String subtitle, bool value, ValueChanged<bool> onChanged) {
            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF19222E) : Colors.grey[50],
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                    color: isDark ? Colors.white10 : Colors.grey[200]!),
              ),
              child: SwitchListTile(
                value: value,
                onChanged: (v) => setModalState(() => onChanged(v)),
                title: Text(title,
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Theme.of(ctx).colorScheme.onSurface)),
                subtitle: Text(subtitle,
                    style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(ctx)
                            .colorScheme
                            .onSurface
                            .withOpacity(0.55))),
                activeColor: Theme.of(ctx).colorScheme.primary,
                contentPadding: EdgeInsets.zero,
              ),
            );
          }

          return SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              24,
              24,
              24,
              MediaQuery.of(ctx).viewInsets.bottom + 32,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle
                Center(
                  child: Container(
                    width: 40, height: 4,
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                        color: Colors.grey[300],
                        borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                Row(
                  children: [
                    Icon(LucideIcons.bell,
                        size: 20,
                        color: Theme.of(ctx).colorScheme.primary),
                    const SizedBox(width: 12),
                    Text('Notifications',
                        style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(ctx).colorScheme.onSurface)),
                  ],
                ),
                const SizedBox(height: 20),
                notifTile(
                  'Push Notifications',
                  'Booking confirmations and alerts',
                  localPush,
                  (v) => localPush = v,
                ),
                notifTile(
                  'Email Updates',
                  'Invoices, receipts and summaries',
                  localEmail,
                  (v) => localEmail = v,
                ),
                notifTile(
                  'Promotions',
                  'Exclusive deals and special offers',
                  localPromo,
                  (v) => localPromo = v,
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      setState(() {
                        _pushNotifications = localPush;
                        _emailUpdates = localEmail;
                        _promotions = localPromo;
                      });
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Notification preferences saved'),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Colors.green,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(ctx).colorScheme.primary,
                      foregroundColor: Theme.of(ctx).colorScheme.onPrimary,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                    child: const Text('Save Preferences',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildNotificationSwitch(String title, String subtitle, bool value, Function(bool) onChanged) {
    return SwitchListTile(
      value: value,
      onChanged: onChanged,
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Theme.of(context).colorScheme.onSurface)),
      subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6))),
      activeColor: Theme.of(context).colorScheme.primary,
      contentPadding: EdgeInsets.zero,
    );
  }

  Widget _buildPaymentCard(String type, String title, String subtitle, bool isDefault) {
    IconData icon;
    switch (type) {
      case 'upi':
        icon = LucideIcons.smartphone;
        break;
      case 'netbanking':
        icon = LucideIcons.landmark;
        break;
      default:
        icon = LucideIcons.creditCard;
    }

    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF19222E) : Colors.white,
        border: Border.all(color: isDefault ? Theme.of(context).colorScheme.primary : Colors.grey[200]!),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          if (isDefault) BoxShadow(color: Theme.of(context).colorScheme.primary.withOpacity(0.1), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withOpacity(0.05),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 20),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Theme.of(context).colorScheme.onSurface)),
                Text(subtitle, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6), fontSize: 12)),
              ],
            ),
          ),
          if (isDefault) 
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), 
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withOpacity(0.1), 
                borderRadius: BorderRadius.circular(4)
              ), 
              child: Text('DEFAULT', style: TextStyle(color: Theme.of(context).colorScheme.primary, fontSize: 8, fontWeight: FontWeight.bold))
            ),
        ],
      ),
    );
  }

  Widget _buildSaveButton(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, _) => SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: auth.isLoading
              ? null
              : () async {
                  String? newProfileImageUrl;
                  String? newCoverImageUrl;
                  
                  if (_profileImageFile != null) {
                    final bytes = await _profileImageFile!.readAsBytes();
                    final base64Image = await PerformanceUtils.encodeImageToBase64(bytes);
                    newProfileImageUrl = await auth.uploadImage(base64Image);
                  }

                  if (_coverImageFile != null) {
                    final bytes = await _coverImageFile!.readAsBytes();
                    final base64Image = await PerformanceUtils.encodeImageToBase64(bytes);
                    newCoverImageUrl = await auth.uploadImage(base64Image);
                  }

                  final success = await auth.updateProfile(
                    name: _nameController.text,
                    phone: _phoneController.text,
                    profileImage: newProfileImageUrl,
                    coverImage: newCoverImageUrl,
                  );

                  if (context.mounted) {
                    if (success) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Profile updated successfully!'),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    } else {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(auth.error ?? 'Failed to update profile'),
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: auth.isLoading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Save Changes', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ),
    );
  }

  Widget _buildAddButton(BuildContext context, String label) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () => _showAddPaymentMethodDialog(context),
        icon: const Icon(LucideIcons.plus, size: 18),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: Theme.of(context).colorScheme.primary,
          side: BorderSide(color: Theme.of(context).colorScheme.primary),
          padding: const EdgeInsets.symmetric(vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }

  void _showAddPaymentMethodDialog(BuildContext context) {
    setState(() {
      _selectedPaymentType = 'card';
    });

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => StatefulBuilder(
        builder: (context, setModalState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom + 32,
            top: 32,
            left: 24,
            right: 24,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Add Payment Method',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
              ),
              const SizedBox(height: 24),
              // Type Selector
              Row(
                children: [
                  _buildTypeTab('Card', 'card', setModalState),
                  const SizedBox(width: 8),
                  _buildTypeTab('UPI', 'upi', setModalState),
                  const SizedBox(width: 8),
                  _buildTypeTab('Bank', 'netbanking', setModalState),
                ],
              ),
              const SizedBox(height: 24),
              if (_selectedPaymentType == 'card') ...[
                CustomTextField(
                  label: 'Cardholder Name',
                  hint: 'John Doe',
                  prefixIcon: LucideIcons.user,
                  controller: _cardNameController,
                ),
                const SizedBox(height: 16),
                CustomTextField(
                  label: 'Card Number',
                  hint: '0000 0000 0000 0000',
                  prefixIcon: LucideIcons.creditCard,
                  keyboardType: TextInputType.number,
                  controller: _cardNumberController,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: CustomTextField(
                        label: 'Expiry',
                        hint: 'MM/YY',
                        prefixIcon: LucideIcons.calendar,
                        controller: _expiryController,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: CustomTextField(
                        label: 'CVV',
                        hint: '000',
                        prefixIcon: LucideIcons.lock,
                        keyboardType: TextInputType.number,
                        controller: _cvvController,
                      ),
                    ),
                  ],
                ),
              ] else if (_selectedPaymentType == 'upi') ...[
                CustomTextField(
                  label: 'UPI ID',
                  hint: 'user@upi',
                  prefixIcon: LucideIcons.smartphone,
                  controller: _upiIdController,
                ),
              ] else if (_selectedPaymentType == 'netbanking') ...[
                CustomTextField(
                  label: 'Bank Name',
                  hint: 'Select your bank',
                  prefixIcon: LucideIcons.landmark,
                  controller: _bankNameController,
                ),
              ],
              const SizedBox(height: 32),
              Consumer<AuthProvider>(
                builder: (context, auth, _) => SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: auth.isLoading
                        ? null
                        : () async {
                            bool success = false;
                            if (_selectedPaymentType == 'card') {
                              if (_cardNumberController.text.length < 16) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Invalid card number'), backgroundColor: Colors.red),
                                );
                                return;
                              }
                              final last4 = _cardNumberController.text.substring(_cardNumberController.text.length - 4);
                              final brand = _cardNumberController.text.startsWith('4') ? 'Visa' : 'Mastercard';
                              success = await auth.addPaymentMethod(
                                type: 'card',
                                brand: brand,
                                last4: last4,
                                expiry: _expiryController.text,
                              );
                            } else if (_selectedPaymentType == 'upi') {
                              if (_upiIdController.text.isEmpty) return;
                              success = await auth.addPaymentMethod(
                                type: 'upi',
                                upiId: _upiIdController.text,
                              );
                            } else if (_selectedPaymentType == 'netbanking') {
                              if (_bankNameController.text.isEmpty) return;
                              success = await auth.addPaymentMethod(
                                type: 'netbanking',
                                bankName: _bankNameController.text,
                              );
                            }

                            if (mounted) {
                              if (success) {
                                Navigator.pop(context);
                                _cardNumberController.clear();
                                _expiryController.clear();
                                _cvvController.clear();
                                _cardNameController.clear();
                                _upiIdController.clear();
                                _bankNameController.clear();
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('Payment method added successfully!'),
                                    behavior: SnackBarBehavior.floating,
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              } else {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(auth.error ?? 'Failed to add payment method'),
                                    behavior: SnackBarBehavior.floating,
                                    backgroundColor: Colors.red,
                                  ),
                                );
                              }
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                      foregroundColor: Theme.of(context).colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: auth.isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Payment Method', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTypeTab(String label, String type, StateSetter setModalState) {
    bool isSelected = _selectedPaymentType == type;
    final isDark = Theme.of(context).colorScheme.brightness == Brightness.dark;
    return Expanded(
      child: GestureDetector(
        onTap: () {
          setModalState(() {
            _selectedPaymentType = type;
          });
        },
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Theme.of(context).colorScheme.primary : (isDark ? const Color(0xFF19222E) : Colors.grey[100]),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isSelected ? Theme.of(context).colorScheme.primary : (isDark ? Colors.white10 : Colors.grey[200]!)),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: isSelected ? Colors.white : (isDark ? Colors.grey[400] : Colors.grey[600]),
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLogoutButton() {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton.icon(
        onPressed: () {
          context.read<AuthProvider>().logout();
          context.go('/login');
        },
        icon: const Icon(LucideIcons.logOut, size: 18),
        label: const Text('Log Out'),
        style: OutlinedButton.styleFrom(
          foregroundColor: Colors.red,
          side: BorderSide(color: Colors.red.withOpacity(0.2)),
          padding: const EdgeInsets.symmetric(vertical: 18),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }

  void _showImageUploadOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'Update Profile Photo',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 8),
            Text(
              'Choose a source for your new profile picture',
              style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6)),
            ),
            const SizedBox(height: 32),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                _buildUploadOption(context, LucideIcons.camera, 'Camera', onTap: () => _pickImage(ImageSource.camera, isProfile: true)),
                _buildUploadOption(context, LucideIcons.image, 'Gallery', onTap: () => _pickImage(ImageSource.gallery, isProfile: true)),
              ],
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildUploadListTile(BuildContext context, IconData icon, String title, String subtitle, {bool isDestructive = false}) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: isDestructive ? Colors.red.withOpacity(0.1) : Theme.of(context).colorScheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: isDestructive ? Colors.red : Theme.of(context).colorScheme.primary, size: 20),
      ),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: isDestructive ? Colors.red : Theme.of(context).colorScheme.primary)),
      subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6))),
      onTap: () {
        Navigator.pop(context);
        setState(() {
          if (isDestructive) {
            _profileImageUrl = 'https://ui-avatars.com/api/?name=Alex+Johnson&background=F5E6CA&color=2C3E50';
          } else {
            final randomId = DateTime.now().millisecondsSinceEpoch;
            _profileImageUrl = 'https://picsum.photos/seed/$randomId/200';
          }
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isDestructive ? 'Profile photo removed' : 'Profile photo updated successfully!'),
            behavior: SnackBarBehavior.floating,
          ),
        );
      },
    );
  }

  Widget _buildUploadOption(BuildContext context, IconData icon, String label, {required VoidCallback onTap, bool isDestructive = false}) {
    return InkWell(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDestructive ? Colors.red.withOpacity(0.1) : Theme.of(context).colorScheme.primary.withOpacity(0.05),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: isDestructive ? Colors.red : Theme.of(context).colorScheme.primary, size: 24),
          ),
          const SizedBox(height: 8),
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: isDestructive ? Colors.red : Theme.of(context).colorScheme.primary)),
        ],
      ),
    );
  }

  Future<void> _pickImage(ImageSource source, {required bool isProfile}) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(source: source);
      if (pickedFile != null) {
        if (mounted) Navigator.pop(context); // Close the bottom sheet

        setState(() {
          if (isProfile) {
            _profileImageFile = pickedFile;
          } else {
            _coverImageFile = pickedFile;
          }
        });

        if (mounted) {
          // Show loading indicator
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                  const SizedBox(width: 16),
                  Text(isProfile ? 'Uploading profile photo...' : 'Uploading cover photo...'),
                ],
              ),
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );

          final auth = Provider.of<AuthProvider>(context, listen: false);
          final bytes = await pickedFile.readAsBytes();
          final base64Image = base64Encode(bytes);
          
          final newImageUrl = await auth.uploadImage(base64Image);
          
          if (newImageUrl != null) {
            final success = await auth.updateProfile(
              profileImage: isProfile ? newImageUrl : null,
              coverImage: !isProfile ? newImageUrl : null,
            );
            if (success && mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(isProfile ? 'Profile photo updated successfully!' : 'Cover photo updated successfully!'),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: Colors.green,
                ),
              );
              setState(() {
                if (isProfile) {
                  _profileImageUrl = newImageUrl;
                  _profileImageFile = null;
                } else {
                  _coverImageUrl = newImageUrl;
                  _coverImageFile = null;
                }
              });
            }
          } else {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(auth.error ?? 'Failed to upload image'),
                  behavior: SnackBarBehavior.floating,
                  backgroundColor: Colors.red,
                ),
              );
            }
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error picking image: $e')),
        );
      }
    }
  }

  void _showCoverImageOptions(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Theme.of(context).colorScheme.brightness == Brightness.dark ? const Color(0xFF253040) : Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
              child: Text('Update Cover Photo', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
            ),
            const Divider(),
            _buildCoverListTile(context, LucideIcons.camera, 'Camera', 'Capture a new cover image', onTap: () => _pickImage(ImageSource.camera, isProfile: false)),
            _buildCoverListTile(context, LucideIcons.image, 'Upload from Gallery', 'Select from your library', onTap: () => _pickImage(ImageSource.gallery, isProfile: false)),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildCoverListTile(BuildContext context, IconData icon, String title, String subtitle, {required VoidCallback onTap}) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primary.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: Theme.of(context).colorScheme.primary, size: 20),
      ),
      title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Theme.of(context).colorScheme.primary)),
      subtitle: Text(subtitle, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withOpacity(0.6))),
      onTap: onTap,
    );
  }
}
