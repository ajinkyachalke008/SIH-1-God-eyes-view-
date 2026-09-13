import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const LOG_FILE = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/gev_incremental.log';
const GEV_SCREENSHOT = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/gev_proxy_working.png';
const WORLD_SCREENSHOT = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/world_proxy_working.png';

// Initialize log file
fs.writeFileSync(LOG_FILE, `=== PROXIED VERIFICATION RUN STARTED AT ${new Date().toISOString()} ===\n`);

function logIncremental(type, data) {
  const line = `[${new Date().toISOString()}] [${type}] ${typeof data === 'object' ? JSON.stringify(data) : data}\n`;
  fs.appendFileSync(LOG_FILE, line);
}

async function verify() {
  console.log('Launching Chrome via Puppeteer with SwiftShader WebGL...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    protocolTimeout: 60000,
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

  const networkStats = {
    total: 0,
    success: 0,
    failed: [],
    statuses: {}
  };
  const consoleMessages = [];

  page.on('request', req => {
    networkStats.total++;
    logIncremental('REQ', `${req.method()} ${req.url()}`);
  });

  page.on('response', res => {
    const status = res.status();
    const url = res.url();
    networkStats.statuses[status] = (networkStats.statuses[status] || 0) + 1;
    if (status >= 400) {
      const entry = { status, url };
      networkStats.failed.push(entry);
      logIncremental('FAIL_RES', entry);
    } else {
      networkStats.success++;
      logIncremental('RES', `[${status}] ${url}`);
    }
  });

  page.on('requestfailed', req => {
    const entry = {
      url: req.url(),
      errorText: req.failure() ? req.failure().errorText : 'unknown'
    };
    networkStats.failed.push({ status: 'NETWORK_ERR', ...entry });
    logIncremental('REQ_FAILED', entry);
  });

  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    consoleMessages.push(entry);
    logIncremental('CONSOLE', entry);
  });

  page.on('pageerror', err => {
    const entry = { type: 'pageerror', text: err.toString() };
    consoleMessages.push(entry);
    logIncremental('PAGE_ERROR', entry);
  });

  console.log('\n--- Step 1: Testing God\'s Eye View at http://localhost:5000/gev/ ---');
  console.log('Navigating with waitUntil: "domcontentloaded", timeout: 60000ms ...');
  
  const navStart = Date.now();
  const navResponse = await page.goto('http://localhost:5000/gev/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });
  const navElapsed = Date.now() - navStart;
  console.log(`Navigation resolved in ${navElapsed}ms with HTTP status: ${navResponse ? navResponse.status() : 'null'}`);
  logIncremental('NAV_DONE', { elapsedMs: navElapsed, status: navResponse ? navResponse.status() : null });

  console.log('Polling every 500ms for up to 15s for document.querySelector(".cesium-widget canvas") with non-zero dimensions...');
  const pollStart = Date.now();
  const pollTimeout = 15000;
  let canvasFound = null;

  while (Date.now() - pollStart < pollTimeout) {
    const check = await page.evaluate(() => {
      const el = document.querySelector('.cesium-widget canvas');
      if (!el) {
        // Also check if any canvas exists
        const anyCanvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
          className: c.className,
          width: c.width,
          height: c.height,
          clientWidth: c.clientWidth,
          clientHeight: c.clientHeight
        }));
        return { exists: false, anyCanvases };
      }
      return {
        exists: true,
        width: el.width,
        height: el.height,
        clientWidth: el.clientWidth,
        clientHeight: el.clientHeight,
        hasNonZero: el.width > 0 && el.height > 0
      };
    });

    if (check.exists && check.hasNonZero) {
      canvasFound = {
        ...check,
        elapsedMs: Date.now() - pollStart
      };
      console.log(`✓ Cesium canvas confirmed after ${canvasFound.elapsedMs}ms:`, JSON.stringify(canvasFound));
      logIncremental('CANVAS_POLL_SUCCESS', canvasFound);
      break;
    }

    await new Promise(r => setTimeout(r, 500));
  }

  if (!canvasFound) {
    console.warn('Poll timeout reached without matching .cesium-widget canvas with non-zero dimensions.');
    const finalDomCheck = await page.evaluate(() => {
      return {
        title: document.title,
        bodyHtmlSnippet: document.body ? document.body.innerHTML.slice(0, 1000) : '',
        allCanvases: Array.from(document.querySelectorAll('canvas')).map(c => ({
          className: c.className,
          width: c.width,
          height: c.height
        }))
      };
    });
    console.log('Final DOM state:', JSON.stringify(finalDomCheck, null, 2));
    logIncremental('CANVAS_POLL_TIMEOUT', finalDomCheck);
  }

  // Extra settle pause to ensure textures finish rasterizing
  console.log('Waiting 3 additional seconds for textures to settle before screenshot...');
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: GEV_SCREENSHOT, fullPage: false });
  console.log(`Saved fresh GEV screenshot to: ${GEV_SCREENSHOT}`);
  logIncremental('SCREENSHOT_SAVED', { path: GEV_SCREENSHOT });

  // DOM Summary
  const gevDomSummary = await page.evaluate(() => {
    return {
      title: document.title,
      canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({
        className: c.className,
        width: c.width,
        height: c.height,
        offsetWidth: c.offsetWidth,
        offsetHeight: c.offsetHeight
      })),
      hasCesiumWidget: !!document.querySelector('.cesium-widget'),
      hasHud: !!document.querySelector('#hud, .hud-panel, #app, #intel-hud')
    };
  });

  console.log('\n--- Step 2: Testing World Monitor at http://localhost:5000/world/ ---');
  const worldPage = await browser.newPage();
  await worldPage.setViewport({ width: 1440, height: 900 });

  const worldErrors = [];
  worldPage.on('console', m => {
    if (m.type() === 'error') worldErrors.push(m.text());
  });

  console.log('Navigating to http://localhost:5000/world/ with domcontentloaded...');
  const worldNav = await worldPage.goto('http://localhost:5000/world/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  console.log(`World Monitor navigation status: ${worldNav ? worldNav.status() : 'null'}`);
  console.log('Waiting 8s for World Monitor UI...');
  await new Promise(r => setTimeout(r, 8000));

  await worldPage.screenshot({ path: WORLD_SCREENSHOT, fullPage: false });
  console.log(`Saved World Monitor screenshot to: ${WORLD_SCREENSHOT}`);

  const worldSummary = await worldPage.evaluate(() => ({
    title: document.title,
    panelsCount: document.querySelectorAll('.panel, [class*="panel"], [class*="card"]').length,
    canvases: Array.from(document.querySelectorAll('canvas')).map(c => ({ width: c.width, height: c.height }))
  }));

  await browser.close();

  const finalReport = {
    gev: {
      navigationElapsedMs: navElapsed,
      canvasFound,
      domSummary: gevDomSummary,
      screenshot: GEV_SCREENSHOT,
      networkStats: {
        total: networkStats.total,
        success: networkStats.success,
        failedCount: networkStats.failed.length,
        failed: networkStats.failed,
        statuses: networkStats.statuses
      },
      consoleErrors: consoleMessages.filter(c => c.type === 'error' || c.type === 'pageerror')
    },
    world: {
      screenshot: WORLD_SCREENSHOT,
      summary: worldSummary,
      errorsCount: worldErrors.length,
      errors: worldErrors.slice(0, 5)
    }
  };

  logIncremental('RUN_COMPLETE', finalReport);
  console.log('\n=== FINAL VERIFICATION RESULTS ===');
  console.log(JSON.stringify(finalReport, null, 2));
}

verify().catch(err => {
  logIncremental('FATAL_ERROR', { error: err.message, stack: err.stack });
  console.error('Fatal test error:', err);
  process.exit(1);
});
