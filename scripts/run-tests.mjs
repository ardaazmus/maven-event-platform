import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const testDir = path.join(root, 'tests');
const tests = fs.readdirSync(testDir).filter((name) => name.endsWith('.test.mjs')).sort();
const benignBunNoise = /^error: Cannot read file "D:\\project\\": EPERM\s*$/;
let failed = false;

for (const name of tests) {
  const file = path.join(testDir, name);
  const source = fs.readFileSync(file, 'utf8');
  const needsBun = /from ['"]\.\.\/src\/.*\.(?:ts|tsx)['"]/.test(source);
  const command = needsBun ? 'bun' : process.execPath;
  const result = spawnSync(command, [file], { cwd: root, encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`
    .split(/\r?\n/)
    .filter((line) => !benignBunNoise.test(line))
    .join('\n')
    .trim();
  const passed = result.status === 0;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
  if (!passed) {
    console.error(output || `exit=${result.status}`);
    failed = true;
  }
}

if (failed) process.exitCode = 1;
else console.log(`test-runner: PASS (${tests.length} files)`);
