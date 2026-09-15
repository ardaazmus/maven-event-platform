export const BADGE_QR_MODES = [
  'NONE',
  'PUBLIC_CARD_URL',
  'INLINE_VCARD',
  'SECURE_TOKEN',
] as const

export type BadgeQrMode = (typeof BADGE_QR_MODES)[number]

export type BadgeNameCollisionMode = 'BASE' | 'WITH_TITLE' | 'OPAQUE_FALLBACK'

export type BadgeIdentity = Readonly<{
  participantId: string
  submissionId: string
  badgeId: string
  badgeInstanceId: string
  qrTokenId: string | null
  generationJobId: string
  outputId: string
  outputIdShort: string
}>

export type BadgeFilenameInput = Readonly<{
  firstName: string
  lastName: string
  title?: string
  eventName: string
  formName: string
  outputIdShort: string
  collisionMode?: BadgeNameCollisionMode
}>

const WINDOWS_FORBIDDEN = /[<>:"/\\|?*\u0000-\u001f]/g
const MULTIPLE_SEPARATORS = /[-\s]+/g
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i

function requireNonEmpty(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} boş olamaz`)
}

export function assertBadgeIdentitySeparation(identity: BadgeIdentity) {
  const required: ReadonlyArray<[string, string]> = [
    ['participantId', identity.participantId],
    ['submissionId', identity.submissionId],
    ['badgeId', identity.badgeId],
    ['badgeInstanceId', identity.badgeInstanceId],
    ['generationJobId', identity.generationJobId],
    ['outputId', identity.outputId],
    ['outputIdShort', identity.outputIdShort],
  ]

  for (const [label, value] of required) requireNonEmpty(value, label)
  if (identity.qrTokenId !== null) requireNonEmpty(identity.qrTokenId, 'qrTokenId')
  if (identity.qrTokenId && identity.qrTokenId === identity.outputId) {
    throw new Error('qrTokenId ve outputId aynı kimlik olamaz')
  }
  if (identity.qrTokenId && identity.qrTokenId === identity.outputIdShort) {
    throw new Error('qrTokenId ve outputIdShort aynı kimlik olamaz')
  }
  return identity
}

export function normalizeBadgeFilenameSegment(value: string, fallback = 'untitled') {
  const normalized = value
    .normalize('NFC')
    .replace(WINDOWS_FORBIDDEN, '-')
    .replace(MULTIPLE_SEPARATORS, '-')
    .replace(/[.\s-]+$/g, '')
    .replace(/^-+|-+$/g, '')

  const safeValue = normalized || fallback
  return WINDOWS_RESERVED.test(safeValue) ? `_${safeValue}` : safeValue
}

export function badgeFilenameCollisionKey(filename: string) {
  return filename.normalize('NFC').toLocaleLowerCase('en-US')
}

export function buildBadgePdfFilename(input: BadgeFilenameInput) {
  const collisionMode = input.collisionMode ?? 'BASE'
  const readableParts =
    collisionMode === 'OPAQUE_FALLBACK'
      ? ['badge']
      : [
          input.firstName,
          input.lastName,
          ...(collisionMode === 'WITH_TITLE' && input.title ? [input.title] : []),
          input.eventName,
          input.formName,
        ]

  const parts = readableParts.map(part => normalizeBadgeFilenameSegment(part))
  const outputId = normalizeBadgeFilenameSegment(input.outputIdShort, 'output')
  return `${[...parts, outputId].join('-')}.pdf`
}

export function isPublicBadgeQrMode(mode: BadgeQrMode) {
  return mode === 'PUBLIC_CARD_URL' || mode === 'INLINE_VCARD'
}

export function isSecureBadgeQrMode(mode: BadgeQrMode) {
  return mode === 'SECURE_TOKEN'
}
