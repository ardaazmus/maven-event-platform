'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api-client'
import type { FormField, FormAppearance, Theme } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  Phone,
  MapPin,
  Instagram,
  Linkedin,
  Twitter,
  Facebook,
  Youtube,
  CheckCircle2,
  Loader2,
  Send,
} from 'lucide-react'

interface PublicFormRendererProps {
  form: {
    id: string
    title: string
    description: string | null
    slug: string
    settings: any
    fields: FormField[]
    theme: (Theme & { tokens: any }) | null
    appearance: (FormAppearance & { footerLinks: any[] }) | null
  }
}

export function PublicFormRenderer({ form }: PublicFormRendererProps) {
  const [values, setValues] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [height, setHeight] = useState(600)
  const app = form.appearance
  const settings = form.settings || {}
  const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1'

  // Send height to parent window (for embed)
  useEffect(() => {
    if (!isEmbedded) return
    const sendHeight = () => {
      const h = document.documentElement.scrollHeight
      setHeight(h)
      window.parent.postMessage(
        { mavenforms: true, type: 'resize', height: h },
        '*'
      )
    }
    sendHeight()
    const observer = new MutationObserver(sendHeight)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true })
    window.addEventListener('resize', sendHeight)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', sendHeight)
    }
  }, [isEmbedded, submitted])

  const validate = () => {
    const errs: Record<string, string> = {}
    for (const field of form.fields) {
      if (field.required && !values[field.fieldKey]) {
        errs[field.fieldKey] = 'Bu alan zorunludur'
      }
      if (field.type === 'email' && values[field.fieldKey]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(values[field.fieldKey])) {
          errs[field.fieldKey] = 'Geçerli bir e-posta adresi girin'
        }
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      await api(`/api/forms/${form.id}/submissions`, {
        method: 'POST',
        body: JSON.stringify(values),
        skipAuth: true,
      })
      setSubmitted(true)
      // Notify parent (embed) of submission
      if (isEmbedded) {
        window.parent.postMessage(
          { mavenforms: true, type: 'submit', payload: { formId: form.id } },
          '*'
        )
      }
    } catch (err: any) {
      alert('Gönderim hatası: ' + (err.message || 'Bilinmeyen hata'))
    } finally {
      setSubmitting(false)
    }
  }

  const themeTokens = form.theme?.tokens || {}
  const primaryColor = themeTokens.primary || '#10b981'

  // Self-contained styles (scoped under .mavenforms-public)
  const scopedStyle = `
    .mavenforms-public {
      --mf-primary: ${primaryColor};
      --mf-bg: ${themeTokens.background || '#f9fafb'};
      --mf-text: ${themeTokens.text || '#1a1a1a'};
      --mf-radius: ${form.theme?.radius || 0.625}rem;
      --mf-font: ${form.theme?.font || 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'};
      font-family: var(--mf-font);
      color: var(--mf-text);
      background: var(--mf-bg);
      min-height: 100vh;
    }
    ${app?.customCss || ''}
  `

  return (
    <div className="mavenforms-public">
      <style dangerouslySetInnerHTML={{ __html: scopedStyle }} />

      <div className="max-w-3xl mx-auto bg-white shadow-lg">
        {/* HEADER */}
        {app?.headerEnabled && (
          <FormHeader app={app} defaultTitle={form.title} defaultDescription={form.description} />
        )}

        {/* CONTACT BAR */}
        {app?.contactBarEnabled && <ContactBar app={app} />}

        {/* FORM BODY */}
        <div className="p-6 sm:p-8" style={{ fontFamily: 'var(--mf-font)' }}>
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Teşekkürler!</h2>
              <p className="text-gray-600">
                {settings.successMessage || 'Formunuz başarıyla gönderildi.'}
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--mf-text)' }}>
                {form.title}
              </h1>
              {form.description && (
                <p className="text-gray-600 mb-6">{form.description}</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {form.fields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={values[field.fieldKey]}
                    error={errors[field.fieldKey]}
                    onChange={(v) => setValues({ ...values, [field.fieldKey]: v })}
                    primaryColor={primaryColor}
                  />
                ))}

                {form.fields.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Bu formda henüz alan yok.</p>
                )}

                {form.fields.length > 0 && (
                  <Button
                    type="submit"
                    size="lg"
                    disabled={submitting}
                    className="w-full gap-2"
                    style={{ backgroundColor: primaryColor, color: 'white' }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        {settings.submitButtonText || 'Gönder'}
                      </>
                    )}
                  </Button>
                )}
              </form>
            </>
          )}
        </div>

        {/* FOOTER */}
        {app?.footerEnabled && <FormFooter app={app} />}
      </div>
    </div>
  )
}

