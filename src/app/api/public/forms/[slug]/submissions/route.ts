import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomBytes, createHmac } from 'crypto'
import { enqueueSubmissionOutbox } from '@/lib/outbox-worker'
import { buildSubmissionEmailIntents } from '@/lib/submission-email-intents'

interface RouteParams { params: Promise<{ slug: string }> }

// Public write-only submission — opaque slug, no internal id leaked (AC-PUBLIC-05)
export async function POST(req: NextRequest, { params }: RouteParams) {
  const { slug } = await params
  const formMeta = await db.form.findFirst({ where: { slug, deletedAt: null }, select: { id: true, title: true, workspaceId: true, status: true, publishedVersionId: true, settingsJson: true, submissionCount: true, startDate: true, endDate: true } })
  if (!formMeta || formMeta.status !== 'published' || !formMeta.publishedVersionId) {
    return NextResponse.json({ error: 'Form bulunamadı veya yayında değil' }, { status: 404 })
  }
  const version = await db.formVersion.findUnique({ where: { id: formMeta.publishedVersionId } })
  if (!version) return NextResponse.json({ error: 'Form bulunamadı' }, { status: 404 })
  let snapshot: any
  try { snapshot = JSON.parse(version.schemaJson) } catch { return NextResponse.json({ error: 'Form hatası' }, { status: 500 }) }
  // Use snapshot fields allowlist for validation
  const snapshotFields: any[] = Array.isArray(snapshot.fields) ? snapshot.fields : []
  // Need live fields for fieldId mapping (fieldId is internal, but public uses fieldKey)
  const liveFields = await db.formField.findMany({ where: { formId: formMeta.id, adminOnly: false } })
  const fieldByKey = new Map(liveFields.map(f => [f.fieldKey, f]))
  const missingSnapshotFields = snapshotFields.filter(sf => !fieldByKey.has(sf.fieldKey))
  if (missingSnapshotFields.length > 0) {
    return NextResponse.json({ error: 'Yayınlanan form sürümü kullanılamıyor' }, { status: 503 })
  }

  try {
    const body = await req.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: 'Geçersiz form verisi' }, { status: 400 })
    const rawBody = JSON.stringify(body)
    if (rawBody.length > 100 * 1024) return NextResponse.json({ error: 'Payload çok büyük' }, { status: 413 })
    if (Object.keys(body).length > 100) return NextResponse.json({ error: 'Çok fazla alan' }, { status: 400 })

    const idempotencyKey = req.headers.get('Idempotency-Key')
    if (idempotencyKey) {
      const existing = await db.submission.findUnique({ where: { publicToken: idempotencyKey } })
      if (existing) return NextResponse.json({ data: { status: 'duplicate' } })
    }
    const publicToken = idempotencyKey || `sub_${randomBytes(16).toString('hex')}`
    const hmacSecret = process.env.SESSION_SECRET
    if (!hmacSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Form güvenliği yapılandırılmamış' }, { status: 503 })
    }
    const hashSecret = hmacSecret || 'mavenforms-local-development-only'
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const rawUa = req.headers.get('user-agent') || null
    const ipHash = rawIp ? createHmac('sha256', hashSecret).update(rawIp).digest('hex').slice(0, 32) : null
    const userAgentHash = rawUa ? createHmac('sha256', hashSecret).update(rawUa).digest('hex').slice(0, 32) : null

    const values: any[] = []
    for (const sf of snapshotFields) {
      const v = body[sf.fieldKey]
      const live = fieldByKey.get(sf.fieldKey)!
      if (v !== undefined && v !== null && v !== '') {
        if (sf.required && (v === '' || v === null)) return NextResponse.json({ error: `${sf.label} zorunlu` }, { status: 400 })
        if (sf.type === 'email' && v) {
          const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!re.test(String(v))) return NextResponse.json({ error: `${sf.label} geçersiz e-posta` }, { status: 400 })
        }
        if (typeof v === 'string' && v.length > 5000) return NextResponse.json({ error: `${sf.label} çok uzun` }, { status: 400 })
        values.push({ fieldId: live.id, valueJson: JSON.stringify({ value: v }), normalizedText: typeof v === 'string' ? v : JSON.stringify(v) })
      } else if (sf.required) {
        return NextResponse.json({ error: `${sf.label} zorunlu` }, { status: 400 })
      }
    }
    // Unknown keys are ignored (allowlist), but if body contains keys not in snapshot, they are silently dropped (AC-PUBLIC-02)
    const recipientEmail = snapshotFields
      .filter(sf => sf.type === 'email')
      .map(sf => body[sf.fieldKey])
      .find(value => typeof value === 'string' && value.trim())?.trim().toLowerCase() || null
    const entryData = snapshotFields
      .filter(sf => fieldByKey.has(sf.fieldKey) && body[sf.fieldKey] !== undefined && body[sf.fieldKey] !== null && body[sf.fieldKey] !== '')
      .map(sf => `${sf.label}: ${typeof body[sf.fieldKey] === 'string' ? body[sf.fieldKey] : JSON.stringify(body[sf.fieldKey])}`)
      .join('\n')
      .slice(0, 20_000)

    const notificationRows = await db.notification.findMany({
      where: { formId: formMeta.id },
      select: { id: true, type: true, enabled: true, configJson: true },
    })
    const emailIntents = buildSubmissionEmailIntents({
      formTitle: formMeta.title,
      submissionId: publicToken,
      submitterEmail: recipientEmail,
      submittedAt: new Date().toISOString(),
      entryData,
      notifications: notificationRows.map(notification => {
        let config: { to?: string; subject?: string; body?: string } = {}
        try {
          const parsed = JSON.parse(notification.configJson || '{}')
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) config = parsed
        } catch {
          config = {}
        }
        return { id: notification.id, type: notification.type as 'admin' | 'user_confirmation' | 'webhook', enabled: notification.enabled, config }
      }),
    })

    const settings = snapshot.settings || {}
    if (settings.responseLimit && formMeta.submissionCount >= settings.responseLimit) return NextResponse.json({ error: settings.closedMessage || 'Form yanıt limitine ulaştı' }, { status: 403 })
    if (formMeta.startDate && new Date() < new Date(formMeta.startDate)) return NextResponse.json({ error: 'Form henüz açılmadı' }, { status: 403 })
    if (formMeta.endDate && new Date() > new Date(formMeta.endDate)) return NextResponse.json({ error: settings.closedMessage || 'Form kapandı' }, { status: 403 })

    const submission = await db.$transaction(async (tx) => {
      const sub = await tx.submission.create({ data: { formId: formMeta.id, publicToken, status: 'new', locale: settings.locale || 'tr', source: 'web', ipHash, userAgentHash } })
      if (values.length > 0) await tx.submissionValue.createMany({ data: values.map(v => ({ ...v, submissionId: sub.id })) })
      await tx.form.update({ where: { id: formMeta.id }, data: { submissionCount: { increment: 1 }, todaySubmissionCount: { increment: 1 } } })
      await enqueueSubmissionOutbox(tx, {
        workspaceId: formMeta.workspaceId,
        formId: formMeta.id,
        submissionId: sub.id,
        payload: { formId: formMeta.id, submissionId: sub.id },
        emailIntents: emailIntents.intents,
        emailMessageClass: 'notification',
      })
      return sub
    })
    // AC-PUBLIC-03: only opaque receipt, no PII echo
    return NextResponse.json({ data: { status: 'ok', submissionToken: publicToken, successMessage: settings.successMessage || 'Formunuz başarıyla gönderildi.' } })
  } catch (e: any) {
    if (e?.code === 'P2002') return NextResponse.json({ data: { status: 'duplicate' } })
    return NextResponse.json({ error: 'Gönderim hatası' }, { status: 500 })
  }
}
