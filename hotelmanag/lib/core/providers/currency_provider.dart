import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

class CurrencyProvider extends ChangeNotifier {
  static const Map<String, double> rates = {
    'USD': 1.0,
    'INR': 83.5,
    'EUR': 0.92,
    'GBP': 0.79,
    'AED': 3.67,
    'AUD': 1.53,
    'SGD': 1.34,
  };

  static const Map<String, String> symbols = {
    'USD': '\$',
    'INR': '₹',
    'EUR': '€',
    'GBP': '£',
    'AED': 'د.إ',
    'AUD': 'A\$',
    'SGD': 'S\$',
  };

  String _currency = 'USD';
  String get currency => _currency;
  String get symbol => symbols[_currency] ?? '\$';

  CurrencyProvider() {
    _loadCurrency();
  }

  Future<void> _loadCurrency() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('luxe_currency');
    if (saved != null && rates.containsKey(saved)) {
      _currency = saved;
    } else {
      // Optional: basic auto-detection could go here
      _currency = 'USD';
    }
    notifyListeners();
  }

  Future<void> setCurrency(String code) async {
    if (rates.containsKey(code)) {
      _currency = code;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('luxe_currency', code);
      notifyListeners();
    }
  }

  String format(num? amountUSD) {
    if (amountUSD == null) return '';
    final rate = rates[_currency] ?? 1.0;
    final converted = (amountUSD.toDouble() * rate).round();
    final sym = symbols[_currency] ?? '\$';

    if (_currency == 'INR') {
      final f = NumberFormat.currency(locale: 'en_IN', symbol: sym, decimalDigits: 0);
      return f.format(converted);
    } else {
      final f = NumberFormat.currency(locale: 'en_US', symbol: sym, decimalDigits: 0);
      return f.format(converted);
    }
  }
}
