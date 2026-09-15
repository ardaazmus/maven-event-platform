import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const ignored = new Set(['.git', '.next', 'node_modules', 'artifacts', 'db', 'storage', 'upload', 'tmp', 'coverage']);
const extensions = /\.(md|mdc|json|[cm]?js|tsx?|css|sql|ya?ml|sh)$/;
const fail = message => { throw new Error(`BLOCKED: ${message}`); };
export function safePath(root, name) {
  if (typeof name !== 'string' || !name || name.includes('\\') || path.isAbsolute(name) || name.split('/').includes('..')) fail('repository-relative path required');
  const resolved = path.resolve(root, name);
  if (!resolved.startsWith(`${path.resolve(root)}${path.sep}`)) fail('outside workspace');
  let current = path.resolve(root);
  for (const part of name.split('/')) {
    current = path.join(current, part);
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) fail('symlink path rejected');
  }
  return resolved;
}
export function snapshot(root) {
  const entries = {};
  function walk(dir, prefix = '') {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignored.has(item.name) || item.name.startsWith('.env') || item.isSymbolicLink()) continue;
      const name = `${prefix}${item.name}`;
      if (item.isDirectory()) walk(path.join(dir, item.name), `${name}/`);
      else if (extensions.test(item.name) && item.name !== 'next-env.d.ts') entries[name] = hash(fs.readFileSync(path.join(dir, item.name)));
    }
  }
  walk(root);
  return entries;
}
export function changedFiles(before, after) {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(name => before[name] !== after[name]).sort();
}
export function assertScope(files, allowed) {
  for (const file of files) if (!allowed.some(rule => rule.endsWith('/**') ? file.startsWith(rule.slice(0, -2)) : file === rule)) fail(`out-of-scope change: ${file}`);
}
function json(root, name) { return JSON.parse(fs.readFileSync(safePath(root, name), 'utf8')); }
export function loadPacket(root, name) {
  const packet = json(root, name);
  if (!/^[A-Z][A-Z0-9-]+$/.test(packet.id) || packet.status !== 'READY') fail('READY packet with safe ID required');
  if (packet.lifecycle === 'SUPERSEDED') fail(`superseded packet cannot run: ${packet.id}`);
  for (const field of ['goal', 'rollback']) if (typeof packet[field] !== 'string' || !packet[field].trim()) fail(`${field} required`);
  for (const field of ['allowedFiles', 'reads', 'acceptance', 'preflight', 'checks']) if (!Array.isArray(packet[field]) || !packet[field].length) fail(`${field} required`);
  if (!Array.isArray(packet.previous) || packet.timeboxMinutes !== 15) fail('previous list and 15-minute timebox required');
  for (const file of packet.allowedFiles) safePath(root, file.endsWith('/**') ? `${file.slice(0, -3)}/placeholder` : file);
  for (const file of packet.reads) if (!fs.existsSync(safePath(root, file))) fail(`missing task source: ${file}`);
  return packet;
}
function run(root, commands) {
  return commands.map(command => {
    if (!Array.isArray(command) || !command.length || !command.every(v => typeof v === 'string') || !['node', 'bun'].includes(command[0])) fail('use node/bun argument arrays; no shell');
    const result = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8', shell: false, timeout: 300000, maxBuffer: 8 * 1024 * 1024 });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    // Preserve only a digest: provider secrets and PII must not enter evidence logs.
    console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${command.join(' ')}`);
    if (result.status !== 0 || result.error || /Ran 0 tests|unhandled rejection|TEST RUNNER: BLOCKED/.test(output)) fail(`command failed: ${command.join(' ')} (exit ${result.status})`);
    return { command, exitCode: result.status, outputSha256: hash(output) };
  });
}
function save(root, name, value) {
  const target = safePath(root, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
}
export function execute(root, action, packetPath) {
  const packet = loadPacket(root, packetPath);
  const prefix = `artifacts/workflow/${packet.id}`;
  const packetHash = hash(JSON.stringify(packet));
  if (action === 'begin') {
    for (const previous of packet.previous) {
      const receipt = json(root, `artifacts/workflow/${previous}/verified.json`);
      if (receipt.status !== 'LOCAL_PASS') fail(`previous phase not verified: ${previous}`);
      const current = snapshot(root);
      for (const file of receipt.changedFiles) if (current[file] !== receipt.files[file]) fail(`previous evidence stale: ${file}`);
    }
    const commands = run(root, packet.preflight);
    save(root, `${prefix}/baseline.json`, { packetHash, files: snapshot(root), commands, startedAt: new Date().toISOString() });
    console.log(`READY ${packet.id}; begin is a baseline, not phase completion`);
    return;
  }
  if (action !== 'verify') fail('use begin or verify');
  const baseline = json(root, `${prefix}/baseline.json`);
  if (baseline.packetHash !== packetHash) fail('packet changed after begin; prepare a new revision/ID');
  const before = snapshot(root);
  const changed = changedFiles(baseline.files, before);
  if (changed.length === 0) fail('no in-scope change since begin');
  assertScope(changed, packet.allowedFiles);
  const commands = run(root, packet.checks);
  const after = snapshot(root);
  if (changedFiles(before, after).length) fail('source changed during verification');
  const receipt = { id: packet.id, status: 'LOCAL_PASS', packetHash, changedFiles: changed, files: after, commands, verifiedAt: new Date().toISOString(), releaseVerified: false };
  save(root, `${prefix}/verified.json`, receipt);
  console.log(`LOCAL_PASS ${packet.id}; independent review / provider / release gates remain separate`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { execute(process.cwd(), process.argv[2], process.argv[3]); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
