'use client'

import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { api, getStoredToken } from '@/lib/api-client'
import type { SessionContext } from '@/lib/types'
import { EventBar } from '@/components/mavenforms/event-bar'
import { Sidebar } from '@/components/mavenforms/sidebar'
import { TopBar } from '@/components/mavenforms/topbar'
import { LoginView } from '@/components/mavenforms/views/login-view'
import { DashboardView } from '@/components/mavenforms/views/dashboard-view'
import { EventListView } from '@/components/mavenforms/views/event-list-view'
import { RegistrationInboxView } from '@/components/mavenforms/views/registration-inbox-view'
import { EventDashboardView } from '@/components/mavenforms/views/event-dashboard-view'
import { ProgramView } from '@/components/mavenforms/views/program-view'
import { AbstractView } from '@/components/mavenforms/views/abstract-view'
import { SponsorView } from '@/components/mavenforms/views/sponsor-view'
import { SurveyView } from '@/components/mavenforms/views/survey-view'
import { NetworkView } from '@/components/mavenforms/views/network-view'
import { BadgeStudioView } from '@/components/mavenforms/views/badge-studio-view'
import { CheckinView } from '@/components/mavenforms/views/checkin-view'
import { FloorView } from '@/components/mavenforms/views/floor-view'
import { FinanceView } from '@/components/mavenforms/views/finance-view'
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
    // Check session: only attempt if we have a token in localStorage
    const token = getStoredToken()
    if (!token) {
      // No token, skip API call and show login
      useApp.setState({ initialized: true })
      return
    }

    api<SessionContext>('/api/auth/me')
      .then((ctx) => {
        init(ctx.user, ctx.workspace)
      })
      .catch(() => {
        // Token invalid, show login
        useApp.setState({ initialized: true })
      })
  }, [])

  useEffect(() => {
    // Listen for unauthorized events
    const handler = () => {
      useApp.setState({ user: null, workspace: null, view: 'dashboard', initialized: true })
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
    <div className="mavenforms-app flex h-screen min-w-0 overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <EventBar />
        <main className="min-h-0 min-w-0 flex-1 overflow-auto">
          {view === 'dashboard' && <DashboardView />}
          {view === 'events' && <EventListView />}
          {view === 'program' && <ProgramView />}
          {view === 'abstracts' && <AbstractView />}
          {view === 'sponsors' && <SponsorView />}
          {view === 'surveys' && <SurveyView />}
          {view === 'network' && <NetworkView />}
          {view === 'registrations' && <RegistrationInboxView />}
          {view === 'event-dashboard' && <EventDashboardView />}
          {view === 'badges' && <BadgeStudioView />}
          {view === 'checkin' && <CheckinView />}
          {view === 'floor' && <FloorView />}
          {view === 'finance' && <FinanceView />}
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
