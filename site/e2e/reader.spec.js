import {test, expect, signIn, noOverflow} from './fixtures.js';

async function screenshot(page, testInfo, name) {
  const path=testInfo.outputPath(`${name}.png`);
  await page.screenshot({path,fullPage:true});
  await testInfo.attach(name,{path,contentType:'image/png'});
}

test('signed-out visitors cannot load the library or reader assets',async({page,reader},testInfo)=>{
  await page.goto(reader.origin);
  await expect(page.getByRole('link',{name:'Sign in with GitHub'})).toBeVisible();
  for(const path of ['/api/library','/api/session','/assets/private.js']) {
    const response=await page.request.get(reader.origin+path);
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toBe('no-store');
  }
  expect(reader.github.calls).toHaveLength(0);
  await noOverflow(page);
  await screenshot(page,testInfo,'sign-in');
});

test('an unapproved GitHub account receives no private content',async({page,reader})=>{
  reader.github.userID=456;
  await page.goto(reader.origin);
  await page.getByRole('link',{name:'Sign in with GitHub'}).click();
  await expect(page.getByText('Sign-in failed.',{exact:false})).toBeVisible();
  expect((await page.request.get(reader.origin+'/api/library')).status()).toBe(401);
  expect(reader.github.calls.some(path=>path.includes('/contents/'))).toBe(false);
});

test('owner can filter, search, sort, and find original-source links',async({page,reader},testInfo)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await signIn(page,reader);
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

test('appearance and sign-out share a row, with sticky desktop navigation',async({page,reader,isMobile},testInfo)=>{
  await signIn(page,reader);
  await noOverflow(page);
  const brand=await page.getByRole('link',{name:'x-read',exact:true}).boundingBox();
  const theme=await page.getByRole('button',{name:'Switch color theme'}).boundingBox();
  const logout=await page.getByRole('button',{name:'Sign out',exact:true}).boundingBox();
  expect(Math.abs((logout.y+logout.height/2)-(theme.y+theme.height/2))).toBeLessThan(2);
  expect(logout.x+logout.width <= theme.x || theme.x+theme.width <= logout.x).toBe(true);
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
  await signIn(page,reader);
  const count=reader.github.calls.length;
  await page.reload();
  await expect(page.locator('.entry')).toHaveCount(3);
  expect(reader.github.calls).toHaveLength(count);
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('x-read:library:')))).toEqual([]);
  reader.github.time+=300001;
  reader.github.limited=true;
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Showing cached readings');
  await expect(page.locator('.entry')).toHaveCount(3);
  const limitedCount=reader.github.calls.length;
  await page.getByRole('button',{name:'Try again'}).click();
  await expect(page.getByRole('status')).toContainText('Showing cached readings');
  expect(reader.github.calls).toHaveLength(limitedCount);
});

test('logout removes private content in every open tab and back navigation',async({page,context,reader})=>{
  await signIn(page,reader);
  const other=await context.newPage();
  await other.goto(reader.origin);
  await expect(other.locator('.entry')).toHaveCount(3);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  for(const tab of [page,other]) {
    await expect(tab.getByRole('link',{name:'Sign in with GitHub'})).toBeVisible();
    await expect(tab.locator('.entry')).toHaveCount(0);
    expect((await tab.request.get(reader.origin+'/api/library')).status()).toBe(401);
  }
  await page.goBack();
  await expect(page.getByRole('link',{name:'Sign in with GitHub'})).toBeVisible();
});

test('revoked upstream access invalidates a session instead of returning cached private data',async({page,reader})=>{
  await signIn(page,reader);
  reader.github.time+=300001;reader.github.revoked=true;
  await page.reload();
  await expect(page.getByRole('link',{name:'Sign in with GitHub'})).toBeVisible();
  expect((await page.request.get(reader.origin+'/api/library')).status()).toBe(401);
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
  await signIn(page, reader);
  const card = page.locator('.entry').filter({has:page.getByRole('heading',{name:'Browser rendering',exact:true})});
  const response = await page.request.get(reader.origin + '/api/library');
  await expect(page.locator('iframe')).toHaveCount(0);
  const payload = page.evaluate(() => new Promise(resolve => {
    window.addEventListener('message', event => {
      if (event.source === window && event.data?.type === 'x-read:open-with-notes') {
        window.postMessage({type:'x-read:extension-result', id:event.data.id, ok:true}, location.origin);
        resolve(event.data);
      }
    });
  }));
  await card.getByRole('button',{name:'Read with notes'}).click();
  await expect(card.getByRole('status')).toContainText('Click the x-read Notes icon');
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
