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

  console.log('Navigating to http://127.0.0.1:4173 ...');
  let httpStatus = null;
  try {
    const res = await page.goto('http://127.0.0.1:4173', {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });
    if (res) httpStatus = res.status();
  } catch (e) {
    console.log(`Navigation notice: ${e.message}`);
  }

  console.log('Waiting 15 seconds for Cesium 3D globe and keyless layer data (flights, earthquakes, fires)...');
  await new Promise(r => setTimeout(r, 15000));

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

  const domLayers = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.layer-chip, .source-chip, button, [role="button"], [data-layer]'));
    const chipTexts = chips.map(c => c.innerText.trim()).filter(Boolean);
    const title = document.title;
    const bodyText = document.body.innerText.slice(0, 500);

    // Look for GEV layer badges or status
    const hudBadges = Array.from(document.querySelectorAll('.hud-badge, .status-pill, .chip, [class*="chip"], [class*="layer"]'))
      .map(el => el.innerText.trim()).filter(Boolean);

    return {
      title,
      chipTexts: chipTexts.slice(0, 40),
      hudBadges: hudBadges.slice(0, 30),
      bodySnippet: bodyText
    };
  });

  await browser.close();

  console.log(JSON.stringify({
    httpStatus,
    canvasInfo,
    domLayers,
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
