import fs from 'node:fs';

const REDACTION_NAMES = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SESSION_SECRET',
  'NEXTAUTH_SECRET',
  'ENCRYPTION_KEY',
  'API_KEY',
  'ACCESS_TOKEN',
  'WEBHOOK_SECRET'
];

const hasSecret = (value) => {
  const serialized = JSON.stringify(value);
  return REDACTION_NAMES.some((name) => new RegExp(`${name}\\s*[:=]\\s*[^\\s,}]+`, 'i').test(serialized))
    || /(?:sk-[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,})/.test(serialized);
};

export const collectEvidence = ({ preflight, test, scope, review, changedFiles, redaction = { names: REDACTION_NAMES, hasSecret: false } }) => {
  if (!preflight || !test || !scope || !review) throw new Error('preflight, test, scope ve review kanıtları zorunludur');
  const evidence = {
    preflight: String(preflight).slice(0, 12000),
    test: String(test).slice(0, 20000),
    scope: Array.isArray(changedFiles) ? changedFiles : scope,
    redaction: { names: redaction.names || REDACTION_NAMES, hasSecret: Boolean(redaction.hasSecret) },
    review: String(review).slice(0, 12000),
    hasSecret: false
  };
  evidence.hasSecret = hasSecret(evidence) || evidence.redaction.hasSecret;
  return evidence;
};

const main = () => {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    console.error('Kullanım: node scripts/phase-evidence.mjs <evidence-input.json>');
    process.exitCode = 1;
    return;
  }
  const input = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  console.log(JSON.stringify(collectEvidence(input), null, 2));
};

if (process.argv[1]?.endsWith('phase-evidence.mjs')) main();
