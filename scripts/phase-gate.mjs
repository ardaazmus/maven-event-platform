import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'phase-manifest.v2.json');
const artifactDirValue = process.env.PHASE_ARTIFACT_DIR || 'artifacts/phases';
const ARTIFACT_DIR = path.isAbsolute(artifactDirValue) ? artifactDirValue : path.join(ROOT, artifactDirValue);
const FORBIDDEN_OUTPUT = /(?:EPERM|EACCES|ENOENT|Ran 0 tests|uncaught|unhandled rejection)/i;

const fail = (message) => {
  throw new Error(`BLOCKED: ${message}`);
};

const normalize = (value) => value.replaceAll('\\', '/').replace(/^\.\//, '');

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`JSON okunamadı: ${normalize(path.relative(ROOT, filePath))} (${error.message})`);
  }
};

export const loadManifest = () => {
  const manifest = readJson(MANIFEST_PATH);
  if (manifest.version !== 2 || !Array.isArray(manifest.phases) || manifest.phases.length === 0) {
    fail('manifest version 2 ve en az bir faz içermelidir');
  }
  const ids = new Set();
  for (const phase of manifest.phases) {
    if (!phase.id || ids.has(phase.id)) fail(`geçersiz veya tekrar eden faz: ${phase.id}`);
    if (!Array.isArray(phase.previous) || !Array.isArray(phase.allowedFiles) || !Array.isArray(phase.requiredCommands) || !Array.isArray(phase.requiredEvidence) || !Array.isArray(phase.acceptanceIds)) {
      fail(`${phase.id}: faz sözleşmesi eksik`);
    }
    ids.add(phase.id);
  }
  return manifest;
};

const getPhase = (id) => {
  const phase = loadManifest().phases.find((candidate) => candidate.id === id);
  if (!phase) fail(`unknown phase ${id}`);
  return phase;
};

export const manifestChecksum = () => {
  const manifest = loadManifest();
  const canonical = JSON.stringify({ ...manifest, checksum: '' });
  return crypto.createHash('sha256').update(canonical).digest('hex').slice(0, 16);
};

const artifactPath = (id) => path.join(ARTIFACT_DIR, `${id}.json`);

const readLock = (id) => {
  const filePath = artifactPath(id);
  if (!fs.existsSync(filePath)) fail(`${id}: önceki faz kilidi bulunamadı`);
  return readJson(filePath);
};

