import { db } from '@/lib/db'
import type { PrismaClient } from '@prisma/client'
import type { ParasutProductCommandStore, ParasutProductExecutionStore } from '@/lib/parasut-product-command'

type CommandScope = { workspaceId: string; connectionId: string; companyId: string }
type ProductCommandClient = Pick<PrismaClient, 'parasutProductCommand'>

function assertScope(scope: CommandScope): void {
  if (!scope.workspaceId || !scope.connectionId || !/^\d+$/.test(scope.companyId)) throw new Error('parasut product command scope is invalid')
}

/** Creates a workspace/company-scoped Prisma adapter for product command persistence. */
export function createParasutProductCommandStoreFromClient(client: ProductCommandClient, scope: CommandScope): ParasutProductCommandStore & ParasutProductExecutionStore {
  assertScope(scope)
  return {
    async findUnique(args) {
      if (args.where.workspaceId_requestFingerprint.workspaceId !== scope.workspaceId) return null
      return client.parasutProductCommand.findUnique({ where: args.where, select: { id: true, status: true } })
    },
    async create(args) {
      const data = args.data
      if (data.workspaceId !== scope.workspaceId || data.connectionId !== scope.connectionId || data.companyId !== scope.companyId) throw new Error('parasut product command scope mismatch')
      return client.parasutProductCommand.create({ data, select: { id: true, status: true } })
    },
    async claimApproved(commandId) {
      const claimed = await client.parasutProductCommand.updateMany({
        where: { id: commandId, workspaceId: scope.workspaceId, connectionId: scope.connectionId, companyId: scope.companyId, status: 'approved' },
        data: { status: 'submitted' },
      })
      if (claimed.count === 1) return { claimed: true }
      const current = await client.parasutProductCommand.findFirst({ where: { id: commandId, workspaceId: scope.workspaceId, connectionId: scope.connectionId, companyId: scope.companyId }, select: { status: true, providerProductId: true } })
      return current ? { claimed: false, status: current.status, providerProductId: current.providerProductId } : { claimed: false, status: 'not_found', providerProductId: null }
    },
    async markConfirmed(commandId, providerProductId) {
      const result = await client.parasutProductCommand.updateMany({
        where: { id: commandId, workspaceId: scope.workspaceId, connectionId: scope.connectionId, companyId: scope.companyId, status: 'submitted' },
        data: { status: 'confirmed', providerProductId },
      })
      if (result.count !== 1) throw new Error('parasut product command confirmation lost')
    },
    async markReconciliationRequired(commandId) {
      const result = await client.parasutProductCommand.updateMany({
        where: { id: commandId, workspaceId: scope.workspaceId, connectionId: scope.connectionId, companyId: scope.companyId, status: 'submitted' },
        data: { status: 'reconciliation_required' },
      })
      if (result.count !== 1) throw new Error('parasut product command reconciliation transition lost')
    },
    async markFailed(commandId) {
      const result = await client.parasutProductCommand.updateMany({
        where: { id: commandId, workspaceId: scope.workspaceId, connectionId: scope.connectionId, companyId: scope.companyId, status: 'submitted' },
        data: { status: 'failed' },
      })
      if (result.count !== 1) throw new Error('parasut product command failure transition lost')
    },
  }
}

/** Returns the production store while keeping the Prisma client private to this module. */
export function createParasutProductCommandStore(scope: CommandScope): ParasutProductCommandStore & ParasutProductExecutionStore {
  return createParasutProductCommandStoreFromClient(db, scope)
}
