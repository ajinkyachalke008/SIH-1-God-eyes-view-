import puppeteer from 'puppeteer';

async function diagnose() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    protocolTimeout: 60000,
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

  const networkRequests = [];
  const consoleMessages = [];

  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });

  page.on('response', res => {
    networkRequests.push({
      url: res.url(),
      status: res.status(),
      ok: res.ok(),
      statusText: res.statusText()
    });
  });

  console.log('Navigating to http://localhost:5000/gev/ ...');
  try {
    await page.goto('http://localhost:5000/gev/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  } catch (e) {
    console.log('Nav exception/timeout:', e.message);
  }

  console.log('Waiting 10 seconds for initial asset load...');
  await new Promise(r => setTimeout(r, 10000));

  const screenshotPath = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/gev_proxy_broken.png';
  await page.screenshot({ path: screenshotPath });
  console.log(`Saved screenshot to: ${screenshotPath}`);

  const domInfo = await page.evaluate(() => {
    return {
      title: document.title,
      canvasCount: document.querySelectorAll('canvas').length,
      bodyHtmlSnippet: document.body.innerHTML.slice(0, 1000)
    };
  });

  await browser.close();

  const failedRequests = networkRequests.filter(r => r.status >= 400);

  console.log('\n=== DIAGNOSTIC REPORT ===');
  console.log(`Total Network Requests: ${networkRequests.length}`);
  console.log(`Failed (4xx/5xx) Requests: ${failedRequests.length}`);
  console.log('\n--- All Failed Requests ---');
  failedRequests.forEach(r => console.log(`[${r.status}] ${r.url}`));

  console.log(`\n--- First 25 Network Requests ---`);
  networkRequests.slice(0, 25).forEach(r => console.log(`[${r.status}] ${r.url}`));

  console.log('\n--- All Console Messages ---');
  consoleMessages.forEach(m => console.log(`[${m.type}] ${m.text}`));

  console.log('\n--- DOM Info ---');
  console.log(JSON.stringify(domInfo, null, 2));
}

diagnose().catch(err => {
  console.error('Diagnosis failed:', err);
  process.exit(1);
});
