const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setCacheEnabled(false);

  console.log('🔍 Checking https://lensroom.ru/create...\n');

  await page.goto('https://lensroom.ru/create', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(resolve => setTimeout(resolve, 3000));

  const title = await page.title();
  console.log('📄 Page Title:', title);

  const bodyText = await page.evaluate(() => {
    return document.body.innerText.substring(0, 500);
  });

  console.log('\n📝 Body text preview:');
  console.log(bodyText);

  await page.screenshot({ path: '/Users/maratsagimov/Desktop/LensRoom.V2/create-page-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved to: /Users/maratsagimov/Desktop/LensRoom.V2/create-page-screenshot.png');

  await browser.close();
})();
