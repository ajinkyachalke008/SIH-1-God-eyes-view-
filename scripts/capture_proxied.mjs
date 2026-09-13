import puppeteer from 'puppeteer';

const ARTIFACTS = '/Users/rushikeshkevale/.gemini/antigravity-ide/brain/2788b504-c184-4e39-8b96-292a7d2954c4';

async function run() {
  console.log('Launching Puppeteer with extended protocolTimeout...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    protocolTimeout: 120000,
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

  try {
    // 1. Capture GEV through proxy
    console.log('\n--- Capturing God\'s Eye View via http://localhost:5000/gev/ ---');
    const pageGev = await browser.newPage();
    await pageGev.setViewport({ width: 1440, height: 900 });
    
    try {
      await pageGev.goto('http://localhost:5000/gev/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log('GEV DOM loaded');
    } catch (e) {
      console.log('GEV goto timeout/warning (continuing):', e.message);
    }
    console.log('Waiting 12s for Cesium 3D canvas and HUD render...');
    await new Promise(r => setTimeout(r, 12000));
    
    const gevPath = `${ARTIFACTS}/unified_gev.png`;
    await pageGev.screenshot({ path: gevPath, fullPage: false });
    console.log(`✓ GEV screenshot saved: ${gevPath}`);
    await pageGev.close();

    // 2. Capture World Monitor through proxy
    console.log('\n--- Capturing World Monitor via http://localhost:5000/world/ ---');
    const pageWm = await browser.newPage();
    await pageWm.setViewport({ width: 1440, height: 900 });
    
    try {
      await pageWm.goto('http://localhost:5000/world/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      console.log('World Monitor DOM loaded');
    } catch (e) {
      console.log('World Monitor goto timeout/warning (continuing):', e.message);
    }
    console.log('Waiting 12s for Globe render and panels...');
    await new Promise(r => setTimeout(r, 12000));
    
    const wmPath = `${ARTIFACTS}/unified_world.png`;
    await pageWm.screenshot({ path: wmPath, fullPage: false });
    console.log(`✓ World Monitor screenshot saved: ${wmPath}`);
    await pageWm.close();

    console.log('\nAll proxied screenshots captured successfully!');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Capture failed:', err);
  process.exit(1);
});
