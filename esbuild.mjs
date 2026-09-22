import * as esbuild from 'esbuild';
import './scripts/third-party-notices.mjs';
const options = { entryPoints: ['src/extension.ts'], bundle: true, platform: 'node', format: 'cjs', external: ['vscode'], outfile: 'dist/extension.js', sourcemap: true, target: 'node20' };
const mermaidOptions = { entryPoints: ['media/mermaid-entry.js'], bundle: true, platform: 'browser', format: 'iife', outfile: 'media/mermaid.js', minify: true, target: 'es2022', legalComments: 'eof' };
if (process.argv.includes('--watch')) {
  for (const config of [options, mermaidOptions]) {
    const context = await esbuild.context(config);
    await context.watch();
  }
} else await Promise.all([esbuild.build(options), esbuild.build(mermaidOptions)]);
