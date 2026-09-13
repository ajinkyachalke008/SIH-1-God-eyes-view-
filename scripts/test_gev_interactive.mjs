import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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

const consoleLogs = [];
const consoleErrors = [];
page.on('console', msg => {
  const text = msg.text();
  consoleLogs.push(`[${msg.type()}] ${text}`);
  if (msg.type() === 'error') {
    consoleErrors.push(text);
  }
});

const failedRequests = [];
page.on('requestfailed', req => {
  failedRequests.push({ url: req.url(), failure: req.failure()?.errorText });
});

console.log('1. Navigating to http://localhost:5000/gev/ ...');
await page.goto('http://localhost:5000/gev/', { waitUntil: 'domcontentloaded', timeout: 60000 });

// Wait for the modal or canvas
await page.waitForSelector('.cesium-widget canvas', { timeout: 25000 });
console.log('Cesium canvas detected.');

// Wait 2 seconds for initial animations
await new Promise(r => setTimeout(r, 2000));

// Check initial state
const initialState = await page.evaluate(() => {
  const modal = document.querySelector('.mission-control-dialog, [class*="first-launch"], #first-launch-dialog');
  const errorPanel = document.querySelector('.cesium-widget-errorPanel');
  const exploreBtn = Array.from(document.querySelectorAll('button, div[role="button"], span, h3')).find(el => el.textContent && el.textContent.includes('EXPLORE MANUALLY'));
  return {
    hasErrorPanel: !!errorPanel,
    hasModal: !!modal,
    hasExploreBtn: !!exploreBtn
  };
});
console.log('Initial state:', JSON.stringify(initialState));

// Click "EXPLORE MANUALLY"
console.log('2. Clicking "EXPLORE MANUALLY"...');
const clicked = await page.evaluate(() => {
  const elements = Array.from(document.querySelectorAll('*'));
  const btn = elements.find(el => el.textContent && el.textContent.trim() === 'EXPLORE MANUALLY' && el.offsetParent !== null);
  if (btn) {
    btn.click();
    return true;
  }
  const item = elements.find(el => el.textContent && el.textContent.includes('EXPLORE MANUALLY') && (el.tagName === 'DIV' || el.tagName === 'BUTTON'));
  if (item) {
    item.click();
    return true;
  }
  return false;
});
console.log('Explore button clicked:', clicked);

// Wait for globe to reveal
await new Promise(r => setTimeout(r, 3000));

// Capture globe screenshot
const screenshot1Path = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/gev_interactive_globe.png';
await page.screenshot({ path: screenshot1Path });
console.log('Saved screenshot: gev_interactive_globe.png');

// Simulate globe interaction: drag/rotate
console.log('3. Interacting with globe (drag/orbit)...');
const canvasBox = await page.evaluate(() => {
  const c = document.querySelector('.cesium-widget canvas');
  if (!c) return null;
  const rect = c.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
});

if (canvasBox) {
  await page.mouse.move(canvasBox.x, canvasBox.y);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 150, canvasBox.y + 80, { steps: 10 });
  await page.mouse.up();
  console.log('Dragged globe successfully.');
}

await new Promise(r => setTimeout(r, 2000));

// Click "DATA LAYERS"
console.log('4. Testing DATA LAYERS toggle...');
const layersClicked = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('*')).find(el => el.textContent && el.textContent.includes('DATA LAYERS'));
  if (btn) {
    btn.click();
    return true;
  }
  return false;
});
console.log('Data layers clicked:', layersClicked);

await new Promise(r => setTimeout(r, 2000));

// Capture screenshot after rotation & layer click
const screenshot2Path = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/gev_interactive_layers.png';
await page.screenshot({ path: screenshot2Path });
console.log('Saved screenshot: gev_interactive_layers.png');

// Check final WebGL state & Cesium status
const status = await page.evaluate(() => {
  const c = document.querySelector('.cesium-widget canvas');
  const errorPanel = document.querySelector('.cesium-widget-errorPanel');
  return {
    canvasWidth: c ? c.width : 0,
    canvasHeight: c ? c.height : 0,
    hasError: !!errorPanel,
    errorText: errorPanel ? errorPanel.innerText : null,
    cesiumDefined: typeof window.Cesium !== 'undefined',
    cesiumBaseUrl: window.CESIUM_BASE_URL || null
  };
});

console.log('Final Status:', JSON.stringify(status, null, 2));
console.log('Console Errors count:', consoleErrors.length);
if (consoleErrors.length > 0) {
  console.log('Console Errors:', JSON.stringify(consoleErrors.slice(0, 10), null, 2));
}
console.log('Failed Requests count:', failedRequests.length);

await browser.close();
console.log('TEST COMPLETE');
