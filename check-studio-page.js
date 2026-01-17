const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Очистить кэш
  await page.setCacheEnabled(false);

  console.log('🔍 Checking https://lensroom.ru/create/studio...\n');

  // Перейти на страницу
  await page.goto('https://lensroom.ru/create/studio', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  // Подождать 3 секунды для полной загрузки
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Проверить заголовок
  const title = await page.title();
  console.log('📄 Page Title:', title);

  // Проверить наличие компонентов GeneratorV2
  const hasCanvas = await page.evaluate(() => {
    // Ищем элементы Canvas
    const canvasElements = document.querySelectorAll('[class*="canvas"], [class*="Canvas"]');
    return canvasElements.length > 0;
  });

  const hasHistory = await page.evaluate(() => {
    // Ищем сайдбар истории
    const historyElements = document.querySelectorAll('[class*="history"], [class*="History"], [class*="sidebar"], [class*="Sidebar"]');
    return historyElements.length > 0;
  });

  const hasPromptBar = await page.evaluate(() => {
    // Ищем поле ввода промпта
    const promptInputs = document.querySelectorAll('textarea[placeholder*="prompt"], textarea[placeholder*="промпт"], input[placeholder*="prompt"]');
    return promptInputs.length > 0;
  });

  const hasStyleGallery = await page.evaluate(() => {
    // Ищем галерею стилей
    const galleryElements = document.querySelectorAll('[class*="gallery"], [class*="Gallery"], [class*="style"], [class*="Style"]');
    return galleryElements.length > 0;
  });

  // Получить текст из body
  const bodyText = await page.evaluate(() => {
    return document.body.innerText.substring(0, 500);
  });

  // Проверить какие компоненты загружены
  const componentNames = await page.evaluate(() => {
    const scripts = Array.from(document.querySelectorAll('script'));
    const componentHints = [];

    // Проверяем data-атрибуты
    const allElements = document.querySelectorAll('*');
    allElements.forEach(el => {
      const className = el.className;
      if (typeof className === 'string') {
        if (className.includes('GeneratorV2')) componentHints.push('GeneratorV2 (class)');
        if (className.includes('StudioRuntime')) componentHints.push('StudioRuntime (class)');
        if (className.includes('ImageGenerator')) componentHints.push('ImageGenerator (class)');
      }
    });

    return [...new Set(componentHints)];
  });

  console.log('\n✅ Component Detection:');
  console.log('  Canvas elements:', hasCanvas ? '✓ Found' : '✗ Not found');
  console.log('  History/Sidebar:', hasHistory ? '✓ Found' : '✗ Not found');
  console.log('  Prompt input:', hasPromptBar ? '✓ Found' : '✗ Not found');
  console.log('  Style gallery:', hasStyleGallery ? '✓ Found' : '✗ Not found');

  console.log('\n🔍 Component names found:', componentNames.length > 0 ? componentNames.join(', ') : 'None detected');

  console.log('\n📝 Body text preview:');
  console.log(bodyText);

  // Сделать скриншот
  await page.screenshot({ path: '/Users/maratsagimov/Desktop/LensRoom.V2/studio-page-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved to: /Users/maratsagimov/Desktop/LensRoom.V2/studio-page-screenshot.png');

  await browser.close();

  console.log('\n✅ Check complete!');
})();
