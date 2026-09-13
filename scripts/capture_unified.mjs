import puppeteer from 'puppeteer';

const ARTIFACTS = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--enable-webgl',
  '--enable-webgl2',
  '--ignore-gpu-blocklist',
  '--use-gl=angle',
  '--use-angle=swiftshader',
  '--window-size=1440,900'
];

async function captureWithTimeout(page, url, filename, renderDelay = 10000) {
  console.log(`  Navigating to ${url} ...`);
  // Use goto with a short timeout, catching timeout errors gracefully
  // since WM's SSE feeds keep the connection alive indefinitely
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });
  } catch (err) {
    if (err.name === 'TimeoutError') {
      console.log('  (Navigation timeout — page is still loading streams, continuing with screenshot)');
    } else {
      throw err;
    }
  }
  console.log(`  Waiting ${renderDelay / 1000}s for rendering ...`);
  await new Promise(r => setTimeout(r, renderDelay));
  await page.screenshot({ path: `${ARTIFACTS}/${filename}` });
  console.log(`  ✓ ${filename} saved`);
}

async function main() {
  const browser = await puppeteer.launch({ executablePath: CHROME, args: CHROME_ARGS });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Landing page
  console.log('1/3 — Landing page at http://localhost:5000/');
  await captureWithTimeout(page, 'http://localhost:5000/', 'unified_landing.png', 3000);

  // 2. World Monitor through proxy
  console.log('2/3 — World Monitor at http://localhost:5000/world/');
  await captureWithTimeout(page, 'http://localhost:5000/world/', 'unified_world.png', 12000);

  // 3. God's Eye View through proxy
  console.log("3/3 — God's Eye View at http://localhost:5000/gev/");
  await captureWithTimeout(page, 'http://localhost:5000/gev/', 'unified_gev.png', 10000);

  await browser.close();
  console.log('\nAll 3 screenshots captured successfully.');
}

main().catch(err => { console.error(err); process.exit(1); });
