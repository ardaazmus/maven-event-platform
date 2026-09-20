'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { api } from '@/lib/api-client'
import { clearBrandingCache } from '@/components/mavenforms/brand'
import { MediaPicker } from '@/components/mavenforms/media-picker'
import { EmailTemplateEditor, type EmailTemplateDefinition } from '@/components/mavenforms/email-template-editor'
import { useToast } from '@/hooks/use-toast'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { useApp } from '@/lib/store'
import {
  User as UserIcon,
  Building,
  Shield,
  Mail,
  Server,
  Globe,
  Bell,
  Palette,
  CreditCard,
  Key,
  Smartphone,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  Settings as SettingsIcon,
  Database,
  Zap,
  ShieldCheck,
  AlertTriangle,
  MailCheck,
} from 'lucide-react'

const settingsGroups = [
  {
    id: 'personal',
    label: 'Kişisel',
    items: [
      { id: 'account', label: 'Hesap', icon: UserIcon },
      { id: 'notifications', label: 'Bildirimler', icon: Bell },
      { id: 'appearance', label: 'Uygulama teması', icon: Palette },
    ],
  },
  {
    id: 'workspace',
    label: 'Çalışma alanı',
    items: [
      { id: 'workspace', label: 'Workspace', icon: Building },
      { id: 'branding', label: 'Marka & Logo', icon: Palette },
      { id: 'email', label: 'E-posta / SMTP', icon: Mail },
    ],
  },
  {
    id: 'security-data',
    label: 'Güvenlik ve veri',
    items: [
      { id: 'security', label: 'Güvenlik', icon: Shield },
      { id: 'ldap', label: 'LDAP / AD', icon: Server },
      { id: 'system', label: 'Sistem', icon: SettingsIcon },
    ],
  },
  {
    id: 'plan',
    label: 'Plan ve kullanım',
    items: [
      { id: 'billing', label: 'Faturalama', icon: CreditCard },
    ],
  },
] as const

export function SettingsView() {
  const [tab, setTab] = useState('account')
  const [wideSettingsNav, setWideSettingsNav] = useState(false)
  const { user, workspace } = useApp()
  const { toast } = useToast()

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)')
    const sync = () => setWideSettingsNav(mediaQuery.matches)
    sync()
    mediaQuery.addEventListener('change', sync)
    return () => mediaQuery.removeEventListener('change', sync)
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl p-4 lg:p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Ayarlar</h2>
        <p className="text-sm text-muted-foreground">Hesap ve workspace ayarlarınızı yönetin</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} orientation={wideSettingsNav ? 'vertical' : 'horizontal'} className="flex flex-col gap-6 xl:flex-row">
        <TabsList className="flex h-fit w-full max-w-full flex-wrap justify-start gap-1 overflow-hidden rounded-lg bg-muted/50 p-1 xl:h-fit xl:w-56 xl:flex-col xl:flex-nowrap">
          {settingsGroups.map((group) => (
            <div key={group.id} role="group" aria-labelledby={`settings-group-${group.id}`} className="w-full min-w-0 space-y-1">
              <p id={`settings-group-${group.id}`} className="px-2 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground first:pt-1">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1 xl:flex-col">
                {group.items.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="h-auto w-max flex-none shrink-0 justify-start gap-2 text-xs xl:h-9 xl:w-full xl:flex-none"
                  >
                    <t.icon className="w-3.5 h-3.5" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </div>
            </div>
          ))}
        </TabsList>

        <div className="min-w-0 flex-1 pb-12">
          <TabsContent value="account" className="mt-0">
            <AccountSettings />
          </TabsContent>
          <TabsContent value="workspace" className="mt-0">
            <WorkspaceSettings />
          </TabsContent>
          <TabsContent value="branding" className="mt-0">
            <BrandingSettings />
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <SecuritySettings />
          </TabsContent>
          <TabsContent value="email" className="mt-0">
            <EmailSettings />
          </TabsContent>
          <TabsContent value="ldap" className="mt-0">
            <LdapSettings />
          </TabsContent>
          <TabsContent value="appearance" className="mt-0">
            <AppearanceSettings onOpenBranding={() => setTab('branding')} />
          </TabsContent>
          <TabsContent value="notifications" className="mt-0">
            <NotificationSettings />
          </TabsContent>
          <TabsContent value="billing" className="mt-0">
            <BillingSettings />
          </TabsContent>
          <TabsContent value="system" className="mt-0">
            <SystemSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div>
        <h3 className="font-semibold">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Separator />
      {children}
    </Card>
  )
}

