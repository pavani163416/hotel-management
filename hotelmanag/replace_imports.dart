import 'dart:io';

void main() {
  final dir = Directory('lib');
  final files = dir.listSync(recursive: true).whereType<File>().where((f) => f.path.endsWith('.dart'));
  for (final file in files) {
    String content = file.readAsStringSync();
    if (content.contains('package:lucide_icons/lucide_icons.dart')) {
      content = content.replaceAll('package:lucide_icons/lucide_icons.dart', 'package:lucide_icons_flutter/lucide_icons.dart');
      file.writeAsStringSync(content);
      print('Updated ${file.path}');
    }
  }
}
