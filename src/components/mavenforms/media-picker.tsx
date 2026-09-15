'use client'
import { useEffect, useId, useState } from 'react'
import { api } from '@/lib/api-client'
import { Check, ImagePlus, Search, Trash2, Upload } from 'lucide-react'

interface MediaPickerProps {
  formId: string | null
  value: string | null // assetId
  onChange: (assetId: string | null, asset?: any) => void
  scope?: 'form' | 'global'
  allowGlobal?: boolean
}

type PickerMode = 'library' | 'upload' | null

export function MediaPicker({ formId, value, onChange, scope: fixedScope, allowGlobal = false }: MediaPickerProps) {
  const [assets, setAssets] = useState<any[]>([])
  const [selectedAsset, setSelectedAsset] = useState<any | null>(null)
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<'form' | 'global'>(fixedScope || 'form')
  const [mode, setMode] = useState<PickerMode>(null)
  const [uploading, setUploading] = useState(false)
  const [savingAlt, setSavingAlt] = useState(false)
  const [alt, setAlt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const canSwitchScope = !!formId && allowGlobal && !fixedScope
  const uploadInputId = `media-upload-${useId()}`
  const selectedIsReady = selectedAsset?.scanStatus === 'clean' && selectedAsset?.visibility === 'private'

  const load = async () => {
    try {
      setError(null)
      const endpoint = formId ? `/api/forms/${formId}/media?scope=${scope}` : '/api/media?scope=global'
      const data = await api<any[]>(endpoint)
      setAssets(Array.isArray(data) ? data : [])
      const current = Array.isArray(data) ? data.find((asset) => asset.id === value) : null
      if (current) {
        setSelectedAsset(current)
        setAlt(current.altText || '')
      }
    } catch (err: any) {
      setError(err.message || 'Medya listesi alınamadı')
    }
  }

  useEffect(() => {
    // Load the current asset even while the picker is closed. This keeps the
    // selected thumbnail/name visible and makes the active source explicit.
    if (!value && mode !== 'library') {
      setSelectedAsset(null)
      setAlt('')
      return
    }
    void load()
  }, [formId, scope, value, mode])

  const selectAsset = async (asset: any) => {
    try {
      setError(null)
      if (asset.scanStatus !== 'clean' || asset.visibility !== 'private') {
        setSelectedAsset(asset)
        setError('Bu görsel güvenlik taraması tamamlanmadan aktif edilemez')
        return
      }
      if (scope === 'global' && formId) {
        await api(`/api/forms/${formId}/media`, { method: 'POST', body: JSON.stringify({ action: 'attach', assetId: asset.id }) })
      }
      setSelectedAsset(asset)
      setAlt(asset.altText || '')
      onChange(asset.id, asset)
      setMode(null)
    } catch (err: any) {
      setError(err.message || 'Medya forma bağlanamadı')
    }
  }

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      setError(null)
      const fd = new FormData()
      fd.append('file', file)
      const endpoint = formId ? `/api/forms/${formId}/media?scope=${scope}` : '/api/media?scope=global'
      const res = await fetch(endpoint, { method: 'POST', body: fd, credentials: 'include' })
      if (!res.ok) throw new Error(await res.text())
      const result = await res.json()
      setSelectedAsset(result.data)
      setAlt(result.data.altText || '')
      if (result.data.scanStatus === 'clean' && result.data.visibility === 'private') onChange(result.data.id, result.data)
      setMode(null)
      await load()
    } catch (err: any) {
      setError(err.message || 'Medya yüklenemedi')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const saveAlt = async () => {
    const assetId = selectedAsset?.id || value
    if (!assetId) return
    setSavingAlt(true)
    try {
      const query = scope === 'global' ? 'scope=global' : `formId=${formId}`
      const updated = await api<any>(`/api/media/${assetId}?${query}`, { method: 'PATCH', body: JSON.stringify({ altText: alt.trim() || null }) })
      setSelectedAsset((current) => ({ ...(current || {}), ...updated }))
      onChange(assetId, updated)
    } catch (err: any) {
      setError(err.message || 'Alt metin kaydedilemedi')
    } finally {
      setSavingAlt(false)
    }
  }

  const clear = () => {
    setSelectedAsset(null)
    setAlt('')
    setMode(null)
    onChange(null)
  }

  const imageSrc = selectedIsReady && selectedAsset?.id ? `/api/media/${selectedAsset.id}?${scope === 'global' ? 'scope=global' : `formId=${formId}`}` : null
  const filtered = assets.filter((asset) => !q || asset.originalName.toLowerCase().includes(q.toLowerCase()))
  const hasPendingSelection = !!selectedAsset && !selectedIsReady

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3" role="group" aria-label="Medya kaynağı" aria-busy={uploading || savingAlt}>
      {!value && !hasPendingSelection ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => setMode('library')} className="inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[.99]"><ImagePlus className="h-3.5 w-3.5" /> Medyadan seç</button>
          <label htmlFor={uploadInputId} className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary active:scale-[.99]"><Upload className="h-3.5 w-3.5" /> {uploading ? 'Yükleniyor…' : 'Bilgisayardan yükle'}</label>
        </div>
      ) : (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {imageSrc && <img src={imageSrc} alt={alt || selectedAsset?.originalName || 'Seçilen görsel'} className="h-14 w-24 rounded-md border border-border object-cover" />}
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{selectedAsset?.originalName || 'Görsel seçildi'}</p><p className={`text-[11px] ${selectedIsReady ? 'text-primary' : 'text-amber-700'}`}>{selectedIsReady ? 'Aktif kaynak' : 'Beklemede · güvenlik taraması gerekli'} · {scope === 'global' ? 'ortak medya' : 'bu formun medya klasörü'}</p>{selectedAsset?.width && selectedAsset?.height ? <p className="text-[11px] text-muted-foreground">{selectedAsset.width} × {selectedAsset.height}px · {selectedAsset.mime}</p> : null}</div>
          <div className="flex flex-wrap shrink-0 gap-2">
            <button type="button" onClick={() => setMode('library')} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[.99]"><ImagePlus className="h-3.5 w-3.5" /> Değiştir</button>
            <label htmlFor={uploadInputId} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary active:scale-[.99]"><Upload className="h-3.5 w-3.5" /> {uploading ? 'Yükleniyor…' : 'Yeni yükle'}</label>
            <button type="button" onClick={clear} aria-label="Temizle: seçilen medyayı kaldır" className="inline-flex min-h-9 items-center justify-center rounded-md border border-destructive/30 px-2.5 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive active:scale-[.99]"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}

      <input id={uploadInputId} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={onUpload} disabled={uploading} aria-label="Görsel dosyası yükle" />

      {value && selectedIsReady && <div className="flex flex-col gap-2 border-t border-border/60 pt-3 sm:flex-row sm:items-end"><div className="min-w-0 flex-1 space-y-1"><label htmlFor={`${uploadInputId}-alt`} className="text-xs font-medium">Alt metin</label><input id={`${uploadInputId}-alt`} placeholder="Görselin amacını açıklayın" value={alt} onChange={(e) => setAlt(e.target.value)} className="min-h-9 w-full rounded-md border border-border bg-background px-2 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-describedby={`${uploadInputId}-alt-help`} /><p id={`${uploadInputId}-alt-help`} className="text-[11px] text-muted-foreground">Dekoratif görseller için boş bırakabilirsiniz.</p></div><button type="button" onClick={saveAlt} disabled={savingAlt} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[.99]"><Check className="h-3.5 w-3.5" /> {savingAlt ? 'Kaydediliyor…' : 'Alt metni kaydet'}</button></div>}

      {mode === 'library' && <div className="space-y-3 border-t border-border/60 pt-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><input placeholder="Medya klasöründe ara" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-9 w-full rounded-md border border-border bg-background pl-8 pr-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label="Medya klasöründe ara" autoFocus /></div><button type="button" onClick={() => setMode(null)} className="min-h-9 rounded-md border border-border px-3 py-2 text-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Kapat</button></div>{canSwitchScope && <div className="flex flex-wrap gap-1.5"><button type="button" onClick={() => setScope('form')} aria-pressed={scope === 'form'} className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${scope === 'form' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Bu form</button><button type="button" onClick={() => setScope('global')} aria-pressed={scope === 'global'} className={`rounded-md px-2.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${scope === 'global' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>Ortak medya</button></div>}<div className="grid max-h-48 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">{filtered.map((asset) => <button type="button" key={asset.id} onClick={() => selectAsset(asset)} aria-pressed={value === asset.id} disabled={asset.scanStatus !== 'clean' || asset.visibility !== 'private'} className={`min-w-0 overflow-hidden rounded-md border p-1 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${value === asset.id ? 'ring-2 ring-primary' : ''}`} aria-label={`${asset.originalName}${value === asset.id ? ' · aktif kaynak' : ''}${asset.scanStatus !== 'clean' ? ' · tarama bekliyor' : ''}`}><div className="flex aspect-[16/9] items-center justify-center overflow-hidden bg-muted text-[10px]"><img loading="lazy" src={`/api/media/${asset.id}?${scope === 'global' ? 'scope=global' : `formId=${formId}`}`} alt={asset.altText || asset.originalName} className="h-full w-full object-cover" /></div><div className="truncate text-[10px]">{asset.originalName}</div><div className="text-[10px] text-muted-foreground">{asset.scanStatus === 'clean' ? 'Hazır' : 'Tarama bekliyor'}</div></button>)}{filtered.length === 0 && <div className="col-span-2 py-4 text-center text-xs text-muted-foreground sm:col-span-3">Bu medya klasöründe görsel yok</div>}</div><label htmlFor={uploadInputId} className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-primary/40 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-within:ring-2 focus-within:ring-primary"><Upload className="h-3.5 w-3.5" /> Yeni görsel yükle</label></div>}

      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      {uploading && <div className="text-xs" role="status">Görsel yükleniyor…</div>}
    </div>
  )
}
