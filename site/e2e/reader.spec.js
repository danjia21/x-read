import {test, expect, openLibrary, noOverflow} from './fixtures.js';

async function screenshot(page, testInfo, name) {
  const path=testInfo.outputPath(`${name}.png`);
  await page.screenshot({path,fullPage:true});
  await testInfo.attach(name,{path,contentType:'image/png'});
}

test('visitors can filter, search, sort, and find original-source links',async({page,reader},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await openLibrary(page,reader);
  await expect(page.getByLabel('Browse by topic').getByRole('option',{name:'Systems (2)',exact:true})).toHaveCount(1);
  await page.getByLabel('Browse by topic').selectOption('Systems');
  await expect(page.getByRole('heading',{name:'Systems (2)',exact:true})).toBeVisible();
  await page.getByLabel('Find a reading').fill('understanding');
  await expect(page.locator('.entry')).toHaveCount(1);
  await page.getByLabel('Find a reading').fill('no such article');
  await expect(page.getByText('No readings match.',{exact:false})).toBeVisible();
  await page.getByLabel('Find a reading').fill('');
  await page.getByLabel('Browse by topic').selectOption('');
  const order=page.getByRole('combobox',{name:'Order'});
  await expect(page.locator('.entry h3').first()).toHaveText('Network fundamentals');
  await order.selectOption('oldest');
  await expect(page.locator('.entry h3').first()).toHaveText('Understanding systems');
  await order.selectOption('published-newest');
  await expect(page.locator('.entry h3')).toHaveText(['Understanding systems','Browser rendering','Network fundamentals']);
  await expect(page.locator('.entry').first().locator('.entry-detail')).toContainText('Example Author · Published 2026-10-15');
  await order.selectOption('published-oldest');
  await expect(page.locator('.entry h3')).toHaveText(['Browser rendering','Understanding systems','Network fundamentals']);
  await noOverflow(page);
  await page.getByRole('combobox',{name:'Order'}).selectOption('title');
  await expect(page.locator('.entry h3').first()).toHaveText('Browser rendering');
  const source=page.locator('.entry').first().getByRole('link',{name:'Original source',exact:true});
  await expect(source).toHaveAttribute('href','https://example.org/browsers');
  await expect(source).toHaveAttribute('target','_blank');
  await screenshot(page,testInfo,'collection');
  await expect(page.locator('#reader, iframe')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('theme persists with sticky desktop navigation',async({page,reader,isMobile},testInfo)=>{
  await openLibrary(page,reader);
  await noOverflow(page);
  const brand=await page.getByRole('link',{name:'x-read',exact:true}).boundingBox();
  const theme=await page.getByRole('button',{name:'Switch color theme'}).boundingBox();
  if(isMobile) {
    expect(Math.abs((brand.y+brand.height/2)-(theme.y+theme.height/2))).toBeLessThan(12);
    expect(theme.x).toBeGreaterThan(brand.x+brand.width);
    expect(page.viewportSize().width-(theme.x+theme.width)).toBeLessThan(35);
  } else {
    expect((await page.locator('main').boundingBox()).x).toBeGreaterThan((await page.locator('.sidebar').boundingBox()).width-1);
  }
  await page.getByRole('button',{name:'Switch color theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await screenshot(page,testInfo,'dark-collection');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.locator('.entry').last().scrollIntoViewIfNeeded();
  await noOverflow(page);
  if(!isMobile) {
    await expect(page.getByRole('link',{name:'x-read',exact:true})).toBeInViewport();
    await expect(page.getByRole('button',{name:'Switch color theme'})).toBeInViewport();
  }
});

test('reloads use the server cache, and rate limits retain readable articles',async({page,reader})=>{
  await openLibrary(page,reader);
  const count=reader.github.calls.length;
  await page.reload();
  await expect(page.locator('.entry')).toHaveCount(3);
  expect(reader.github.calls).toHaveLength(count);
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('x-read:library:')))).toEqual([]);
  reader.github.time+=300001;
  reader.github.status=429;
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Showing cached readings');
  await expect(page.locator('.entry')).toHaveCount(3);
  const limitedCount=reader.github.calls.length;
  await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('status')).toContainText('Showing cached readings');
  expect(reader.github.calls).toHaveLength(limitedCount);
});

test('a cold GitHub failure shows a retry action and can recover',async({page,reader})=>{
  reader.github.status=502;
  await page.goto(reader.origin);
  await expect(page.getByRole('status')).toContainText('The library could not be loaded from GitHub.');
  await expect(page.locator('.entry')).toHaveCount(0);
  const retry=page.getByRole('button',{name:'Try again'});
  await expect(retry).toBeVisible();
  reader.github.status=200;
  reader.github.time+=60001;
  await retry.click();
  await expect(page.getByRole('heading',{name:'All topics (3)'})).toBeVisible();
  await expect(retry).toBeHidden();
});

test('list hands off only structured notes', async ({page,reader}, testInfo) => {
  reader.github.articleMarkdown = `---
format: notes-v1
title: Browser rendering
authors: [Example Author]
source_url: https://example.org/browsers
read_date: '2026-11-21'
published: '2026-10-01'
---

# Reading guide

Watch how the DOM and CSS feed into layout, then see which work can be skipped when a layer moves.

## Layout consequence

<!-- x-read-anchor {"heading":"Layout and paint","passage":"A short passage anchors the overview note."} -->

A layout change can move nearby elements. A transform can sometimes be handled by the compositor without laying out the page again.
`;
  await openLibrary(page, reader);
  const card = page.locator('.entry').filter({has:page.getByRole('heading',{name:'Browser rendering',exact:true})});
  await expect(page.locator('iframe')).toHaveCount(0);
  const button = card.getByRole('button',{name:'Read with notes'});
  await button.click();
  const storeUrl = 'https://chromewebstore.google.com/detail/cpdnlcmlfjdaehaaoddpgmhfgpnpbken';
  await expect(page.getByRole('link', {name:'Install x-read Notes for desktop Chrome'})).toHaveAttribute('href', storeUrl);
  await expect(card.getByRole('status').getByRole('link', {name:'Install x-read Notes'})).toHaveAttribute('href', storeUrl);
  const payload = page.evaluate(() => new Promise(resolve => {
    window.addEventListener('message', event => {
      if (event.source === window && event.data?.type === 'x-read:open-with-notes') {
        window.postMessage({type:'x-read:extension-result', id:event.data.id, ok:true}, location.origin);
        resolve(event.data);
      }
    });
  }));
  await button.click();
  await expect(button).toBeEnabled();
  await expect(card.locator('.entry-action-status')).toBeHidden();
  expect(await payload).toMatchObject({
    source:'https://example.org/browsers',
    notes:[{heading:'',passage:'',title:'Reading guide',text:expect.stringContaining('Watch how the DOM')},
      {heading:'Layout and paint',passage:'A short passage anchors the overview note.',title:'Layout consequence',text:expect.stringContaining('A layout change')}],
  });
  await expect(page.locator('iframe')).toHaveCount(0);
  await noOverflow(page);
  await screenshot(page,testInfo,'source-and-notes');

  await expect(card.getByRole('link',{name:'Original source'})).toHaveAttribute('href','https://example.org/browsers');
  await page.getByRole('searchbox').fill('A layout change');
  await expect(page.locator('.entry')).toHaveCount(1);
});
