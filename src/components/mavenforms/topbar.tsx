'use client'

import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Search,
  Sun,
  Moon,
  Palette,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
  ChevronDown,
  Command,
  HelpCircle,
  Menu,
} from 'lucide-react'
import { api, setStoredToken } from '@/lib/api-client'
import { useToast } from '@/hooks/use-toast'

const viewTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Genel Bakış', subtitle: 'Workspace istatistikleri ve son aktiviteler' },
  events: { title: 'Etkinlikler', subtitle: 'Etkinlik seçin ve yönetin' },
  'event-dashboard': { title: 'Etkinlik Paneli', subtitle: 'Seçili etkinliğin özeti ve modülleri' },
  registrations: { title: 'Kayıtlar', subtitle: 'Etkinlik kayıt havuzu' },
  forms: { title: 'Formlar', subtitle: 'Tüm formlarınızı yönetin' },
  builder: { title: 'Form Builder', subtitle: 'Sürükle-bırak ile form tasarlayın' },
  submissions: { title: 'Yanıtlar', subtitle: 'Form yanıtlarını görüntüleyin ve yönetin' },
  reports: { title: 'Raporlar', subtitle: 'Grafikler ve analizler' },
  settings: { title: 'Ayarlar', subtitle: 'Workspace ve hesap ayarları' },
  users: { title: 'Kullanıcılar', subtitle: 'Takım üyeleri ve roller' },
  audit: { title: 'Denetim', subtitle: 'Sistem aktivite kayıtları' },
}

const themeIcons = { light: Sun, dark: Moon, vibrant: Palette }
const themeLabels = { light: 'Açık', dark: 'Koyu', vibrant: 'Canlı' }

export function TopBar() {
  const { user, workspace, view, theme, setTheme, logout, setView } = useApp()
  const { toast } = useToast()

  const info = viewTitles[view] || viewTitles.dashboard
  const ThemeIcon = themeIcons[theme] || Sun

  const handleLogout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' })
      setStoredToken(null)
      logout()
      toast({ title: 'Çıkış yapıldı' })
    } catch {
      setStoredToken(null)
      logout()
    }
  }

  const initials = (user?.name || user?.email || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30">
      <div className="h-full flex items-center gap-2 lg:gap-3 px-3 lg:px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 md:hidden" aria-label="Menüyü aç">
              <Menu className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>Menü</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(viewTitles).map(([id, item]) => (
              <DropdownMenuItem
                key={id}
                className="gap-2"
                onClick={() => {
                  if (id === 'forms') useApp.getState().selectForm('')
                  setView(id as any)
                }}
              >
                {item.title}
                {view === id && <span className="ml-auto text-xs text-primary">●</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Title */}
        <div className="min-w-[5.5rem] shrink-0 sm:min-w-[7rem] lg:min-w-[8rem] lg:max-w-[10rem]">
          <h1 className="text-lg font-semibold leading-tight whitespace-nowrap">{info.title}</h1>
          <p className="text-xs text-muted-foreground truncate hidden lg:block">{info.subtitle}</p>
        </div>

        {/* Search */}
        <div className="hidden min-w-0 flex-1 items-center relative max-w-sm lg:flex">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Formlarda ara..."
            className="w-full pl-9 pr-12 py-2 text-sm bg-muted/50 border border-transparent rounded-lg focus:outline-none focus:bg-background focus:border-border transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value) {
                window.dispatchEvent(
                  new CustomEvent('mavenforms:search', { detail: e.currentTarget.value })
                )
              }
            }}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-background border border-border">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>

        {/* Workspace switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 lg:flex">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                {workspace?.name?.[0]?.toUpperCase() || 'W'}
              </div>
              <span className="max-w-[120px] truncate">{workspace?.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                {workspace?.name?.[0]?.toUpperCase() || 'W'}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{workspace?.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {workspace?.plan} plan · aktif
                </div>
              </div>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm" disabled>
              <div className="w-6 h-6 rounded border border-dashed border-border flex items-center justify-center">
                +
              </div>
              Yeni workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Tema: ${themeLabels[theme]}`}>
              <ThemeIcon className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(['light', 'dark', 'vibrant'] as const).map((t) => {
              const Icon = themeIcons[t]
              return (
                <DropdownMenuItem
                  key={t}
                  onClick={() => {
                    setTheme(t)
                    document.documentElement.classList.remove('light', 'dark', 'vibrant')
                    document.documentElement.classList.add(t)
                  }}
                  className="gap-2 capitalize"
                >
                  <Icon className="w-4 h-4" />
                  {themeLabels[t]}
                  {theme === t && <span className="ml-auto text-xs text-primary">●</span>}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Bildirimler">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive ring-2 ring-background" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Bildirimler</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {[
                { title: 'Yeni form yanıtı', desc: 'Teknoloji Zirvesi 2026 - Ahmet Y.', time: '2 dk' },
                { title: 'Ödeme alındı', desc: 'VIP bilet - 1.500₺', time: '15 dk' },
                { title: 'Form yayınlandı', desc: 'Müşteri Anketi 2026', time: '1 sa' },
                { title: 'Yeni kullanıcı', desc: 'Selin Ö. workspace\'e katıldı', time: '3 sa' },
              ].map((n, i) => (
                <DropdownMenuItem key={i} className="flex-col items-start gap-1 py-2">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-sm font-medium">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground">{n.time}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{n.desc}</span>
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary" onClick={() => setView('submissions')}>
              Tümünü gör
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help */}
        <Button variant="ghost" size="icon" className="h-9 w-9 hidden sm:flex" disabled aria-label="Yardım (yakında)">
          <HelpCircle className="w-4 h-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted/50 transition-colors" aria-label={`Kullanıcı menüsü: ${user?.name || 'Kullanıcı'}`} title="Kullanıcı menüsünü aç">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-medium leading-tight max-w-[120px] truncate">
                  {user?.name || 'Kullanıcı'}
                </div>
                <div className="text-[10px] text-muted-foreground capitalize">{user?.role}</div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm" onClick={() => useApp.getState().setView('settings')}>
              <UserIcon className="w-4 h-4" /> Profilim
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-sm"
              onClick={() => useApp.getState().setView('settings')}
            >
              <SettingsIcon className="w-4 h-4" /> Hesap Ayarları
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-sm text-destructive" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
