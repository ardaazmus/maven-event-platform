'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Eye,
  Activity,
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const users = [
  { id: '1', name: 'Demo Kullanıcı', email: 'demo@mavenforms.com', role: 'owner', status: 'active', lastActive: 'Şimdi', forms: 5, submissions: 247 },
  { id: '2', name: 'Ayşe Kaya', email: 'ayse@mavenforms.com', role: 'admin', status: 'active', lastActive: '5 dk önce', forms: 8, submissions: 532 },
  { id: '3', name: 'Mehmet Demir', email: 'mehmet@mavenforms.com', role: 'form_manager', status: 'active', lastActive: '1 saat önce', forms: 12, submissions: 189 },
  { id: '4', name: 'Fatma Şahin', email: 'fatma@mavenforms.com', role: 'analyst', status: 'active', lastActive: '2 saat önce', forms: 0, submissions: 0 },
  { id: '5', name: 'Ali Arslan', email: 'ali@mavenforms.com', role: 'reviewer', status: 'active', lastActive: '3 saat önce', forms: 0, submissions: 45 },
  { id: '6', name: 'Zeynep Koç', email: 'zeynep@mavenforms.com', role: 'viewer', status: 'invited', lastActive: '-', forms: 0, submissions: 0 },
  { id: '7', name: 'Burak Aksoy', email: 'burak@mavenforms.com', role: 'viewer', status: 'suspended', lastActive: '1 hafta önce', forms: 0, submissions: 0 },
]

const roleConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  owner: { label: 'Owner', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: Crown },
  admin: { label: 'Admin', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', icon: Shield },
  form_manager: { label: 'Form Manager', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', icon: FileText },
  analyst: { label: 'Analyst', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-500/10', icon: BarChart3 },
  reviewer: { label: 'Reviewer', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', icon: Activity },
  viewer: { label: 'Viewer', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-500/10', icon: Eye },
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: 'Aktif', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  invited: { label: 'Davetli', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  suspended: { label: 'Askıya Alınmış', color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
}

export function UsersView() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold mb-1">Kullanıcılar</h2>
          <p className="text-sm text-muted-foreground">Workspace üyelerini ve rollerini yönetin</p>
        </div>
        <Button className="gap-2">
          <UserPlus className="w-4 h-4" /> Kullanıcı Davet Et
        </Button>
      </div>

      {/* Role Matrix */}
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Rol Yetki Matrisi
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 font-medium text-muted-foreground">Yetki</th>
                {Object.entries(roleConfig).map(([role, cfg]) => (
                  <th key={role} className="text-center py-2 px-3 font-medium">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center', cfg.bg)}>
                        <cfg.icon className={cn('w-3 h-3', cfg.color)} />
                      </div>
                      <span className="text-[10px]">{cfg.label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { perm: 'Form oluştur', roles: ['owner', 'admin', 'form_manager'] },
                { perm: 'Form düzenle', roles: ['owner', 'admin', 'form_manager'] },
                { perm: 'Form sil', roles: ['owner', 'admin'] },
                { perm: 'Yanıtları görüntüle', roles: ['owner', 'admin', 'form_manager', 'analyst', 'reviewer'] },
                { perm: 'Yanıt onayla', roles: ['owner', 'admin', 'reviewer'] },
                { perm: 'Raporları görüntüle', roles: ['owner', 'admin', 'analyst'] },
                { perm: 'Kullanıcı yönet', roles: ['owner', 'admin'] },
                { perm: 'Sistem ayarları', roles: ['owner'] },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-3 font-medium">{row.perm}</td>
                  {Object.keys(roleConfig).map((role) => (
                    <td key={role} className="text-center py-2 px-3">
                      {row.roles.includes(role) ? (
                        <span className="inline-flex w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 items-center justify-center text-[10px]">✓</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Users List */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Kullanıcı ara..." className="pl-9" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-40 gap-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Roller</SelectItem>
              {Object.entries(roleConfig).map(([role, cfg]) => (
                <SelectItem key={role} value={role}>{cfg.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="divide-y divide-border">
          {users.map((u) => {
            const role = roleConfig[u.role] || roleConfig.viewer
            const status = statusConfig[u.status] || statusConfig.active
            const initials = u.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
            const RoleIcon = role.icon
            return (
              <div key={u.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className={cn('text-xs font-semibold', role.bg, role.color)}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{u.name}</span>
                      <Badge variant="outline" className={cn('gap-1 text-[10px]', role.bg, role.color)}>
                        <RoleIcon className="w-2.5 h-2.5" />
                        {role.label}
                      </Badge>
                      {u.status === 'active' && (
                        <Badge variant="outline" className={cn('gap-1 text-[10px]', status.color)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                          {status.label}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {u.email}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-xs">
                    <div className="text-center">
                      <div className="font-semibold">{u.forms}</div>
                      <div className="text-muted-foreground">Form</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{u.submissions}</div>
                      <div className="text-muted-foreground">Yanıt</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">{u.lastActive}</div>
                      <div className="text-muted-foreground">Son aktif</div>
                    </div>
                  </div>

                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
