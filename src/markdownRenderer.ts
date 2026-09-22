import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';

export function renderMarkdown(source: string, imageUri: (href: string) => string): string {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: false });
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0].toLowerCase();
    const escaped = md.utils.escapeHtml(token.content);
    let rendered = escaped;
    if (language && language !== 'mermaid' && hljs.getLanguage(language)) {
      try { rendered = hljs.highlight(token.content, { language, ignoreIllegals: true }).value; } catch { /* Keep readable source for unsupported syntax. */ }
    }
    const body = language === 'mermaid'
      ? `<div class="mermaid-diagram"><pre><code>${escaped}</code></pre></div>`
      : `<pre><code class="hljs">${rendered}</code></pre>`;
    return `<div class="code-block" data-source-line="${token.map?.[0] ?? 0}" data-code="${escaped}"><div class="code-header"><span>${md.utils.escapeHtml(language || 'Código')}</span></div>${body}</div>\n`;
  };
  const image = md.renderer.rules.image!;
  md.renderer.rules.image = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const src = token.attrGet('src');
    if (src) token.attrSet('src', imageUri(src));
    return image(tokens, index, options, env, self);
  };
  const tokens = md.parse(source, {});
  const sourceLines = source.split(/\r?\n/);
  const headings = new Map<string, number>();
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.map && token.nesting !== -1) token.attrSet('data-source-line', String(token.map[0]));
    if (token.type === 'table_open' && token.map) {
      token.attrSet('data-markdown', sourceLines.slice(token.map[0], token.map[1]).join('\n'));
    }
    if (token.type === 'heading_open') {
      const slug = (tokens[i + 1]?.content || 'section').toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
      const count = headings.get(slug) || 0;
      headings.set(slug, count + 1);
      token.attrSet('id', count ? `${slug}-${count}` : slug);
    }
  }
  return md.renderer.render(tokens, md.options, {});
}
