const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito']
  });

  const page = await browser.newPage();
  
  // Полная очистка кэша
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await client.send('Network.clearBrowserCache');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('🔍 Проверка https://lensroom.ru/create/studio?section=image&model=nano-banana-pro\n');

  await page.goto('https://lensroom.ru/create/studio?section=image&model=nano-banana-pro', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  const title = await page.title();
  const url = page.url();

  console.log('📄 Title:', title);
  console.log('🔗 URL:', url);

  // Проверяем наличие GeneratorV2
  const checks = await page.evaluate(() => {
    return {
      hasGeneratorV2Attr: document.querySelector('[data-generator-v2="true"]') !== null,
      hasVersion2Badge: document.body.innerText.includes('2.0'),
      hasCanvasTitle: document.body.innerText.includes('Создайте изображение'),
      bodyText: document.body.innerText.substring(0, 2000)
    };
  });

  console.log('\n✅ Проверки:');
  console.log('  data-generator-v2:', checks.hasGeneratorV2Attr ? '✓' : '✗');
  console.log('  Версия 2.0:', checks.hasVersion2Badge ? '✓' : '✗');
  console.log('  Canvas "Создайте изображение":', checks.hasCanvasTitle ? '✓' : '✗');

  console.log('\n📝 Body text:\n');
  console.log(checks.bodyText);

  await page.screenshot({
    path: '/Users/maratsagimov/Desktop/LensRoom.V2/check-with-params.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot: /Users/maratsagimov/Desktop/LensRoom.V2/check-with-params.png');

  await browser.close();
})();
