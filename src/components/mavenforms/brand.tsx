'use client'

import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

export interface BrandingData {
  appName: string
  appTagline: string
  logoUrl: string | null
  logoDarkUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  loginTitle: string
  loginSubtitle: string
  loginHeroImage: string | null
  loginBgColor: string
  loginShowFeatures: boolean
  footerText: string
  footerLinks: Array<{ label: string; url: string }>
  customDomain: string | null
}

// Singleton cache for branding (avoid repeated fetches)
let brandingCache: BrandingData | null = null
let brandingFetchPromise: Promise<BrandingData | null> | null = null

export async function fetchBranding(): Promise<BrandingData | null> {
  if (brandingCache) return brandingCache
  if (brandingFetchPromise) return brandingFetchPromise

  brandingFetchPromise = fetch('/api/branding?public=true')
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (d?.data) {
        brandingCache = d.data
        return d.data as BrandingData
      }
      return null
    })
    .catch(() => null)
    .finally(() => {
      brandingFetchPromise = null
    })

  return brandingFetchPromise
}

export function clearBrandingCache() {
  brandingCache = null
}

export function MavenFormsLogo({
  className,
  showText = true,
  size = 32,
  branding,
}: {
  className?: string
  showText?: boolean
  size?: number
  branding?: BrandingData | null
}) {
  const logoUrl = branding?.logoUrl

  // If custom logo provided, use it
  if (logoUrl) {
    return (
      <div className={cn('flex items-center gap-2.5', className)}>
        <img
          src={logoUrl}
          alt={branding?.appName || 'Logo'}
          style={{ height: size, width: 'auto', maxHeight: size * 1.5 }}
          className="object-contain"
        />
        {showText && (
          <div className="flex flex-col leading-none">
            <span className="font-bold text-base tracking-tight">{branding?.appName || 'MavenForms'}</span>
            {branding?.appTagline && (
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                {branding.appTagline}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // Default MavenForms logo (gradient + M icon)
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-chart-3 shadow-lg shadow-primary/20"
        style={{ width: size, height: size }}
      >
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* M-shape representing MavenForms */}
          <path
            d="M4 18V8L9 13L12 9L15 13L20 8V18"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="20" r="1.5" fill="white" />
        </svg>
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-chart-2 rounded-full ring-2 ring-background" />
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-bold text-base tracking-tight">
            {(branding?.appName || 'Maven').split('')[0]}
            <span className="text-primary">{(branding?.appName || 'MavenForms').slice(1) || 'Forms'}</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
            {branding?.appTagline || 'FORM PLATFORM'}
          </span>
        </div>
      )}
    </div>
  )
}

// Hook to use branding in components
export function useBranding() {
  const [branding, setBranding] = useState<BrandingData | null>(brandingCache)

  useEffect(() => {
    let mounted = true
    if (!brandingCache) {
      fetchBranding().then((b) => {
        if (mounted && b) setBranding(b)
      })
    }
    return () => {
      mounted = false
    }
  }, [])

  return branding
}
