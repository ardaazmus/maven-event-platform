'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api-client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import {
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Mail,
  Phone,
  MapPin,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  Save,
  Loader2,
  Eye,
  Plus,
  Trash2,
  Link as LinkIcon,
  Palette,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AppearanceData {
  headerEnabled: boolean
  headerLogoUrl: string | null
  headerLogoAlt: string | null
  headerLogoWidth: number | null
  headerTitle: string | null
  headerSubtitle: string | null
  headerDescription: string | null
  headerBgColor: string
  headerBgImage: string | null
  headerTextColor: string
  headerAlign: 'left' | 'center' | 'right'
  headerPadding: number
  contactBarEnabled: boolean
  contactBarBgColor: string
  contactBarTextColor: string
  contactEmail: string | null
  contactPhone: string | null
  contactAddress: string | null
  socialInstagram: string | null
  socialLinkedin: string | null
  socialTwitter: string | null
  socialFacebook: string | null
  socialYoutube: string | null
  footerEnabled: boolean
  footerLogoUrl: string | null
  footerText: string | null
  footerBgColor: string
  footerTextColor: string
  footerLinks: Array<{ label: string; url: string }>
  footerPadding: number
  customCss: string | null
}

interface AppearancePanelProps {
  formId: string
  formTitle: string
  formDescription: string | null
}

