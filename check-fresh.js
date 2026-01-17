const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-cache', '--disable-application-cache', '--disable-offline-load-stale-cache', '--disk-cache-size=0']
  });

  const page = await browser.newPage();
  
  // Полная очистка кэша
  const client = await page.target().createCDPSession();
  await client.send('Network.clearBrowserCookies');
  await client.send('Network.clearBrowserCache');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  
  await page.setCacheEnabled(false);
  
  // Desktop UA
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  console.log('🔍 Проверка https://lensroom.ru/create с полной очисткой кэша...\n');

  await page.goto('https://lensroom.ru/create', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });

  await new Promise(resolve => setTimeout(resolve, 5000));

  const title = await page.title();
  const url = page.url();

  console.log('📄 Page Title:', title);
  console.log('🔗 Current URL:', url);

  // Проверяем data-атрибут GeneratorV2
  const hasGeneratorV2Attribute = await page.evaluate(() => {
    const el = document.querySelector('[data-generator-v2="true"]');
    return el !== null;
  });

  // Проверяем версию в хедере
  const hasVersion2Badge = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('LensRoom') && text.includes('2.0');
  });

  // Проверяем наличие Canvas компонента (пустое состояние)
  const hasCanvasEmptyState = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Создайте изображение') || text.includes('Космический корабль киберпанк');
  });

  // Проверяем наличие HistorySidebar
  const hasHistorySidebar = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('История') && text.includes('Ваши генерации');
  });

  // Проверяем наличие PromptBar
  const hasPromptBar = await page.evaluate(() => {
    const textareas = document.querySelectorAll('textarea');
    for (let ta of textareas) {
      if (ta.placeholder && (ta.placeholder.includes('Вводите') || ta.placeholder.includes('Опишите'))) {
        return true;
      }
    }
    return false;
  });

  // Получаем текст из body
  const bodyText = await page.evaluate(() => {
    return document.body.innerText.substring(0, 1500);
  });

  console.log('\n✅ Проверка компонентов GeneratorV2:');
  console.log('  data-generator-v2 атрибут:', hasGeneratorV2Attribute ? '✓ Найден' : '✗ Не найден');
  console.log('  Бейдж "2.0":', hasVersion2Badge ? '✓ Найден' : '✗ Не найден');
  console.log('  Canvas (empty state):', hasCanvasEmptyState ? '✓ Найден' : '✗ Не найден');
  console.log('  HistorySidebar:', hasHistorySidebar ? '✓ Найден' : '✗ Не найден');
  console.log('  PromptBar:', hasPromptBar ? '✓ Найден' : '✗ Не найден');

  console.log('\n📝 Текст страницы (первые 1500 символов):');
  console.log(bodyText);

  await page.screenshot({
    path: '/Users/maratsagimov/Desktop/LensRoom.V2/check-fresh.png',
    fullPage: true
  });

  console.log('\n📸 Скриншот: /Users/maratsagimov/Desktop/LensRoom.V2/check-fresh.png');

  await browser.close();
})();
