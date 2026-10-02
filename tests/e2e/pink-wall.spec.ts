import { test,expect } from '@playwright/test';
test('Figma assets load and the page stays within the viewport',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  await expect(page.getByRole('heading',{name:'October reminds us. But support has no season.'})).toBeAttached();
  await expect(page.getByRole('heading',{name:"And if you're the one fighting…"})).toBeVisible();
  const images=await page.locator('main img').evaluateAll(imgs=>imgs.map(img=>({src:(img as HTMLImageElement).src,loaded:(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0})));
  expect(images.every(img=>img.loaded)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:'test-results/'+test.info().project.name+'-page.png',fullPage:true});
});
test('reading, zoom controls, and reset work',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Read a message',exact:true}).click();
  const popover=page.getByRole('dialog',{name:'Message of support'});
  await expect(popover).toBeVisible();await expect(popover.locator('.message-content')).not.toBeEmpty();
  await popover.getByRole('button',{name:'Read next message'}).click();await expect(popover).toBeVisible();
  await popover.getByRole('button',{name:'Close message'}).click();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await expect(page.locator('.zoom-controls')).not.toContainText('100%');
  await page.getByRole('button',{name:'Reset ribbon view'}).click();
  await expect(page.locator('.zoom-controls')).toContainText('100%');
});
test('a contribution travels to its dot and persists locally',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Leave a message',exact:true}).first().click();
  const dialog=page.getByRole('dialog',{name:'Leave a little love.'});await expect(dialog).toBeVisible();
  await dialog.getByLabel('Your message',{exact:true}).fill('You are held in love. One day at a time.');
  await dialog.getByLabel('From (optional)').fill('Taylor');
  await dialog.getByRole('button',{name:'Add my message to the ribbon'}).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('dialog',{name:'Message of support'})).toContainText('Your message is now part of the ribbon.');
  await expect(page.getByRole('dialog',{name:'Message of support'})).toContainText('Taylor');
  await expect(page.locator('.ribbon-count')).toContainText('121 messages');
  await expect(page.locator('.zoom-controls')).toContainText('550%');
  await page.screenshot({path:'test-results/'+test.info().project.name+'-contribution.png',fullPage:true});
  await page.reload();await expect(page.locator('.ribbon-count')).toContainText('121 messages');
});
test('dialog supports Escape and reduced motion retains essential actions',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
  await page.getByRole('button',{name:'Leave a message',exact:true}).first().click();
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name:'Leave a little love.'})).not.toBeVisible();
  await page.getByRole('button',{name:'Read a message',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Message of support'})).toBeVisible();
  await expect(page.locator('.zoom-controls')).toContainText('550%');
});
test('touch exploration can be exited to resume scrolling',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile');await page.goto('/');
  const toggle=page.getByRole('button',{name:'Explore ribbon',exact:true});await toggle.click();
  await expect(page.getByRole('button',{name:'Done exploring',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.getByRole('button',{name:'Done exploring',exact:true}).click();await expect(toggle).toHaveAttribute('aria-pressed','false');
  expect(await page.locator('canvas').evaluate(el=>getComputedStyle(el).touchAction)).toBe('pan-y');
});
