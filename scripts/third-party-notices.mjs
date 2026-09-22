import fs from 'node:fs';
import path from 'node:path';

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
let notices = 'Third-party notices\n';
for (const [directory, entry] of Object.entries(lock.packages)) {
  if (!directory || entry.dev || !fs.existsSync(directory)) continue;
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  notices += `\n--- ${pkg.name} ${pkg.version} (${pkg.license || 'See package license'}) ---\n`;
  for (const file of fs.readdirSync(directory).filter(name => /^(license|licence|copying|notice)(\.|$)/i.test(name))) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isFile()) notices += fs.readFileSync(fullPath, 'utf8') + '\n';
  }
}
fs.writeFileSync('THIRD_PARTY_NOTICES.txt', notices);
