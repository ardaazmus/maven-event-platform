import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const artifactDir = mkdtempSync(path.join(tmpdir(), 'mavenforms-phase-gate-'));
process.env.PHASE_ARTIFACT_DIR = artifactDir;

const { createLock, startPhase, verifyLock, verifyPhase } = await import('../scripts/phase-gate.mjs');

const validEvidence = {
  preflight: 'health=200; ready=200',
  test: '2 assertions passed',
  scope: { changedFiles: ['phase-manifest.v2.json'] },
  redaction: { names: ['DATABASE_URL'], hasSecret: false },
  review: 'independent review completed',
  hasSecret: false
};

const validInput = {
  executor: 'agent-a',
  verifier: 'agent-b',
  changedFiles: ['phase-manifest.v2.json'],
  acceptanceIds: ['AC-BASELINE-01'],
  assertionCount: 2,
  commandResults: [
    { command: 'bun run lint', exitCode: 0, output: 'passed' },
    { command: 'bunx tsc --noEmit', exitCode: 0, output: 'passed' }
  ],
  evidence: validEvidence
};

assert.deepEqual(startPhase('M00.1'), { ok: true, phase: 'M00.1', previous: [] });
assert.throws(() => verifyPhase('M00.1', { ...validInput, commandResults: [validInput.commandResults[0]] }), /tüm zorunlu/);
assert.throws(() => verifyPhase('M00.1', { ...validInput, evidence: { ...validEvidence, test: 'EPERM: fake test runner' } }), /başarısız|çalışma hatası/);
assert.throws(() => verifyPhase('M00.1', { ...validInput, changedFiles: ['src/out-of-scope.ts'] }), /izin verilmeyen/);
assert.throws(() => verifyPhase('M00.1', { ...validInput, assertionCount: 0 }), /assertion/);
assert.throws(() => verifyPhase('M00.1', { ...validInput, executor: 'same', verifier: 'same' }), /aynı kişi/);
assert.throws(() => verifyPhase('M00.1', { ...validInput, isMockOnly: true }), /mock/);
assert.throws(() => verifyPhase('M00.1', { ...validInput, acceptanceIds: ['UNKNOWN-AC'] }), /acceptance ID/);

const oldController = process.env.PHASE_GATE_CONTROLLER;
delete process.env.PHASE_GATE_CONTROLLER;
assert.throws(() => createLock('M00.1', validInput), /PHASE_GATE_CONTROLLER=1/);
if (oldController === undefined) delete process.env.PHASE_GATE_CONTROLLER;
else process.env.PHASE_GATE_CONTROLLER = oldController;

process.env.PHASE_GATE_CONTROLLER = '1';
assert.deepEqual(createLock('M00.1', validInput).ok, true);
assert.deepEqual(verifyLock('M00.1').ok, true);
assert.deepEqual(startPhase('M00.2').previous, ['M00.1']);

const lock = JSON.parse(readFileSync(path.join(artifactDir, 'M00.1.json'), 'utf8'));
assert.equal(lock.status, 'PASSED');
assert.equal(lock.fileHashes['phase-manifest.v2.json'].length, 64);
console.log('phase-gate.test: PASS (7 negative gates + positive lock chain)');
