import type { MediaAssetState } from '@/lib/media'

export const MEDIA_LIFECYCLE_ACTIONS = Object.freeze(['replace', 'archive', 'delete'] as const)
export type MediaLifecycleAction = (typeof MEDIA_LIFECYCLE_ACTIONS)[number]

export const MEDIA_DEPENDENCY_KINDS = Object.freeze([
  'form_appearance',
  'form_field',
  'badge_template',
  'badge_artifact',
  'invoice_document',
] as const)
export type MediaDependencyKind = (typeof MEDIA_DEPENDENCY_KINDS)[number]

export type MediaAssetDependency = Readonly<{
  kind: MediaDependencyKind
  active: boolean
}>

export type MediaLifecycleStrategy = 'new_version' | 'soft_archive' | 'hard_delete' | 'blocked'

export type MediaLifecycleDecision = Readonly<{
  action: MediaLifecycleAction
  allowed: boolean
  code:
    | 'REPLACE_AS_NEW_VERSION'
    | 'ARCHIVE_ALLOWED'
    | 'DELETE_ALLOWED'
    | 'ACTIVE_DEPENDENCIES'
    | 'PUBLISHED_ASSET'
    | 'RETENTION_REQUIRED'
    | 'ALREADY_ARCHIVED'
  strategy: MediaLifecycleStrategy
  dependencyCount: number
  preserveSource: boolean
}>

export type MediaLifecycleInput = Readonly<{
  action: MediaLifecycleAction
  state: MediaAssetState
  visibility: 'private' | 'published'
  dependencies: readonly MediaAssetDependency[]
}>

function activeDependencies(dependencies: readonly MediaAssetDependency[]) {
  return dependencies.filter(dependency => dependency.active)
}

/**
 * Decides a media mutation without touching storage or the database. Active
 * references force versioned replacement and prevent destructive deletion.
 * Callers must persist the decision and perform the mutation in a transaction.
 */
export function evaluateMediaAssetLifecycle(input: MediaLifecycleInput): MediaLifecycleDecision {
  const dependencies = activeDependencies(input.dependencies)
  const dependencyCount = dependencies.length

  if (input.action === 'replace') {
    return { action: input.action, allowed: true, code: 'REPLACE_AS_NEW_VERSION', strategy: 'new_version', dependencyCount, preserveSource: true }
  }
  if (input.action === 'archive') {
    if (input.state === 'archived') return { action: input.action, allowed: false, code: 'ALREADY_ARCHIVED', strategy: 'blocked', dependencyCount, preserveSource: true }
    if (dependencyCount > 0) return { action: input.action, allowed: false, code: 'ACTIVE_DEPENDENCIES', strategy: 'blocked', dependencyCount, preserveSource: true }
    return { action: input.action, allowed: true, code: 'ARCHIVE_ALLOWED', strategy: 'soft_archive', dependencyCount, preserveSource: true }
  }
  if (dependencyCount > 0) return { action: input.action, allowed: false, code: 'ACTIVE_DEPENDENCIES', strategy: 'blocked', dependencyCount, preserveSource: true }
  if (input.visibility === 'published') return { action: input.action, allowed: false, code: 'PUBLISHED_ASSET', strategy: 'blocked', dependencyCount, preserveSource: true }
  if (!['quarantine', 'rejected', 'archived'].includes(input.state)) return { action: input.action, allowed: false, code: 'RETENTION_REQUIRED', strategy: 'blocked', dependencyCount, preserveSource: true }
  return { action: input.action, allowed: true, code: 'DELETE_ALLOWED', strategy: 'hard_delete', dependencyCount, preserveSource: false }
}