export function AppearancePanel({ formId, formTitle, formDescription }: AppearancePanelProps) {
  const [data, setData] = useState<AppearanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api<AppearanceData>(`/api/forms/${formId}/appearance`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [formId])

  const update = (key: keyof AppearanceData, value: any) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api(`/api/forms/${formId}/appearance`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      toast({ title: 'Görünüm kaydedildi', description: 'Header/footer ayarları güncellendi' })
    } catch (err: any) {
      toast({ title: 'Kaydetme hatası', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-5 h-32">
              <div className="shimmer h-full w-full rounded" />
            </Card>
          ))}
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="flex-1">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Görünüm & Header/Footer</h2>
            <p className="text-sm text-muted-foreground">
              Formun üst ve alt alanlarını özelleştirin. Resim, metin, iletişim ve sosyal medya ekleyin.
            </p>
          </div>
          <div className="flex gap-2">
            <a href={`/forms/${formId}?preview=1`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <Eye className="w-3.5 h-3.5" /> Önizle
              </Button>
            </a>
            <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Kaydet
            </Button>
          </div>
        </div>

        {/* HEADER SECTION */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Header (Üst Bölüm)</h3>
                <p className="text-xs text-muted-foreground">Logo, başlık ve açıklama</p>
              </div>
            </div>
            <Switch checked={data.headerEnabled} onCheckedChange={(c) => update('headerEnabled', c)} />
          </div>

          {data.headerEnabled && (
            <>
              <Separator />
              {/* Logo */}
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> Logo URL (PNG, JPG, SVG, WebP)
                </Label>
                <Input
                  value={data.headerLogoUrl || ''}
                  onChange={(e) => update('headerLogoUrl', e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="text-sm"
                />
                {data.headerLogoUrl && (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-border">
                    <img
                      src={data.headerLogoUrl}
                      alt="Logo preview"
                      className="max-h-16 w-auto"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <div className="flex-1">
                      <Label className="text-xs">Logo Genişliği (px)</Label>
                      <Input
                        type="number"
                        value={data.headerLogoWidth ?? ''}
                        onChange={(e) => update('headerLogoWidth', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="Otomatik"
                        className="h-8 text-sm w-32"
                      />
                    </div>
                  </div>
                )}
                <Input
                  value={data.headerLogoAlt || ''}
                  onChange={(e) => update('headerLogoAlt', e.target.value)}
                  placeholder="Logo alt metni (erişilebilirlik)"
                  className="text-xs h-8"
                />
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-xs">Başlık</Label>
                <Input
                  value={data.headerTitle || ''}
                  onChange={(e) => update('headerTitle', e.target.value)}
                  placeholder={formTitle}
                  className="text-sm"
                />
              </div>

              {/* Subtitle */}
              <div className="space-y-2">
                <Label className="text-xs">Alt Başlık</Label>
                <Input
                  value={data.headerSubtitle || ''}
                  onChange={(e) => update('headerSubtitle', e.target.value)}
                  placeholder="Örn: 8 Ekim 2026, İstanbul"
                  className="text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-xs">Açıklama (HTML destekler)</Label>
                <Textarea
                  value={data.headerDescription || ''}
                  onChange={(e) => update('headerDescription', e.target.value)}
                  placeholder="Form açıklaması, etkinlik detayları..."
                  rows={3}
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Satır sonu için Enter, HTML etiketleri desteklenir</p>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Arka Plan Rengi</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.headerBgColor}
                      onChange={(e) => update('headerBgColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={data.headerBgColor}
                      onChange={(e) => update('headerBgColor', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Metin Rengi</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.headerTextColor}
                      onChange={(e) => update('headerTextColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={data.headerTextColor}
                      onChange={(e) => update('headerTextColor', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Background Image */}
              <div className="space-y-2">
                <Label className="text-xs">Arka Plan Resmi URL (opsiyonel)</Label>
                <Input
                  value={data.headerBgImage || ''}
                  onChange={(e) => update('headerBgImage', e.target.value)}
                  placeholder="https://example.com/bg.jpg"
                  className="text-sm"
                />
              </div>

              {/* Alignment */}
              <div className="space-y-2">
                <Label className="text-xs">Hizalama</Label>
                <div className="flex gap-1">
                  {[
                    { id: 'left', icon: AlignLeft, label: 'Sol' },
                    { id: 'center', icon: AlignCenter, label: 'Orta' },
                    { id: 'right', icon: AlignRight, label: 'Sağ' },
                  ].map((a) => (
                    <button
                      key={a.id}
                      onClick={() => update('headerAlign', a.id)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-md text-xs transition-colors',
                        data.headerAlign === a.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <a.icon className="w-3.5 h-3.5" />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Padding */}
              <div className="space-y-2">
                <Label className="text-xs">İç Boşluk: {data.headerPadding}px</Label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={data.headerPadding}
                  onChange={(e) => update('headerPadding', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </>
          )}
        </Card>

        {/* CONTACT BAR */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">İletişim Çubuğu</h3>
                <p className="text-xs text-muted-foreground">E-posta, telefon, adres ve sosyal medya</p>
              </div>
            </div>
            <Switch checked={data.contactBarEnabled} onCheckedChange={(c) => update('contactBarEnabled', c)} />
          </div>

          {data.contactBarEnabled && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Çubuk Arka Planı</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.contactBarBgColor}
                      onChange={(e) => update('contactBarBgColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={data.contactBarBgColor}
                      onChange={(e) => update('contactBarBgColor', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Çubuk Metin Rengi</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.contactBarTextColor}
                      onChange={(e) => update('contactBarTextColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={data.contactBarTextColor}
                      onChange={(e) => update('contactBarTextColor', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> E-posta</Label>
                  <Input
                    value={data.contactEmail || ''}
                    onChange={(e) => update('contactEmail', e.target.value)}
                    placeholder="info@example.com"
                    className="text-sm h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Telefon</Label>
                  <Input
                    value={data.contactPhone || ''}
                    onChange={(e) => update('contactPhone', e.target.value)}
                    placeholder="+90 212 xxx xxxx"
                    className="text-sm h-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Adres</Label>
                <Input
                  value={data.contactAddress || ''}
                  onChange={(e) => update('contactAddress', e.target.value)}
                  placeholder="Mah. Cad. No:xx"
                  className="text-sm h-9"
                />
              </div>

              <Separator />
              <div>
                <Label className="text-xs mb-2 block">Sosyal Medya Linkleri</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <SocialInput icon={Instagram} placeholder="https://instagram.com/..." value={data.socialInstagram || ''} onChange={(v) => update('socialInstagram', v)} />
                  <SocialInput icon={Linkedin} placeholder="https://linkedin.com/..." value={data.socialLinkedin || ''} onChange={(v) => update('socialLinkedin', v)} />
                  <SocialInput icon={Twitter} placeholder="https://x.com/..." value={data.socialTwitter || ''} onChange={(v) => update('socialTwitter', v)} />
                  <SocialInput icon={Facebook} placeholder="https://facebook.com/..." value={data.socialFacebook || ''} onChange={(v) => update('socialFacebook', v)} />
                  <SocialInput icon={Youtube} placeholder="https://youtube.com/..." value={data.socialYoutube || ''} onChange={(v) => update('socialYoutube', v)} />
                </div>
              </div>
            </>
          )}
        </Card>

        {/* FOOTER */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gray-500/10 text-gray-600 flex items-center justify-center">
                <AlignLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold">Footer (Alt Bölüm)</h3>
                <p className="text-xs text-muted-foreground">Logo, telif metni ve linkler</p>
              </div>
            </div>
            <Switch checked={data.footerEnabled} onCheckedChange={(c) => update('footerEnabled', c)} />
          </div>

          {data.footerEnabled && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3" /> Footer Logo URL
                </Label>
                <Input
                  value={data.footerLogoUrl || ''}
                  onChange={(e) => update('footerLogoUrl', e.target.value)}
                  placeholder="https://example.com/footer-logo.png"
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Footer Metni (telif, açıklama)</Label>
                <Textarea
                  value={data.footerText || ''}
                  onChange={(e) => update('footerText', e.target.value)}
                  placeholder="© 2026 Şirket Adı. Tüm hakları saklıdır."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Arka Plan Rengi</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.footerBgColor}
                      onChange={(e) => update('footerBgColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={data.footerBgColor}
                      onChange={(e) => update('footerBgColor', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Metin Rengi</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={data.footerTextColor}
                      onChange={(e) => update('footerTextColor', e.target.value)}
                      className="w-10 h-9 rounded border border-border cursor-pointer"
                    />
                    <Input
                      value={data.footerTextColor}
                      onChange={(e) => update('footerTextColor', e.target.value)}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">İç Boşluk: {data.footerPadding}px</Label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={data.footerPadding}
                  onChange={(e) => update('footerPadding', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <Separator />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs flex items-center gap-1"><LinkIcon className="w-3 h-3" /> Footer Linkleri</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs gap-1"
                    onClick={() => update('footerLinks', [...(data.footerLinks || []), { label: '', url: '' }])}
                  >
                    <Plus className="w-3 h-3" /> Ekle
                  </Button>
                </div>
                <div className="space-y-2">
                  {(data.footerLinks || []).map((link, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={link.label}
                        onChange={(e) => {
                          const links = [...(data.footerLinks || [])]
                          links[i] = { ...links[i], label: e.target.value }
                          update('footerLinks', links)
                        }}
                        placeholder="Etiket"
                        className="h-8 text-sm flex-1"
                      />
                      <Input
                        value={link.url}
                        onChange={(e) => {
                          const links = [...(data.footerLinks || [])]
                          links[i] = { ...links[i], url: e.target.value }
                          update('footerLinks', links)
                        }}
                        placeholder="https://"
                        className="h-8 text-sm flex-1"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => {
                          const links = (data.footerLinks || []).filter((_, idx) => idx !== i)
                          update('footerLinks', links)
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>

        {/* CUSTOM CSS */}
        <Card className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Özel CSS</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Form export edildiğinde bozulmaması için tüm stiller <code>.mavenforms-public</code> kapsamındadır.
          </p>
          <Textarea
            value={data.customCss || ''}
            onChange={(e) => update('customCss', e.target.value)}
            placeholder={`/* .mavenforms-public kapsamında yazın */\n.mavenforms-public h1 {\n  font-size: 2rem;\n}`}
            rows={6}
            className="font-mono text-xs"
          />
        </Card>
      </div>
    </ScrollArea>
  )
}

function SocialInput({ icon: Icon, placeholder, value, onChange }: {
  icon: any
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm pl-8"
      />
    </div>
  )
}
