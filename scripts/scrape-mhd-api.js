import puppeteer from 'puppeteer';
import fs from 'fs';

const MHD_URL = 'https://www.mayadatabase.org';

async function scrapeMHDAPI() {
  console.log('🚀 Starting MHD infinite scroll scraper...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null
  });
  const page = await browser.newPage();
  
  const allResponses = [];
  let totalExpected = 0;
  let responseCount = 0;
  const batchTimes = [];
  
  await page.setRequestInterception(true);
  page.on('request', (request) => request.continue());
  
  // Intercept API responses
  let lastBatchTime = Date.now();
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (url.includes('api.mayadatabase.org/v1/main/maya') && contentType.includes('application/json')) {
      try {
        const text = await response.text();
        const json = JSON.parse(text);
        
        if (json.success && json.data && Array.isArray(json.data)) {
          responseCount++;
          
          // Track time between batches
          const now = Date.now();
          if (responseCount > 1) {
            batchTimes.push(now - lastBatchTime);
          }
          lastBatchTime = now;
          
          // Deduplicate by blsort (unique ID)
          const existingIds = new Set(allResponses.map(r => r.blsort));
          const newRecords = json.data.filter(r => !existingIds.has(r.blsort));
          allResponses.push(...newRecords);
          
          if (newRecords.length > 0) {
            const progress = totalExpected ? Math.round(allResponses.length/totalExpected*100) : 0;
            
            // Calculate ETA from average batch time
            let eta = '';
            if (batchTimes.length > 5) {
              const avgBatchTime = batchTimes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(batchTimes.length, 20);
              const remainingBatches = Math.ceil((totalExpected - allResponses.length) / 50);
              const etaMinutes = Math.round(remainingBatches * avgBatchTime / 60000);
              eta = ` | ETA: ${etaMinutes}m`;
            }
            
            console.log(`📡 +${newRecords.length} → ${allResponses.length.toLocaleString()}/${totalExpected.toLocaleString()} (${progress}%)${eta}`);
          }
          
          if (json.counts) totalExpected = json.counts;
        }
      } catch (e) {}
    }
  });
  
  try {
    // 1. Login
    console.log('🔐 Logging in...');
    await page.goto(MHD_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[placeholder="Email"]');
    await page.type('input[placeholder="Email"]', process.env.MHD_EMAIL);
    await page.type('input[placeholder="Password"]', process.env.MHD_PASSWORD);
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginButton = buttons.find(btn => btn.textContent.trim() === 'Login');
      if (loginButton) loginButton.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Logged in!\n');
    
    // 2. Navigate to "All - Graphemes"
    console.log('🔍 Opening search dropdown...');
    await page.waitForSelector('input[placeholder="Search Texts and/or Catalog"]');
    await page.click('input[placeholder="Search Texts and/or Catalog"]');
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    console.log('📋 Clicking "All - Graphemes"...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const allGraphemes = elements.find(el => {
        const text = el.textContent.trim();
        return text === 'All - Graphemes' && el.children.length === 0;
      });
      if (allGraphemes) allGraphemes.click();
    });
    
    console.log('⏳ Waiting for table to load...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (allResponses.length === 0) {
      console.log('❌ No data loaded. Exiting.');
      await browser.close();
      return;
    }
    
    console.log(`✅ Initial load: ${allResponses.length} records`);
    console.log(`🎯 Target: ${totalExpected.toLocaleString()} records`);
    console.log('🖱️  Starting turbo scroll...\n');
    
    // 3. Find table position
    const tableRect = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) {
        const rect = table.getBoundingClientRect();
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2
        };
      }
      return { x: 800, y: 500 };
    });
    
    let lastSaveCount = 0;
    const startTime = Date.now();
    let noProgressCount = 0;
    let scrollAttempts = 0;
    
    while (allResponses.length < totalExpected && scrollAttempts < 5000) {
      scrollAttempts++;
      const beforeCount = allResponses.length;
      
      // Move mouse to table and TURBO SCROLL
      await page.mouse.move(tableRect.x, tableRect.y);
      
      // Much bigger scroll increments - 10 scrolls of 500px each = 5000px
      for (let i = 0; i < 10; i++) {
        await page.mouse.wheel({ deltaY: 500 });
        await new Promise(resolve => setTimeout(resolve, 20)); // Tiny delay
      }
      
      // Wait for new data (reduced from 1000ms to 600ms)
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Check progress
      if (allResponses.length === beforeCount) {
        noProgressCount++;
        if (noProgressCount > 20) {
          console.log('\n⚠️  No progress for 20 attempts. Stopping.');
          break;
        }
      } else {
        noProgressCount = 0;
      }
      
      // Save every 1000 records
      if (allResponses.length - lastSaveCount >= 1000) {
        fs.mkdirSync('data', { recursive: true });
        fs.writeFileSync('data/mhd-graphemes-all.json', JSON.stringify(allResponses, null, 2));
        lastSaveCount = allResponses.length;
        
        const elapsed = Math.round((Date.now() - startTime) / 60000);
        console.log(`   💾 Progress saved | ${elapsed}m elapsed`);
      }
    }
    
    console.log(`\n✅ Complete! ${allResponses.length.toLocaleString()}/${totalExpected.toLocaleString()}\n`);
    
    // Save final
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync('data/mhd-graphemes-all.json', JSON.stringify(allResponses, null, 2));
    console.log('✅ Saved to data/mhd-graphemes-all.json');
    
    const totalTime = Math.round((Date.now() - startTime) / 60000);
    const avgBatchTime = batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length / 1000;
    console.log(`⏱️  Total: ${totalTime}m (${(totalTime/60).toFixed(1)}h)`);
    console.log(`⚡ Avg time per batch: ${avgBatchTime.toFixed(1)}s`);
    
    console.log('\n📊 Summary:');
    console.log(`   Records: ${allResponses.length.toLocaleString()}`);
    console.log(`   With images: ${allResponses.filter(d => d.blimage1).length.toLocaleString()}`);
    console.log(`   Artifacts: ${new Set(allResponses.map(d => d.objabbr)).size.toLocaleString()}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (allResponses.length > 0) {
      fs.mkdirSync('data', { recursive: true });
      fs.writeFileSync('data/mhd-graphemes-all.json', JSON.stringify(allResponses, null, 2));
      console.log(`✅ Saved ${allResponses.length.toLocaleString()} partial`);
    }
  } finally {
    await browser.close();
  }
}

scrapeMHDAPI();
