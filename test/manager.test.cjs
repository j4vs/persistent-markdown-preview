const { test } = require('node:test');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');

test('Manager: independent instances, targeted debounce, reveal, restore and cleanup', async () => {
  const result = await esbuild.build({ entryPoints: ['src/extension.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], write: false });
  const commands = new Map(); const panels = []; const listeners = new Set();
  let serializer;
  let clipboardText;
  const disposable = () => ({ dispose() {} });
  const uri = value => ({ scheme: value.split(':')[0], path: value.split(':').slice(1).join(':'), authority: '', toString: () => value });
  const api = {
    env: { clipboard: { writeText: async text => { clipboardText = text; } } },
    Uri: { parse: uri, joinPath: (base, ...parts) => uri(base.toString() + '/' + parts.join('/')) },
    ViewColumn: { Active: -1 },
    workspace: {
      getConfiguration: () => ({ get: (_, fallback) => fallback }),
      onDidChangeConfiguration: () => disposable(),
      textDocuments: [], getWorkspaceFolder: () => undefined,
      onDidChangeTextDocument: callback => { listeners.add(callback); return { dispose: () => listeners.delete(callback) }; }
    },
    commands: { registerCommand: (name, callback) => { commands.set(name, callback); return disposable(); } },
    window: {
      showInformationMessage: () => {},
      registerWebviewPanelSerializer: (_, value) => { serializer = value; return disposable(); },
      createWebviewPanel: (_, title, column, options) => {
        const disposed = new Set(); const received = new Set(); const visibility = new Set();
        const panel = {
          title, visible: true, options, messages: [], revealCount: 0,
          reveal() { this.revealCount++; },
          onDidDispose: callback => { disposed.add(callback); return { dispose: () => disposed.delete(callback) }; },
          onDidChangeViewState: callback => { visibility.add(callback); return { dispose: () => visibility.delete(callback) }; },
          dispose() { for (const callback of [...disposed]) callback(); },
          ready() { for (const callback of received) callback({ type: 'ready' }); },
          receive(message) { for (const callback of received) callback(message); },
          webview: {
            cspSource: 'https://test.invalid', asWebviewUri: x => x,
            onDidReceiveMessage: callback => { received.add(callback); return { dispose: () => received.delete(callback) }; },
            postMessage: message => { if (message.type !== 'appearance') panel.messages.push(message); return Promise.resolve(true); }
          }
        };
        panels.push(panel); return panel;
      }
    }
  };
  const mod = { exports: {} };
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(mod, mod.exports, name => name === 'vscode' ? api : require(name));
  const context = { extensionUri: uri('file:/extension'), subscriptions: [] };
  mod.exports.activate(context);
  const a = { uri: uri('untitled:Untitled-1'), languageId: 'markdown', getText: () => '# A' };
  const b = { uri: uri('untitled:Untitled-2'), languageId: 'markdown', getText: () => '# B' };
  api.window.activeTextEditor = { document: a, selection: { active: { line: 60 } } };
  await commands.get('persistentMarkdownPreview.open')();
  await commands.get('persistentMarkdownPreview.open')();
  api.window.activeTextEditor = { document: b, selection: { active: { line: 0 } } };
  await commands.get('persistentMarkdownPreview.open')();
  panels.forEach(panel => panel.ready());
  assert.equal(panels[0].messages[0].initialLine, 60);
  assert.equal(panels[2].messages[0].initialLine, 0);
  assert.equal(listeners.size, 1);
  assert.equal(panels.length, 3);
  assert.match(panels[1].title, /\(2\)/);
  assert.ok(panels.every(panel => panel.options.retainContextWhenHidden));
  assert.notEqual(panels[0].messages[0].state.instanceId, panels[1].messages[0].state.instanceId);
  a.getText = () => '# Changed';
  for (let i = 0; i < 3; i++) for (const callback of listeners) callback({ document: a, contentChanges: [{}] });
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(panels[0].messages.length, 2);
  assert.equal(panels[1].messages.length, 2);
  assert.equal(panels[2].messages.length, 1);
  assert.match(panels[0].messages[1].html, /Changed/);
  await commands.get('persistentMarkdownPreview.reveal')();
  assert.equal(panels.length, 3);
  assert.equal(panels[2].revealCount, 1);
  panels[0].dispose();
  for (const callback of listeners) callback({ document: a, contentChanges: [{}] });
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.equal(panels[0].messages.length, 2);
  assert.equal(panels[1].messages.length, 3);
  const restored = api.window.createWebviewPanel('', '', 2, {});
  await serializer.deserializeWebviewPanel(restored, panels[1].messages[2].state);
  restored.ready();
  assert.match(restored.messages[0].html, /Changed/);
  restored.receive({ type: 'copyTable', text: '| A |\n| --- |\n| **B** |', requestId: 'copy-1' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(clipboardText, '| A |\n| --- |\n| **B** |');
  assert.deepEqual(restored.messages.at(-1), { type: 'copyResult', requestId: 'copy-1', ok: true });
  for (const subscription of context.subscriptions) subscription.dispose();
  assert.equal(listeners.size, 0);
});
