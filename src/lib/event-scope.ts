import type { SessionContext } from '@/lib/policy'

export function assertEventReadable(
  resource: { workspaceId: string },
  ctx: SessionContext | null | undefined,
): void {
  if (!ctx || !ctx.user || !ctx.workspace) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 })
  }
  if (!resource || resource.workspaceId !== ctx.workspace.id) {
    throw Object.assign(new Error('Not found'), { status: 404 })
  }
}
