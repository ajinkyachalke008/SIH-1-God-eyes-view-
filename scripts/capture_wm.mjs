import puppeteer from 'puppeteer';

async function capture() {
  console.log('Launching Chrome via Puppeteer...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--enable-webgl2',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--window-size=1440,900'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const consoleMessages = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  console.log('Navigating to http://localhost:3000 ...');
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });

  console.log('Waiting 12 seconds for World Monitor 3D globe and panels...');
  await new Promise(resolve => setTimeout(resolve, 12000));

  const targetPath = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/world_monitor_standalone.png';
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log(`Successfully captured World Monitor screenshot at: ${targetPath}`);

  console.log('\n--- First 15 Console Logs ---');
  consoleMessages.slice(0, 15).forEach(m => console.log(m));

  await browser.close();
}

capture().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
