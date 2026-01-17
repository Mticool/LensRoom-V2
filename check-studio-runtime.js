const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito']
  });

  const page = await browser.newPage();
  
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await client.send('Network.clearBrowserCache');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  
  await page.setCacheEnabled(false);
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('🔍 Проверка https://lensroom.ru/create/studio\n');

  await page.goto('https://lensroom.ru/create/studio', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  const title = await page.title();
  const url = page.url();

  console.log('📄 Title:', title);
  console.log('🔗 URL:', url);

  const checks = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return {
      hasStudioRuntime: bodyText.includes('Batch') || bodyText.includes('Качество'),
      hasGallery: bodyText.includes('Галерея') || bodyText.includes('Gallery'),
      hasPhotoVideo: bodyText.includes('Фото') && bodyText.includes('Видео'),
      bodyPreview: bodyText.substring(0, 1000)
    };
  });

  console.log('\n✅ Проверки:');
  console.log('  StudioRuntime компонент:', checks.hasStudioRuntime ? '✓' : '✗');
  console.log('  Галерея:', checks.hasGallery ? '✓' : '✗');
  console.log('  Фото/Видео переключатель:', checks.hasPhotoVideo ? '✓' : '✗');

  console.log('\n📝 Body text:\n');
  console.log(checks.bodyPreview);

  await page.screenshot({
    path: '/Users/maratsagimov/Desktop/LensRoom.V2/studio-runtime-check.png',
    fullPage: true
  });

  console.log('\n📸 Screenshot: /Users/maratsagimov/Desktop/LensRoom.V2/studio-runtime-check.png');

  await browser.close();
})();
