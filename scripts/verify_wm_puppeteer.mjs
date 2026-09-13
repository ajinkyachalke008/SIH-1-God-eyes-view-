import puppeteer from 'puppeteer';

async function run() {
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

  const errors = [];
  const warnings = [];
  const failedRequests = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      errors.push(text);
    } else if (type === 'warning') {
      warnings.push(text);
    }
  });

  page.on('response', res => {
    const status = res.status();
    if (status >= 400) {
      failedRequests.push({ status, url: res.url() });
    }
  });

  console.log('Navigating to http://localhost:3000 ...');
  const res = await page.goto('http://localhost:3000', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  const httpStatus = res.status();
  console.log(`HTTP Status: ${httpStatus}`);

  console.log('Waiting 10 seconds for globe rendering and initial data...');
  await new Promise(r => setTimeout(r, 10000));

  const canvasInfo = await page.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas'));
    return canvases.map(c => ({
      width: c.width,
      height: c.height,
      visible: c.offsetWidth > 0 && c.offsetHeight > 0,
      className: c.className,
      id: c.id
    }));
  });

  const rootContent = await page.evaluate(() => {
    const root = document.getElementById('root') || document.body;
    return {
      hasChildren: root.children.length > 0,
      textPreview: root.innerText ? root.innerText.slice(0, 150) : ''
    };
  });

  await browser.close();

  console.log(JSON.stringify({
    httpStatus,
    canvasInfo,
    rootContent,
    errorsCount: errors.length,
    errors,
    warningsCount: warnings.length,
    warnings: warnings.slice(0, 10),
    failedRequestsCount: failedRequests.length,
    failedRequests
  }, null, 2));
}

run().catch(e => {
  console.error('Test run error:', e);
  process.exit(1);
});
