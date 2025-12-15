import puppeteer from 'puppeteer';
import fs from 'fs';

const MHD_URL = 'https://www.mayadatabase.org';
const OUTPUT_PATH = 'data/mhd-graphemes-all.json';

async function scrapeMHDAPI() {
  console.log('🚀 Starting MHD infinite scroll scraper...\n');

  // 0. Resume from existing file if present
  let allResponses = [];
  const existingIds = new Set();

  try {
    const existingText = fs.readFileSync(OUTPUT_PATH, 'utf8');
    const existingJson = JSON.parse(existingText);
    if (Array.isArray(existingJson)) {
      allResponses = existingJson;
      for (const r of existingJson) {
        if (r && typeof r.blsort !== 'undefined') {
          existingIds.add(r.blsort);
        }
      }
      console.log(`♻️ Resuming from ${allResponses.length.toLocaleString()} existing records\n`);
    }
  } catch (e) {
    console.log('🆕 No existing JSON, starting fresh\n');
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    protocolTimeout: 24 * 60 * 60 * 1000, // 24 hours per CDP call
  });
  const page = await browser.newPage();

  let totalExpected = 0;
  let responseCount = 0;
  const batchTimes = [];

  await page.setRequestInterception(true);
  page.on('request', (request) => request.continue());

  const initialCount = allResponses.length;
  let haveSeenNewThisRun = false;

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

          // Deduplicate by blsort (unique ID), respecting previously saved records
          const newRecords = json.data.filter((r) => {
            if (!r || typeof r.blsort === 'undefined') return false;
            if (existingIds.has(r.blsort)) return false;
            existingIds.add(r.blsort);
            return true;
          });
          allResponses.push(...newRecords);

          if (!haveSeenNewThisRun && allResponses.length > initialCount) {
            haveSeenNewThisRun = true;
          }

          if (newRecords.length > 0) {
            const progress = totalExpected ? Math.round((allResponses.length / totalExpected) * 100) : 0;

            // Calculate ETA from average batch time
            let eta = '';
            if (batchTimes.length > 5 && totalExpected) {
              const recent = batchTimes.slice(-20);
              const avgBatchTime = recent.reduce((a, b) => a + b, 0) / recent.length;
              const remainingBatches = Math.max(0, Math.ceil((totalExpected - allResponses.length) / 50));
              const etaMinutes = Math.round((remainingBatches * avgBatchTime) / 60000);
              eta = ` | ETA: ${etaMinutes}m`;
            }

            console.log(
              `📡 +${newRecords.length} → ${allResponses.length.toLocaleString()}/${totalExpected.toLocaleString()} (${progress}%)${eta}`,
            );
          }

          if (json.counts) totalExpected = json.counts;
        }
      } catch (e) {
        // ignore individual response parse issues
      }
    }
  });

  try {
    // 1. Login
    console.log('🔐 Logging in...');
    await page.goto(MHD_URL, { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[placeholder="Email"]');
    await page.type('input[placeholder="Email"]', process.env.MHD_EMAIL || '');
    await page.type('input[placeholder="Password"]', process.env.MHD_PASSWORD || '');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginButton = buttons.find(
        (btn) => btn.textContent && btn.textContent.trim() === 'Login',
      );
      if (loginButton) loginButton.click();
    });
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Logged in!\n');

    // 2. Navigate to "All - Graphemes"
    console.log('🔍 Opening search dropdown...');
    await page.waitForSelector('input[placeholder="Search Texts and/or Catalog"]');
    await page.click('input[placeholder="Search Texts and/or Catalog"]');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('📋 Clicking "All - Graphemes"...');
    await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('*'));
      const allGraphemes = elements.find((el) => {
        const text = (el.textContent || '').trim();
        return text === 'All - Graphemes' && el.children.length === 0;
      });
      if (allGraphemes) allGraphemes.click();
    });

    console.log('⏳ Waiting for table to load...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    if (allResponses.length === 0) {
      console.log('❌ No data loaded. Exiting.');
      await browser.close();
      return;
    }

    console.log(`✅ Initial load / resume: ${allResponses.length} records`);
    console.log(`🎯 Target (from API counts): ${totalExpected.toLocaleString()} records`);
    console.log('🖱️  Starting turbo scroll...\n');

    // 3. Find table position
    const tableRect = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (table) {
        const rect = table.getBoundingClientRect();
        return {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        };
      }
      return { x: 800, y: 500 };
    });

    let lastSaveCount = allResponses.length;
    const startTime = Date.now();
    let lastProgressTime = Date.now();

    const HOURS_WITHOUT_DATA = 6; // safety net

    // Scroll until we reach totalExpected, or no new data for many hours
    while (!totalExpected || allResponses.length < totalExpected) {
      const beforeCount = allResponses.length;

      // Scroll with retry in case of occasional protocol timeouts
      try {
        await page.mouse.move(tableRect.x, tableRect.y);

        // Gentler scrolling: fewer events, bigger delays
        for (let i = 0; i < 5; i++) {
          await page.mouse.wheel({ deltaY: 500 });
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (e) {
        console.log('⚠️ Scroll event failed, retrying after short pause:', e.message);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // Wait for new data
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (allResponses.length > beforeCount) {
        lastProgressTime = Date.now();
      } else {
        if (haveSeenNewThisRun) {
          if (Date.now() - lastProgressTime > HOURS_WITHOUT_DATA * 60 * 60 * 1000) {
            console.log(`\n⚠️ No new data for ${HOURS_WITHOUT_DATA} hours. Assuming complete and stopping.`);
            break;
          }
        }
      }

      // Save every 1000 new records
      if (allResponses.length - lastSaveCount >= 1000) {
        fs.mkdirSync('data', { recursive: true });
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResponses, null, 2));
        lastSaveCount = allResponses.length;

        const elapsed = Math.round((Date.now() - startTime) / 60000);
        console.log(`   💾 Progress saved | ${elapsed}m elapsed`);
      }
    }

    console.log(`\n✅ Complete! ${allResponses.length.toLocaleString()}/${totalExpected.toLocaleString()}\n`);

    // Save final
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResponses, null, 2));
    console.log(`✅ Saved to ${OUTPUT_PATH}`);

    const totalTime = Math.round((Date.now() - startTime) / 60000);
    const avgBatchTime = batchTimes.length
      ? batchTimes.reduce((a, b) => a + b, 0) / batchTimes.length / 1000
      : 0;
    console.log(`⏱️  Total: ${totalTime}m (${(totalTime / 60).toFixed(1)}h)`);
    console.log(`⚡ Avg time per batch: ${avgBatchTime.toFixed(1)}s`);

    console.log('\n📊 Summary:');
    console.log(`   Records: ${allResponses.length.toLocaleString()}`);
    console.log(`   With images: ${allResponses.filter((d) => d && d.blimage1).length.toLocaleString()}`);
    console.log(`   Artifacts: ${new Set(allResponses.map((d) => d && d.objabbr)).size.toLocaleString()}`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);

    if (allResponses.length > 0) {
      fs.mkdirSync('data', { recursive: true });
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allResponses, null, 2));
      console.log(`✅ Saved ${allResponses.length.toLocaleString()} partial`);
    }
  } finally {
    await browser.close();
  }
}

scrapeMHDAPI();
