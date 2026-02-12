const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1200 });

  await page.goto('https://lensroom.ru/create/studio?section=voice', {
    waitUntil: 'networkidle2',
    timeout: 90000,
  });

  await new Promise((r) => setTimeout(r, 2500));

  const p1 = '/Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2/prod-voice-redesign.png';
  await page.screenshot({ path: p1, fullPage: true });

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find((el) =>
      (el.textContent || '').includes('Animation')
    );
    if (btn) {
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });

  await new Promise((r) => setTimeout(r, 1200));

  const p2 = '/Users/maratsagimov/Desktop/LensRoom.V2/lensroom-v2/prod-voice-animate-redesign.png';
  await page.screenshot({ path: p2, fullPage: true });

  console.log(p1);
  console.log(p2);

  await browser.close();
})();