function AccountSettings() {
  const { user } = useApp()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || null)
  const initials = (user?.name || user?.email || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const handleAvatarChange = async (assetId: string | null) => {
    const nextUrl = assetId ? `/api/media/${assetId}?scope=global` : null
    try {
      await api('/api/auth/me', { method: 'PATCH', body: JSON.stringify({ avatarUrl: nextUrl }) })
      setAvatarUrl(nextUrl)
      toast({ title: assetId ? 'Profil fotoğrafı güncellendi' : 'Profil fotoğrafı kaldırıldı' })
    } catch (err: any) {
      toast({ title: 'Profil fotoğrafı kaydedilemedi', description: err.message, variant: 'destructive' })
    }
  }

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => {
      setSaving(false)
      toast({ title: 'Profil kaydedildi' })
    }, 800)
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Profil" description="Kişisel bilgilerinizi güncelleyin">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            {avatarUrl && <AvatarImage src={avatarUrl} alt="Profil fotoğrafı" />}
            <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-primary-foreground text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">Profil fotoğrafı</p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG · Max 2MB</p>
          </div>
        </div>

        <MediaPicker formId={null} scope="global" value={avatarUrl?.match(/^\/api\/media\/([^?]+)/)?.[1] || null} onChange={handleAvatarChange} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ad Soyad</Label>
            <Input defaultValue={user?.name || ''} />
          </div>
          <div className="space-y-2">
            <Label>E-posta</Label>
            <Input defaultValue={user?.email || ''} type="email" />
          </div>
          <div className="space-y-2">
            <Label>Dil</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="tr">Türkçe</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Zaman Dilimi</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Değişiklikleri Kaydet
        </Button>
      </SectionCard>

      <SectionCard title="Parola Değiştir">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Mevcut Parola</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Yeni Parola</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Yeni Parola (Tekrar)</Label>
              <Input type="password" placeholder="••••••••" />
            </div>
          </div>
        </div>
        <Button variant="outline" disabled aria-label="Parolayı Güncelle (yakında)" title="Parola yönetimi (yakında)">Parolayı Güncelle (yakında)</Button>
      </SectionCard>

      <SectionCard title="Aktif Oturumlar">
        <div className="space-y-2">
          {[
            { device: 'Chrome - macOS', location: 'İstanbul, TR', lastActive: 'Şimdi', current: true },
            { device: 'Safari - iPhone', location: 'İstanbul, TR', lastActive: '2 saat önce' },
            { device: 'Firefox - Linux', location: 'Ankara, TR', lastActive: '1 gün önce' },
          ].map((s, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium flex items-center gap-2">
                  {s.device}
                  {s.current && <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Bu cihaz</Badge>}
                </div>
                <div className="text-xs text-muted-foreground">{s.location} · {s.lastActive}</div>
              </div>
              {!s.current && (
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" disabled aria-label={`${s.device} oturumunu sonlandır (yakında)`} title="Oturum yönetimi (yakında)">
                  Sonlandır (yakında)
                </Button>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function WorkspaceSettings() {
  const { workspace, user } = useApp()
  return (
    <div className="space-y-6">
      <SectionCard title="Workspace Bilgileri">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Workspace Adı</Label>
            <Input defaultValue={workspace?.name || ''} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input defaultValue={workspace?.slug || ''} className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">{workspace?.plan}</Badge>
              <Button variant="outline" size="sm" className="text-xs" disabled aria-label="Workspace planını yükseltme (yakında)" title="Plan yönetimi (yakında)">Yükselt (yakında)</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Durum</Label>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> Aktif
            </Badge>
          </div>
        </div>
        <Button className="gap-2" disabled aria-label="Workspace ayarlarını kaydetme (yakında)" title="Workspace ayarları (yakında)">
          <Save className="w-4 h-4" /> Kaydet (yakında)
        </Button>
      </SectionCard>

      <SectionCard title="Kullanım İstatistikleri">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Form', value: '5', limit: '∞', icon: Database },
            { label: 'Bu Ay Yanıt', value: '247', limit: '10.000', icon: Zap },
            { label: 'Depolama', value: '1.2 GB', limit: '50 GB', icon: Database },
            { label: 'Takım Üyesi', value: '7', limit: '25', icon: UserIcon },
          ].map((s, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <s.icon className="w-4 h-4 text-primary mb-2" />
              <div className="text-xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">/ {s.limit}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {user?.role === 'owner' && <DangerousZone workspaceSlug={workspace?.slug || ''} adminEmail={user.email} />}
    </div>
  )
}

function DangerousZone({ workspaceSlug, adminEmail }: { workspaceSlug: string; adminEmail: string }) {
  const { toast } = useToast()
  const [action, setAction] = useState<'archive_workspace' | 'delete_workspace'>('delete_workspace')
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [requesting, setRequesting] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const phrase = action === 'delete_workspace' ? 'SİL' : 'ARŞİVLE'
  const requestCode = async (nextAction: 'archive_workspace' | 'delete_workspace') => {
    setAction(nextAction)
    setChallengeId(null)
    setCode('')
    setConfirmation('')
    setRequesting(true)
    try {
      const data = await api('/api/workspace/dangerous-actions', { method: 'POST', body: JSON.stringify({ intent: 'request_code', action: nextAction }) })
      setChallengeId(data.challengeId)
      setMaskedEmail(data.email)
      toast({ title: 'Doğrulama kodu istendi', description: `${data.email} adresine gönderildi.` })
    } catch (error: any) {
      toast({ title: 'Kod gönderilemedi', description: error.message, variant: 'destructive' })
    } finally {
      setRequesting(false)
    }
  }

  const confirmAction = async () => {
    if (!challengeId) return
    setConfirming(true)
    try {
      await api('/api/workspace/dangerous-actions', { method: 'POST', body: JSON.stringify({ intent: 'confirm', action, challengeId, code, confirmation }) })
      toast({ title: action === 'delete_workspace' ? 'Workspace silindi' : 'Workspace arşivlendi' })
      window.location.reload()
    } catch (error: any) {
      toast({ title: 'İşlem gerçekleştirilemedi', description: error.message, variant: 'destructive' })
    } finally {
      setConfirming(false)
    }
  }

  return (
    <SectionCard title="Tehlikeli Bölge" description="Bu işlemler geri alınamaz ve yalnızca hesap admini tarafından başlatılabilir">
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Geri alınamaz işlemler</AlertTitle>
        <AlertDescription>Tek tıkla silme yoktur. İşlem için hesap admini e-postasına gönderilen tek kullanımlık kod ve aşağıdaki açık onay birlikte gerekir.</AlertDescription>
      </Alert>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Workspace&apos;i Arşivle</div>
            <div className="text-xs text-muted-foreground">Tüm formlar arşivlenir ve yayınları durur.</div>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full border-amber-300 text-amber-700 hover:bg-amber-500/10 sm:w-auto" onClick={() => void requestCode('archive_workspace')} disabled={requesting}>
            <MailCheck className="mr-1.5 h-4 w-4" /> Kod iste
          </Button>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium text-red-600 dark:text-red-400">Workspace&apos;i Kalıcı Olarak Sil</div>
            <div className="text-xs text-muted-foreground">Formlar, yanıtlar, medya ve workspace verileri silinir.</div>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full border-red-300 text-red-600 hover:bg-red-500/10 sm:w-auto" onClick={() => void requestCode('delete_workspace')} disabled={requesting}>
            <MailCheck className="mr-1.5 h-4 w-4" /> Kod iste
          </Button>
        </div>
      </div>
      {challengeId && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <p className="text-sm font-medium">Admin e-postası doğrulaması</p>
          <p className="text-xs text-muted-foreground">Kod {maskedEmail || adminEmail} adresine gönderildi. Kod 10 dakika geçerlidir ve tek kullanımlıktır.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dangerous-action-code">6 haneli kod</Label>
              <Input id="dangerous-action-code" inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dangerous-action-confirmation">Onay metni: {phrase}</Label>
              <Input id="dangerous-action-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value.toLocaleUpperCase('tr-TR'))} placeholder={phrase} />
            </div>
          </div>
          <Button type="button" variant="destructive" className="w-full sm:w-auto" onClick={() => void confirmAction()} disabled={confirming || code.length !== 6 || confirmation !== phrase}>
            {confirming ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-1.5 h-4 w-4" />}
            Doğrula ve işlemi uygula
          </Button>
        </div>
      )}
    </SectionCard>
  )
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="İki Adımlı Doğrulama (2FA)">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="font-medium text-sm">TOTP / Authenticator</div>
              <div className="text-xs text-muted-foreground">Google Authenticator, Authy, vb.</div>
            </div>
          </div>
          <Switch disabled aria-label="TOTP kurulumu (yakında)" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Key className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium text-sm">Passkey</div>
              <div className="text-xs text-muted-foreground">Biyometrik doğrulama</div>
            </div>
          </div>
          <Button variant="outline" size="sm" disabled aria-label="Passkey kurulumu (yakında)" title="Passkey kurulumu (yakında)">Kur (yakında)</Button>
        </div>
      </SectionCard>

      <SectionCard title="Güvenlik Politikaları">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Başarısız giriş limiti</div>
              <div className="text-xs text-muted-foreground">5 deneme sonra 15dk kilit</div>
            </div>
            <Switch defaultChecked disabled aria-label="Başarısız giriş limiti (yakında)" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">IP kısıtlaması</div>
              <div className="text-xs text-muted-foreground">Belirli IP'lerden erişim</div>
            </div>
            <Switch disabled aria-label="IP kısıtlaması (yakında)" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Otomatik çıkış</div>
              <div className="text-xs text-muted-foreground">30 dakika hareketsizlik</div>
            </div>
            <Switch defaultChecked disabled aria-label="Otomatik çıkış (yakında)" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Denetim ve veri saklama" description="Denetim kayıtlarının saklama kapsamı">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">Audit log saklama</div>
            <div className="text-xs text-muted-foreground">Gün sayısı</div>
          </div>
          <div className="flex items-center gap-2">
            <Input defaultValue={365} type="number" min={1} className="w-24" aria-label="Audit log saklama gün sayısı" />
            <span className="text-xs text-muted-foreground">gün</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="KVKK & Veri Koruma">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground mb-1">Veri Saklama Süresi</div>
              <select className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm">
                <option>6 ay</option>
                <option>1 yıl</option>
                <option>3 yıl</option>
                <option>Sınırsız</option>
              </select>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground mb-1">Veri Lokasyonu</div>
              <select className="w-full h-8 px-2 rounded-md border border-input bg-background text-sm">
                <option>Türkiye (Hostinger TR)</option>
                <option>AB (GDPR)</option>
                <option>ABD</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Aydınlatma metni zorunlu</div>
              <div className="text-xs text-muted-foreground">Tüm formlarda KVKK onayı</div>
            </div>
            <Switch defaultChecked disabled aria-label="Aydınlatma metni zorunluluğu (yakında)" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Otomatik anonimleştirme</div>
              <div className="text-xs text-muted-foreground">Süre dolunca kişisel verileri anonimleştir</div>
            </div>
            <Switch defaultChecked disabled aria-label="Otomatik anonimleştirme (yakında)" />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function EmailSettings() {
  const isConfigured = !!(typeof process !== 'undefined' && (process as any).env?.SMTP_HOST)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateDefinition | null>(null)
  const [templates, setTemplates] = useState<EmailTemplateDefinition[]>([
    { name: 'Yeni Yanıt Bildirimi', desc: 'Admin için yeni yanıt geldiğinde', subject: 'Yeni yanıt alındı', body: 'Formunuza yeni bir yanıt geldi.', plainTextBody: 'Formunuza yeni bir yanıt geldi.', guidance: { trigger: 'Yeni yanıt başarıyla işlendiğinde', recipient: 'Workspace yetkilileri', messageClass: 'notification', senderProfile: 'SMTP ayarlarında tanımlı profil' } },
    { name: 'Kullanıcı Onayı', desc: 'Formu doldurana teşekkür', subject: 'Yanıtınız alınmıştır', body: 'Katılımınız başarıyla kaydedildi.', plainTextBody: 'Katılımınız başarıyla kaydedildi.', guidance: { trigger: 'Form yanıtı başarıyla kaydedildiğinde', recipient: 'Katılımcının formdaki e-posta adresi', messageClass: 'notification', senderProfile: 'SMTP ayarlarında tanımlı profil' } },
    { name: 'Şifre Sıfırlama', desc: 'Şifre kurtarma bağlantısı', subject: 'Şifre sıfırlama bağlantınız', body: 'Şifrenizi yenilemek için bağlantıyı kullanın.', plainTextBody: 'Şifrenizi yenilemek için bağlantıyı kullanın.', guidance: { trigger: 'Şifre sıfırlama talebi doğrulandığında', recipient: 'Talep sahibi kullanıcı', messageClass: 'transactional', senderProfile: 'SMTP ayarlarında tanımlı profil' } },
    { name: 'Davet E-postası', desc: 'Workspace daveti', subject: 'Workspace davetiniz', body: 'Workspace davetini kabul etmek için bağlantıyı kullanın.', plainTextBody: 'Workspace davetini kabul etmek için bağlantıyı kullanın.', guidance: { trigger: 'Workspace daveti oluşturulduğunda', recipient: 'Davet edilen kullanıcı', messageClass: 'transactional', senderProfile: 'SMTP ayarlarında tanımlı profil' } },
  ])
  const { toast } = useToast()
  return (
    <div className="space-y-6">
      {!isConfigured && <div className="px-3 py-2 rounded bg-amber-500/10 text-amber-600 text-xs border border-amber-500/20">DEFERRED — SMTP henüz bağlı değil, yapılandırma bekleniyor</div>}
      <SectionCard title="SMTP Ayarları" description="E-posta gönderimi için SMTP yapılandırması">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>SMTP Sunucu</Label>
            <Input placeholder="smtp.hostinger.com" defaultValue="smtp.hostinger.com" />
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input placeholder="465" defaultValue="465" type="number" />
          </div>
          <div className="space-y-2">
            <Label>Şifreleme</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="ssl">SSL</option>
              <option value="tls">TLS</option>
              <option value="none">Yok</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Kullanıcı Adı</Label>
            <Input placeholder="noreply@mavenforms.com" />
          </div>
          <div className="space-y-2">
            <Label>Parola</Label>
            <Input type="password" placeholder="••••••••" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Gönderen Adı</Label>
            <Input placeholder="MavenForms" defaultValue="MavenForms" />
            <p className="text-xs text-muted-foreground">E-posta alıcısının göreceği gönderen adı; uygulama markasından bağımsızdır.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            className="gap-2"
            disabled
            title="SMTP yapılandırması bu sürümde saklanmıyor"
          >
            <Save className="w-4 h-4" /> Kaydet
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled
            title="SMTP gönderimi bu sürümde etkin değil"
          >
            <Mail className="w-4 h-4" /> Test E-postası Gönder
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Gerçek e-posta gönderimi henüz etkin değil; SMTP doğrulama ve outbox fazı tamamlandığında açılacaktır.
        </p>
        <p className="text-xs text-muted-foreground">
          SMTP ayarları bu sürümde kalıcı olarak saklanmıyor; yapılandırma API&apos;si hazır olduğunda etkinleştirilecektir.
        </p>
      </SectionCard>

      <SectionCard title="E-posta Şablonları">
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.name} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditingTemplate(t)}>Düzenle</Button>
            </div>
          ))}
        </div>
      </SectionCard>
      <EmailTemplateEditor
        key={editingTemplate?.name || 'email-template-editor-closed'}
        template={editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onDuplicate={draft => {
          if (!editingTemplate) return
          const copyNamePrefix = `${editingTemplate.name} — Kopya`
          const copyIndex = templates.filter(template => template.name.startsWith(copyNamePrefix)).length + 1
          setTemplates(current => [...current, {
            ...editingTemplate,
            ...draft,
            name: `${copyNamePrefix} ${copyIndex}`,
            desc: `${editingTemplate.desc} (oturum taslağı)`,
          }])
          setEditingTemplate(null)
          toast({ title: 'Taslak kopyalandı', description: 'Kopya bu oturumda oluşturuldu; kalıcı API kaydı henüz açık değil.', variant: 'success' })
        }}
        onSave={draft => {
          if (!editingTemplate) return
          setTemplates(current => current.map(template => template.name === editingTemplate.name ? { ...template, ...draft } : template))
          setEditingTemplate(null)
          toast({ title: 'Taslak güncellendi', description: 'Bu oturumdaki taslak güncellendi; kalıcı API kaydı henüz açık değil.', variant: 'success' })
        }}
      />
    </div>
  )
}

function LdapSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="LDAP / Active Directory" description="Kurumsal dizin entegrasyonu">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Host</Label>
            <Input placeholder="ldap.sirket.com" />
          </div>
          <div className="space-y-2">
            <Label>Port</Label>
            <Input placeholder="389" defaultValue="389" type="number" />
          </div>
          <div className="space-y-2">
            <Label>Şifreleme</Label>
            <select className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm">
              <option value="none">Yok</option>
              <option value="ssl">SSL (LDAPS)</option>
              <option value="starttls">StartTLS</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Base DN</Label>
            <Input placeholder="dc=sirket,dc=com" />
          </div>
          <div className="space-y-2">
            <Label>Suffix</Label>
            <Input placeholder="@sirket.com" />
          </div>
          <div className="space-y-2">
            <Label>Gerekli Gruplar</Label>
            <Input placeholder="form-users, admins" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Exclusive mode</div>
            <div className="text-xs text-muted-foreground">Sadece LDAP kullanıcıları giriş yapabilir</div>
          </div>
          <Switch disabled aria-label="LDAP exclusive mode (yakında)" />
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" disabled aria-label="LDAP ayarlarını kaydetme (yakında)" title="LDAP ayarları (yakında)"><Save className="w-4 h-4" /> Kaydet (yakında)</Button>
          <Button variant="outline" className="gap-2" disabled aria-label="LDAP bağlantı testi (yakında)" title="LDAP bağlantı testi (yakında)"><Server className="w-4 h-4" /> Bağlantıyı Test Et (yakında)</Button>
        </div>
      </SectionCard>
    </div>
  )
}

function AppearanceSettings({ onOpenBranding }: { onOpenBranding: () => void }) {
  const { theme, setTheme } = useApp()
  return (
    <div className="space-y-6">
      <SectionCard title="Uygulama teması" description="Panel ve giriş ekranı görünümünü özelleştirin; formun public teması Form Builder içindeki Tema sekmesindedir.">
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', name: 'Açık', colors: ['#ffffff', '#f3f4f6', '#10b981'] },
            { id: 'dark', name: 'Koyu', colors: ['#1f2937', '#374151', '#6366f1'] },
            { id: 'vibrant', name: 'Canlı', colors: ['#7c3aed', '#ec4899', '#f59e0b'] },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id as any)
                document.documentElement.classList.remove('light', 'dark', 'vibrant')
                document.documentElement.classList.add(t.id)
              }}
              className={`rounded-lg border-2 p-4 transition-colors ${theme === t.id ? 'border-primary bg-primary/5' : 'border-border'}`}
            >
              <div className="flex gap-1 mb-2 justify-center">
                {t.colors.map((c, i) => (
                  <div key={i} className="w-6 h-6 rounded-full ring-2 ring-background" style={{ backgroundColor: c }} />
                ))}
              </div>
              <div className="text-sm font-medium text-center">{t.name}</div>
              {theme === t.id && <CheckCircle2 className="w-4 h-4 text-primary mx-auto mt-1" />}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Marka" description="Logo ve marka renkleri">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center">
                <Palette className="w-6 h-6 text-muted-foreground" />
              </div>
              <Button type="button" variant="outline" onClick={onOpenBranding}>Marka & Logo ayarlarını aç</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Marka Rengi</Label>
            <div className="flex items-center gap-2">
              <input type="color" defaultValue="#10b981" className="w-12 h-9 rounded border border-border" />
              <Input defaultValue="#10b981" className="font-mono w-32" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Uygulama markası</Label>
            <Input defaultValue="Maven Event Platform" aria-label="Uygulama markası" />
            <p className="text-xs text-muted-foreground">Panel ve giriş ekranındaki marka adıdır; SMTP gönderen kimliğinden bağımsızdır.</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Bildirim Tercihleri">
        <div className="space-y-4">
          {[
            { label: 'Yeni form yanıtı', desc: 'Her yeni yanıt geldiğinde' },
            { label: 'Ödeme alındı', desc: 'Başarılı ödemede' },
            { label: 'Onay bekleyen yanıt', desc: 'İnceleme gerektiğinde' },
            { label: 'Form hatası', desc: 'Form gönderilemezse' },
            { label: 'Haftalık özet', desc: 'Pazartesi sabahı özet' },
            { label: 'Güvenlik uyarıları', desc: 'Şüpheli aktivite' },
          ].map((n, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{n.label}</div>
                  <div className="text-xs text-muted-foreground">{n.desc}</div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Mail className="w-2.5 h-2.5" /> E-posta
                  </Badge>
                  <Switch defaultChecked={i < 4} disabled aria-label={`${n.label} bildirimi (yakında)`} />
                </div>
              </div>
              {i < 5 && <Separator />}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  )
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Mevcut Plan">
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-chart-3/5 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 mb-2">Business Plan</Badge>
              <div className="text-2xl font-bold">₺499<span className="text-sm font-normal text-muted-foreground">/ay</span></div>
            </div>
            <Button disabled aria-label="Planı yükseltme (yakında)" title="SaaS plan yönetimi (yakında)">Planı Yükselt (yakında)</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {['Sınırsız form', '10.000 yanıt/ay', '50 GB depolama', '25 takım üyesi', 'Özel tema', 'Öncelikli destek'].map((f, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {f}
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Ödeme Yöntemi">
        <Alert className="border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20">
          <ShieldCheck className="text-emerald-600" />
          <AlertTitle>Faturalama sağlayıcısı henüz bağlanmadı</AlertTitle>
          <AlertDescription>
            <strong className="font-bold text-foreground">Kart numarası, son kullanma tarihi ve CVV/CVC MavenForms uygulamasında hiçbir şekilde tutulmaz.</strong>
            {' '}Faturalama bağlantısı açıldığında ödeme bilgileri sağlayıcının güvenli ekranında işlenir; MavenForms yalnızca gerekli sağlayıcı referansını ve durumu saklar.
          </AlertDescription>
        </Alert>
        <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-border p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">Ödeme yöntemi yok</div>
              <div className="text-xs text-muted-foreground">Güvenli faturalama bağlantısı bekleniyor</div>
            </div>
          </div>
          <Badge variant="outline">Planlandı</Badge>
        </div>
      </SectionCard>

      <SectionCard title="Fatura Geçmişi">
        <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Fatura geçmişi, güvenli faturalama sağlayıcısı bağlantısı tamamlandığında gerçek verilerle gösterilecektir.
          <Badge variant="outline" className="ml-2">Planlandı</Badge>
        </div>
      </SectionCard>
    </div>
  )
}

function SystemSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Varsayılan Form Ayarları">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Captcha varsayılan</div>
              <div className="text-xs text-muted-foreground">Yeni formlarda otomatik aktif</div>
            </div>
            <Switch defaultChecked disabled aria-label="Captcha varsayılanı (yakında)" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Dosya yükleme limiti (MB)</div>
              <div className="text-xs text-muted-foreground">Maksimum dosya boyutu</div>
            </div>
            <div className="flex items-center gap-2">
              <Input defaultValue={10} type="number" min={1} className="w-24" aria-label="Dosya yükleme limiti MB" placeholder="MB" />
              <span className="text-xs text-muted-foreground">MB</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Yedekleme" description="Yedekleme özelliği henüz bağlı değil">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Otomatik yedek</div>
              <div className="text-xs text-muted-foreground">Günlük yedek al</div>
            </div>
            <Switch disabled aria-label="Otomatik yedekleme (yakında)" />
          </div>
          <Separator />
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-200" role="status">
            Henüz doğrulanmış yedek yok. Yedekleme servisi bağlandığında son başarılı yedek ve boyutu burada gösterilir.
          </div>
          <Button variant="outline" className="gap-2 w-full" disabled aria-label="Şimdi yedekleme (yakında)" title="Yedekleme (yakında)">
            <Database className="w-4 h-4" /> Şimdi Yedekle (yakında)
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Sistem Bilgisi">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-muted-foreground">Sürüm</div>
            <div className="font-medium font-mono">v1.0.0</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-muted-foreground">Sunucu</div>
            <div className="font-medium">Hostinger VPS</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-muted-foreground">Veritabanı</div>
            <div className="font-medium">SQLite (dev)</div>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="text-muted-foreground">Bölge</div>
            <div className="font-medium">Europe/Istanbul</div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function BrandingSettings() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api('/api/branding')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const update = (key: string, value: any) => {
    setData((prev: any) => (prev ? { ...prev, [key]: value } : prev))
  }

  const mediaIdFromValue = (value: unknown) => {
    if (typeof value !== 'string') return null
    return value.match(/^\/api\/media\/([^/?]+)(?:\?.*)?$/)?.[1] || null
  }

  const externalUrlValue = (value: unknown) => typeof value === 'string' && value.startsWith('https://') ? value : ''

  const updateBrandingMedia = (mediaKey: string, urlKey: string, assetId: string | null) => {
    setData((prev: any) => {
      if (!prev) return prev
      const previousUrl = prev[urlKey]
      const fallbackUrl = typeof previousUrl === 'string' && previousUrl.startsWith('/api/media/') ? null : previousUrl
      return { ...prev, [mediaKey]: assetId, [urlKey]: assetId ? null : fallbackUrl }
    })
  }

  const updateBrandingExternalUrl = (mediaKey: string, urlKey: string, value: string) => {
    setData((prev: any) => (prev ? { ...prev, [mediaKey]: null, [urlKey]: value || null } : prev))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api('/api/branding', {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      // Clear branding cache so changes reflect immediately
      clearBrandingCache()
      toast({ title: 'Marka ayarları kaydedildi', description: 'Logo ve görünüm güncellendi' })
      // Reload to reflect branding changes
      setTimeout(() => window.location.reload(), 1000)
    } catch (err: any) {
      toast({ title: 'Kaydetme hatası', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-5 h-32">
            <div className="shimmer h-full w-full rounded" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      <SectionCard title="Uygulama Markası" description="Sol üstteki logo ve uygulama adı">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Uygulama Adı</Label>
            <Input
              value={data.appName || ''}
              onChange={(e) => update('appName', e.target.value)}
              placeholder="Maven Event Platform"
            />
            <p className="text-xs text-muted-foreground">Sidebar'da ve login ekranında görünür</p>
          </div>

          <div className="space-y-2">
            <Label>Tagline (Alt Başlık)</Label>
            <Input
              value={data.appTagline || ''}
              onChange={(e) => update('appTagline', e.target.value)}
              placeholder="EVENT PLATFORM"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo — Medya klasöründen seç veya yükle</Label>
            <MediaPicker
              formId={null}
              scope="global"
              value={data.logoMediaId || mediaIdFromValue(data.logoUrl)}
              onChange={(id) => updateBrandingMedia('logoMediaId', 'logoUrl', id)}
            />
            <div className="space-y-1 border-t border-border/60 pt-3">
              <Label className="text-xs">Harici görsel URL'si (alternatif)</Label>
              <Input value={externalUrlValue(data.logoUrl)} onChange={(e) => updateBrandingExternalUrl('logoMediaId', 'logoUrl', e.target.value)} placeholder="https://example.com/logo.png" />
              <p className="text-[11px] text-muted-foreground">Ortak medya klasöründen seçim yapmazsanız HTTPS bağlantısı kullanılır.</p>
            </div>
            {(data.logoMediaId || externalUrlValue(data.logoUrl)) && (
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <img
                  src={data.logoMediaId ? `/api/media/${data.logoMediaId}?scope=global` : data.logoUrl}
                  alt="Logo preview"
                  className="max-h-16 w-auto"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Logo (Koyu Tema) — seç veya yükle</Label>
            <MediaPicker
              formId={null}
              scope="global"
              value={data.logoDarkMediaId || mediaIdFromValue(data.logoDarkUrl)}
              onChange={(id) => updateBrandingMedia('logoDarkMediaId', 'logoDarkUrl', id)}
            />
            <div className="space-y-1 border-t border-border/60 pt-3">
              <Label className="text-xs">Harici görsel URL'si (alternatif)</Label>
              <Input value={externalUrlValue(data.logoDarkUrl)} onChange={(e) => updateBrandingExternalUrl('logoDarkMediaId', 'logoDarkUrl', e.target.value)} placeholder="https://example.com/logo-dark.png" />
              <p className="text-[11px] text-muted-foreground">Ortak medya klasöründen seçim yapmazsanız HTTPS bağlantısı kullanılır.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Favicon — seç veya yükle</Label>
            <MediaPicker
              formId={null}
              scope="global"
              value={data.faviconMediaId || mediaIdFromValue(data.faviconUrl)}
              onChange={(id) => updateBrandingMedia('faviconMediaId', 'faviconUrl', id)}
            />
            <div className="space-y-1 border-t border-border/60 pt-3">
              <Label className="text-xs">Harici görsel URL'si (alternatif)</Label>
              <Input value={externalUrlValue(data.faviconUrl)} onChange={(e) => updateBrandingExternalUrl('faviconMediaId', 'faviconUrl', e.target.value)} placeholder="https://example.com/favicon.png" />
              <p className="text-[11px] text-muted-foreground">Ortak medya klasöründen seçim yapmazsanız HTTPS bağlantısı kullanılır.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Marka Rengi (Primary)</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.primaryColor || '#10b981'}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="w-12 h-9 rounded border border-border cursor-pointer"
              />
              <Input
                value={data.primaryColor || ''}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Login Ekranı Markalaması" description="İlk açılış ekranındaki metinler ve görseller">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Login Hero Başlık</Label>
            <Textarea
              value={data.loginTitle || ''}
              onChange={(e) => update('loginTitle', e.target.value)}
              placeholder="Etkinliklerinizi yönetin, kayıtları otomatikleştirin."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Son 2 kelime gradient renkli olur</p>
          </div>

          <div className="space-y-2">
            <Label>Login Alt Başlık</Label>
            <Textarea
              value={data.loginSubtitle || ''}
              onChange={(e) => update('loginSubtitle', e.target.value)}
              placeholder="Modern, mobil öncelikli etkinlik platformu..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Login Hero Görseli — seç veya yükle</Label>
            <MediaPicker
              formId={null}
              scope="global"
              value={data.loginHeroMediaId || mediaIdFromValue(data.loginHeroImage)}
              onChange={(id) => updateBrandingMedia('loginHeroMediaId', 'loginHeroImage', id)}
            />
            <div className="space-y-1 border-t border-border/60 pt-3">
              <Label className="text-xs">Harici görsel URL'si (alternatif)</Label>
              <Input value={externalUrlValue(data.loginHeroImage)} onChange={(e) => updateBrandingExternalUrl('loginHeroMediaId', 'loginHeroImage', e.target.value)} placeholder="https://example.com/login-hero.jpg" />
              <p className="text-[11px] text-muted-foreground">Ortak medya klasöründen seçim yapmazsanız HTTPS bağlantısı kullanılır.</p>
            </div>
            <p className="text-xs text-muted-foreground">Login ekranının sol panelinde gösterilir.</p>
          </div>

          <div className="space-y-2">
            <Label>Login Arka Plan Rengi</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={data.loginBgColor || '#10b981'}
                onChange={(e) => update('loginBgColor', e.target.value)}
                className="w-12 h-9 rounded border border-border cursor-pointer"
              />
              <Input
                value={data.loginBgColor || ''}
                onChange={(e) => update('loginBgColor', e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Login özellikleri göster</Label>
              <p className="text-xs text-muted-foreground">Kvkk, hızlı kurulum vb. kartlar</p>
            </div>
            <Switch
              checked={data.loginShowFeatures}
              onCheckedChange={(c) => update('loginShowFeatures', c)}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Footer & Domain" description="Sayfa altı ve özel domain">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Footer Metni</Label>
            <Input
              value={data.footerText || ''}
              onChange={(e) => update('footerText', e.target.value)}
              placeholder="© 2026 Şirket Adı"
            />
          </div>

          <div className="space-y-2">
            <Label>Özel Domain</Label>
            <Input
              value={data.customDomain || ''}
              onChange={(e) => update('customDomain', e.target.value)}
              placeholder="forms.sirketiniz.com"
            />
            <p className="text-xs text-muted-foreground">CNAME ile yönlendirme yapın</p>
          </div>
        </div>
      </SectionCard>

      <div className="flex gap-2 rounded-lg border border-border bg-background/95 p-2 shadow-sm">
        <Button onClick={handleSave} disabled={saving} className="gap-2 flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Kaydediliyor...' : 'Marka Ayarlarını Kaydet'}
        </Button>
      </div>
    </div>
  )
}
