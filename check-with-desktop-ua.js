const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1920,1080']
  });

  const page = await browser.newPage();

  // Set desktop viewport
  await page.setViewport({ width: 1920, height: 1080 });

  // Set desktop user agent explicitly
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  await page.setCacheEnabled(false);

  console.log('🔍 Checking https://lensroom.ru/create with desktop UA...\n');

  await page.goto('https://lensroom.ru/create', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Wait for page to fully load
  await new Promise(resolve => setTimeout(resolve, 5000));

  const title = await page.title();
  const url = page.url();

  console.log('📄 Page Title:', title);
  console.log('🔗 Current URL:', url);

  // Check for Canvas elements
  const hasCanvas = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    let found = [];
    elements.forEach(el => {
      const text = el.textContent || '';
      if (text.includes('Canvas') || text.includes('canvas')) {
        found.push(el.tagName);
      }
    });
    return found.length > 0;
  });

  // Check for history/sidebar
  const hasHistory = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return bodyText.includes('История') || bodyText.includes('history');
  });

  // Check for prompt textarea
  const hasPromptInput = await page.evaluate(() => {
    const textareas = document.querySelectorAll('textarea');
    return textareas.length > 0;
  });

  // Get all text content
  const bodyText = await page.evaluate(() => {
    return document.body.innerText.substring(0, 1000);
  });

  console.log('\n✅ Component Detection:');
  console.log('  Canvas:', hasCanvas ? '✓ Found' : '✗ Not found');
  console.log('  History:', hasHistory ? '✓ Found' : '✗ Not found');
  console.log('  Prompt textarea:', hasPromptInput ? '✓ Found' : '✗ Not found');

  console.log('\n📝 Body text preview:');
  console.log(bodyText);

  // Screenshot
  await page.screenshot({
    path: '/Users/maratsagimov/Desktop/LensRoom.V2/create-desktop-ua.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot saved to: /Users/maratsagimov/Desktop/LensRoom.V2/create-desktop-ua.png');

  await browser.close();
})();
