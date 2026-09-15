type PublishedContextInput = {
  requestedFormId: unknown
  requestedPublishedVersionId: unknown
  form: { id: unknown; status: unknown; publishedVersionId: unknown } | null | undefined
  version: { id: unknown; formId: unknown; status: unknown } | null | undefined
}

type PublishedContextResult =
  | { ok: true }
  | { ok: false; reason: 'context_invalid' | 'form_id_mismatch' | 'form_not_published' | 'published_version_mismatch' | 'version_form_mismatch' | 'version_not_published' }

/** Fails closed unless the requested form and its immutable published version agree. */
export function authorizePublishedPaymentContext(input: PublishedContextInput): PublishedContextResult {
  if (!input || !input.form || !input.version) return { ok: false, reason: 'context_invalid' }
  if (typeof input.requestedFormId !== 'string' || typeof input.requestedPublishedVersionId !== 'string') {
    return { ok: false, reason: 'context_invalid' }
  }
  if (input.form.id !== input.requestedFormId) return { ok: false, reason: 'form_id_mismatch' }
  if (input.form.status !== 'published' || typeof input.form.publishedVersionId !== 'string') {
    return { ok: false, reason: 'form_not_published' }
  }
  if (input.form.publishedVersionId !== input.requestedPublishedVersionId || input.version.id !== input.requestedPublishedVersionId) {
    return { ok: false, reason: 'published_version_mismatch' }
  }
  if (input.version.formId !== input.form.id) return { ok: false, reason: 'version_form_mismatch' }
  if (input.version.status !== 'published') return { ok: false, reason: 'version_not_published' }
  return { ok: true }
}
