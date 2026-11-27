import {fileURLToPath} from 'node:url';
import {test, expect} from '@playwright/test';

const overlay = fileURLToPath(new URL('../chrome-extension/overlay.js', import.meta.url));

test('inline notes wrap and stay readable on a publisher page', async ({page}, testInfo) => {
  await page.setContent(`<!doctype html>
    <html lang="en">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      body { margin: 0; padding: clamp(20px, 5vw, 60px); color-scheme: light dark; }
      article { max-width: 65rem; margin: auto; }
      article p { margin: 0; font: 18px Georgia, serif; }
      article p[lang="zh"] { font: 21px sans-serif; }
      article > div { margin-block: 0; padding-block: 0; }
    </style>
    <main><article>
      <h1>Understanding GRPO</h1>
      <p>The article explains how group sampling provides a baseline for policy updates.</p>
      <h2 lang="zh">仿真基准结果</h2>
      <p lang="zh">本节比较不同条件下的任务完成率。</p>
    </article></main>
    </html>`);
  await page.addScriptTag({path: overlay});
  await page.evaluate(() => {
    // Keep references for assertions without changing the production shadow mode.
    const roots = [];
    const attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const root = attachShadow.call(this, options);
      roots.push(root);
      return root;
    };
    try {
      globalThis.placeXReadNotes(location.href, [
        {
          heading: '',
          passage: '',
          title: 'Reading guide | From learned baselines to group-relative advantages',
          text: 'GRPO removes PPO’s learned critic and estimates a prompt-local baseline from a group of completions. Follow the derivation to see how sampling affects the policy update and why the result depends on group size and reward noise.\n\nLook for the trade-off between bias, variance, and compute.',
        },
        {
          heading: '仿真基准结果',
          passage: '',
          title: '注解 | 高成功率提示 benchmark 饱和',
          text: '成功率超过 95% 时，平均分提供的区分度有限。可以进一步比较失败类型、长程任务、分布外扰动和不同 seed 的方差。',
        },
      ]);
    } finally {
      Element.prototype.attachShadow = attachShadow;
    }
    globalThis.noteRoots = roots;
  });

  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({colorScheme});
    const layout = await page.evaluate(() => ({
      pageFits: document.documentElement.scrollWidth <= innerWidth,
      notes: globalThis.noteRoots.map(root => {
        const box = root.querySelector('details');
        const text = root.querySelector('.note');
        const {paddingInlineStart, paddingInlineEnd} = getComputedStyle(box);
        const innerWidth = box.clientWidth - parseFloat(paddingInlineStart) - parseFloat(paddingInlineEnd);
        const {top, bottom} = box.getBoundingClientRect();
        const spaceAbove = top - root.host.getBoundingClientRect().top;
        const spaceBelow = root.host.nextElementSibling.getBoundingClientRect().top - bottom;
        return {
          title: text.querySelector('.title').textContent,
          fontSize: getComputedStyle(text.querySelector('p')).fontSize,
          fontFamily: getComputedStyle(text.querySelector('p')).fontFamily,
          paragraphs: text.querySelectorAll('p').length,
          fullWidth: Math.abs(text.getBoundingClientRect().width - innerWidth) < 1.5,
          spaced: spaceAbove >= 12 && spaceBelow >= 18,
          fits: box.scrollWidth <= box.clientWidth,
        };
      }),
    }));
    expect(layout.pageFits).toBe(true);
    expect(layout.notes).toEqual([
      {title: expect.stringMatching(/^Reading guide/), fontSize: '18px', fontFamily: 'Georgia, serif', paragraphs: 2, fullWidth: true, spaced: true, fits: true},
      {title: expect.stringMatching(/^注解/), fontSize: '21px', fontFamily: 'sans-serif', paragraphs: 1, fullWidth: true, spaced: true, fits: true},
    ]);
    const path = testInfo.outputPath(`inline-notes-${colorScheme}.png`);
    await page.screenshot({path, fullPage: true});
    await testInfo.attach(`Inline notes · ${colorScheme}`, {path, contentType: 'image/png'});
  }
});

test('notes use article prose typography and stay out of adjacent grid tracks', async ({page}) => {
  await page.setContent(`
    <style>
      .layout { display: grid; grid-template-columns: minmax(0, 1fr) 80px; }
      .section-title, .prose { grid-column: 1; }
      aside { grid-column: 2; grid-row: 1 / 3; font-size: 11px; }
      .prose { font: 20px Georgia, serif; margin: 0; }
    </style>
    <main>
      <header><h1>Article title</h1><p>Published today</p></header>
      <div class="layout">
        <aside><p>Related articles</p></aside>
        <h2 class="section-title">Section title</h2>
        <p class="prose">The publisher’s article starts here.</p>
      </div>
    </main>
  `);
  await page.addScriptTag({path: overlay});
  const result = await page.evaluate(() => {
    const roots = [];
    const attachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (options) {
      const root = attachShadow.call(this, options);
      roots.push(root);
      return root;
    };
    try {
      globalThis.placeXReadNotes(location.href, [
        {heading: '', passage: '', title: 'Guide', text: 'The reading guide.'},
        {heading: 'Section title', passage: '', title: 'Annotation', text: 'The section note.'},
      ]);
    } finally {
      Element.prototype.attachShadow = attachShadow;
    }
    return roots.map(({host, firstElementChild}) => ({
      afterSectionTitle: host.previousElementSibling?.tagName === 'H2',
      matchesProseWidth: host.offsetWidth === document.querySelector('.prose').offsetWidth,
      fontSize: getComputedStyle(firstElementChild.querySelector('p')).fontSize,
    }));
  });
  expect(result).toEqual([
    {afterSectionTitle: false, matchesProseWidth: true, fontSize: '20px'},
    {afterSectionTitle: true, matchesProseWidth: true, fontSize: '20px'},
  ]);
});