function FormHeader({ app, defaultTitle, defaultDescription }: {
  app: any
  defaultTitle: string
  defaultDescription: string | null
}) {
  return (
    <header
      style={{
        backgroundColor: app.headerBgColor || '#ffffff',
        backgroundImage: app.headerBgImage ? `url(${app.headerBgImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: app.headerTextColor || '#1a1a1a',
        padding: `${app.headerPadding || 32}px`,
        textAlign: app.headerAlign || 'center',
      }}
    >
      {app.headerLogoUrl && (
        <img
          src={app.headerLogoUrl}
          alt={app.headerLogoAlt || ''}
          style={{
            maxWidth: '100%',
            width: app.headerLogoWidth ? `${app.headerLogoWidth}px` : 'auto',
            height: 'auto',
            maxHeight: '120px',
            marginBottom: '16px',
            display: 'block',
            marginLeft: app.headerAlign === 'center' ? 'auto' : app.headerAlign === 'right' ? 'auto' : '0',
            marginRight: app.headerAlign === 'center' ? 'auto' : '0',
          }}
        />
      )}
      {app.headerTitle && (
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: '0 0 8px 0', lineHeight: 1.2 }}>
          {app.headerTitle}
        </h1>
      )}
      {app.headerSubtitle && (
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 16px 0', opacity: 0.9 }}>
          {app.headerSubtitle}
        </h2>
      )}
      {app.headerDescription && (
        <div
          style={{ fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '600px', margin: '0 auto', opacity: 0.85 }}
          dangerouslySetInnerHTML={{ __html: app.headerDescription.replace(/\n/g, '<br/>') }}
        />
      )}
    </header>
  )
}

function ContactBar({ app }: { app: any }) {
  return (
    <div
      style={{
        backgroundColor: app.contactBarBgColor || '#e31e24',
        color: app.contactBarTextColor || '#ffffff',
        padding: '12px 24px',
        fontSize: '0.8rem',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center gap-4">
          {app.contactEmail && (
            <a href={`mailto:${app.contactEmail}`} className="flex items-center gap-1 hover:underline">
              <Mail className="w-3 h-3" /> {app.contactEmail}
            </a>
          )}
          {app.contactPhone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" /> {app.contactPhone}
            </span>
          )}
          {app.contactAddress && (
            <span className="flex items-center gap-1 hidden sm:flex">
              <MapPin className="w-3 h-3" /> {app.contactAddress}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {app.socialInstagram && (
            <a href={app.socialInstagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
              <Instagram className="w-4 h-4" />
            </a>
          )}
          {app.socialLinkedin && (
            <a href={app.socialLinkedin} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
              <Linkedin className="w-4 h-4" />
            </a>
          )}
          {app.socialTwitter && (
            <a href={app.socialTwitter} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
              <Twitter className="w-4 h-4" />
            </a>
          )}
          {app.socialFacebook && (
            <a href={app.socialFacebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
              <Facebook className="w-4 h-4" />
            </a>
          )}
          {app.socialYoutube && (
            <a href={app.socialYoutube} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
              <Youtube className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function FormFooter({ app }: { app: any }) {
  const links = app.footerLinks || []
  return (
    <footer
      style={{
        backgroundColor: app.footerBgColor || '#1a1a1a',
        color: app.footerTextColor || '#ffffff',
        padding: `${app.footerPadding || 24}px`,
      }}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-3xl mx-auto">
        {app.footerLogoUrl && (
          <img
            src={app.footerLogoUrl}
            alt="Logo"
            style={{ maxHeight: '40px', width: 'auto' }}
          />
        )}
        {app.footerText && (
          <p style={{ fontSize: '0.85rem', margin: 0, textAlign: 'center', flex: 1 }}>
            {app.footerText}
          </p>
        )}
        {links.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {links.map((link: any, i: number) => (
              <a
                key={i}
                href={link.url}
                style={{ fontSize: '0.85rem', opacity: 0.8 }}
                className="hover:opacity-100"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  )
}

function FieldRenderer({ field, value, error, onChange, primaryColor }: {
  field: FormField
  value: any
  error?: string
  onChange: (v: any) => void
  primaryColor: string
}) {
  const config = field.config || {}

  if (field.type === 'section') {
    return (
      <div className="py-2 border-t border-gray-200">
        <h3 className="font-semibold text-lg">{field.label}</h3>
        {field.description && <p className="text-sm text-gray-600 mt-1">{field.description}</p>}
      </div>
    )
  }

  if (field.type === 'page_break') return null

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium flex items-center gap-1">
        {field.label}
        {field.required && <span style={{ color: primaryColor }}>*</span>}
      </Label>
      {field.description && <p className="text-xs text-gray-500">{field.description}</p>}

      {['text', 'email', 'phone', 'number', 'date', 'time'].includes(field.type) && (
        <Input
          type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'time' ? 'time' : 'text'}
          placeholder={field.placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          readOnly={field.readOnly}
        />
      )}

      {field.type === 'paragraph' && (
        <Textarea
          placeholder={field.placeholder || ''}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          readOnly={field.readOnly}
        />
      )}

      {field.type === 'radio' && (
        <RadioGroup value={value || ''} onValueChange={onChange}>
          <div className="space-y-2">
            {(config.options || []).map((opt: any, i: number) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`${field.id}-${i}`} />
                <Label htmlFor={`${field.id}-${i}`} className="text-sm cursor-pointer font-normal">
                  {opt.label}
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}

      {field.type === 'checkbox' && (
        <div className="space-y-2">
          {(config.options || []).map((opt: any, i: number) => (
            <div key={i} className="flex items-center space-x-2">
              <Checkbox
                id={`${field.id}-${i}`}
                checked={Array.isArray(value) && value.includes(opt.value)}
                onCheckedChange={(c) => {
                  const arr = Array.isArray(value) ? [...value] : []
                  if (c) arr.push(opt.value)
                  else arr.splice(arr.indexOf(opt.value), 1)
                  onChange(arr)
                }}
              />
              <Label htmlFor={`${field.id}-${i}`} className="text-sm cursor-pointer font-normal">
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      )}

      {field.type === 'select' && (
        <Select value={value || ''} onValueChange={onChange}>
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Seçiniz...'} />
          </SelectTrigger>
          <SelectContent>
            {(config.options || []).map((opt: any, i: number) => (
              <SelectItem key={i} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === 'file' && (
        <Input
          type="file"
          onChange={(e) => onChange(e.target.files?.[0])}
        />
      )}

      {field.type === 'rating' && (
        <div className="flex items-center gap-1">
          {[...Array(config.max || 10)].map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(i + 1)}
              className="text-2xl"
              style={{ color: (i + 1) <= (value || 0) ? '#f59e0b' : '#d1d5db' }}
            >
              ★
            </button>
          ))}
        </div>
      )}

      {field.helpText && <p className="text-xs text-gray-500">{field.helpText}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
