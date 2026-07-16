import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const trackedFiles = execFileSync('git', ['ls-files'], {
  cwd: root,
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);

const problems = [];
const envKeys = new Set([
  'MONGODB_URI',
  'GOOGLE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'HADITH_API_KEY',
  'AUTH_SECRET',
  'WEB_PUSH_PRIVATE_KEY',
  'CRON_SECRET',
]);
const safeMarkers = [
  'USERNAME',
  'PASSWORD',
  'your-',
  'generate-',
  'XXXXXXXX',
];

for (const relativePath of trackedFiles) {
  const basename = path.basename(relativePath);
  if (!basename.startsWith('.env')) {
    continue;
  }

  const contents = readFileSync(path.join(root, relativePath), 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    if (!line || line.startsWith('#') || !line.includes('=')) {
      continue;
    }
    const separator = line.indexOf('=');
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (!envKeys.has(key)) {
      continue;
    }
    const looksSafe = value === '' || safeMarkers.some((marker) => value.includes(marker));
    if (!looksSafe) {
      problems.push(`${relativePath}: ${key} must contain a placeholder, not a credential`);
    }
  }
}

const retiredAnalyticsId = ['G', 'HZJ0Z0MFBP'].join('-');

for (const relativePath of trackedFiles.filter((file) => /\.(?:ts|tsx|js|mjs)$/.test(file))) {
  const contents = readFileSync(path.join(root, relativePath), 'utf8');
  if (contents.includes(retiredAnalyticsId)) {
    problems.push(`${relativePath}: hard-coded Google Analytics ID found`);
  }
  if (contents.includes('-----BEGIN PRIVATE KEY-----')) {
    problems.push(`${relativePath}: private key material found`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

console.log('Tracked secret check passed.');
