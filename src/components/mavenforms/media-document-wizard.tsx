'use client'

import { FileCheck2, LockKeyhole } from 'lucide-react'
import { ConnectionWizard, type ConnectionWizardStep } from '@/components/mavenforms/connection-wizard'

export const MEDIA_DOCUMENT_STEPS: readonly ConnectionWizardStep[] = Object.freeze([
  { id: 'scope', label: 'Kapsam', description: 'Kaynağı yalnız ilgili form alanına bağla' },
  { id: 'scan', label: 'Tarama', description: 'Dosyayı private karantinada güvenlik kontrolüne al' },
  { id: 'preview', label: 'Önizleme', description: 'İçeriği aktif etmeden önce doğrula' },
  { id: 'retention', label: 'Saklama', description: 'Retention ve kullanım bağımlılıklarını incele' },
])

export type MediaDocumentPurpose = 'form_media' | 'invoice_document' | 'badge_template'
export type MediaDocumentState = 'quarantine' | 'clean' | 'ready' | 'rejected' | 'archived'

export type MediaDocumentCapability = Readonly<{
  enabled: boolean
  reason:
    | 'scope_required'
    | 'private_visibility_required'
    | 'scan_required'
    | 'asset_not_ready'
    | 'preview_required'
    | 'alt_text_review'
    | 'retention_required'
    | 'ready_for_manual_review'
}>

export type MediaDocumentCapabilityInput = Readonly<{
  purpose?: unknown
  scopedToOwner?: unknown
  visibility?: unknown
  scanStatus?: unknown
  assetState?: unknown
  previewAvailable?: unknown
  altTextReviewed?: unknown
  retentionReady?: unknown
}>

export type MediaDocumentWizardProps = Readonly<{
  capability?: MediaDocumentCapabilityInput
}>

/** Evaluates the asset boundary without uploading, reading or mutating a file. */
export function mediaDocumentCapability(input: MediaDocumentCapabilityInput = {}): MediaDocumentCapability {
  const purpose = input.purpose ?? 'invoice_document'
  if (input.scopedToOwner !== true) return { enabled: false, reason: 'scope_required' }
  if (input.visibility !== 'private') return { enabled: false, reason: 'private_visibility_required' }
  if (input.scanStatus !== 'clean') return { enabled: false, reason: 'scan_required' }
  if (input.assetState !== 'ready') return { enabled: false, reason: 'asset_not_ready' }
  if (input.previewAvailable !== true) return { enabled: false, reason: 'preview_required' }
  if (purpose !== 'invoice_document' && purpose !== 'form_media' && purpose !== 'badge_template') return { enabled: false, reason: 'scope_required' }
  if (purpose !== 'invoice_document' && input.altTextReviewed !== true) return { enabled: false, reason: 'alt_text_review' }
  if (input.retentionReady !== true) return { enabled: false, reason: 'retention_required' }
  return { enabled: true, reason: 'ready_for_manual_review' }
}

/** Shows the shared media/document safety pipeline while keeping mutation server-owned. */
export function MediaDocumentWizard({ capability: input = {} }: MediaDocumentWizardProps) {
  const capability = mediaDocumentCapability(input)

  return (
    <ConnectionWizard steps={MEDIA_DOCUMENT_STEPS} initialStepId="scope" draftId="media-document-safety">
      {(step) => (
        <div className="space-y-2" data-media-document-step={step.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="h-4 w-4 text-primary" /> Medya ve belge güvenlik akışı</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">Private · tarama gerekli</span>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <p><span className="font-medium text-foreground">Kapsam:</span> yalnız bu formun private medya/belge alanı</p>
            <p><span className="font-medium text-foreground">Sıra:</span> seç/yükle → karantina → tarama → hazır</p>
            <p><span className="font-medium text-foreground">Görsel:</span> önizleme ve alt metin kontrolü</p>
            <p><span className="font-medium text-foreground">Saklama:</span> bağımlılık ve retention kontrolü</p>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {capability.enabled ? 'Yerel kontroller tamam; manuel inceleme ve ayrı release kapısı bekleniyor.' : 'Kapsam, private görünürlük, temiz tarama, hazır durum, önizleme ve retention tamamlanmadan asset aktif edilmez.'}</p>
          <p className="text-[11px] text-muted-foreground">Mevcut MediaPicker ve upload route’ları server-owned kalır; bu rehber gerçek dosya işlemi yapmaz.</p>
        </div>
      )}
    </ConnectionWizard>
  )
}
