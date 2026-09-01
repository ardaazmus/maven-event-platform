'use client'

import { useApp } from '@/lib/store'
import { MavenFormsLogo, useBranding } from '@/components/mavenforms/brand'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Plus,
  Folder as FolderIcon,
  Hash,
  BarChart3,
  Bell,
  Zap,
  ShieldCheck,
} from 'lucide-react'
import type { AppView } from '@/lib/types'

interface NavItem {
  id: AppView
  label: string
  icon: any
  badge?: string
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
  { id: 'forms', label: 'Formlar', icon: FileText },
  { id: 'submissions', label: 'Yanıtlar', icon: Activity, badge: '12' },
  { id: 'reports', label: 'Raporlar', icon: BarChart3 },
  { id: 'settings', label: 'Ayarlar', icon: Settings },
]

const secondaryItems = [
  { id: 'users' as AppView, label: 'Kullanıcılar', icon: Users },
  { id: 'audit' as AppView, label: 'Denetim', icon: ShieldCheck },
]

export function Sidebar() {
  const {
    sidebarCollapsed,
    toggleSidebar,
    view,
    setView,
    selectForm,
    folders,
    tags,
    selectedFolderId,
    selectFolder,
  } = useApp()

  const branding = useBranding()

  return (
    <aside
      className={cn(
        'flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
        sidebarCollapsed ? 'w-[68px]' : 'w-[260px]'
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border shrink-0">
        {sidebarCollapsed ? (
          <MavenFormsLogo showText={false} size={32} branding={branding} />
        ) : (
          <MavenFormsLogo size={32} branding={branding} />
        )}
      </div>

      {/* New Form Button */}
      <div className="p-3 shrink-0">
        <Button
          className="w-full gap-2"
          variant={sidebarCollapsed ? 'default' : 'default'}
          size={sidebarCollapsed ? 'icon' : 'default'}
          onClick={() => {
            setView('forms')
            // Trigger new form modal
            window.dispatchEvent(new CustomEvent('mavenforms:new-form'))
          }}
        >
          <Plus className="w-4 h-4" />
          {!sidebarCollapsed && <span>Yeni Form</span>}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="px-3 pb-3 space-y-1">
          {!sidebarCollapsed && (
            <div className="px-3 mb-2 mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Menü
            </div>
          )}
          {navItems.map((item) => {
            const active = view === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'forms') selectForm('')
                  setView(item.id)
                }}
                title={sidebarCollapsed ? item.label : undefined}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', active && 'text-sidebar-primary-foreground')} />
                {!sidebarCollapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                          active
                            ? 'bg-sidebar-primary-foreground/20 text-sidebar-primary-foreground'
                            : 'bg-sidebar-accent text-sidebar-accent-foreground'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </nav>

        {!sidebarCollapsed && folders.length > 0 && (
          <div className="px-3 pb-3">
            <div className="px-3 mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Klasörler
            </div>
            <div className="space-y-0.5">
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => selectFolder(folder.id)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors group',
                    selectedFolderId === folder.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                  )}
                >
                  <FolderIcon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: folder.color }}
                  />
                  <span className="flex-1 text-left truncate">{folder.name}</span>
                  <span className="text-[10px] text-muted-foreground">{folder.formCount}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {!sidebarCollapsed && tags.length > 0 && (
          <div className="px-3 pb-3">
            <div className="px-3 mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Etiketler
            </div>
            <div className="flex flex-wrap gap-1.5 px-3">
              {tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                  style={{
                    backgroundColor: `${tag.color}15`,
                    color: tag.color,
                    borderColor: `${tag.color}30`,
                  }}
                >
                  <Hash className="w-2.5 h-2.5" />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {!sidebarCollapsed && (
          <div className="px-3 pb-3">
            <div className="px-3 mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sistem
            </div>
            <div className="space-y-0.5">
              {secondaryItems.map((item) => {
                const active = view === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => setView(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-1.5 rounded-md text-sm transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 text-left">{item.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 shrink-0 space-y-2">
        {!sidebarCollapsed && (
          <div className="rounded-lg bg-gradient-to-br from-primary/10 to-chart-3/5 p-3 border border-primary/10">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold">Business Plan</span>
            </div>
            <p className="text-[10px] text-muted-foreground mb-2">
              Sınırsız form, 10K yanıt/ay
            </p>
            <Button size="sm" variant="outline" className="w-full h-7 text-xs">
              Planı Yükselt
            </Button>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <>
              <ChevronLeft className="w-3.5 h-3.5" />
              Daralt
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
