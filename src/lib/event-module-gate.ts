/**
 * Event modül gate (F8-R2).
 *
 * Her event modülü manifest taşır; kapalıyken yalnız menü gizlenmez,
 * API mutation da 403 ile reddedilir. Pilot fazda tüm modüller varsayılan
 * açıktır; kapatma server-owned `disabledModules` listesinden yapılır
 * (route'lar `EVENT_MODULES_DISABLED` env CSV'sini okur).
 *
 * Bu helper pure'dur: DB, fetch ve framework importu yoktur. Bilinmeyen
 * modül fail-closed kapalıdır.
 */

export const EVENT_MODULES = [
  'program',
  'abstracts',
  'speakers',
  'sponsors',
  'surveys',
  'leads',
  'reports',
] as const
export type EventModuleId = (typeof EVENT_MODULES)[number]

export type EventModuleManifest = Readonly<{
  moduleId: EventModuleId
  version: 1
  requiredCapability: 'events.write'
  scope: 'event'
  supportedModes: readonly ['integrated', 'standalone']
}>

const MANIFESTS: Record<EventModuleId, EventModuleManifest> = {
  program: { moduleId: 'program', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
  abstracts: { moduleId: 'abstracts', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
  speakers: { moduleId: 'speakers', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
  sponsors: { moduleId: 'sponsors', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
  surveys: { moduleId: 'surveys', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
  leads: { moduleId: 'leads', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
  reports: { moduleId: 'reports', version: 1, requiredCapability: 'events.write', scope: 'event', supportedModes: ['integrated', 'standalone'] },
}

export function isEventModuleId(value: unknown): value is EventModuleId {
  return typeof value === 'string' && (EVENT_MODULES as readonly string[]).includes(value)
}

export function getEventModuleManifest(moduleId: unknown): EventModuleManifest | null {
  if (!isEventModuleId(moduleId)) return null
  return MANIFESTS[moduleId]
}

/** Kapalı liste server-owned girer; bilinmeyen modül her zaman kapalıdır. */
export function isEventModuleEnabled(moduleId: unknown, disabledModules?: readonly unknown[]): boolean {
  if (!isEventModuleId(moduleId)) return false
  if (!disabledModules) return true
  return !disabledModules.includes(moduleId)
}

export type EventModuleMutationDecision =
  | { allowed: true }
  | { allowed: false; status: 403; error: 'Module disabled' }

export function eventModuleMutationDecision(
  moduleId: unknown,
  disabledModules?: readonly unknown[],
): EventModuleMutationDecision {
  if (!isEventModuleEnabled(moduleId, disabledModules)) {
    return { allowed: false, status: 403, error: 'Module disabled' }
  }
  return { allowed: true }
}

/** `EVENT_MODULES_DISABLED` CSV'sini ayrıştırır; bilinmeyen adlar düşer. */
export function parseDisabledEventModules(value: unknown): EventModuleId[] {
  if (typeof value !== 'string' || value.trim() === '') return []
  const out: EventModuleId[] = []
  for (const part of value.split(',')) {
    const name = part.trim()
    if (isEventModuleId(name) && !out.includes(name)) out.push(name)
  }
  return out
}
