import { db } from '@/lib/db'
import type { PrismaClient } from '@prisma/client'
import type { ParasutContactCommandStore, ParasutContactExecutionStore } from '@/lib/parasut-contact-command'

type CommandScope = { workspaceId: string; connectionId: string; companyId: string }
type CommandState = { status: string; providerContactId: string | null }

function scopedWhere(scope: CommandScope, id: string) {
  return { id, workspaceId: scope.workspaceId, connectionId: scope.connectionId, companyId: scope.companyId }
}

function assertScope(scope: CommandScope): void {
  if (!scope.workspaceId || !scope.connectionId || !/^\d+$/.test(scope.companyId)) throw new Error('parasut command scope is invalid')
}

type ContactCommandClient = Pick<PrismaClient, 'parasutContactCommand'>

/** Creates a scoped Prisma adapter; the client must stay inside the server boundary. */
export function createParasutContactCommandStoreFromClient(client: ContactCommandClient, scope: CommandScope): ParasutContactCommandStore & ParasutContactExecutionStore {
  assertScope(scope)
  return {
    async findUnique(args) {
      if (args.where.workspaceId_requestFingerprint.workspaceId !== scope.workspaceId) return null
      return client.parasutContactCommand.findUnique({
        where: args.where,
        select: { id: true, status: true },
      })
    },
    async create(args) {
      if (args.data.workspaceId !== scope.workspaceId || args.data.connectionId !== scope.connectionId || args.data.companyId !== scope.companyId) throw new Error('parasut command scope mismatch')
      return client.parasutContactCommand.create({
        data: args.data,
        select: { id: true, status: true },
      })
    },
    async claimApproved(commandId) {
      const claimed = await client.parasutContactCommand.updateMany({
        where: { ...scopedWhere(scope, commandId), status: 'approved' },
        data: { status: 'submitted' },
      })
      if (claimed.count === 1) return { claimed: true }
      const current = await client.parasutContactCommand.findFirst({ where: scopedWhere(scope, commandId), select: { status: true, providerContactId: true } })
      return current ? { claimed: false, status: current.status, providerContactId: current.providerContactId } : { claimed: false, status: 'not_found', providerContactId: null }
    },
    async markConfirmed(commandId, providerContactId) {
      const result = await client.parasutContactCommand.updateMany({
        where: { ...scopedWhere(scope, commandId), status: 'submitted' },
        data: { status: 'confirmed', providerContactId },
      })
      if (result.count !== 1) throw new Error('parasut contact command confirmation lost')
    },
    async markReconciliationRequired(commandId) {
      const result = await client.parasutContactCommand.updateMany({
        where: { ...scopedWhere(scope, commandId), status: 'submitted' },
        data: { status: 'reconciliation_required' },
      })
      if (result.count !== 1) throw new Error('parasut contact command reconciliation transition lost')
    },
    async markFailed(commandId) {
      const result = await client.parasutContactCommand.updateMany({
        where: { ...scopedWhere(scope, commandId), status: 'submitted' },
        data: { status: 'failed' },
      })
      if (result.count !== 1) throw new Error('parasut contact command failure transition lost')
    },
  }
}

/** Returns the production store while keeping the Prisma client private to this module. */
export function createParasutContactCommandStore(scope: CommandScope): ParasutContactCommandStore & ParasutContactExecutionStore {
  return createParasutContactCommandStoreFromClient(db, scope)
}

export type ParasutContactCommandState = CommandState
