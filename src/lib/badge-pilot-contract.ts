export type BadgePilotFaceMode = 'SINGLE_FACE' | 'DUAL_FACE'

export type BadgePilotFace = 'front' | 'back'

export type BadgePilotProofStatus = 'NOT_RUN' | 'PREVIEWED' | 'PRINTED' | 'SCANNED' | 'ACCEPTED' | 'BLOCKED'

export type BadgePilotProofPlan = Readonly<{
  pilotId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  faceMode: BadgePilotFaceMode
  requiredFaces: readonly BadgePilotFace[]
  printedFaces: readonly BadgePilotFace[]
  qrScanRequired: true
  qrScanned: boolean
  status: BadgePilotProofStatus
  environment: 'INTERNAL_PILOT_ONLY'
}>

export type BadgePilotProofEvent = 'PREVIEWED' | 'PRINTED_FRONT' | 'PRINTED_BACK' | 'QR_SCANNED' | 'ACCEPT'

export type BadgePilotErrorCode =
  | 'IDENTIFIER_INVALID'
  | 'FACE_MODE_INVALID'
  | 'EVENT_INVALID'
  | 'EVENT_ORDER_INVALID'
  | 'DUPLICATE_EVENT'
  | 'BACK_FACE_NOT_REQUIRED'
  | 'REQUIRED_FACE_MISSING'
  | 'QR_SCAN_REQUIRED'

function isSafeIdentifier(value: string) {
  return Boolean(value.trim()) && !/[\\/:\s]/u.test(value)
}

function requiredFacesFor(faceMode: BadgePilotFaceMode): readonly BadgePilotFace[] {
  return faceMode === 'SINGLE_FACE' ? ['front'] : ['front', 'back']
}

function deriveStatus(plan: Readonly<Pick<BadgePilotProofPlan, 'printedFaces' | 'requiredFaces' | 'qrScanned' | 'status'>>) {
  if (plan.status === 'ACCEPTED') return 'ACCEPTED' as const
  if (plan.qrScanned) return 'SCANNED' as const
  if (plan.requiredFaces.every((face) => plan.printedFaces.includes(face))) return 'PRINTED' as const
  if (plan.status !== 'NOT_RUN') return 'PREVIEWED' as const
  return 'NOT_RUN' as const
}

export function createBadgePilotProofPlan(input: Readonly<{
  pilotId: string
  workspaceId: string
  formId: string
  templateVersionId: string
  faceMode: BadgePilotFaceMode
}>): { ok: true; plan: BadgePilotProofPlan } | { ok: false; code: BadgePilotErrorCode } {
  if (![input.pilotId, input.workspaceId, input.formId, input.templateVersionId].every(isSafeIdentifier)) {
    return { ok: false, code: 'IDENTIFIER_INVALID' }
  }
  if (input.faceMode !== 'SINGLE_FACE' && input.faceMode !== 'DUAL_FACE') return { ok: false, code: 'FACE_MODE_INVALID' }

  return {
    ok: true,
    plan: {
      pilotId: input.pilotId,
      workspaceId: input.workspaceId,
      formId: input.formId,
      templateVersionId: input.templateVersionId,
      faceMode: input.faceMode,
      requiredFaces: requiredFacesFor(input.faceMode),
      printedFaces: [],
      qrScanRequired: true,
      qrScanned: false,
      status: 'NOT_RUN',
      environment: 'INTERNAL_PILOT_ONLY',
    },
  }
}

export function advanceBadgePilotProof(input: Readonly<{
  plan: BadgePilotProofPlan
  event: BadgePilotProofEvent
}>): { ok: true; plan: BadgePilotProofPlan } | { ok: false; code: BadgePilotErrorCode } {
  const { plan, event } = input
  if (plan.status === 'ACCEPTED' || plan.status === 'BLOCKED') return { ok: false, code: 'EVENT_ORDER_INVALID' }
  if (event !== 'PREVIEWED' && event !== 'PRINTED_FRONT' && event !== 'PRINTED_BACK' && event !== 'QR_SCANNED' && event !== 'ACCEPT') {
    return { ok: false, code: 'EVENT_INVALID' }
  }
  if (event === 'PREVIEWED') {
    if (plan.status !== 'NOT_RUN') return { ok: false, code: 'DUPLICATE_EVENT' }
    return { ok: true, plan: { ...plan, status: 'PREVIEWED' } }
  }
  if (plan.status === 'NOT_RUN') return { ok: false, code: 'EVENT_ORDER_INVALID' }
  if (event === 'PRINTED_FRONT') {
    if (plan.printedFaces.includes('front')) return { ok: false, code: 'DUPLICATE_EVENT' }
    const printedFaces: BadgePilotFace[] = [...plan.printedFaces, 'front']
    return { ok: true, plan: { ...plan, printedFaces, status: deriveStatus({ ...plan, printedFaces }) } }
  }
  if (event === 'PRINTED_BACK') {
    if (!plan.requiredFaces.includes('back')) return { ok: false, code: 'BACK_FACE_NOT_REQUIRED' }
    if (!plan.printedFaces.includes('front')) return { ok: false, code: 'EVENT_ORDER_INVALID' }
    if (plan.printedFaces.includes('back')) return { ok: false, code: 'DUPLICATE_EVENT' }
    const printedFaces: BadgePilotFace[] = [...plan.printedFaces, 'back']
    return { ok: true, plan: { ...plan, printedFaces, status: deriveStatus({ ...plan, printedFaces }) } }
  }
  if (event === 'QR_SCANNED') {
    if (plan.qrScanned) return { ok: false, code: 'DUPLICATE_EVENT' }
    if (!plan.requiredFaces.every((face) => plan.printedFaces.includes(face))) return { ok: false, code: 'REQUIRED_FACE_MISSING' }
    return { ok: true, plan: { ...plan, qrScanned: true, status: 'SCANNED' } }
  }
  if (!plan.requiredFaces.every((face) => plan.printedFaces.includes(face))) return { ok: false, code: 'REQUIRED_FACE_MISSING' }
  if (!plan.qrScanned) return { ok: false, code: 'QR_SCAN_REQUIRED' }
  return { ok: true, plan: { ...plan, status: 'ACCEPTED' } }
}
