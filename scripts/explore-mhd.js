import puppeteer from 'puppeteer';

const MHD_URL = 'https://www.mayadatabase.org';

async function exploreMHD() {
  console.log('🔍 Exploring MHD structure...\n');
  
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // 1. Go to MHD
    console.log('📍 Navigating to MHD...');
    await page.goto(MHD_URL, { waitUntil: 'networkidle0' });
    
    // 2. Wait for login form to be visible
    console.log('🔐 Waiting for login form...');
    await page.waitForSelector('input[placeholder="Email"]', { timeout: 10000 });
    
    // 3. Fill in login credentials
    console.log('📝 Filling in credentials...');
    await page.type('input[placeholder="Email"]', process.env.MHD_EMAIL);
    await page.type('input[placeholder="Password"]', process.env.MHD_PASSWORD);
    
    // 4. Click login button (find by text content)
    console.log('🔘 Clicking login...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginButton = buttons.find(btn => btn.textContent.trim() === 'Login');
      if (loginButton) loginButton.click();
    });
    
    // 5. Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 15000 });
    
    console.log('✅ Logged in successfully!');
    console.log('🌐 Current URL:', page.url());
    
    // 6. Take screenshot
    await page.screenshot({ path: 'mhd-logged-in.png', fullPage: true });
    console.log('📸 Screenshot saved as mhd-logged-in.png');
    
    // Keep browser open for exploration
    console.log('\n⏸️  Browser will stay open for 60 seconds so you can explore...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'mhd-error.png', fullPage: true });
    console.log('📸 Error screenshot saved as mhd-error.png');
  } finally {
    await browser.close();
  }
}

exploreMHD();
