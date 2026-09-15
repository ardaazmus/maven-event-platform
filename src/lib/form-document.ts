// Form layout contract: bounded Grid/Bento presets for the flat field model.
import type { FieldDecoration, FieldHeight, FieldLayout } from './types'

const fieldHeights: FieldHeight[] = ['auto', 'compact', 'standard', 'tall']
const decorationPositions = ['top', 'left', 'right'] as const
const decorationSizes = ['sm', 'md', 'lg'] as const

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function normalizeFieldLayout(value: unknown): Required<FieldLayout> {
  const candidate = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const colSpan = clampNumber(candidate.colSpan, 1, 12, 12)
  const height = fieldHeights.includes(candidate.height as FieldHeight) ? candidate.height as FieldHeight : 'auto'
  return {
    colSpan,
    tabletColSpan: clampNumber(candidate.tabletColSpan, 1, 6, Math.min(colSpan, 6)),
    mobileColSpan: 1,
    height,
    breakBefore: candidate.breakBefore === true,
  }
}

export function normalizeFieldDecoration(value: unknown): FieldDecoration | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  const source = candidate.source === 'media' ? 'media' : 'builtin'
  const position = decorationPositions.includes(candidate.position as typeof decorationPositions[number])
    ? candidate.position as typeof decorationPositions[number]
    : 'top'
  const size = decorationSizes.includes(candidate.size as typeof decorationSizes[number])
    ? candidate.size as typeof decorationSizes[number]
    : 'md'
  const iconName = typeof candidate.iconName === 'string' && candidate.iconName.trim().length > 0
    ? candidate.iconName.trim().slice(0, 64)
    : undefined
  const mediaAssetId = typeof candidate.mediaAssetId === 'string' && candidate.mediaAssetId.trim().length > 0
    ? candidate.mediaAssetId.trim().slice(0, 128)
    : null
  const altText = typeof candidate.altText === 'string' ? candidate.altText.slice(0, 160) : undefined
  return { source, position, size, ...(iconName ? { iconName } : {}), mediaAssetId, ...(altText ? { altText } : {}), decorative: candidate.decorative === true }
}

export function normalizeFieldConfig(value: unknown): Record<string, any> {
  const config = value && typeof value === 'object' && !Array.isArray(value)
    ? { ...(value as Record<string, any>) }
    : {}
  if ('layout' in config) config.layout = normalizeFieldLayout(config.layout)
  if ('decoration' in config) config.decoration = normalizeFieldDecoration(config.decoration)
  return config
}

const layoutPresetPatterns: Record<string, Array<Pick<FieldLayout, 'colSpan' | 'tabletColSpan' | 'height'>>> = {
  'grid-single': [{ colSpan: 12, tabletColSpan: 6, height: 'auto' }],
  'grid-equal': [{ colSpan: 6, tabletColSpan: 3, height: 'auto' }, { colSpan: 6, tabletColSpan: 3, height: 'auto' }],
  'grid-thirds': [{ colSpan: 4, tabletColSpan: 3, height: 'auto' }, { colSpan: 8, tabletColSpan: 3, height: 'auto' }],
  'grid-quarters': [{ colSpan: 3, tabletColSpan: 3, height: 'auto' }],
  'bento-featured': [{ colSpan: 8, tabletColSpan: 4, height: 'tall' }, { colSpan: 4, tabletColSpan: 2, height: 'standard' }, { colSpan: 4, tabletColSpan: 2, height: 'standard' }],
  'bento-focus': [{ colSpan: 7, tabletColSpan: 4, height: 'tall' }, { colSpan: 5, tabletColSpan: 2, height: 'standard' }, { colSpan: 5, tabletColSpan: 2, height: 'standard' }],
}

export function createLayoutPreset(presetId: string, count: number): FieldLayout[] {
  const pattern = layoutPresetPatterns[presetId] || layoutPresetPatterns['grid-single']
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({ ...pattern[index % pattern.length] }))
}
