const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const root = path.resolve(__dirname, '..');
const executable = process.env.VS_CODE_EXECUTABLE || path.join(process.env.LOCALAPPDATA || '', 'Programs/Microsoft VS Code/Code.exe');
if (!fs.existsSync(executable)) throw new Error('Define VS_CODE_EXECUTABLE con la ruta al ejecutable de VS Code.');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, [
  `--extensionDevelopmentPath=${root}`, `--extensionTestsPath=${path.join(__dirname, 'host/index.cjs')}`,
  `--user-data-dir=${path.join(root, '.test-host/profile')}`, `--extensions-dir=${path.join(root, '.test-host/extensions')}`,
  '--disable-extensions', '--disable-workspace-trust', '--skip-welcome', '--skip-release-notes'
], { env, stdio: 'inherit', windowsHide: true });
const timeout = setTimeout(() => { child.kill(); process.exitCode = 1; }, 90000);
child.on('error', error => { clearTimeout(timeout); console.error(error); process.exitCode = 1; });
child.on('exit', code => { clearTimeout(timeout); process.exitCode = code ?? 1; });
