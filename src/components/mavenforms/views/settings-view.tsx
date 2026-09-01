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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { api } from '@/lib/api-client'
import { clearBrandingCache } from '@/components/mavenforms/brand'
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
} from 'lucide-react'

export function SettingsView() {
  const [tab, setTab] = useState('account')
  const { user, workspace } = useApp()
  const { toast } = useToast()

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-1">Ayarlar</h2>
        <p className="text-sm text-muted-foreground">Hesap ve workspace ayarlarınızı yönetin</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="flex flex-col lg:flex-row gap-6">
        <TabsList className="lg:w-56 lg:h-auto flex lg:flex-col gap-1 p-1 bg-muted/50 rounded-lg h-fit overflow-x-auto">
          {[
            { id: 'account', label: 'Hesap', icon: UserIcon },
            { id: 'workspace', label: 'Workspace', icon: Building },
            { id: 'branding', label: 'Marka & Logo', icon: Palette },
            { id: 'security', label: 'Güvenlik', icon: Shield },
            { id: 'email', label: 'E-posta / SMTP', icon: Mail },
            { id: 'ldap', label: 'LDAP / AD', icon: Server },
            { id: 'appearance', label: 'Tema', icon: Palette },
            { id: 'notifications', label: 'Bildirimler', icon: Bell },
            { id: 'billing', label: 'Faturalama', icon: CreditCard },
            { id: 'system', label: 'Sistem', icon: SettingsIcon },
          ].map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="justify-start gap-2 text-xs lg:w-full w-auto"
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 min-w-0">
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
            <AppearanceSettings />
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
    <Card className="p-6 space-y-4">
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
  const initials = (user?.name || user?.email || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

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
            <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-primary-foreground text-lg font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <Button variant="outline" size="sm">Fotoğraf Yükle</Button>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG · Max 2MB</p>
          </div>
        </div>

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
        <Button variant="outline">Parolayı Güncelle</Button>
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
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                  Sonlandır
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
  const { workspace } = useApp()
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
              <Button variant="outline" size="sm" className="text-xs">Yükselt</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Durum</Label>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" /> Aktif
            </Badge>
          </div>
        </div>
        <Button className="gap-2">
          <Save className="w-4 h-4" /> Kaydet
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

      <SectionCard title="Tehlikeli Bölge" description="Bu işlemler geri alınamaz">
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-500/5">
            <div>
              <div className="text-sm font-medium">Workspace'i Arşivle</div>
              <div className="text-xs text-muted-foreground">Tüm formlar devre dışı kalır</div>
            </div>
            <Button variant="outline" size="sm" className="text-amber-600 border-amber-300">Arşivle</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-500/5">
            <div>
              <div className="text-sm font-medium text-red-600 dark:text-red-400">Workspace'i Sil</div>
              <div className="text-xs text-muted-foreground">Tüm veriler kalıcı olarak silinir</div>
            </div>
            <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-500/10">Sil</Button>
          </div>
        </div>
      </SectionCard>
    </div>
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
          <Switch />
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
          <Button variant="outline" size="sm">Kur</Button>
        </div>
      </SectionCard>

      <SectionCard title="Güvenlik Politikaları">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Başarısız giriş limiti</div>
              <div className="text-xs text-muted-foreground">5 deneme sonra 15dk kilit</div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">IP kısıtlaması</div>
              <div className="text-xs text-muted-foreground">Belirli IP'lerden erişim</div>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Otomatik çıkış</div>
              <div className="text-xs text-muted-foreground">30 dakika hareketsizlik</div>
            </div>
            <Switch defaultChecked />
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
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Otomatik anonimleştirme</div>
              <div className="text-xs text-muted-foreground">Süre dolunca kişisel verileri anonimleştir</div>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function EmailSettings() {
  return (
    <div className="space-y-6">
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
          </div>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2">
            <Save className="w-4 h-4" /> Kaydet
          </Button>
          <Button variant="outline" className="gap-2">
            <Mail className="w-4 h-4" /> Test E-postası Gönder
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="E-posta Şablonları">
        <div className="space-y-2">
          {[
            { name: 'Yeni Yanıt Bildirimi', desc: 'Admin için yeni yanıt geldiğinde' },
            { name: 'Kullanıcı Onayı', desc: 'Formu doldurana teşekkür' },
            { name: 'Şifre Sıfırlama', desc: 'Şifre kurtarma bağlantısı' },
            { name: 'Davet E-postası', desc: 'Workspace daveti' },
          ].map((t, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.desc}</div>
              </div>
              <Button variant="outline" size="sm">Düzenle</Button>
            </div>
          ))}
        </div>
      </SectionCard>
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
          <Switch />
        </div>
        <div className="flex gap-2">
          <Button className="gap-2"><Save className="w-4 h-4" /> Kaydet</Button>
          <Button variant="outline" className="gap-2"><Server className="w-4 h-4" /> Bağlantıyı Test Et</Button>
        </div>
      </SectionCard>
    </div>
  )
}

function AppearanceSettings() {
  const { theme, setTheme } = useApp()
  return (
    <div className="space-y-6">
      <SectionCard title="Tema" description="Workspace görünümünü özelleştirin">
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
              <Button variant="outline">Yükle</Button>
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
            <Label>Sistem E-posta Adı</Label>
            <Input defaultValue="MavenForms" />
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
                  <Switch defaultChecked={i < 4} />
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
            <Button>Planı Yükselt</Button>
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
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-medium">•••• •••• •••• 4242</div>
              <div className="text-xs text-muted-foreground">Son kullanma: 12/27</div>
            </div>
          </div>
          <Button variant="outline" size="sm">Değiştir</Button>
        </div>
      </SectionCard>

      <SectionCard title="Fatura Geçmişi">
        <div className="space-y-2">
          {[
            { date: '01.09.2026', amount: '₺499', status: 'paid' },
            { date: '01.08.2026', amount: '₺499', status: 'paid' },
            { date: '01.07.2026', amount: '₺499', status: 'paid' },
          ].map((inv, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <div className="text-sm font-medium">{inv.date}</div>
                <div className="text-xs text-muted-foreground">MavenForms Business</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">{inv.amount}</span>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Ödendi</Badge>
                <Button variant="ghost" size="sm">İndir</Button>
              </div>
            </div>
          ))}
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
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Dosya yükleme limiti</div>
              <div className="text-xs text-muted-foreground">Maksimum dosya boyutu</div>
            </div>
            <Input defaultValue={10} type="number" className="w-24" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Audit log saklama</div>
              <div className="text-xs text-muted-foreground">Gün sayısı</div>
            </div>
            <Input defaultValue={365} type="number" className="w-24" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Yedekleme" description="Otomatik veri yedekleme">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Otomatik yedek</div>
              <div className="text-xs text-muted-foreground">Günlük yedek al</div>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1">Son yedek</div>
              <div className="text-sm font-medium">3 saat önce</div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <div className="text-xs text-muted-foreground mb-1">Yedek boyutu</div>
              <div className="text-sm font-medium">125 MB</div>
            </div>
          </div>
          <Button variant="outline" className="gap-2 w-full">
            <Database className="w-4 h-4" /> Şimdi Yedekle
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
    <div className="space-y-6">
      <SectionCard title="Uygulama Markası" description="Sol üstteki logo ve uygulama adı">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Uygulama Adı</Label>
            <Input
              value={data.appName || ''}
              onChange={(e) => update('appName', e.target.value)}
              placeholder="MavenForms"
            />
            <p className="text-xs text-muted-foreground">Sidebar'da ve login ekranında görünür</p>
          </div>

          <div className="space-y-2">
            <Label>Tagline (Alt Başlık)</Label>
            <Input
              value={data.appTagline || ''}
              onChange={(e) => update('appTagline', e.target.value)}
              placeholder="FORM PLATFORM"
            />
          </div>

          <div className="space-y-2">
            <Label>Logo URL (PNG, JPG, SVG, WebP)</Label>
            <Input
              value={data.logoUrl || ''}
              onChange={(e) => update('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">Boş bırakılırsa varsayılan MavenForms logosu kullanılır</p>
            {data.logoUrl && (
              <div className="p-3 rounded-lg border border-border bg-muted/30">
                <img
                  src={data.logoUrl}
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
            <Label>Logo (Koyu Tema için) - opsiyonel</Label>
            <Input
              value={data.logoDarkUrl || ''}
              onChange={(e) => update('logoDarkUrl', e.target.value)}
              placeholder="https://example.com/logo-dark.png"
            />
          </div>

          <div className="space-y-2">
            <Label>Favicon URL</Label>
            <Input
              value={data.faviconUrl || ''}
              onChange={(e) => update('faviconUrl', e.target.value)}
              placeholder="https://example.com/favicon.ico"
            />
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
              placeholder="Formlarınızı tasarlayın, yanıtları otomatikleştirin."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Son 2 kelime gradient renkli olur</p>
          </div>

          <div className="space-y-2">
            <Label>Login Alt Başlık</Label>
            <Textarea
              value={data.loginSubtitle || ''}
              onChange={(e) => update('loginSubtitle', e.target.value)}
              placeholder="Modern, mobil öncelikli form platformu..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Login Hero Görsel URL (opsiyonel)</Label>
            <Input
              value={data.loginHeroImage || ''}
              onChange={(e) => update('loginHeroImage', e.target.value)}
              placeholder="https://example.com/hero.jpg"
            />
            <p className="text-xs text-muted-foreground">Login ekranının sol panelinde gösterilir</p>
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

      <div className="flex gap-2 sticky bottom-4">
        <Button onClick={handleSave} disabled={saving} className="gap-2 flex-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Kaydediliyor...' : 'Marka Ayarlarını Kaydet'}
        </Button>
      </div>
    </div>
  )
}
