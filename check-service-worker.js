const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://lensroom.ru/create/studio', { waitUntil: 'networkidle2' });
  
  const hasServiceWorker = await page.evaluate(async () => {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    }
    return false;
  });

  console.log('Service Worker активен:', hasServiceWorker ? 'ДА' : 'НЕТ');
  
  if (hasServiceWorker) {
    console.log('\n⚠️  На сайте активен Service Worker который может кэшировать старую версию!');
    console.log('Решение: Очистите Application → Service Workers в Chrome DevTools');
  }

  await browser.close();
})();
