/* eslint-disable no-console */
const puppeteer = require("puppeteer");

async function diagnose(url, outPng) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // Try to reduce false-positives from bot protection.
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.setUserAgent(
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
  });

  // Common headless fingerprint.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  const logs = [];
  const failures = [];

  page.on("console", (msg) => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  page.on("pageerror", (err) => {
    logs.push({ type: "pageerror", text: String(err), location: null });
  });

  page.on("requestfailed", (req) => {
    const failure = req.failure();
    failures.push({
      url: req.url(),
      method: req.method(),
      resourceType: req.resourceType(),
      errorText: failure ? failure.errorText : "unknown",
    });
  });

  const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  const status = resp ? resp.status() : null;

  // Give hydration a chance (and capture "stuck on loading" cases).
  await new Promise((r) => setTimeout(r, 12000));

  const title = await page.title().catch(() => "");
  const currentUrl = page.url();
  const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 1200) || "");

  await page.screenshot({ path: outPng, fullPage: true });

  await browser.close();

  return { status, title, currentUrl, bodyText, logs, failures };
}

async function main() {
  const url = process.argv[2] || "https://lensroom.ru/create/studio";
  const out = process.argv[3] || "/Users/maratsagimov/Desktop/LensRoom.V2/prod-studio-diagnose.png";

  console.log(`🔎 Diagnose: ${url}`);
  const res = await diagnose(url, out);

  console.log(`\n📄 HTTP status: ${res.status}`);
  console.log(`📄 Title: ${res.title}`);
  console.log(`🔗 Final URL: ${res.currentUrl}`);
  console.log(`📸 Screenshot: ${out}`);

  console.log("\n🧾 Body preview:");
  console.log(res.bodyText);

  console.log(`\n🧯 Console/page errors (${res.logs.length}):`);
  for (const l of res.logs.slice(0, 80)) {
    const loc = l.location && l.location.url ? ` @ ${l.location.url}:${l.location.lineNumber}:${l.location.columnNumber}` : "";
    console.log(`- [${l.type}] ${l.text}${loc}`);
  }
  if (res.logs.length > 80) console.log(`… (${res.logs.length - 80} more)`);

  console.log(`\n🚫 Failed requests (${res.failures.length}):`);
  for (const f of res.failures.slice(0, 80)) {
    console.log(`- ${f.method} ${f.resourceType} ${f.url} -> ${f.errorText}`);
  }
  if (res.failures.length > 80) console.log(`… (${res.failures.length - 80} more)`);
}

main().catch((e) => {
  console.error("❌ Diagnose failed:", e);
  process.exitCode = 1;
});
