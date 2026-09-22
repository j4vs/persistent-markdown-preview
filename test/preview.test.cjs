const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright');
const esbuild = require('esbuild');

test('Markdown: tables, headings, images and untrusted content', async () => {
  const result = await esbuild.build({ entryPoints: ['src/markdownRenderer.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const html = mod.exports.renderMarkdown('# Hola\n\n# Hola\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n![image](./image.png)\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))', href => 'safe/' + href);
  assert.match(html, /<table/);
  assert.match(html, /id="hola-1"/);
  assert.match(html, /src="safe\/\.\/image.png"/);
  assert.doesNotMatch(html, /<script|href="javascript:/);
});

test('Real browser: independent scroll, updates, state restore and anchors', async () => {
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const executablePath = process.env.PREVIEW_TEST_BROWSER || (fs.existsSync(edge) ? edge : undefined);
  const browser = await chromium.launch({ headless: true, executablePath });
  try {
    const create = async (saved = {}) => {
      const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
      await page.setContent('<main id="content"></main>');
      await page.evaluate(saved => { window.saved = saved; window.acquireVsCodeApi = () => ({ getState: () => window.saved, setState: state => window.saved = state, postMessage: () => {} }); }, saved);
      await page.addScriptTag({ path: path.resolve('media/preview.js') });
      return page;
    };
    const render = async (page, suffix = '', initialLine) => {
      await page.evaluate(({ suffix, initialLine }) => window.dispatchEvent(new MessageEvent('message', { data: { type: 'render', initialLine, html: Array.from({ length: 200 }, (_, i) => `<h2 id="s${i}" data-source-line="${i * 4}">Section ${i}</h2><p data-source-line="${i * 4 + 2}">Content ${suffix}</p>`).join(''), state: { documentUri: 'untitled:Untitled-1', markdown: suffix } } })), { suffix, initialLine });
      await page.waitForTimeout(100);
    };
    const a = await create(); const b = await create();
    const cursorPreview = await create();
    await render(cursorPreview, '', 240);
    assert.ok(Math.abs(await cursorPreview.locator('#s60').evaluate(el => el.getBoundingClientRect().top) - 16) < 1);
    await cursorPreview.evaluate(() => window.scrollTo(0, 900));
    await cursorPreview.waitForTimeout(100);
    await render(cursorPreview, 'Updated', 400);
    assert.equal(await cursorPreview.evaluate(() => window.scrollY), 900);
    const cursorState = await cursorPreview.evaluate(() => window.saved);
    const cursorRestored = await create(cursorState);
    await render(cursorRestored, 'Updated', 240);
    assert.equal(await cursorRestored.evaluate(() => window.scrollY), 900);
    const betweenLines = await create();
    await render(betweenLines, '', 241);
    assert.ok(Math.abs(await betweenLines.locator('#s60').evaluate(el => el.getBoundingClientRect().top) - 16) < 1);
    await render(a); await render(b);
    await a.evaluate(() => window.scrollTo(0, 1850));
    await b.evaluate(() => window.scrollTo(0, 650));
    await a.waitForTimeout(100);
    await render(a, 'Edited');
    assert.equal(await a.evaluate(() => window.scrollY), 1850);
    assert.equal(await b.evaluate(() => window.scrollY), 650);
    const saved = await a.evaluate(() => window.saved);
    assert.equal(saved.scrollPosition, 1850);
    const restored = await create(saved);
    await render(restored, 'Edited');
    assert.equal(await restored.evaluate(() => window.scrollY), 1850);
    await render(a, 'Edited');
    assert.equal(await a.evaluate(() => window.scrollY), 1850);
    await a.evaluate(() => document.getElementById('content').insertAdjacentHTML('beforeend', '<a id="jump" href="#s3">Jump</a>'));
    await a.evaluate(() => document.getElementById('jump').click());
    await a.waitForTimeout(100);
    assert.ok(await a.evaluate(() => window.scrollY) < 1850);
  } finally { await browser.close(); }
});
