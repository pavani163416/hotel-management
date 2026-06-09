const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Capture all console messages
  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.type().toUpperCase()} ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  console.log('Navigating to http://localhost:5173/hotel/h1');
  await page.goto('http://localhost:5173/hotel/h1', { waitUntil: 'networkidle0' });

  // Wait a bit to ensure rendering
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
