const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  
  await page.goto('file:///Users/alkhastvatsaev/Desktop/MAP%20BELGIQUE/index.html', {waitUntil: 'networkidle0'});
  
  await browser.close();
})();
