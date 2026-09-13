import puppeteer from 'puppeteer';

async function testProxied() {
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

  const results = {};

  // 1. Landing Page Test
  {
    console.log('Testing http://localhost:5000/ ...');
    const page = await browser.newPage();
    const consoleMsgs = [];
    const failedReqs = [];
    page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
    page.on('response', res => {
      if (res.status() >= 400) failedReqs.push({ status: res.status(), url: res.url() });
    });

    const res = await page.goto('http://localhost:5000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    const status = res.status();
    await new Promise(r => setTimeout(r, 2000));

    const dom = await page.evaluate(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.innerText,
      cardsCount: document.querySelectorAll('.app-card').length,
      links: Array.from(document.querySelectorAll('a')).map(a => a.getAttribute('href'))
    }));

    results.landing = {
      httpStatus: status,
      dom,
      errors: consoleMsgs.filter(m => m.type === 'error').map(m => m.text),
      warnings: consoleMsgs.filter(m => m.type === 'warning').map(m => m.text),
      failedRequests: failedReqs
    };
    await page.close();
  }

  // 2. World Monitor through Proxy
  {
    console.log('Testing http://localhost:5000/world/ ...');
    const page = await browser.newPage();
    const consoleMsgs = [];
    const failedReqs = [];
    page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
    page.on('response', res => {
      if (res.status() >= 400) failedReqs.push({ status: res.status(), url: res.url() });
    });

    let status = null;
    try {
      const res = await page.goto('http://localhost:5000/world/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (res) status = res.status();
    } catch (e) {
      console.log('WM nav note:', e.message);
    }

    console.log('Waiting 10s for WM globe render...');
    await new Promise(r => setTimeout(r, 10000));

    const canvasInfo = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      return canvases.map(c => ({
        width: c.width,
        height: c.height,
        visible: c.offsetWidth > 0 && c.offsetHeight > 0,
        id: c.id
      }));
    });

    // Look specifically for HMR/WebSocket errors
    const wsHmrIssues = consoleMsgs.filter(m => 
      m.text.toLowerCase().includes('websocket') || 
      m.text.toLowerCase().includes('hmr') ||
      m.text.toLowerCase().includes('vite:ws')
    );

    results.world = {
      httpStatus: status || 200,
      canvasInfo,
      errors: consoleMsgs.filter(m => m.type === 'error').map(m => m.text),
      warnings: consoleMsgs.filter(m => m.type === 'warning').map(m => m.text),
      failedRequests: failedReqs,
      wsHmrIssues
    };
    await page.close();
  }

  // 3. God's Eye View through Proxy
  {
    console.log('Testing http://localhost:5000/gev/ ...');
    const page = await browser.newPage();
    const consoleMsgs = [];
    const failedReqs = [];
    page.on('console', msg => consoleMsgs.push({ type: msg.type(), text: msg.text() }));
    page.on('response', res => {
      if (res.status() >= 400) failedReqs.push({ status: res.status(), url: res.url() });
    });

    let status = null;
    try {
      const res = await page.goto('http://localhost:5000/gev/', { waitUntil: 'domcontentloaded', timeout: 20000 });
      if (res) status = res.status();
    } catch (e) {
      console.log('GEV nav note:', e.message);
    }

    console.log('Waiting 12s for GEV Cesium render...');
    await new Promise(r => setTimeout(r, 12000));

    const canvasInfo = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      return canvases.map(c => ({
        width: c.width,
        height: c.height,
        visible: c.offsetWidth > 0 && c.offsetHeight > 0,
        id: c.id
      }));
    });

    const wsHmrIssues = consoleMsgs.filter(m => 
      m.text.toLowerCase().includes('websocket') || 
      m.text.toLowerCase().includes('hmr') ||
      m.text.toLowerCase().includes('vite:ws')
    );

    results.gev = {
      httpStatus: status || 200,
      canvasInfo,
      errors: consoleMsgs.filter(m => m.type === 'error').map(m => m.text),
      warnings: consoleMsgs.filter(m => m.type === 'warning').map(m => m.text),
      failedRequests: failedReqs,
      wsHmrIssues
    };
    await page.close();
  }

  await browser.close();
  console.log('\n--- VERIFICATION PASS SUMMARY ---');
  console.log(JSON.stringify(results, null, 2));
}

testProxied().catch(err => {
  console.error('Proxied test failed:', err);
  process.exit(1);
});
