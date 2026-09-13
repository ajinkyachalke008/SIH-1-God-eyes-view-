import puppeteer from 'puppeteer';

async function runTest() {
  console.log('=== Starting Puppeteer Verification of Proxied Endpoints ===');
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

  // TEST 1: God's Eye View through Proxy at http://localhost:5000/gev/
  console.log('\n----------------------------------------');
  console.log('TESTING http://localhost:5000/gev/');
  console.log('----------------------------------------');
  const gevPage = await browser.newPage();
  await gevPage.setViewport({ width: 1440, height: 900 });

  const gevRequests = [];
  const gevConsole = [];

  gevPage.on('response', res => {
    gevRequests.push({
      url: res.url(),
      status: res.status(),
      isError: res.status() >= 400
    });
  });

  gevPage.on('requestfailed', req => {
    gevRequests.push({
      url: req.url(),
      status: 'FAILED',
      isError: true,
      errorText: req.failure() ? req.failure().errorText : 'unknown'
    });
  });

  gevPage.on('console', msg => {
    gevConsole.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  gevPage.on('pageerror', err => {
    gevConsole.push({
      type: 'pageerror',
      text: err.toString()
    });
  });

  gevPage.on('request', req => {
    // console.log(`  -> ${req.method()} ${req.url()}`);
  });

  console.log('Navigating to http://localhost:5000/gev/ ...');
  const navRes = await gevPage.goto('http://localhost:5000/gev/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  console.log(`Initial navigation HTTP status: ${navRes ? navRes.status() : 'N/A'}`);

  console.log('Waiting 10s for Cesium 3D canvas, globe textures, and HUD widgets...');
  await new Promise(r => setTimeout(r, 10000));

  const gevScreenshot = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/unified_gev_working.png';
  await gevPage.screenshot({ path: gevScreenshot, fullPage: false });
  console.log(`GEV screenshot saved to: ${gevScreenshot}`);

  const gevDom = await gevPage.evaluate(() => {
    const canvases = Array.from(document.querySelectorAll('canvas')).map(c => ({
      width: c.width,
      height: c.height,
      className: c.className
    }));
    return {
      title: document.title,
      canvasCount: canvases.length,
      canvases,
      hasCesiumWidget: !!document.querySelector('.cesium-widget'),
      hudVisible: !!document.querySelector('#hud, .hud-panel, #app')
    };
  });

  console.log('\nGEV DOM Evaluation:', JSON.stringify(gevDom, null, 2));

  console.log(`\nGEV Network Requests (${gevRequests.length} total):`);
  const gevErrors = gevRequests.filter(r => r.isError);
  console.log(`Failed / 4xx / 5xx requests: ${gevErrors.length}`);
  if (gevErrors.length > 0) {
    console.log('Errors:');
    gevErrors.forEach(e => console.log(`  [${e.status}] ${e.url} ${e.errorText || ''}`));
  }
  console.log('\nGEV Sample Network Requests:');
  gevRequests.slice(0, 30).forEach(r => console.log(`  [${r.status}] ${r.url}`));

  console.log(`\nGEV Console Messages (${gevConsole.length} total):`);
  gevConsole.forEach(c => console.log(`  [${c.type}] ${c.text}`));

  // TEST 2: World Monitor through Proxy at http://localhost:5000/world/
  console.log('\n----------------------------------------');
  console.log('TESTING http://localhost:5000/world/');
  console.log('----------------------------------------');
  const worldPage = await browser.newPage();
  await worldPage.setViewport({ width: 1440, height: 900 });

  const worldRequests = [];
  const worldConsole = [];

  worldPage.on('response', res => {
    worldRequests.push({
      url: res.url(),
      status: res.status(),
      isError: res.status() >= 400
    });
  });

  worldPage.on('requestfailed', req => {
    worldRequests.push({
      url: req.url(),
      status: 'FAILED',
      isError: true
    });
  });

  worldPage.on('console', msg => {
    worldConsole.push({
      type: msg.type(),
      text: msg.text()
    });
  });

  worldPage.on('pageerror', err => {
    worldConsole.push({
      type: 'pageerror',
      text: err.toString()
    });
  });

  console.log('Navigating to http://localhost:5000/world/ ...');
  const worldNav = await worldPage.goto('http://localhost:5000/world/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  console.log(`Initial navigation HTTP status: ${worldNav ? worldNav.status() : 'N/A'}`);

  console.log('Waiting 8s for World Monitor panels and maps...');
  await new Promise(r => setTimeout(r, 8000));

  const worldScreenshot = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4/unified_world_working.png';
  await worldPage.screenshot({ path: worldScreenshot, fullPage: false });
  console.log(`World Monitor screenshot saved to: ${worldScreenshot}`);

  const worldDom = await worldPage.evaluate(() => {
    return {
      title: document.title,
      panels: document.querySelectorAll('.panel, [class*="panel"], [class*="card"]').length,
      bodyTextSnippet: document.body.innerText.substring(0, 300).replace(/\n+/g, ' ')
    };
  });

  console.log('\nWorld Monitor DOM Evaluation:', JSON.stringify(worldDom, null, 2));

  console.log(`\nWorld Network Requests (${worldRequests.length} total):`);
  const worldErrors = worldRequests.filter(r => r.isError);
  console.log(`Failed / 4xx / 5xx requests: ${worldErrors.length}`);
  if (worldErrors.length > 0) {
    console.log('World Errors:');
    worldErrors.forEach(e => console.log(`  [${e.status}] ${e.url}`));
  }
  console.log('\nWorld Sample Network Requests:');
  worldRequests.slice(0, 15).forEach(r => console.log(`  [${r.status}] ${r.url}`));

  console.log(`\nWorld Console Messages (${worldConsole.length} total):`);
  worldConsole.slice(0, 15).forEach(c => console.log(`  [${c.type}] ${c.text}`));

  await browser.close();
  console.log('\n=== All Tests Completed Successfully ===');
}

runTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
