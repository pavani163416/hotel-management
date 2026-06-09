import 'dart:io';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Security Audit Tests', () {
    test('No localhost or development URLs in lib directory', () {
      final libDir = Directory('lib');
      final dartFiles = libDir
          .listSync(recursive: true)
          .whereType<File>()
          .where((file) => file.path.endsWith('.dart'));

      final violations = <String>[];
      final regex = RegExp(r'(localhost|127\.0\.0\.1|10\.0\.2\.2|10\.0\.3\.2|http://)', caseSensitive: false);

      for (var file in dartFiles) {
        final content = file.readAsStringSync();
        final lines = content.split('\n');
        for (var i = 0; i < lines.length; i++) {
          final line = lines[i];
          if (regex.hasMatch(line)) {
            violations.add('${file.path}:${i + 1}: $line');
          }
        }
      }

      if (violations.isNotEmpty) {
        fail('Found security violations (localhost or http URLs) in the following files:\n${violations.join('\n')}');
      }
    });
  });
}
