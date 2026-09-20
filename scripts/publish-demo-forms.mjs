// Kanonik publish akisi: gercek POST /api/forms/[id]/publish (cookie session).
// Seed/DEMO formlarina published FormVersion uretir (public snapshot 403 -> 200).
const base = 'http://127.0.0.1:3000';

const loginRes = await fetch(base + '/api/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }),
});
if (loginRes.status !== 200) throw new Error(`login ${loginRes.status}`);
const cookie = (loginRes.headers.get('set-cookie') || '').split(',').map((c) => c.split(';')[0]).join('; ');

const ids = ['form_event_reg', 'form_survey', 'form_application', 'form_demo_general', 'form_demo_eventreg'];
for (const id of ids) {
  const r = await fetch(`${base}/api/forms/${id}/publish`, { method: 'POST', headers: { Cookie: cookie } });
  const j = await r.json().catch(() => ({}));
  console.log(`${id}: publish ${r.status}${j.versionNo ? ` v${j.versionNo}` : ''} ${j.error || ''}`);
  if (r.status !== 200 && r.status !== 201) throw new Error(`publish failed ${id}: ${r.status}`);
}
console.log('publish-demo-forms: PASS');
