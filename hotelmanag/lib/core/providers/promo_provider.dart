import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/network/api_service.dart';
import '../../core/utils/audio_helper.dart';

class CouponEntity {
  final String id;
  final String code;
  final String description;
  final String type; // 'percentage' | 'fixed'
  final double value;
  final bool firstTimeOnly;
  final bool isActive;
  final DateTime? validUntil;

  const CouponEntity({
    required this.id,
    required this.code,
    required this.description,
    required this.type,
    required this.value,
    required this.firstTimeOnly,
    required this.isActive,
    this.validUntil,
  });

  factory CouponEntity.fromJson(Map<String, dynamic> json) {
    return CouponEntity(
      id: json['_id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      type: json['type']?.toString() ?? 'percentage',
      value: (json['value'] ?? 0).toDouble(),
      firstTimeOnly: json['firstTimeOnly'] ?? false,
      isActive: json['isActive'] ?? true,
      validUntil: json['validUntil'] != null
          ? DateTime.tryParse(json['validUntil'].toString())
          : null,
    );
  }

  /// Human-readable discount label e.g. "15% OFF" or "$50 OFF"
  String get discountLabel =>
      type == 'percentage' ? '${value.toInt()}% OFF' : '\$${value.toInt()} OFF';

  /// True if the coupon is still valid (not expired)
  bool get isValid {
    if (!isActive) return false;
    if (validUntil != null && DateTime.now().isAfter(validUntil!)) return false;
    return true;
  }
}

class PromoProvider extends ChangeNotifier {
  final ApiService _apiService;

  List<CouponEntity> _coupons = [];
  bool _isLoading = false;
  String? _error;

  // IDs of coupons the user has already been notified about
  static const _kSeenCouponsKey = 'seen_coupon_ids';

  PromoProvider(this._apiService);

  List<CouponEntity> get coupons => _coupons;
  bool get isLoading => _isLoading;
  String? get error => _error;

  /// All valid coupons (not expired, isActive)
  List<CouponEntity> get validCoupons =>
      _coupons.where((c) => c.isValid).toList();

  /// Coupons available to ALL users (not first-time only)
  List<CouponEntity> get generalCoupons =>
      validCoupons.where((c) => !c.firstTimeOnly).toList();

  /// Coupons only for first-time users
  List<CouponEntity> get firstTimeCoupons =>
      validCoupons.where((c) => c.firstTimeOnly).toList();

  /// Fetch coupons from backend and fire notifications for new ones
  Future<void> fetchCoupons({
    required bool isFirstTimeUser,
    required Function(CouponEntity) onNewOffer,
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _apiService.get('admin/coupons-public');
      final List raw = response.data['data'] ?? [];
      _coupons = raw.map((e) => CouponEntity.fromJson(e)).toList();

      // Check for new coupons the user hasn't seen yet
      final prefs = await SharedPreferences.getInstance();
      final seenRaw = prefs.getString(_kSeenCouponsKey) ?? '[]';
      final Set<String> seen = Set<String>.from(
        (jsonDecode(seenRaw) as List).map((e) => e.toString()),
      );

      final newCoupons = validCoupons.where((c) {
        if (seen.contains(c.id)) return false;
        // Only show first-time coupons to first-time users
        if (c.firstTimeOnly && !isFirstTimeUser) return false;

        // Filter out test/dummy coupons so they don't trigger push notifications
        final codeLower = c.code.toLowerCase();
        final descLower = c.description?.toLowerCase() ?? '';
        if (codeLower.contains('test') ||
            codeLower.contains('demo') ||
            codeLower.contains('mock') ||
            descLower.contains('test') ||
            descLower.contains('demo') ||
            descLower.contains('mock')) {
          return false;
        }

        return true;
      }).toList();

      // Only fire ONE notification to avoid spamming the user, even if there are multiple new offers
      if (newCoupons.isNotEmpty) {
        // Mark all as seen so we don't notify again
        for (final coupon in newCoupons) {
          seen.add(coupon.id);
        }

        // Show the most recent one
        final latestCoupon = newCoupons.first;
        onNewOffer(latestCoupon);
        triggerNotificationChime();
      }

      // Persist seen IDs
      await prefs.setString(_kSeenCouponsKey, jsonEncode(seen.toList()));

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  void reset() {
    _coupons = [];
    _error = null;
    notifyListeners();
  }
}
