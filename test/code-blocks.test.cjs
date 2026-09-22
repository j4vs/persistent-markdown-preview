const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');
const esbuild = require('esbuild');

test('Code blocks: highlighted languages, exact copy, rounded and sticky code/table headers', async () => {
  const result = await esbuild.build({ entryPoints: ['src/markdownRenderer.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, require);
  const render = text => mod.exports.renderMarkdown(text, href => href);
  const code = '<?php\n// Configuración de ejemplo\n$nombre = "Cliente";\necho $nombre;\n' + Array.from({ length: 90 }, (_, i) => `$valor${i} = ${i};`).join('\n') + '\n';
  const table = '| Clave | Valor |\n| --- | --- |\n' + Array.from({ length: 70 }, (_, i) => `| Campo ${i} | Dato ${i} |`).join('\n');
  const text = '# Código\n\n```php\n' + code + '```\n\n## Tabla\n\n' + table + '\n\n' + 'Fin\n\n'.repeat(50);
  for (const [language, snippet] of [['php', '<?php echo "Hola";'], ['md', '# Título\n**Negrita**'], ['bash', 'echo "$HOME"'], ['json', '{"valor": 123}']]) {
    assert.match(render('```' + language + '\n' + snippet + '\n```'), /class="hljs-/);
  }
  const plain = render('```desconocido\n<script>alert(1)</script>\n```\n\n```txt\nTexto\n```\n\n```\nSin lenguaje\n```');
  assert.doesNotMatch(plain, /<script>|class="hljs-/);
  assert.match(plain, /<span>Código<\/span>/);
  const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
  const browser = await chromium.launch({ executablePath: process.env.PREVIEW_TEST_BROWSER || (fs.existsSync(edge) ? edge : undefined), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
    await page.setContent('<main id="content"></main>');
    await page.addStyleTag({ path: 'media/preview.css' });
    await page.evaluate(() => { window.messages = []; window.acquireVsCodeApi = () => ({ getState: () => ({}), setState: () => {}, postMessage: m => window.messages.push(m) }); });
    await page.addScriptTag({ path: 'media/preview.js' });
    await page.evaluate(html => window.dispatchEvent(new MessageEvent('message', { data: { type: 'render', html, state: {} } })), render(text));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.code-header > span').textContent(), 'php');
    assert.equal(await page.locator('.code-block code').textContent(), code);
    assert.equal(await page.locator('.copy-code').evaluate(el => getComputedStyle(el).opacity), '1');
    await page.locator('.copy-code').click();
    const message = await page.evaluate(() => window.messages.find(m => m.type === 'copyCode'));
    assert.equal(message.text, code);
    await page.evaluate(requestId => window.dispatchEvent(new MessageEvent('message', { data: { type: 'copyResult', requestId, ok: true } })), message.requestId);
    assert.equal(await page.locator('.copy-code').getAttribute('title'), 'Código copiado');
    await page.waitForTimeout(2100);
    assert.equal(await page.locator('.copy-code').getAttribute('title'), 'Copiar código');
    assert.equal(await page.locator('.code-block').evaluate(el => getComputedStyle(el).borderRadius), '8px');
    assert.equal(await page.locator('.table-data').evaluate(el => getComputedStyle(el).borderRadius), '8px');
    fs.mkdirSync('test-results', { recursive: true });
    await page.screenshot({ path: 'test-results/code-highlight.png' });
    await page.locator('.code-block').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY + 300));
    await page.waitForTimeout(100);
    assert.ok(Math.abs((await page.locator('.code-header').boundingBox()).y - 8) < 1, 'Code header stays at viewport top');
    assert.ok(await page.locator('.code-header').evaluate(el => getComputedStyle(el, '::before').backgroundColor === 'rgb(30, 30, 46)' && parseFloat(getComputedStyle(el, '::before').height) >= 48), 'Code above the sticky header is masked');
    await page.screenshot({ path: 'test-results/code-sticky.png' });
    await page.locator('.table-data').evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY + 300));
    await page.waitForTimeout(100);
    assert.ok(Math.abs((await page.locator('.table-heading thead').boundingBox()).y - 8) < 3, 'Table header stays at viewport top');
    assert.ok(await page.locator('.table-sticky-header').evaluate(el => getComputedStyle(el, '::before').backgroundColor === 'rgb(30, 30, 46)' && parseFloat(getComputedStyle(el, '::before').height) >= 48), 'Rows above the sticky header are masked');
    assert.equal(await page.locator('.table-heading thead').evaluate(el => getComputedStyle(el).transform), 'none', 'Vertical position does not rely on JavaScript transforms');
    await page.locator('.table-heading thead').hover();
    await page.screenshot({ path: 'test-results/table-sticky.png' });
    await page.setViewportSize({ width: 700, height: 900 });
    await page.waitForTimeout(100);
    assert.ok(Math.abs((await page.locator('.table-heading thead').boundingBox()).y - 48) < 3, 'Table header avoids the compact TOC control');
    // A horizontally scrolled table must keep its header aligned with its body.
    await page.locator('.table-data th:first-child').evaluate(el => el.style.minWidth = '1200px');
    await page.locator('.table-data').evaluate(el => el.scrollLeft = 500);
    await page.waitForTimeout(100);
    const leftHeader = (await page.locator('.table-heading th').first().boundingBox()).x;
    const leftCell = (await page.locator('td').first().boundingBox()).x;
    assert.ok(Math.abs(leftHeader - leftCell) < 1);
    await page.locator('.table-data').evaluate(el => scrollTo(0, el.getBoundingClientRect().bottom + scrollY + 20));
    await page.waitForTimeout(100);
    assert.ok((await page.locator('.table-heading thead').boundingBox()).y < 0, 'Header leaves the viewport with its table');
  } finally { await browser.close(); }
});
