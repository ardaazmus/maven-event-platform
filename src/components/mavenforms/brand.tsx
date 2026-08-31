'use client'

import { cn } from '@/lib/utils'

export function MavenFormsLogo({
  className,
  showText = true,
  size = 32,
}: {
  className?: string
  showText?: boolean
  size?: number
}) {
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
            Maven<span className="text-primary">Forms</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
            FORM PLATFORM
          </span>
        </div>
      )}
    </div>
  )
}
