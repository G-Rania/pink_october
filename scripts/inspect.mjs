import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('artifacts',{recursive:true});
const browser=await chromium.launch();
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844],['tablet',820,1180]]) {
  const page=await browser.newPage({viewport:{width,height},isMobile:name==='mobile',hasTouch:name!=='desktop'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:5173');
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:'artifacts/'+name+'-inspection.png',fullPage:true});
  const assets=await page.locator('main img').evaluateAll(elements=>elements.map(element=>{
    const rect=element.getBoundingClientRect();
    return {name:element.getAttribute('src'),loaded:element.complete&&element.naturalWidth>0,
      width:Math.round(rect.width),height:Math.round(rect.height)};
  }));
  console.log(JSON.stringify({name,errors,overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),assets}));
  await page.close();
}
await browser.close();
