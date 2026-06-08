const fs = require('fs');
const files = [
  'lib/features/hotels/presentation/pages/hotel_details_page.dart',
  'lib/features/hotels/presentation/pages/hotels_page.dart',
  'lib/features/home/presentation/pages/home_page.dart',
  'lib/features/booking/presentation/pages/review_page.dart',
  'lib/features/booking/presentation/pages/payment_page.dart',
  'lib/features/booking/presentation/pages/history_page.dart',
  'lib/features/booking/presentation/pages/booking_page.dart'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('currency_provider.dart')) {
    const depth = file.split('/').length - 2;
    const prefix = depth > 0 ? '../'.repeat(depth) : './';
    const importLine = "import '" + prefix + "core/providers/currency_provider.dart';\n";
    content = content.replace(/(import [^\n]+;\n)/, "$1" + importLine);
    fs.writeFileSync(file, content);
  }
});
console.log('Fixed imports');
