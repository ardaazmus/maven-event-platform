import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const canonicalSource = 'docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/';
const required = [
  'AGENTS.md', 'PROJECT_CONTEXT.md', 'STATUS.md', 'package.json',
  'phase-manifest.v2.json',
  canonicalSource + '00_OKU_BENI.md', canonicalSource + '11_YOL_HARITASI.md',
  canonicalSource + '12_GELISTIRME_KONTROL_SISTEMI.md',
  canonicalSource + '16_KANONIK_KAYNAK_VE_MIGRASYON_POLITIKASI_2026-09-18.md',
  'MAVENFORMS_EVENT_MANAGEMENT_UX_REDESIGN_MASTER_PLAN_2026-09-18.md',
  'scripts/workflow.mjs', 'scripts/phase-gate.mjs', 'scripts/local-ready.mjs', 'docs/workflow/README.md',
];
const maxChars = { 'AGENTS.md': 12000, 'PROJECT_CONTEXT.md': 12000, 'STATUS.md': 6000 };
const fail = message => { throw new Error(`BLOCKED: ${message}`); };
const read = name => {
  const absolute = path.join(root, name);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) fail(`missing ${name}`);
  const content = fs.readFileSync(absolute, 'utf8');
  if (maxChars[name] && content.length > maxChars[name]) fail(`${name} exceeds bootstrap cap`);
  return content;
};
for (const name of required) read(name);
const agents = read('AGENTS.md');
const context = read('PROJECT_CONTEXT.md');
const status = read('STATUS.md');
for (const marker of ['PROJECT_CONTEXT.md', 'STATUS.md', 'docs/workflow/README.md', 'scripts/workflow.mjs', canonicalSource, 'docs/legacy/root-docs/']) if (!agents.includes(marker)) fail(`AGENTS.md missing route ${marker}`);
for (const marker of [canonicalSource, '16_KANONIK_KAYNAK_VE_MIGRASYON_POLITIKASI_2026-09-18.md', 'Event', 'Registration']) if (!context.includes(marker)) fail(`PROJECT_CONTEXT.md missing canonical route ${marker}`);
for (const marker of ['R-10', 'F0', 'F9', 'release açık değil']) if (!status.includes(marker)) fail(`STATUS.md missing current marker ${marker}`);
const packageJson = JSON.parse(read('package.json'));
if (packageJson.scripts?.['context:check'] !== 'node scripts/context-check.mjs') fail('package.json context:check script missing');
if (!fs.existsSync(path.join(root, '.github/copilot-instructions.md'))) fail('Copilot adapter missing');
if (!fs.existsSync(path.join(root, '.cursor/rules/mavenforms-core.mdc'))) fail('Cursor adapter missing');
for (const name of ['CLAUDE.md', 'GEMINI.md']) {
  const content = read(name);
  if (!content.includes('AGENTS.md') || content.length > 4000) fail(`${name} adapter invalid`);
}
const packetDir = path.join(root, 'docs/workflow/packets');
for (const name of fs.readdirSync(packetDir).filter(item => item.endsWith('.json'))) {
  const packet = JSON.parse(fs.readFileSync(path.join(packetDir, name), 'utf8'));
  if (packet.status !== 'READY' || packet.timeboxMinutes !== 15 || !Array.isArray(packet.reads) || !Array.isArray(packet.allowedFiles)) fail(`invalid packet ${name}`);
  if (packet.sourceOfTruth && packet.sourceOfTruth !== canonicalSource) fail(`packet ${name} points outside canonical source`);
  for (const source of packet.reads) if (!fs.existsSync(path.join(root, source))) fail(`packet ${name} missing read ${source}`);
}
const manifest = JSON.parse(read('phase-manifest.v2.json'));
const ids = new Set(manifest.phases.map(phase => phase.id));
if (ids.size !== manifest.phases.length || manifest.phases.some(phase => phase.previous.some(previous => !ids.has(previous)))) fail('phase manifest dependency is invalid');
for (const name of ['AGENTS.md', 'PROJECT_CONTEXT.md', 'STATUS.md', 'docs/workflow/README.md']) if (/(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/.test(read(name))) fail(`secret-like value in ${name}`);
console.log(`context-check: PASS (${required.length} required files, ${fs.readdirSync(packetDir).filter(item => item.endsWith('.json')).length} READY packets)`);
