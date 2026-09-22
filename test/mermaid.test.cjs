const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const esbuild = require('esbuild');

test('Mermaid: user flowchart, offline CSP, theme, live updates, scroll and syntax errors', async () => {
  const result = await esbuild.build({ entryPoints: ['src/markdownRenderer.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const render = text => mod.exports.renderMarkdown(text, href => href);
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const browser = await chromium.launch({ executablePath: process.env.PREVIEW_TEST_BROWSER || (fs.existsSync(edge) ? edge : undefined), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const violations = [];
    await page.exposeFunction('recordViolation', value => violations.push(value));
    await page.route('https://preview.test/**', route => {
      const file = new URL(route.request().url()).pathname.slice(1);
      if (['mermaid.js', 'preview.js', 'preview.css'].includes(file)) return route.fulfill({ path: path.resolve('media', file), contentType: file.endsWith('.css') ? 'text/css' : 'application/javascript' });
      return route.fulfill({ contentType: 'text/html', body: `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'self' 'unsafe-inline'; script-src 'nonce-test';"><link rel="stylesheet" href="/preview.css"><body><main id="content"></main><script nonce="test">window.acquireVsCodeApi=()=>({getState:()=>({}),setState:s=>window.saved=s,postMessage:()=>{}});document.addEventListener('securitypolicyviolation',e=>window.recordViolation(e.violatedDirective));</script><script nonce="test" src="/mermaid.js"></script><script nonce="test" src="/preview.js"></script>` });
    });
    await page.goto('https://preview.test/');
    const markdown = fs.readFileSync('test/fixtures/entrega.md', 'utf8');
    const send = async (text, initialLine) => page.evaluate(({ html, initialLine }) => window.dispatchEvent(new MessageEvent('message', { data: { type: 'render', html, initialLine, state: {} } })), { html: render(text), initialLine });
    await send(markdown);
    await page.locator('.mermaid-diagram svg').waitFor();
    assert.match(await page.locator('.mermaid-diagram svg').textContent(), /Chofer abre entrega/);
    assert.equal(await page.locator('svg .node').count(), 20);
    await page.waitForTimeout(100);
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(100);
    await send(markdown.replace('Chofer abre entrega', 'Chofer inicia entrega'));
    await page.waitForFunction(() => document.querySelector('.mermaid-diagram svg')?.textContent.includes('Chofer inicia entrega'));
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => scrollY), 500);
    const oldId = await page.locator('.mermaid-diagram svg').getAttribute('id');
    await page.evaluate(() => document.body.classList.add('vscode-dark'));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.mermaid-diagram svg').getAttribute('id'), oldId, 'Fixed theme does not redraw on editor theme changes');
    assert.equal(await page.evaluate(() => scrollY), 500);
    await send('```mermaid\nflowchart TD\nA[broken\n```\n\n```mermaid\nsequenceDiagram\nAlice->>Bob: Hola\n```');
    await page.locator('.mermaid-error').waitFor();
    await page.locator('.mermaid-diagram svg').waitFor();
    assert.match(await page.locator('.mermaid-error + pre').textContent(), /A\[broken/);
    await send('```mermaid\nflowchart LR\nA --> B\n```');
    await page.locator('.mermaid-diagram svg').waitFor();
    assert.equal(await page.locator('.mermaid-error').count(), 0);
    assert.deepEqual(violations, []);
  } finally { await browser.close(); }
});
