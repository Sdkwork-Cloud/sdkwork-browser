import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_browser_flutter_mobile/app.dart';

void main() {
  testWidgets('renders browser shell title', (tester) async {
    await tester.pumpWidget(const BrowserApp());
    expect(find.text('SDKWork Browser Flutter Mobile'), findsOneWidget);
  });
}
