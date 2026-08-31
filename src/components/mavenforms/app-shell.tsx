'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { api } from '@/lib/api-client'
import type { SessionContext } from '@/lib/types'
import { Sidebar } from '@/components/mavenforms/sidebar'
import { TopBar } from '@/components/mavenforms/topbar'
import { LoginView } from '@/components/mavenforms/views/login-view'
import { DashboardView } from '@/components/mavenforms/views/dashboard-view'
import { FormsListView } from '@/components/mavenforms/views/forms-list-view'
import { FormBuilderView } from '@/components/mavenforms/views/form-builder-view'
import { SubmissionsView } from '@/components/mavenforms/views/submissions-view'
import { ReportsView } from '@/components/mavenforms/views/reports-view'
import { SettingsView } from '@/components/mavenforms/views/settings-view'
import { AuditView } from '@/components/mavenforms/views/audit-view'
import { UsersView } from '@/components/mavenforms/views/users-view'
import { MavenFormsLogo } from '@/components/mavenforms/brand'
import { Loader2 } from 'lucide-react'

export function AppShell() {
  const { initialized, init, view, theme, user } = useApp()

  useEffect(() => {
    // Apply theme on mount
    const savedTheme = localStorage.getItem('mavenforms-theme') || 'light'
    document.documentElement.classList.remove('light', 'dark', 'vibrant')
    document.documentElement.classList.add(savedTheme)
    useApp.getState().setTheme(savedTheme as any)
  }, [])

  useEffect(() => {
    // Check session
    api<SessionContext>('/api/auth/me', { skipAuth: true })
      .then((ctx) => {
        init(ctx.user, ctx.workspace)
      })
      .catch(() => {
        // Not logged in, show login
        useApp.setState({ initialized: true })
      })
  }, [])

  useEffect(() => {
    // Listen for unauthorized events
    const handler = () => {
      useApp.setState({ user: null, workspace: null, view: 'login' })
    }
    window.addEventListener('mavenforms:unauthorized', handler)
    return () => window.removeEventListener('mavenforms:unauthorized', handler)
  }, [])

  useEffect(() => {
    // Save theme preference
    localStorage.setItem('mavenforms-theme', theme)
  }, [theme])

  if (!initialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <MavenFormsLogo size={48} />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Yükleniyor...
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginView />
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden">
          {view === 'dashboard' && <DashboardView />}
          {view === 'forms' && <FormsListView />}
          {view === 'builder' && <FormBuilderView />}
          {view === 'submissions' && <SubmissionsView />}
          {view === 'reports' && <ReportsView />}
          {view === 'settings' && <SettingsView />}
          {view === 'audit' && <AuditView />}
          {view === 'users' && <UsersView />}
        </main>
      </div>
    </div>
  )
}
