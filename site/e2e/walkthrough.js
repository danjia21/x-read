import {fileURLToPath} from 'node:url';
import {test, expect} from './fixtures.js';

const source = 'https://example.org/browsers';
const overlay = fileURLToPath(new URL('../chrome-extension/overlay.js', import.meta.url));

test('x-read walkthrough', async ({page, reader}) => {
  reader.github.articleMarkdown = `---
format: notes-v1
title: Browser rendering
authors: [Example Author]
source_url: ${source}
read_date: '2026-11-21'
topics: [Web]
---
# Reading guide

Follow the browser from DOM and CSS to layout, paint, and compositing.

## When layout can be skipped

<!-- x-read-anchor {"heading":"Layout and paint","passage":""} -->

Moving a composited layer can avoid recalculating the positions of nearby elements.
`;

  await page.route(source, route => route.fulfill({contentType: 'text/html', body: `
    <!doctype html><html lang="en"><meta charset="utf-8"><title>Browser rendering</title>
    <style>
      article { max-width: 48rem; margin: 4rem auto; font: 20px/1.6 Georgia, serif; }
      h1, h2 { line-height: 1.2; }
    </style>
    <main><article>
      <h1>Browser rendering</h1>
      <p>The browser turns a document and its styles into pixels on the screen.</p>
      <h2>Layout and paint</h2>
      <p>Layout determines where elements go and how much space they take. Paint fills in the visual details, such as text and backgrounds.</p>
    </article></main>`}));

  // Keep each verified state on screen long enough to read in the recording.
  const hold = (ms = 950) => page.waitForTimeout(ms);
  reader.github.status = 502;
  await page.goto(reader.origin);
  await expect(page.getByRole('status')).toContainText('The library could not be loaded from GitHub.');
  await hold(1800);
  reader.github.status = 200;
  reader.github.time += 60001;
  await page.getByRole('button', {name: 'Try again'}).click();
  await expect(page.getByRole('heading', {name: 'All topics (3)'})).toBeVisible({timeout: 10000});
  await hold();

  const topic = page.getByLabel('Browse by topic');
  await topic.selectOption('Systems');
  await expect(page.getByRole('heading', {name: 'Systems (2)'})).toBeVisible();
  await hold();
  await topic.selectOption('');
  await page.getByRole('combobox', {name: 'Order'}).selectOption('title');
  await expect(page.locator('.entry h3').first()).toHaveText('Browser rendering');
  await hold();

  await page.getByRole('searchbox').pressSequentially('browser', {delay: 100});
  await expect(page.locator('.entry')).toHaveCount(1);
  await hold();
  await page.getByRole('button', {name: 'Switch color theme'}).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await hold();

  // Capture the real handoff. Navigate this fixture in the recorded tab so the
  // entire walkthrough fits in one Playwright video.
  await page.evaluate(() => {
    window.addEventListener('message', event => {
      if (event.source !== window || event.data?.type !== 'x-read:open-with-notes') return;
      window.walkthroughHandoff = event.data;
      window.postMessage({type: 'x-read:extension-result', id: event.data.id, ok: true}, location.origin);
    });
  });
  await page.getByRole('button', {name: 'Read with notes'}).click();
  await expect(page.getByRole('button', {name: 'Read with notes'})).toBeEnabled();
  await expect(page.locator('.entry-action-status')).toBeHidden();
  const handoff = await page.evaluate(() => window.walkthroughHandoff);
  expect(handoff.source).toBe(source);
  await page.goto(handoff.source);
  await expect(page.getByRole('heading', {name: 'Layout and paint'})).toBeVisible();
  await hold();
  await page.addScriptTag({path: overlay});
  await page.evaluate(({source, notes}) => globalThis.placeXReadNotes(source, notes), handoff);
  // The overlay uses closed shadow roots. Verify placement through its hosts.
  await expect(page.locator('article > h1 + div, article > h2 + div')).toHaveCount(2);
  await hold(2200);
});
