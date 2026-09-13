import puppeteer from 'puppeteer';

async function test() {
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

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => errors.push(`[pageerror] ${err.message}`));
  page.on('response', res => {
    if (res.status() >= 400) console.log(`[HTTP ${res.status()}]`, res.url());
  });

  console.log('1. Testing http://localhost:5000/ ...');
  const resHome = await page.goto('http://localhost:5000/', { waitUntil: 'domcontentloaded' });
  console.log('Landing page status:', resHome.status());

  console.log('2. Testing http://localhost:5000/world/ ...');
  const resWorld = await page.goto('http://localhost:5000/world/', { waitUntil: 'domcontentloaded' });
  console.log('World page status:', resWorld.status());
  await new Promise(r => setTimeout(r, 6000));

  console.log('3. Testing http://localhost:5000/gev/ ...');
  const resGev = await page.goto('http://localhost:5000/gev/', { waitUntil: 'domcontentloaded' });
  console.log('GEV page status:', resGev.status());
  await new Promise(r => setTimeout(r, 6000));

  console.log('\nRecorded errors:', errors.length);
  errors.slice(0, 10).forEach(e => console.log(' -', e));

  await browser.close();
}

test().catch(console.error);
