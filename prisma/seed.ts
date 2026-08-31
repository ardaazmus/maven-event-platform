import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

async function main() {
  // Clean slate (idempotent seed)
  await db.auditLog.deleteMany()
  await db.integration.deleteMany()
  await db.submissionFile.deleteMany()
  await db.submissionValue.deleteMany()
  await db.submission.deleteMany()
  await db.notification.deleteMany()
  await db.logicRule.deleteMany()
  await db.formField.deleteMany()
  await db.formVersion.deleteMany()
  await db.formTag.deleteMany()
  await db.form.deleteMany()
  await db.theme.deleteMany()
  await db.tag.deleteMany()
  await db.folder.deleteMany()
  await db.workspaceMember.deleteMany()
  await db.session.deleteMany()
  await db.refreshToken.deleteMany()
  await db.workspace.deleteMany()
  await db.user.deleteMany()

  // Demo Workspace
  const workspace = await db.workspace.create({
    data: {
      id: 'ws_demo',
      name: 'MavenForms Demo',
      slug: 'mavenforms-demo',
      locale: 'tr',
      timezone: 'Europe/Istanbul',
      plan: 'business',
      status: 'active',
    },
  })

  // Demo User
  const passwordHash = await hashPassword('demo1234')
  const user = await db.user.create({
    data: {
      id: 'user_demo',
      email: 'demo@mavenforms.com',
      name: 'Demo Kullanıcı',
      passwordHash,
      locale: 'tr',
      timezone: 'Europe/Istanbul',
      lastLoginAt: new Date(),
    },
  })

  // Workspace Membership
  await db.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      role: 'owner',
      status: 'active',
    },
  })

  // Folders
  const folderEvents = await db.folder.create({
    data: { workspaceId: workspace.id, name: 'Etkinlikler', color: '#f59e0b', sortOrder: 1 },
  })
  const folderSurveys = await db.folder.create({
    data: { workspaceId: workspace.id, name: 'Anketler', color: '#10b981', sortOrder: 2 },
  })
  const folderReg = await db.folder.create({
    data: { workspaceId: workspace.id, name: 'Başvurular', color: '#8b5cf6', sortOrder: 3 },
  })

  // Tags
  const tagVip = await db.tag.create({ data: { workspaceId: workspace.id, name: 'VIP', color: '#ef4444' } })
  const tagPaid = await db.tag.create({ data: { workspaceId: workspace.id, name: 'Ücretli', color: '#10b981' } })
  const tagInternal = await db.tag.create({ data: { workspaceId: workspace.id, name: 'İç Kullanım', color: '#64748b' } })

  // Theme
  const theme = await db.theme.create({
    data: {
      workspaceId: workspace.id,
      name: 'Vibrant',
      tokensJson: JSON.stringify({
        primary: '#6366f1',
        background: '#ffffff',
        text: '#0f172a',
        error: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
      }),
      customCss: '',
      font: 'Inter',
      radius: 0.625,
    },
  })

  // Forms
  const form1 = await db.form.create({
    data: {
      id: 'form_event_reg',
      workspaceId: workspace.id,
      folderId: folderEvents.id,
      ownerId: user.id,
      createdById: user.id,
      title: 'Yıllık Teknoloji Zirvesi 2026 Kayıt Formu',
      description: 'Yıllık Teknoloji Zirvesine katılım için kayıt formu. Lütfen tüm alanları eksiksiz doldurunuz.',
      slug: 'tekno-zirvesi-2026',
      status: 'published',
      submissionCount: 247,
      todaySubmissionCount: 18,
      settingsJson: JSON.stringify({
        successMessage: 'Kaydınız alınmıştır! Onay e-postasını kontrol edin.',
        submitButtonText: 'Kayıt Ol',
        captcha: true,
        responseLimit: 500,
      }),
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
  })

  await db.formTag.create({ data: { formId: form1.id, tagId: tagVip.id } })
  await db.formTag.create({ data: { formId: form1.id, tagId: tagPaid.id } })

  // Form 1 Fields
  const f1Name = await db.formField.create({ data: { formId: form1.id, fieldKey: 'full_name', type: 'text', label: 'Ad Soyad', required: true, sortOrder: 1, placeholder: 'Adınız ve soyadınız' } })
  const f1Email = await db.formField.create({ data: { formId: form1.id, fieldKey: 'email', type: 'email', label: 'E-posta Adresi', required: true, sortOrder: 2, placeholder: 'ornek@email.com' } })
  const f1Phone = await db.formField.create({ data: { formId: form1.id, fieldKey: 'phone', type: 'phone', label: 'Telefon', required: true, sortOrder: 3, placeholder: '+90 5xx xxx xx xx' } })
  const f1Company = await db.formField.create({ data: { formId: form1.id, fieldKey: 'company', type: 'text', label: 'Şirket', sortOrder: 4, placeholder: 'Çalıştığınız şirket' } })
  const f1Attendance = await db.formField.create({
    data: {
      formId: form1.id,
      fieldKey: 'attendance',
      type: 'radio',
      label: 'Katılıyor musunuz?',
      required: true,
      sortOrder: 5,
      configJson: JSON.stringify({ options: [{ label: 'Evet, katılacağım', value: 'yes' }, { label: 'Hayır', value: 'no' }] }),
    },
  })
  const f1TicketType = await db.formField.create({
    data: {
      formId: form1.id,
      fieldKey: 'ticket_type',
      type: 'select',
      label: 'Bilet Türü',
      required: true,
      sortOrder: 6,
      configJson: JSON.stringify({ options: [{ label: 'Standart - 500₺', value: 'standard' }, { label: 'VIP - 1500₺', value: 'vip' }, { label: 'Öğrenci - 250₺', value: 'student' }] }),
    },
  })
  await db.formField.create({ data: { formId: form1.id, fieldKey: 'kvkk', type: 'checkbox', label: 'KVKK Aydınlatma Metnini okudum, kişisel verilerimin işlenmesini kabul ediyorum.', required: true, sortOrder: 7 } })

  // Logic for form 1
  await db.logicRule.create({
    data: {
      formId: form1.id,
      name: 'Katılım hayırsa konaklama alanını gizle',
      priority: 1,
      conditionsJson: JSON.stringify({ type: 'all', conditions: [{ field: 'attendance', operator: 'equals', value: 'no' }] }),
      actionsJson: JSON.stringify([{ type: 'hide', target: 'company' }]),
      enabled: true,
    },
  })

  await db.notification.create({
    data: {
      formId: form1.id,
      name: 'Yeni Kayıt Bildirimi',
      type: 'admin',
      enabled: true,
      configJson: JSON.stringify({
        to: 'kayit@zirve.com',
        subject: 'Yeni Kayıt: {form_title}',
        body: 'Merhaba, yeni bir kayıt alındı. Detaylar: {entry_data}',
      }),
    },
  })

  // Form 2 - Survey
  const form2 = await db.form.create({
    data: {
      id: 'form_survey',
      workspaceId: workspace.id,
      folderId: folderSurveys.id,
      ownerId: user.id,
      createdById: user.id,
      title: 'Müşteri Memnuniyet Anketi 2026',
      description: 'Hizmetlerimiz hakkında görüşlerinizi almak isteriz. Anket 5 dakika sürecektir.',
      slug: 'musteri-memnuniyet-2026',
      status: 'published',
      submissionCount: 1284,
      todaySubmissionCount: 47,
      settingsJson: JSON.stringify({
        successMessage: 'Geri bildiriminiz için teşekkürler!',
        submitButtonText: 'Anketi Gönder',
      }),
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
  })

  await db.formTag.create({ data: { formId: form2.id, tagId: tagInternal.id } })

  await db.formField.create({ data: { formId: form2.id, fieldKey: 'name', type: 'text', label: 'Adınız (opsiyonel)', sortOrder: 1, placeholder: 'Anonim kalmak için boş bırakın' } })
  await db.formField.create({ data: { formId: form2.id, fieldKey: 'satisfaction', type: 'rating', label: 'Genel memnuniyetiniz', required: true, sortOrder: 2, configJson: JSON.stringify({ max: 10, style: 'star', lowLabel: 'Çok kötü', highLabel: 'Mükemmel' }) } })
  await db.formField.create({
    data: {
      formId: form2.id,
      fieldKey: 'service_quality',
      type: 'radio',
      label: 'Hizmet kalitemizi nasıl değerlendirirsiniz?',
      required: true,
      sortOrder: 3,
      configJson: JSON.stringify({ options: [{ label: 'Çok iyi', value: 'excellent' }, { label: 'İyi', value: 'good' }, { label: 'Orta', value: 'average' }, { label: 'Kötü', value: 'poor' }] }),
    },
  })
  await db.formField.create({ data: { formId: form2.id, fieldKey: 'feedback', type: 'paragraph', label: 'Görüş ve önerileriniz', sortOrder: 4, placeholder: 'Açıklamalarınızı buraya yazın...' } })
  await db.formField.create({
    data: {
      formId: form2.id,
      fieldKey: 'recommend',
      type: 'select',
      label: 'Bizi başkalarına önerir misiniz?',
      required: true,
      sortOrder: 5,
      configJson: JSON.stringify({ options: [{ label: 'Kesinlikle', value: 'definitely' }, { label: 'Muhtemelen', value: 'probably' }, { label: 'Emin değilim', value: 'not_sure' }, { label: 'Hayır', value: 'no' }] }),
    },
  })

  // Form 3 - Application
  const form3 = await db.form.create({
    data: {
      id: 'form_application',
      workspaceId: workspace.id,
      folderId: folderReg.id,
      ownerId: user.id,
      createdById: user.id,
      title: 'İş Başvuru Formu',
      description: 'MavenForms ekibimize katılmak için başvuru formu. Tüm alanları doldurunuz.',
      slug: 'is-basvuru',
      status: 'published',
      submissionCount: 89,
      todaySubmissionCount: 3,
      settingsJson: JSON.stringify({
        successMessage: 'Başvurunuz alındı. 14 iş günü içinde size dönüş yapacağız.',
        submitButtonText: 'Başvuruyu Gönder',
        captcha: true,
      }),
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  })

  await db.formField.create({ data: { formId: form3.id, fieldKey: 'full_name', type: 'text', label: 'Ad Soyad', required: true, sortOrder: 1 } })
  await db.formField.create({ data: { formId: form3.id, fieldKey: 'email', type: 'email', label: 'E-posta', required: true, sortOrder: 2 } })
  await db.formField.create({ data: { formId: form3.id, fieldKey: 'phone', type: 'phone', label: 'Telefon', required: true, sortOrder: 3 } })
  await db.formField.create({
    data: {
      formId: form3.id,
      fieldKey: 'position',
      type: 'select',
      label: 'Başvurulan Pozisyon',
      required: true,
      sortOrder: 4,
      configJson: JSON.stringify({ options: [{ label: 'Senior Frontend Developer', value: 'senior_fe' }, { label: 'Backend Developer', value: 'backend' }, { label: 'UI/UX Designer', value: 'designer' }, { label: 'Product Manager', value: 'pm' }] }),
    },
  })
  await db.formField.create({ data: { formId: form3.id, fieldKey: 'experience', type: 'number', label: 'Yıllık Deneyim', required: true, sortOrder: 5, configJson: JSON.stringify({ min: 0, max: 30 }) } })
  await db.formField.create({ data: { formId: form3.id, fieldKey: 'portfolio', type: 'text', label: 'Portfolyo URL', sortOrder: 6, placeholder: 'https://' } })
  await db.formField.create({ data: { formId: form3.id, fieldKey: 'cover_letter', type: 'paragraph', label: 'Ön Yazı', required: true, sortOrder: 7 } })
  await db.formField.create({ data: { formId: form3.id, fieldKey: 'cv', type: 'file', label: 'CV Yükle', required: true, sortOrder: 8, configJson: JSON.stringify({ allowedTypes: ['pdf', 'doc', 'docx'], maxSize: 5 }) } })

  // Form 4 - Draft
  const form4 = await db.form.create({
    data: {
      id: 'form_webinar',
      workspaceId: workspace.id,
      folderId: folderEvents.id,
      ownerId: user.id,
      createdById: user.id,
      title: 'Webinar: AI ile Verimliliği Artırmak',
      description: 'Ücretsiz webinar kayıt formu',
      slug: 'webinar-ai',
      status: 'draft',
      submissionCount: 0,
      todaySubmissionCount: 0,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
  })
  await db.formField.create({ data: { formId: form4.id, fieldKey: 'name', type: 'text', label: 'Ad Soyad', required: true, sortOrder: 1 } })
  await db.formField.create({ data: { formId: form4.id, fieldKey: 'email', type: 'email', label: 'E-posta', required: true, sortOrder: 2 } })

  // Form 5 - Archived
  const form5 = await db.form.create({
    data: {
      id: 'form_old_survey',
      workspaceId: workspace.id,
      folderId: folderSurveys.id,
      ownerId: user.id,
      createdById: user.id,
      title: '2025 Yıllık Çalışan Anketi (Arşiv)',
      description: 'Geçmiş yıl anketi',
      slug: 'calisan-anketi-2025',
      status: 'archived',
      submissionCount: 312,
      todaySubmissionCount: 0,
      createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    },
  })

  // Generate Submissions for Form 1
  const sampleNames = ['Ahmet Yılmaz', 'Ayşe Kaya', 'Mehmet Demir', 'Fatma Şahin', 'Mustafa Çelik', 'Emine Yıldız', 'Ali Arslan', 'Hatice Doğan', 'Hüseyin Aydın', 'Zeynep Koç', 'Burak Aksoy', 'Elif Yalçın', 'Cem Kurt', 'Selin Öztürk', 'Deniz Erdoğan']
  const sampleCompanies = ['TechCorp', 'InnovationLabs', 'StartupHub', 'DigitalAgency', 'CloudSystems', 'AI Works', 'DataMiners', 'CodeFactory']
  const ticketTypes = ['standard', 'vip', 'student']
  const attendanceOptions = ['yes', 'no']

  for (let i = 0; i < 60; i++) {
    const name = sampleNames[i % sampleNames.length]
    const email = `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`
    const phone = `+90 5${Math.floor(100 + Math.random() * 899)} ${Math.floor(100 + Math.random() * 899)} ${Math.floor(10 + Math.random() * 89)} ${Math.floor(10 + Math.random() * 89)}`
    const company = sampleCompanies[i % sampleCompanies.length]
    const attendance = attendanceOptions[i % 2]
    const ticket = ticketTypes[i % 3]
    const status = i < 5 ? 'new' : i < 15 ? 'reviewing' : i < 50 ? 'approved' : i < 55 ? 'rejected' : 'spam'

    const submittedAt = new Date(Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000))
    const submission = await db.submission.create({
      data: {
        formId: form1.id,
        publicToken: `sub_evt_${i}_${Math.random().toString(36).slice(2, 12)}`,
        status,
        locale: 'tr',
        source: i % 4 === 0 ? 'embed' : 'web',
        submittedAt,
        paymentStatus: ticket === 'vip' ? 'paid' : ticket === 'standard' ? 'paid' : 'pending',
      },
    })

    await db.submissionValue.createMany({
      data: [
        { submissionId: submission.id, fieldId: f1Name.id, valueJson: JSON.stringify({ value: name }), normalizedText: name },
        { submissionId: submission.id, fieldId: f1Email.id, valueJson: JSON.stringify({ value: email }), normalizedText: email },
        { submissionId: submission.id, fieldId: f1Phone.id, valueJson: JSON.stringify({ value: phone }), normalizedText: phone },
        { submissionId: submission.id, fieldId: f1Company.id, valueJson: JSON.stringify({ value: company }), normalizedText: company },
        { submissionId: submission.id, fieldId: f1Attendance.id, valueJson: JSON.stringify({ value: attendance }), normalizedText: attendance },
        { submissionId: submission.id, fieldId: f1TicketType.id, valueJson: JSON.stringify({ value: ticket }), normalizedText: ticket },
      ],
    })
  }

  // Generate Submissions for Form 2
  for (let i = 0; i < 40; i++) {
    const name = i % 3 === 0 ? '' : sampleNames[i % sampleNames.length]
    const satisfaction = Math.floor(Math.random() * 4) + 7
    const quality = ['excellent', 'good', 'good', 'average'][i % 4]
    const recommend = ['definitely', 'probably', 'not_sure'][i % 3]
    const feedbacks = ['Çok memnun kaldım, teşekkürler!', 'Hizmetler güzel ama geliştirilebilir.', 'Profesyonel bir ekip.', 'Fiyatlar biraz yüksek ama kalite iyi.', '']
    
    const submittedAt = new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000))
    const submission = await db.submission.create({
      data: {
        formId: form2.id,
        publicToken: `sub_srv_${i}_${Math.random().toString(36).slice(2, 12)}`,
        status: 'approved',
        locale: 'tr',
        source: 'web',
        submittedAt,
      },
    })
  }

  // Integrations
  await db.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: 'stripe',
      name: 'Stripe Ödeme',
      status: 'connected',
      configJson: JSON.stringify({ mode: 'test', currency: 'try' }),
    },
  })
  await db.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: 'mailchimp',
      name: 'Mailchimp E-posta',
      status: 'connected',
      configJson: JSON.stringify({ listId: 'demo_list' }),
    },
  })
  await db.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: 'slack',
      name: 'Slack Bildirim',
      status: 'disconnected',
      configJson: JSON.stringify({}),
    },
  })

  // Audit Logs
  const auditActions = [
    { action: 'form.create', resourceType: 'form', resourceId: form1.id, beforeJson: null, afterJson: JSON.stringify({ title: form1.title }) },
    { action: 'form.publish', resourceType: 'form', resourceId: form1.id, beforeJson: JSON.stringify({ status: 'draft' }), afterJson: JSON.stringify({ status: 'published' }) },
    { action: 'form.update', resourceType: 'form', resourceId: form2.id, beforeJson: null, afterJson: JSON.stringify({ title: form2.title }) },
    { action: 'submission.update', resourceType: 'submission', resourceId: 'sub_1', beforeJson: JSON.stringify({ status: 'new' }), afterJson: JSON.stringify({ status: 'approved' }) },
    { action: 'form.create', resourceType: 'form', resourceId: form3.id, beforeJson: null, afterJson: JSON.stringify({ title: form3.title }) },
    { action: 'form.duplicate', resourceType: 'form', resourceId: form4.id, beforeJson: null, afterJson: JSON.stringify({ title: form4.title }) },
    { action: 'theme.update', resourceType: 'theme', resourceId: theme.id, beforeJson: null, afterJson: JSON.stringify({ name: 'Vibrant' }) },
    { action: 'integration.connect', resourceType: 'integration', resourceId: 'stripe_1', beforeJson: null, afterJson: JSON.stringify({ provider: 'stripe' }) },
  ]

  for (let i = 0; i < auditActions.length; i++) {
    const a = auditActions[i]
    await db.auditLog.create({
      data: {
        workspaceId: workspace.id,
        actorId: user.id,
        action: a.action,
        resourceType: a.resourceType,
        resourceId: a.resourceId,
        beforeJson: a.beforeJson,
        afterJson: a.afterJson,
        createdAt: new Date(Date.now() - i * 6 * 60 * 60 * 1000),
      },
    })
  }

  console.log('Seed completed successfully!')
  console.log(`Workspace: ${workspace.slug}`)
  console.log(`User: ${user.email}`)
  console.log(`Forms: 5`)
  console.log(`Submissions: 100+`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
