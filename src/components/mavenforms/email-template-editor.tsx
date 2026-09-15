'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EMAIL_TEMPLATE_MERGE_TAGS, renderEmailTemplateContent, type EmailTemplateMergeTag } from '@/lib/email-template-content'

export type EmailTemplateGuidance = {
  trigger: string
  recipient: string
  messageClass: 'notification' | 'transactional'
  senderProfile: string
}

export type EmailTemplateDefinition = {
  name: string
  desc: string
  subject: string
  body: string
  plainTextBody: string
  guidance: EmailTemplateGuidance
}

export function EmailTemplateEditor({
  template,
  onClose,
  onSave,
  onDuplicate,
}: {
  template: EmailTemplateDefinition | null
  onClose: () => void
  onSave: (draft: Pick<EmailTemplateDefinition, 'subject' | 'body' | 'plainTextBody'>) => void
  onDuplicate: (draft: Pick<EmailTemplateDefinition, 'subject' | 'body' | 'plainTextBody'>) => void
}) {
  const [subject, setSubject] = useState(() => template?.subject || '')
  const [body, setBody] = useState(() => template?.body || '')
  const [plainTextBody, setPlainTextBody] = useState(() => template?.plainTextBody || template?.body || '')
  const [target, setTarget] = useState<'subject' | 'body'>('body')
  const [showPreview, setShowPreview] = useState(false)
  const [previewSubject, setPreviewSubject] = useState('')
  const [previewBody, setPreviewBody] = useState('')
  const [previewError, setPreviewError] = useState<string | null>(null)
  const hasUnsavedChanges = template !== null && (
    subject !== template.subject ||
    body !== template.body ||
    plainTextBody !== (template.plainTextBody || template.body || '')
  )

  function insertTag(tag: EmailTemplateMergeTag) {
    const value = `{{${tag}}}`
    if (target === 'subject') {
      setSubject(current => `${current}${current ? ' ' : ''}${value}`)
      return
    }
    setBody(current => `${current}${current ? '\n' : ''}${value}`)
  }

  function resetDraft() {
    if (!template) return
    setSubject(template.subject || '')
    setBody(template.body || '')
    setPlainTextBody(template.plainTextBody || template.body || '')
    setShowPreview(false)
    setPreviewError(null)
  }

  function previewTemplate() {
    setPreviewError(null)
    try {
      const rendered = renderEmailTemplateContent({
        subject,
        textBody: plainTextBody,
        values: {
          'form.name': 'Örnek kayıt formu',
          'event.name': 'Örnek etkinlik',
          'participant.name': 'Örnek katılımcı',
          'registration.method': 'Standart kayıt',
          'registration.sponsorship': 'Örnek sponsorluk',
          'payment.status': 'Bekleniyor',
          'event.date': '15 Eylül 2026',
          'event.location': 'İstanbul',
        },
      })
      setPreviewSubject(rendered.subject)
      setPreviewBody(rendered.textBody)
    } catch {
      setPreviewSubject('')
      setPreviewBody('')
      setPreviewError('Önizleme oluşturulamadı. Konu veya içerikte geçersiz bir alan var.')
    }
    setShowPreview(true)
  }

  return (
    <Dialog open={template !== null} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? `${template.name} düzenle` : 'E-posta şablonu'}</DialogTitle>
          <DialogDescription>
            {template?.desc || 'Operasyonel e-posta taslağını düzenleyin.'}
          </DialogDescription>
        </DialogHeader>
        {template && (
          <form
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault()
              onSave({ subject, body, plainTextBody })
            }}
          >
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3" aria-label="Gönderim rehberi">
              <div>
                <div className="text-sm font-medium">Gönderim rehberi</div>
                <p className="text-xs text-slate-600">Bu şablonun ne zaman ve kime gideceğini kontrol edin.</p>
              </div>
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Olay</dt>
                  <dd>{template.guidance.trigger}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Alıcı sınıfı</dt>
                  <dd>{template.guidance.recipient}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Kanal sınıfı</dt>
                  <dd>{template.guidance.messageClass}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Gönderici</dt>
                  <dd>{template.guidance.senderProfile}</dd>
                </div>
              </dl>
              <p className="text-xs font-medium text-amber-800">Bu şablon fatura veya ödeme kanıtı değildir.</p>
            </div>
            <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div>
                <div className="text-sm font-medium">Güvenli alan ekle</div>
                <p className="text-xs text-slate-600">
                  Yalnız form ve katılım verileri eklenebilir; provider sırrı, kart ve iç sistem alanları listelenmez.
                </p>
              </div>
              <div className="flex flex-wrap gap-2" aria-label="Merge-tag hedefi">
                <Button
                  type="button"
                  variant={target === 'subject' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTarget('subject')}
                >
                  Konuya ekle
                </Button>
                <Button
                  type="button"
                  variant={target === 'body' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setTarget('body')}
                >
                  Gövdeye ekle
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {EMAIL_TEMPLATE_MERGE_TAGS.map(tag => (
                  <Button
                    key={tag.name}
                    type="button"
                    variant="outline"
                    size="sm"
                    title={tag.description}
                    onClick={() => insertTag(tag.name)}
                  >
                    {tag.label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-slate-500">Seçili hedef: {target === 'subject' ? 'Konu' : 'Gövde'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-template-subject">Konu</Label>
              <Input
                id="email-template-subject"
                value={subject}
                onChange={event => setSubject(event.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-template-body">İçerik</Label>
              <Textarea
                id="email-template-body"
                value={body}
                onChange={event => setBody(event.target.value)}
                rows={9}
                maxLength={100_000}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-template-plain-text">Düz metin yedeği</Label>
              <Textarea
                id="email-template-plain-text"
                value={plainTextBody}
                onChange={event => setPlainTextBody(event.target.value)}
                rows={6}
                maxLength={100_000}
                required
              />
              <p className="text-xs text-slate-500">HTML desteklemeyen e-posta istemcileri bu içeriği kullanır.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={previewTemplate}>Önizleme</Button>
              <span className="text-xs text-slate-500">Örnek veri kullanılır; hiçbir alıcıya gönderilmez.</span>
            </div>
            {showPreview && (
              <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3" aria-live="polite">
                <div className="text-sm font-medium">Önizleme — Örnek veri</div>
                {previewError ? (
                  <p className="text-sm text-red-700">{previewError}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">{previewSubject}</p>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-700">{previewBody}</pre>
                  </>
                )}
              </div>
            )}
            {hasUnsavedChanges && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900" role="status">
                Kaydedilmemiş değişiklikler var. Kaydetmeden kapatırsanız bu oturum taslağı korunmaz.
              </div>
            )}
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Bu mikro-fazda taslak yalnızca bu oturumda güncellenir. Kalıcı kayıt API&apos;si ve gerçek gönderim henüz açılmamıştır.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={resetDraft} disabled={!hasUnsavedChanges}>
                Değişiklikleri geri al
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDuplicate({ subject, body, plainTextBody })}
              >
                Kopyasını oluştur
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>İptal</Button>
              <Button type="submit">Taslağı güncelle</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
