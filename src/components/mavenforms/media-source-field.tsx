import { useState } from 'react'
import { ImagePlus, Link2 } from 'lucide-react'
import { MediaPicker } from '@/components/mavenforms/media-picker'
import { Input } from '@/components/ui/input'

type MediaSource = 'library' | 'external'

interface MediaSourceFieldProps {
  formId: string | null
  mediaId: string | null
  externalUrl: string | null
  onMediaChange: (assetId: string | null) => void
  onExternalUrlChange: (value: string) => void
  externalPlaceholder: string
  label?: string
}

/**
 * Keeps a media setting's active source explicit. The selected asset and the
 * external fallback are never presented as two simultaneous editors.
 */
export function MediaSourceField({
  formId,
  mediaId,
  externalUrl,
  onMediaChange,
  onExternalUrlChange,
  externalPlaceholder,
  label = 'Görsel kaynağı',
}: MediaSourceFieldProps) {
  const [selectedSource, setSelectedSource] = useState<MediaSource>(mediaId ? 'library' : externalUrl ? 'external' : 'library')
  const source = mediaId ? 'library' : externalUrl ? 'external' : selectedSource

  const useLibrary = () => {
    setSelectedSource('library')
    if (externalUrl) onExternalUrlChange('')
  }

  const useExternal = () => {
    setSelectedSource('external')
    if (mediaId) onMediaChange(null)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-medium">{label}</span>
        <div className="flex rounded-md border border-border bg-background p-0.5" role="group" aria-label={`${label} seçimi`}>
          <button
            type="button"
            aria-pressed={source === 'library'}
            onClick={useLibrary}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${source === 'library' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <ImagePlus className="h-3.5 w-3.5" /> Medya klasörü
          </button>
          <button
            type="button"
            aria-pressed={source === 'external'}
            onClick={useExternal}
            className={`inline-flex min-h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${source === 'external' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Link2 className="h-3.5 w-3.5" /> Harici URL
          </button>
        </div>
      </div>

      {source === 'library' ? (
        <MediaPicker
          formId={formId}
          value={mediaId}
          onChange={onMediaChange}
        />
      ) : (
        <div className="space-y-1">
          <Input
            value={externalUrl || ''}
            onChange={(event) => onExternalUrlChange(event.target.value)}
            placeholder={externalPlaceholder}
            aria-label={`${label} harici URL`}
            className="text-sm"
          />
          <p className="text-[11px] text-muted-foreground">Yalnızca HTTPS görsel bağlantısı kullanılır.</p>
        </div>
      )}
    </div>
  )
}
