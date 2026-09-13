import puppeteer from 'puppeteer';

const url = process.argv[2];
const outFile = process.argv[3];
const delay = parseInt(process.argv[4] || '8000', 10);

if (!url || !outFile) {
  console.error('Usage: node capture_page.mjs <url> <output.png> [delay_ms]');
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  protocolTimeout: 120000,
  args: [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--enable-webgl', '--enable-webgl2',
    '--ignore-gpu-blocklist',
    '--use-gl=angle', '--use-angle=swiftshader',
    '--window-size=1440,900'
  ]
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
} catch (e) {
  if (e.name === 'TimeoutError') console.log('(nav timeout — continuing)');
  else throw e;
}

await new Promise(r => setTimeout(r, delay));
await page.screenshot({ path: outFile });
console.log(`✓ saved ${outFile}`);
await browser.close();
