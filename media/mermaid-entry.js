import mermaid from 'mermaid';

let queue = Promise.resolve();
let sequence = 0;
window.renderPreviewDiagram = (source) => {
  const result = queue.then(async () => {
    mermaid.initialize({
      startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true,
      theme: 'base',
      themeVariables: {
        darkMode: true, background: '#1e1e2e', primaryColor: '#302d41',
        primaryTextColor: '#d9e0ee', primaryBorderColor: '#cba6f7',
        lineColor: '#89dceb', secondaryColor: '#2d2848', tertiaryColor: '#161320',
        textColor: '#d9e0ee', edgeLabelBackground: '#1e1e2e',
        fontFamily: 'Cascadia Code, Inter, Consolas, monospace',
      },
      secure: ['secure', 'securityLevel', 'startOnLoad', 'maxTextSize', 'maxEdges', 'suppressErrorRendering', 'dompurifyConfig'],
    });
    const { svg } = await mermaid.render(`preview-diagram-${++sequence}`, source);
    return svg;
  });
  queue = result.catch(() => {});
  return result;
};
