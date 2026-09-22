(() => {
  'use strict';
  const vscode = acquireVsCodeApi();
  const content = document.getElementById('content');
  let state = vscode.getState() || {};
  let currentHtml;
  let restoring = false;
  let restoreVersion = 0;
  let desiredY = Math.max(0, Number(state.scrollPosition) || 0);
  let initialized = Number.isFinite(state.scrollPosition);
  let initialTarget;
  let renderGeneration = 0;
  let copySequence = 0;
  const copyTimers = new Map();
  const copyIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M15 8V4H4v11h4"/></svg>';
  const checkIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
  const makeCopyButton = (kind, text) => {
    const button = document.createElement('button');
    button.className = `copy-button ${kind === 'table' ? 'copy-table' : 'copy-code'}`;
    button.innerHTML = copyIcon;
    button.dataset.label = kind === 'table' ? 'Copiar tabla como Markdown' : 'Copiar código';
    button.title = button.dataset.label;
    button.setAttribute('aria-label', button.title);
    button.addEventListener('click', () => {
      button.dataset.requestId = String(++copySequence);
      clearTimeout(copyTimers.get(button));
      vscode.postMessage({ type: kind === 'table' ? 'copyTable' : 'copyCode', requestId: button.dataset.requestId, text });
    });
    return button;
  };
  // Keep the visible header outside the horizontal scroller so CSS can pin it
  // natively. Only column widths and horizontal scroll need synchronization.
  let stickyFrame = 0;
  const updateStickyTables = () => {
    stickyFrame = 0;
    for (const table of content.querySelectorAll('.table-data')) {
      if (table.closest('[hidden]')) continue;
      const viewport = table.previousElementSibling;
      const headingTable = viewport.querySelector('table');
      const cells = [...table.querySelectorAll('thead th')];
      const visibleCells = [...headingTable.querySelectorAll('th')];
      cells.forEach((cell, i) => { visibleCells[i].style.width = `${cell.getBoundingClientRect().width}px`; });
      headingTable.style.width = `${cells.reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0) + 2}px`;
      const height = table.querySelector('thead').getBoundingClientRect().height + 1;
      viewport.style.height = `${height}px`;
      viewport.style.marginBottom = `${-height}px`;
      viewport.firstElementChild.scrollLeft = table.scrollLeft;
    }
  };
  const scheduleStickyTables = () => { if (!stickyFrame) stickyFrame = requestAnimationFrame(updateStickyTables); };
  window.addEventListener('resize', scheduleStickyTables, { passive: true });
  new ResizeObserver(scheduleStickyTables).observe(content);
  const tableResizeObserver = new ResizeObserver(scheduleStickyTables);
  const wideLayout = window.matchMedia('(min-width: 1380px)');
  const collapsed = new Set(Array.isArray(state.collapsedHeadings) ? state.collapsedHeadings : []);
  const navigation = document.createElement('aside');
  navigation.className = 'preview-navigation';
  const tocToggle = document.createElement('button');
  tocToggle.className = 'toc-toggle';
  tocToggle.setAttribute('aria-controls', 'preview-toc');
  const toc = document.createElement('nav');
  toc.id = 'preview-toc';
  toc.setAttribute('aria-label', 'Índice del documento');
  const tocHeader = document.createElement('div');
  tocHeader.className = 'toc-header';
  const tocTitle = document.createElement('strong');
  tocTitle.textContent = 'Índice';
  const tocHide = document.createElement('button');
  tocHide.textContent = '×';
  tocHide.title = 'Ocultar índice';
  tocHide.setAttribute('aria-label', 'Ocultar índice');
  tocHeader.append(tocTitle, tocHide);
  navigation.append(tocToggle, tocHeader, toc);
  document.body.prepend(navigation);
  const updateTocVisibility = () => {
    const docked = wideLayout.matches && !state.desktopTocHidden;
    const visible = wideLayout.matches ? docked : !!state.tocVisible;
    document.body.classList.toggle('toc-docked', docked);
    toc.hidden = !visible;
    tocHeader.hidden = !docked;
    tocToggle.hidden = docked;
    tocToggle.textContent = visible ? 'Ocultar índice' : 'Mostrar índice';
    tocToggle.setAttribute('aria-expanded', String(visible));
    scheduleStickyTables();
  };
  updateTocVisibility();
  tocToggle.addEventListener('click', () => {
    if (wideLayout.matches) state.desktopTocHidden = false; else state.tocVisible = !state.tocVisible;
    updateTocVisibility(); save();
  });
  tocHide.addEventListener('click', () => { state.desktopTocHidden = true; updateTocVisibility(); save(); });
  wideLayout.addEventListener('change', updateTocVisibility);
  const navigate = target => {
    if (!target || !content.contains(target)) return;
    userScroll();
    for (let parent = target.parentElement; parent && parent !== content; parent = parent.parentElement) {
      if (parent.classList.contains('heading-content')) {
        parent.hidden = false;
        collapsed.delete(parent.dataset.heading);
        parent.previousElementSibling?.querySelector('.heading-toggle')?.setAttribute('aria-expanded', 'true');
      }
    }
    target.scrollIntoView();
    desiredY = window.scrollY;
    save();
    void renderDiagrams();
  };
  const enhanceContent = () => {
    tableResizeObserver.disconnect();
    toc.replaceChildren();
    const headings = [...content.querySelectorAll('h1, h2, h3, h4, h5, h6')];
    for (const heading of headings) {
      const link = document.createElement('a');
      link.textContent = heading.textContent;
      link.href = `#${heading.id}`;
      link.style.paddingLeft = `${(Number(heading.tagName.slice(1)) - 1) * 12 + 10}px`;
      link.addEventListener('click', event => {
        event.preventDefault();
        if (!wideLayout.matches) { state.tocVisible = false; updateTocVisibility(); }
        navigate(heading);
      });
      toc.append(link);
    }
    if (!headings.length) toc.textContent = 'Este documento no tiene encabezados.';
    // Build from the deepest/latest heading so parent folds include child sections.
    for (const heading of headings.reverse()) {
      const section = document.createElement('div');
      section.className = 'heading-content';
      section.dataset.heading = heading.id;
      section.id = `section-${heading.id}`;
      const level = Number(heading.tagName.slice(1));
      let next = heading.nextSibling;
      while (next) {
        if (next.nodeType === 1 && /^H[1-6]$/.test(next.tagName) && Number(next.tagName.slice(1)) <= level) break;
        const following = next.nextSibling;
        section.append(next);
        next = following;
      }
      heading.after(section);
      section.hidden = collapsed.has(heading.id);
      const button = document.createElement('button');
      button.className = 'heading-toggle';
      button.setAttribute('aria-label', `Expandir o contraer: ${heading.textContent}`);
      button.setAttribute('aria-controls', section.id);
      button.setAttribute('aria-expanded', String(!section.hidden));
      button.addEventListener('click', () => {
        userScroll();
        section.hidden = !section.hidden;
        if (section.hidden) collapsed.add(heading.id); else collapsed.delete(heading.id);
        button.setAttribute('aria-expanded', String(!section.hidden));
        desiredY = window.scrollY;
        save();
        void renderDiagrams();
      });
      heading.prepend(button);
    }
    for (const table of content.querySelectorAll('table[data-markdown]')) {
      const wrapper = document.createElement('div');
      wrapper.className = 'table-container';
      table.before(wrapper);
      const button = makeCopyButton('table', table.dataset.markdown);
      wrapper.append(table);
      const headerCell = table.querySelector('thead tr')?.lastElementChild;
      if (headerCell) { headerCell.classList.add('table-copy-cell'); headerCell.append(button); }
      const header = table.querySelector('thead');
      if (header) {
        const placeholder = header.cloneNode(true);
        placeholder.className = 'table-header-placeholder';
        placeholder.setAttribute('aria-hidden', 'true');
        placeholder.querySelectorAll('button').forEach(button => button.remove());
        header.before(placeholder);
        tableResizeObserver.observe(placeholder);
        const viewport = document.createElement('div');
        viewport.className = 'table-sticky-header';
        const headingTable = document.createElement('table');
        headingTable.className = 'table-heading';
        headingTable.append(header);
        const scroller = document.createElement('div');
        scroller.className = 'table-heading-scroll';
        scroller.append(headingTable);
        viewport.append(scroller);
        table.before(viewport);
        table.classList.add('table-data');
        table.addEventListener('scroll', () => { scroller.scrollLeft = table.scrollLeft; }, { passive: true });
      }
    }
    for (const block of content.querySelectorAll('.code-block')) {
      block.querySelector('.code-header').append(makeCopyButton('code', block.dataset.code));
    }
    scheduleStickyTables();
  };
  const diagramSources = new WeakMap();
  const renderDiagrams = async () => {
    const generation = ++renderGeneration;
    for (const element of content.querySelectorAll('.mermaid-diagram')) {
      if (generation !== renderGeneration) return;
      if (element.closest('[hidden]') || element.dataset.rendered === 'true') continue;
      const source = diagramSources.get(element) ?? element.textContent;
      diagramSources.set(element, source);
      try {
        const svg = await window.renderPreviewDiagram(source);
        if (generation !== renderGeneration || !element.isConnected) return;
        restoring = true;
        element.innerHTML = svg;
        element.dataset.rendered = 'true';
      } catch {
        if (generation !== renderGeneration || !element.isConnected) return;
        restoring = true;
        const error = document.createElement('p');
        error.className = 'mermaid-error';
        error.textContent = 'No se pudo renderizar el diagrama Mermaid. Revisa su sintaxis.';
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = source;
        pre.append(code);
        element.replaceChildren(error, pre);
      }
      restore();
    }
  };
  const save = () => {
    state = { ...state, scrollPosition: desiredY, collapsedHeadings: [...collapsed] };
    vscode.setState(state);
  };
  const restore = () => {
    if (initialTarget?.isConnected) {
      desiredY = Math.max(0, initialTarget.getBoundingClientRect().top + window.scrollY - 16);
      save();
    }
    const version = ++restoreVersion;
    restoring = true;
    window.scrollTo(0, desiredY);
    requestAnimationFrame(() => {
      if (version !== restoreVersion) return;
      window.scrollTo(0, desiredY);
      requestAnimationFrame(() => { if (version === restoreVersion) restoring = false; });
    });
  };
  window.addEventListener('scroll', () => {
    if (restoring || document.hidden) return;
    initialTarget = undefined;
    desiredY = window.scrollY;
    save();
  }, { passive: true });
  // An intentional user scroll always wins over delayed image/layout restoration.
  const userScroll = () => { initialTarget = undefined; restoreVersion++; restoring = false; };
  window.addEventListener('wheel', userScroll, { passive: true });
  window.addEventListener('touchstart', userScroll, { passive: true });
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) userScroll();
  });
  window.addEventListener('message', event => {
    const message = event.data;
    if (message?.type === 'appearance') {
      restoring = true;
      const root = document.documentElement.style;
      root.setProperty('--preview-font-size', `${Math.min(48, Math.max(8, Number(message.fontSize) || 14))}px`);
      root.setProperty('--preview-font', message.textFontFamily?.trim() || 'var(--vscode-font-family, system-ui, sans-serif)');
      root.setProperty('--preview-code-font', message.codeFontFamily?.trim() || 'var(--vscode-editor-font-family, Consolas, monospace)');
      restore();
      return;
    }
    if (message?.type === 'copyResult') {
      const button = [...content.querySelectorAll('.copy-button')].find(button => button.dataset.requestId === message.requestId);
      if (button) {
        button.innerHTML = message.ok ? checkIcon : copyIcon;
        button.title = message.ok ? (button.classList.contains('copy-table') ? 'Tabla copiada' : 'Código copiado') : 'No se pudo copiar. Reintentar';
        button.setAttribute('aria-label', button.title);
        button.classList.toggle('copied', !!message.ok);
        copyTimers.set(button, setTimeout(() => {
          button.innerHTML = copyIcon; button.classList.remove('copied');
          button.title = button.dataset.label; button.setAttribute('aria-label', button.title);
          copyTimers.delete(button);
        }, 2000));
      }
      return;
    }
    if (message?.type !== 'render' || typeof message.html !== 'string') return;
    state = { ...state, ...message.state };
    save();
    if (message.html === currentHtml) return;
    currentHtml = message.html;
    restoring = true;
    initialTarget = undefined;
    for (const timer of copyTimers.values()) clearTimeout(timer);
    copyTimers.clear();
    content.innerHTML = message.html;
    enhanceContent();
    // Use the editor's cursor only on the first render of a new panel.
    // Restored panels and subsequent edits always keep their own scroll.
    if (!initialized) {
      initialized = true;
      if (Number.isInteger(message.initialLine) && message.initialLine > 0) {
        let closestLine = -1;
        for (const element of content.querySelectorAll('[data-source-line]')) {
          const line = Number(element.dataset.sourceLine);
          if (line <= message.initialLine && line >= closestLine) {
            closestLine = line;
            initialTarget = element;
          }
        }
      }
    }
    content.querySelectorAll('img').forEach(img => {
      img.addEventListener('load', restore, { once: true });
      img.addEventListener('error', restore, { once: true });
    });
    restore();
    void renderDiagrams();
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) restore(); else save(); });
  window.addEventListener('pagehide', save);
  content.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    if (!href) return;
    if (href.startsWith('#')) {
      userScroll();
      try { navigate(document.getElementById(decodeURIComponent(href.slice(1)))); } catch { /* Invalid fragment. */ }
    } else vscode.postMessage({ type: 'link', href });
  });
  vscode.postMessage({ type: 'ready' });
})();
