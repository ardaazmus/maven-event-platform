// QA-2 — Canli kullanici akislari (temiz DB, DEMO zinciri).
// Olumlu + hata/empty-state dallari; temp artefaktlar temizlenir.
import assert from 'node:assert';
import { PrismaClient } from '@prisma/client';

const base = 'http://127.0.0.1:3000';
const db = new PrismaClient();
let step = 0;
const ok = (name, cond) => { step += 1; assert(cond, `QA-2 #${step} FAIL: ${name}`); console.log(`ok ${step} - ${name}`); };

// Onceki yarim kalan kosudan temp event kalmissa temizle (yalnizca QA2 Temp basliklilar)
const stale = await db.event.findMany({ where: { title: { startsWith: 'QA2 Temp' } }, select: { id: true } });
if (stale.length) await db.event.deleteMany({ where: { id: { in: stale.map((e) => e.id) } } });

// --- auth ---
const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'demo@mavenforms.com', password: 'demo1234' }) });
ok('owner login 200', login.status === 200);
const rawCookie = login.headers.get('set-cookie') || '';
const cookie = rawCookie.split(',').map((c) => c.split(';')[0]).join('; ');
const { token } = (await login.json()).data;
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
const C = { 'Content-Type': 'application/json', Cookie: cookie };
const j = async (r) => r.json().catch(() => ({}));

// 1. Event listesi DEMO event'i icerir
let r = await fetch(base + '/api/events', { headers: { Authorization: `Bearer ${token}` } });
let events = (await j(r)).data || [];
ok('event list 200 + evt_demo_summit26', r.status === 200 && events.some((e) => e.id === 'evt_demo_summit26'));

// 2. Event olusturma -> occurrence -> readiness (pozitif); bos title 400 (negatif)
r = await fetch(base + '/api/events', { method: 'POST', headers: H, body: JSON.stringify({ title: `QA2 Temp ${Date.now()}` }) });
const tmpEvent = (await j(r)).data;
ok('temp event 201', r.status === 201 && tmpEvent?.id);
r = await fetch(base + '/api/events', { method: 'POST', headers: H, body: JSON.stringify({ title: '' }) });
ok('empty title 400', r.status === 400);
r = await fetch(base + `/api/events/${tmpEvent.id}/occurrences`, { method: 'POST', headers: C, body: JSON.stringify({ venue: 'QA2 Salon', startsAt: '2026-11-01T07:00:00Z', endsAt: '2026-11-01T09:00:00Z' }) });
ok('occurrence create 201', r.status === 201);
r = await fetch(base + `/api/events/${tmpEvent.id}/readiness`, { headers: { Authorization: `Bearer ${token}` } });
ok('readiness 200', r.status === 200);

// 3. Genel Form public erisim (event gerekmez)
r = await fetch(base + '/api/public/forms/demo-genel-iletisim');
ok('genel form public 200', r.status === 200);
// 4. Etkinlik Kayit Formu public + binding guard
r = await fetch(base + '/api/public/forms/demo-etkinlik-kaydi');
ok('event form public 200', r.status === 200);
r = await fetch(base + `/api/events/${tmpEvent.id}/bindings`, { method: 'POST', headers: H, body: JSON.stringify({ formId: 'form_demo_eventreg', purpose: 'registration' }) });
ok('cift registration binding 409', r.status === 409);

// 5. Submission -> intake (pozitif + eksik alan negatifi)
const qa2Key = `qa2-${Date.now()}`;
r = await fetch(base + '/api/public/forms/demo-etkinlik-kaydi/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': qa2Key }, body: JSON.stringify({ full_name: 'QA2 Kisi', email: 'qa2+temp@example.com', ticket_type: 'standard' }) });
const sub = (await j(r)).data;
ok('public submit 200', r.status === 200 && sub?.status === 'ok');
r = await fetch(base + '/api/public/forms/demo-etkinlik-kaydi/submissions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: '' }) });
ok('invalid submit 400', r.status === 400);

// 7. Order/payment durumu (DEMO zinciri)
r = await fetch(base + '/api/orders', { headers: { Authorization: `Bearer ${token}` } });
const orders = (await j(r)).data || [];
ok('order_demo_01 paid', r.status === 200 && orders.some((o) => o.id === 'order_demo_01' && o.status === 'paid'));

// 8. Badge (pozitif + 404 negatifi)
r = await fetch(base + '/api/tickets/ticket_demo_01/badge', { headers: { Authorization: `Bearer ${token}` } });
const badge = await j(r);
ok('badge 200 + DEMO snapshot', r.status === 200 && badge.data?.personName?.includes('[DEMO]'));
r = await fetch(base + '/api/tickets/does-not-exist/badge', { headers: { Authorization: `Bearer ${token}` } });
ok('badge 404', r.status === 404);

// 9. Check-in: valid 201 -> duplicate 409 -> invalid 404 -> empty occurrence 404
r = await fetch(base + '/api/checkin', { method: 'POST', headers: C, body: JSON.stringify({ qrCode: 'DEMO-QR-0001', direction: 'exit', gate: 'QA2' }) });
const scan = await j(r);
ok('valid scan 201', r.status === 201 && scan.data?.id);
r = await fetch(base + '/api/checkin', { method: 'POST', headers: C, body: JSON.stringify({ qrCode: 'DEMO-QR-0001', direction: 'exit', gate: 'QA2' }) });
ok('duplicate scan 409', r.status === 409);
r = await fetch(base + '/api/checkin', { method: 'POST', headers: C, body: JSON.stringify({ qrCode: 'NOPE-QR-0', direction: 'entry' }) });
ok('invalid qr 404', r.status === 404);
r = await fetch(base + '/api/checkin?occurrenceId=does-not-exist', { headers: { Cookie: cookie } });
ok('unknown occurrence 404', r.status === 404);

// 10. EFPS plan binding listesi
r = await fetch(base + `/api/events/evt_demo_summit26/plan-bindings`, { headers: { Authorization: `Bearer ${token}` } });
ok('plan-bindings 200 + DEMO-PLAN-01', r.status === 200 && JSON.stringify(await j(r)).includes('DEMO-PLAN-01'));

// 11. Draft public 403 (empty-state guard)
r = await fetch(base + '/api/public/forms/webinar-ai');
ok('draft public 403', r.status === 403);

// --- temizlik: temp event (cascade), temp submission, temp checkin ---
if (scan.data?.id) await db.checkInEvent.deleteMany({ where: { id: scan.data.id } });
const qa2Sub = await db.submission.findUnique({ where: { publicToken: qa2Key } });
if (qa2Sub) { await db.submissionValue.deleteMany({ where: { submissionId: qa2Sub.id } }); await db.submission.deleteMany({ where: { id: qa2Sub.id } }); }
await db.event.deleteMany({ where: { id: tmpEvent.id } });
await db.$disconnect();
console.log(`QA-2 live flows: PASS (${step} checks)`);