const isAllowed = (file, patterns) => {
  const normalized = normalize(file);
  return patterns.some((pattern) => {
    const normalizedPattern = normalize(pattern);
    if (normalizedPattern.endsWith('/**')) return normalized.startsWith(normalizedPattern.slice(0, -2));
    if (!normalizedPattern.includes('*')) return normalized === normalizedPattern;
    const expression = new RegExp(`^${normalizedPattern.split('*').map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);
    return expression.test(normalized);
  });
};

const fileHash = (relativePath) => {
  const absolutePath = path.resolve(ROOT, relativePath);
  if (!absolutePath.startsWith(`${ROOT}${path.sep}`) && absolutePath !== ROOT) fail(`kapsam dışı dosya: ${relativePath}`);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) fail(`dosya bulunamadı: ${relativePath}`);
  return crypto.createHash('sha256').update(fs.readFileSync(absolutePath)).digest('hex');
};

const assertEvidence = (phase, evidence) => {
  if (!evidence || typeof evidence !== 'object') fail(`${phase.id}: evidence nesnesi zorunludur`);
  for (const key of phase.requiredEvidence) {
    const value = evidence[key];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) fail(`${phase.id}: evidence.${key} eksik`);
  }
  const serialized = JSON.stringify(evidence);
  if (FORBIDDEN_OUTPUT.test(serialized)) fail(`${phase.id}: evidence başarısız/boş test çıktısı içeriyor`);
  if (evidence.hasSecret === true) fail(`${phase.id}: sır veya token tespit edildi`);
};

const assertCommands = (phase, commandResults) => {
  if (!Array.isArray(commandResults)) fail(`${phase.id}: commandResults liste olmalıdır`);
  const actual = commandResults.map((result) => result?.command);
  if (new Set(actual).size !== actual.length || actual.length !== phase.requiredCommands.length || !phase.requiredCommands.every((command) => actual.includes(command))) {
    fail(`${phase.id}: tüm zorunlu doğrulama komutları eksiksiz çalıştırılmalıdır`);
  }
  for (const result of commandResults) {
    if (!Number.isInteger(result.exitCode) || result.exitCode !== 0) fail(`${phase.id}: başarısız komut: ${result.command}`);
    if (FORBIDDEN_OUTPUT.test(`${result.output || ''}\n${result.error || ''}`)) fail(`${phase.id}: komut çıktısı çalışma hatası içeriyor: ${result.command}`);
  }
};

export const verifyPhase = (id, input = {}) => {
  const phase = getPhase(id);
  const changedFiles = Array.isArray(input.changedFiles) ? input.changedFiles.map(normalize) : [];
  if (changedFiles.length === 0) fail(`${id}: changedFiles boş bırakılamaz`);
  if (new Set(changedFiles).size !== changedFiles.length) fail(`${id}: changedFiles tekrar içeriyor`);
  const outOfScope = changedFiles.filter((file) => !isAllowed(file, phase.allowedFiles));
  if (outOfScope.length > 0) fail(`${id}: izin verilmeyen dosyalar: ${outOfScope.join(', ')}`);
  if (input.executor && input.verifier && input.executor === input.verifier) fail(`${id}: executor ve verifier aynı kişi olamaz`);
  if (!input.executor || !input.verifier) fail(`${id}: bağımsız executor ve verifier kimliği zorunludur`);
  if (!Number.isInteger(input.assertionCount) || input.assertionCount < 1) fail(`${id}: en az bir çalıştırılmış assertion zorunludur`);
  if (input.isMockOnly === true) fail(`${id}: yalnızca mock doğrulama kabul edilmez`);
  const acceptanceIds = Array.isArray(input.acceptanceIds) ? input.acceptanceIds : [];
  if (phase.acceptanceIds.some((acceptanceId) => !acceptanceIds.includes(acceptanceId)) || acceptanceIds.some((acceptanceId) => !phase.acceptanceIds.includes(acceptanceId))) {
    fail(`${id}: acceptance ID listesi faz sözleşmesiyle aynı olmalıdır`);
  }
  assertCommands(phase, input.commandResults);
  assertEvidence(phase, input.evidence);
  return { ok: true, phase: id, changedFiles };
};

export const verifyLock = (id) => {
  const phase = getPhase(id);
  const lock = readLock(id);
  if (lock.status !== 'PASSED' || lock.id !== id) fail(`${id}: kilit PASSED değil veya faz kimliği hatalı`);
  if (lock.manifestChecksum !== manifestChecksum()) fail(`${id}: manifest checksum güncel değil; faz yeniden doğrulanmalı`);
  verifyPhase(id, lock);
  if (!lock.fileHashes || typeof lock.fileHashes !== 'object') fail(`${id}: dosya hash kanıtı eksik`);
  for (const changedFile of lock.changedFiles) {
    if (lock.fileHashes[changedFile] !== fileHash(changedFile)) fail(`${id}: dosya hash değişmiş: ${changedFile}`);
  }
  if (lock.scope?.changedFiles && JSON.stringify(lock.scope.changedFiles.map(normalize)) !== JSON.stringify(lock.changedFiles.map(normalize))) fail(`${id}: scope.changedFiles kilitle eşleşmiyor`);
  return { ok: true, phase: id, lockPath: normalize(path.relative(ROOT, artifactPath(id))) };
};

export const startPhase = (id) => {
  const phase = getPhase(id);
  for (const previousId of phase.previous) verifyLock(previousId);
  return { ok: true, phase: id, previous: phase.previous };
};

export const createLock = (id, input = {}) => {
  if (!['1', 'true'].includes(String(process.env.PHASE_GATE_CONTROLLER || '').toLowerCase())) fail('lock yazımı için PHASE_GATE_CONTROLLER=1 gerekir');
  startPhase(id);
  verifyPhase(id, input);
  if (fs.existsSync(artifactPath(id))) fail(`${id}: mevcut kilit korunuyor; yeni doğrulama için ayrı artifact dizini kullanın`);
  const fileHashes = Object.fromEntries(input.changedFiles.map((file) => [normalize(file), fileHash(file)]));
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  fs.writeFileSync(artifactPath(id), `${JSON.stringify({
    ...input,
    id,
    status: 'PASSED',
    manifestChecksum: manifestChecksum(),
    changedFiles: input.changedFiles.map(normalize),
    fileHashes,
    createdAt: new Date().toISOString()
  }, null, 2)}\n`);
  return { ok: true, phase: id, lockPath: normalize(path.relative(ROOT, artifactPath(id))) };
};

const main = () => {
  const [, , action, id, payload] = process.argv;
  try {
    if (action === 'checksum') return console.log(manifestChecksum());
    if (!id || !['start', 'verify', 'lock'].includes(action)) fail('kullanım: node scripts/phase-gate.mjs <start|verify|lock|checksum> <phase> [json]');
    if (action === 'start') return console.log(`${action}:${id} OK`, startPhase(id));
    const input = payload ? JSON.parse(payload) : {};
    if (action === 'verify') return console.log(`${action}:${id} OK`, verifyPhase(id, input));
    return console.log(`${action}:${id} OK`, createLock(id, input));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
};

if (process.argv[1]?.endsWith('phase-gate.mjs')) main();
