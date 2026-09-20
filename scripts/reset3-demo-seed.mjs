// RESET-3 — Kanonik DEMO/TEST senaryosu (deterministic, idempotent).
// Hedef: yalnizca gelistirme DB'si (DATABASE_URL=file:../db/custom.db).
// Tum kayitlar DEMO/TEST isaretlidir; gercek e-posta/odeme/PII uretilmez.
import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const db = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const WS = 'ws_demo';
const USER = 'user_demo';
const D = (s) => new Date(s);

async function main() {
  const ws = await db.workspace.findUnique({ where: { id: WS } });
  const user = await db.user.findUnique({ where: { id: USER } });
  if (!ws || !user) throw new Error('RESET-3 fail-closed: ws_demo/user_demo yok; once kanonik seed calistir');

  // Idempotent temizlik (sabit ID'ler)
  await db.auditLog.deleteMany({ where: { resourceId: { in: ['evt_demo_summit26', 'reg_demo_01', 'pay_demo_01', 'checkin_demo_01'] } } });
  await db.checkInEvent.deleteMany({ where: { id: { in: ['checkin_demo_01'] } } });
  await db.credential.deleteMany({ where: { id: { in: ['cred_demo_01'] } } });
  await db.ticket.deleteMany({ where: { id: { in: ['ticket_demo_01'] } } });
  await db.paymentAllocation.deleteMany({ where: { id: { in: ['alloc_demo_01'] } } });
  await db.payment.deleteMany({ where: { id: { in: ['pay_demo_01'] } } });
  await db.orderItem.deleteMany({ where: { orderId: 'order_demo_01' } });
  await db.order.deleteMany({ where: { id: 'order_demo_01' } });
  await db.registrationHistory.deleteMany({ where: { registrationId: { in: ['reg_demo_01', 'reg_demo_02', 'reg_demo_03'] } } });
  await db.registration.deleteMany({ where: { id: { in: ['reg_demo_01', 'reg_demo_02', 'reg_demo_03'] } } });
  await db.person.deleteMany({ where: { id: { in: ['person_demo_01', 'person_demo_02', 'person_demo_03'] } } });
  await db.submissionValue.deleteMany({ where: { submissionId: 'sub_demo_event_01' } });
  await db.submission.deleteMany({ where: { id: 'sub_demo_event_01' } });
  await db.outboxEvent.deleteMany({ where: { id: { in: ['outbox_demo_confirm'] } } });
  await db.mediaAsset.deleteMany({ where: { id: { in: ['media_demo_tpl_pdf', 'media_demo_tpl_png', 'media_demo_tpl_jpeg'] } } });
  await db.report.deleteMany({ where: { id: 'report_demo_event' } });
  await db.floorPlanBinding.deleteMany({ where: { id: 'floorbind_demo_01' } });
  await db.externalIdMapping.deleteMany({ where: { workspaceId: WS, sourceSystem: { in: ['import', 'efps'] } } });
  await db.eventFormBinding.deleteMany({ where: { eventId: 'evt_demo_summit26' } });
  await db.eventOccurrence.deleteMany({ where: { id: 'occ_demo_day1' } });
  await db.formField.deleteMany({ where: { formId: { in: ['form_demo_general', 'form_demo_eventreg'] } } });
  await db.form.deleteMany({ where: { id: { in: ['form_demo_general', 'form_demo_eventreg'] } } });
  await db.event.deleteMany({ where: { id: 'evt_demo_summit26' } });

  // Event (DRAFT) + Occurrence + Venue/Hall
  await db.event.create({
    data: {
      id: 'evt_demo_summit26', workspaceId: WS, title: '[DEMO] Teknoloji Zirvesi 2026',
      description: 'DEMO/TEST etkinligi; gercek katilimci yok', status: 'draft', createdById: USER,
    },
  });
  await db.eventOccurrence.create({
    data: {
      id: 'occ_demo_day1', eventId: 'evt_demo_summit26', venue: '[DEMO] Kongre Merkezi',
      hall: 'Salon A', startsAt: D('2026-10-08T09:00:00+03:00'), endsAt: D('2026-10-08T18:00:00+03:00'), status: 'scheduled',
    },
  });

  // Genel Form (bagimsiz) + Etkinlik Kayit Formu (event-bound)
  await db.form.create({
    data: {
      id: 'form_demo_general', workspaceId: WS, ownerId: USER, createdById: USER,
      title: '[DEMO] Genel Iletisim Formu', slug: 'demo-genel-iletisim', status: 'published',
      description: 'DEMO/TEST: event gerektirmez',
    },
  });
  await db.formField.create({ data: { formId: 'form_demo_general', fieldKey: 'full_name', type: 'text', label: '[DEMO] Ad Soyad', required: true, sortOrder: 1 } });
  await db.formField.create({ data: { formId: 'form_demo_general', fieldKey: 'email', type: 'email', label: '[DEMO] E-posta', required: true, sortOrder: 2 } });

  await db.form.create({
    data: {
      id: 'form_demo_eventreg', workspaceId: WS, ownerId: USER, createdById: USER,
      title: '[DEMO] Etkinlik Kayit Formu', slug: 'demo-etkinlik-kaydi', status: 'published',
      description: 'DEMO/TEST: evt_demo_summit26 kayit formu',
    },
  });
  const efName = await db.formField.create({ data: { formId: 'form_demo_eventreg', fieldKey: 'full_name', type: 'text', label: '[DEMO] Ad Soyad', required: true, sortOrder: 1 } });
  const efEmail = await db.formField.create({ data: { formId: 'form_demo_eventreg', fieldKey: 'email', type: 'email', label: '[DEMO] E-posta', required: true, sortOrder: 2 } });
  await db.formField.create({ data: { formId: 'form_demo_eventreg', fieldKey: 'ticket_type', type: 'select', label: '[DEMO] Bilet Turu', required: true, sortOrder: 3, configJson: '{"options":[{"label":"Standart","value":"standard"}]}' } });
  await db.eventFormBinding.create({
    data: { workspaceId: WS, eventId: 'evt_demo_summit26', formId: 'form_demo_eventreg', purpose: 'registration' },
  });

  // Form submission -> intake (Person/Registration kaynagi)
  await db.submission.create({
    data: { id: 'sub_demo_event_01', formId: 'form_demo_eventreg', publicToken: 'demo-token-0001', status: 'approved', locale: 'tr', source: 'web', submittedAt: D('2026-09-20T10:00:00+03:00') },
  });
  await db.submissionValue.createMany({
    data: [
      { submissionId: 'sub_demo_event_01', fieldId: efName.id, valueJson: '{"value":"[DEMO] Test Kisi Bir"}', normalizedText: '[DEMO] Test Kisi Bir' },
      { submissionId: 'sub_demo_event_01', fieldId: efEmail.id, valueJson: '{"value":"test+demo1@example.com"}', normalizedText: 'test+demo1@example.com' },
    ],
  });

  // Person + Registration (form + import kaynakli)
  await db.person.create({ data: { id: 'person_demo_01', workspaceId: WS, fullName: '[DEMO] Test Kisi Bir', email: 'test+demo1@example.com' } });
  await db.person.create({ data: { id: 'person_demo_02', workspaceId: WS, fullName: '[DEMO] Test Kisi Iki', email: 'test+demo2@example.com' } });
  await db.person.create({ data: { id: 'person_demo_03', workspaceId: WS, fullName: '[DEMO] Test Kisi Uc', email: 'test+demo3@example.com' } });
  await db.registration.create({
    data: { id: 'reg_demo_01', workspaceId: WS, eventId: 'evt_demo_summit26', personId: 'person_demo_01', formId: 'form_demo_eventreg', status: 'confirmed', formSnapshot: '{"demo":true,"source":"form_demo_eventreg"}' },
  });
  await db.registration.create({
    data: { id: 'reg_demo_02', workspaceId: WS, eventId: 'evt_demo_summit26', personId: 'person_demo_02', formId: 'form_demo_eventreg', status: 'submitted', formSnapshot: '{"demo":true,"source":"form_demo_eventreg"}' },
  });
  await db.registration.create({
    data: { id: 'reg_demo_03', workspaceId: WS, eventId: 'evt_demo_summit26', status: 'submitted', formSnapshot: '{"demo":true,"source":"csv-import"}' , personId: 'person_demo_03' },
  });
  await db.registrationHistory.create({ data: { registrationId: 'reg_demo_01', fromStatus: 'submitted', toStatus: 'confirmed', actorId: USER } });
  // CSV/XLSX import karsiligi: external mapping (ham kayit korunur semantiği)
  await db.externalIdMapping.create({ data: { workspaceId: WS, sourceSystem: 'import', sourceType: 'attendee', sourceId: 'demo-csv-row-003', coreType: 'registration', coreId: 'reg_demo_03' } });
  await db.externalIdMapping.create({ data: { workspaceId: WS, sourceSystem: 'efps', sourceType: 'event', sourceId: 'DEMO-PLAN-01', coreType: 'event', coreId: 'evt_demo_summit26' } });

  // Ticket/Order + Manuel Payment + allocation
  await db.order.create({ data: { id: 'order_demo_01', workspaceId: WS, eventId: 'evt_demo_summit26', customerName: '[DEMO] Test Kisi Bir', currency: 'TRY', status: 'paid' } });
  await db.orderItem.create({ data: { orderId: 'order_demo_01', description: '[DEMO] Standart Bilet', quantity: 1, unitAmountMinor: 50000, currency: 'TRY', snapshotJson: '{"demo":true}' } });
  await db.payment.create({
    data: {
      id: 'pay_demo_01', workspaceId: WS, orderId: 'order_demo_01', payerName: '[DEMO] Test Kisi Bir',
      currency: 'TRY', amountMinor: 50000, method: 'bank_transfer', source: 'manual', status: 'confirmed',
      recorderId: USER, approverId: USER, reference: 'DEMO-DEKONT-001', idempotencyKey: 'demo-pay-0001',
    },
  });
  await db.paymentAllocation.create({ data: { id: 'alloc_demo_01', paymentId: 'pay_demo_01', orderId: 'order_demo_01', amountMinor: 50000 } });
  await db.ticket.create({ data: { id: 'ticket_demo_01', workspaceId: WS, eventId: 'evt_demo_summit26', registrationId: 'reg_demo_01', code: 'DEMO-TICKET-001', status: 'issued' } });

  // Confirmation/Outbox (gonderim yok; local kayit)
  await db.outboxEvent.create({
    data: {
      id: 'outbox_demo_confirm', workspaceId: WS, formId: 'form_demo_eventreg', type: 'email',
      queueClass: 'transactional', status: 'sent', aggregateType: 'registration', aggregateId: 'reg_demo_01',
      eventType: 'registration.confirmed', payloadJson: '{"demo":true,"to":"test+demo1@example.com"}', sentAt: D('2026-09-20T10:05:00+03:00'),
    },
  });

  // Badge subject (Credential) + sablon kayitlari (PDF/PNG/JPEG)
  await db.credential.create({ data: { id: 'cred_demo_01', workspaceId: WS, ticketId: 'ticket_demo_01', qrCode: 'DEMO-QR-0001' } });
  for (const [id, mime, name] of [['media_demo_tpl_pdf', 'application/pdf', 'demo-badge-template.pdf'], ['media_demo_tpl_png', 'image/png', 'demo-badge-template.png'], ['media_demo_tpl_jpeg', 'image/jpeg', 'demo-badge-template.jpg']]) {
    await db.mediaAsset.create({
      data: {
        id, workspaceId: WS, formId: 'form_demo_eventreg', storageKey: `demo/badge-templates/${name}`,
        originalName: `[DEMO] ${name}`, mime, size: 1024, checksum: `demo-checksum-${id}`,
        altText: '[DEMO] yaka karti sablonu', scanStatus: 'clean', visibility: 'private', createdById: USER,
      },
    });
  }

  // Check-in (valid) + EFPS baglantisi + Report
  await db.checkInEvent.create({
    data: { id: 'checkin_demo_01', workspaceId: WS, credentialId: 'cred_demo_01', occurrenceId: 'occ_demo_day1', gate: 'DEMO-A', deviceId: 'DEMO-DEVICE-01', operatorId: USER, direction: 'entry', occurredAt: D('2026-10-08T09:15:00+03:00') },
  });
  await db.floorPlanBinding.create({ data: { id: 'floorbind_demo_01', workspaceId: WS, eventId: 'evt_demo_summit26', externalPlanId: 'DEMO-PLAN-01', planVersion: 1, status: 'active' } });
  await db.report.create({
    data: { id: 'report_demo_event', workspaceId: WS, formId: 'form_demo_eventreg', name: '[DEMO] Etkinlik Kayit Ozeti', description: 'DEMO/TEST event-scope rapor', configJson: '{"demo":true,"eventId":"evt_demo_summit26"}' },
  });

  // TEST least-privilege fixturu (committed test'lerin viewer guard'lari icin)
  await db.workspaceMember.deleteMany({ where: { workspaceId: WS, userId: 'user_viewer_test' } });
  await db.user.deleteMany({ where: { id: 'user_viewer_test' } });
  await db.user.create({
    data: {
      id: 'user_viewer_test', email: 'viewer_test@mavenforms.com', name: '[TEST] Viewer',
      passwordHash: hashPassword('viewer1234'), locale: 'tr', timezone: 'Europe/Istanbul',
    },
  });
  await db.workspaceMember.create({
    data: { workspaceId: WS, userId: 'user_viewer_test', role: 'viewer', status: 'active' },
  });

  // Audit zinciri
  for (const [action, resourceType, resourceId, after] of [
    ['event.create', 'event', 'evt_demo_summit26', '{"demo":true,"status":"draft"}'],
    ['registration.confirm', 'registration', 'reg_demo_01', '{"demo":true,"to":"confirmed"}'],
    ['payment.confirm', 'payment', 'pay_demo_01', '{"demo":true,"method":"bank_transfer"}'],
    ['checkin.record', 'checkin', 'checkin_demo_01', '{"demo":true,"direction":"entry"}'],
  ]) {
    await db.auditLog.create({ data: { workspaceId: WS, actorId: USER, action, resourceType, resourceId, afterJson: after } });
  }

  console.log('RESET-3 DEMO senaryosu kuruldu: evt_demo_summit26 zinciri tamam');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
