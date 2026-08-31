'use client'

import { useState } from 'react'
import { MavenFormsLogo } from '@/components/mavenforms/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Eye, EyeOff, Lock, Mail, Shield, Sparkles, Zap, Globe } from 'lucide-react'
import { api } from '@/lib/api-client'
import { useApp } from '@/lib/store'
import type { SessionContext } from '@/lib/types'

export function LoginView() {
  const [email, setEmail] = useState('demo@mavenforms.com')
  const [password, setPassword] = useState('demo1234')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const init = useApp((s) => s.init)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Step 1: Login (sets cookie via Set-Cookie header)
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, remember }),
        skipAuth: true,
      })

      // Brief delay to ensure cookie is committed to browser store
      await new Promise((r) => setTimeout(r, 200))

      // Step 2: Fetch session to get user + workspace
      // Retry up to 3 times in case cookie isn't committed yet
      let session: SessionContext | null = null
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          session = await api<SessionContext>('/api/auth/me', { skipAuth: true })
          break
        } catch {
          await new Promise((r) => setTimeout(r, 300))
        }
      }

      if (session) {
        // Step 3: Initialize the app store (no reload needed)
        init(session.user, session.workspace)
        toast({ title: 'Giriş başarılı', description: `Hoş geldiniz, ${session.user.name || session.user.email}!` })
      } else {
        // Fallback: reload the page to pick up the cookie
        toast({ title: 'Giriş başarılı', description: 'Yönlendiriliyorsunuz...' })
        setTimeout(() => window.location.reload(), 300)
      }
    } catch (err: any) {
      toast({
        title: 'Giriş başarısız',
        description: err.message || 'E-posta veya parola hatalı',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-background to-chart-3/10 relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 rounded-full bg-chart-3/10 blur-3xl" />

        <div className="relative flex flex-col justify-between p-12 w-full">
          <MavenFormsLogo size={40} />

          <div className="space-y-8 max-w-md">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                <Sparkles className="w-3 h-3" />
                KVKK uyumlu · Çok kiracılı
              </div>
              <h1 className="text-4xl font-bold tracking-tight leading-tight">
                Formlarınızı <span className="gradient-text">tasarlayın</span>,
                <br />
                yanıtları <span className="gradient-text">otomatikleştirin</span>.
              </h1>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Modern, mobil öncelikli form platformu. Tasarla → yayınla → topla → raporla
                zincirinde tek çalışma alanı.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Zap, label: '5 dk içinde yayın', desc: 'Hızlı kurulum' },
                { icon: Shield, label: 'Güvenli & KVKK', desc: 'Veri koruması' },
                { icon: Globe, label: 'Çoklu dil', desc: 'RTL desteği' },
                { icon: Sparkles, label: 'AI destekli', desc: 'Akıllı formlar' },
              ].map((f, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 bg-card/50 backdrop-blur p-4 hover:border-primary/30 transition-colors"
                >
                  <f.icon className="w-5 h-5 text-primary mb-2" />
                  <div className="text-sm font-medium">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            © 2026 MavenForms · Hostinger altyapısında çalışır
          </div>
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex justify-center">
            <MavenFormsLogo size={36} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Tekrar hoş geldiniz</h2>
            <p className="text-muted-foreground">
              Hesabınıza giriş yapın ve formlarınızı yönetmeye devam edin.
            </p>
          </div>

          <Card className="p-6 shadow-sm border-border/60">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta adresi</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="ornek@mavenforms.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Parola</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => toast({ title: 'Şifre sıfırlama', description: 'Demo modunda pasif' })}
                  >
                    Şifremi unuttum
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(c) => setRemember(c === true)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">
                  Beni hatırla (30 gün)
                </Label>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  'Giriş Yap'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border/60">
              <div className="rounded-lg bg-muted/50 p-4 text-xs space-y-1">
                <div className="font-medium text-foreground/80">Demo Hesap</div>
                <div className="text-muted-foreground">
                  E-posta: <code className="text-foreground">demo@mavenforms.com</code>
                </div>
                <div className="text-muted-foreground">
                  Parola: <code className="text-foreground">demo1234</code>
                </div>
              </div>
            </div>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Giriş yaparak <span className="text-foreground/70">Kullanım Şartları</span> ve{' '}
            <span className="text-foreground/70">Gizlilik Politikası</span>nı kabul edersiniz.
          </p>
        </div>
      </div>
    </div>
  )
}
