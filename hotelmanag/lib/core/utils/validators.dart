class AppValidators {
  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email address is required.';
    }
    
    // Robust email regex pattern
    final emailRegex = RegExp(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');
    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address.';
    }
    
    return null;
  }

  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Password is required.';
    }
    
    if (value.length < 8) {
      return 'Password must be at least 8 characters.';
    }
    
    if (value.length > 72) {
      return 'Password must not exceed 72 characters.';
    }
    
    if (!RegExp(r'[A-Z]').hasMatch(value)) {
      return 'Password must contain at least one capital letter.';
    }
    
    if (!RegExp(r'[0-9]').hasMatch(value)) {
      return 'Password must contain at least one number.';
    }
    
    if (!RegExp(r'[^A-Za-z0-9]|_').hasMatch(value)) {
      return 'Password must contain at least one special character.';
    }
    
    return null;
  }

  static String? validateName(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Name is required.';
    }
    if (value.trim().length > 100) {
      return 'Name must not exceed 100 characters.';
    }
    return null;
  }

  static String? validatePhone(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Phone number is required.';
    }
    final clean = value.replaceAll(RegExp(r'[\s\-()]'), '');
    if (!RegExp(r'^\d+$').hasMatch(clean)) {
      return 'Phone number must contain only digits.';
    }
    if (clean.length != 10) {
      return 'Phone number must be exactly 10 digits.';
    }
    return null;
  }

  static String? validateCardNumber(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Card number is required.';
    }
    final clean = value.replaceAll(RegExp(r'\s+|-'), '');
    if (!RegExp(r'^\d+$').hasMatch(clean)) {
      return 'Card number must contain only digits.';
    }
    if (clean.length < 13 || clean.length > 19) {
      return 'Card number must be 13-19 digits long.';
    }
    
    // Luhn algorithm check
    int sum = 0;
    bool alternate = false;
    for (int i = clean.length - 1; i >= 0; i--) {
      int n = int.parse(clean[i]);
      if (alternate) {
        n *= 2;
        if (n > 9) {
          n -= 9;
        }
      }
      sum += n;
      alternate = !alternate;
    }
    
    if (sum % 10 != 0) {
      return 'Invalid card number.';
    }
    
    return null;
  }

  static String? validateExpiry(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Expiry date is required.';
    }
    if (!RegExp(r'^(0[1-9]|1[0-2])\/?([0-9]{2})$').hasMatch(value)) {
      return 'Invalid expiry format (MM/YY).';
    }
    
    final parts = value.split('/');
    if (parts.length != 2) return 'Invalid format';
    
    final month = int.parse(parts[0]);
    final year = int.parse(parts[1]) + 2000;
    
    final now = DateTime.now();
    final expiryDate = DateTime(year, month, 1);
    final currentDate = DateTime(now.year, now.month, 1);
    
    if (expiryDate.isBefore(currentDate)) {
      return 'Card has expired.';
    }
    
    return null;
  }

  static String? validateCVV(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'CVV is required.';
    }
    if (!RegExp(r'^\d{3,4}$').hasMatch(value.trim())) {
      return 'CVV must be 3 or 4 digits.';
    }
    return null;
  }
}
