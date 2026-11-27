import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {test, expect} from './fixtures.js';

const extension = fileURLToPath(new URL('../chrome-extension/', import.meta.url));
const hostedOrigin = 'https://read.danjia.me';

test('installed extension opens the publisher from the hosted reader without a status line', async ({reader}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Chrome extension test');
  const publisher = reader.origin + '/healthz';
  reader.github.articleMarkdown = `---
format: notes-v1
title: Browser rendering
source_url: ${publisher}
---
# Reading guide

An annotation for the publisher page.
`;
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  try {
    await context.route('**/*', async route => {
      const {origin, pathname, search} = new URL(route.request().url());
      if (origin === hostedOrigin) {
        const response = await route.fetch({url: reader.origin + pathname + search});
        return route.fulfill({response});
      }
      if (route.request().url() === publisher) return route.continue();
      await route.abort();
    });

    const page = context.pages()[0];
    await page.goto(hostedOrigin);
    const entry = page.locator('.entry').filter({has: page.getByRole('heading', {name: 'Browser rendering'})});
    const button = entry.getByRole('button', {name: 'Read with notes'});
    const [article] = await Promise.all([context.waitForEvent('page'), button.click()]);
    await expect(article).toHaveURL(publisher);
    await expect(article.locator('body')).toHaveText('ok');
    await expect(button).toBeEnabled();
    await expect(entry.locator('.entry-action-status')).toBeHidden();
  } finally {
    await context.close();
  }
});
