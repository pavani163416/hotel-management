import 'dart:convert';
import 'package:flutter/foundation.dart';

class PerformanceUtils {
  /// Encodes image bytes to base64 string in a separate isolate
  static Future<String> encodeImageToBase64(List<int> bytes) async {
    return await compute(_encodeBase64, bytes);
  }

  static String _encodeBase64(List<int> bytes) {
    return base64Encode(bytes);
  }

  /// Decodes base64 string to bytes in a separate isolate
  static Future<List<int>> decodeBase64ToImage(String base64String) async {
    return await compute(_decodeBase64, base64String);
  }

  static List<int> _decodeBase64(String base64String) {
    return base64Decode(base64String);
  }
}
