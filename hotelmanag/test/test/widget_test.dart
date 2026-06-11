import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('Simple widget render test', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(
      home: Scaffold(
        body: Text('Hotel Management App'),
      ),
    ));
    expect(find.text('Hotel Management App'), findsOneWidget);
  });
}
