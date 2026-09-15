export const FILE_LIMITS = {
  maxSize: 5 * 1024 * 1024, // 5MB ponytail: per-field override when needed
  allowedTypes: ['pdf','doc','docx','png','jpg','jpeg','webp'] as const,
}

export function validateFile(name: string, size: number, mime?: string): { ok: boolean; error?: string } {
  const ext = name.split('.').pop()?.toLowerCase() || ''
  if (size > FILE_LIMITS.maxSize) return { ok: false, error: 'Dosya çok büyük (max 5MB)' }
  if (ext && !(FILE_LIMITS.allowedTypes as readonly string[]).includes(ext)) return { ok: false, error: `İzin verilmeyen tip: ${ext}` }
  return { ok: true }
}

// ponytail: malware scan & signed URL when object storage lands; current: private URL via /api/files/:id with auth
