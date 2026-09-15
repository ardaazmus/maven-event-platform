export type InvoiceRecipientType = 'individual' | 'company' | 'foreign'
export type InvoiceRecipientValidationStatus = 'valid' | 'review_required' | 'invalid'

export interface InvoiceRecipientInput {
  recipientType: InvoiceRecipientType
  legalName?: unknown
  countryCode?: unknown
  email?: unknown
  taxNumber?: unknown
  identityNumber?: unknown
  taxOffice?: unknown
}

export interface InvoiceRecipientValidationResult {
  status: InvoiceRecipientValidationStatus
  codes: string[]
}

const MAX_NAME_LENGTH = 200
const MAX_EMAIL_LENGTH = 320

function text(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized ? normalized : null
}

function isTurkishIdentityNumber(value: string): boolean {
  if (!/^\d{11}$/.test(value) || value[0] === '0') return false
  const digits = [...value].map(Number)
  const odd = digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
  const even = digits[1] + digits[3] + digits[5] + digits[7]
  const tenth = (odd * 7 - even) % 10
  const checksum = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0) % 10
  return tenth === digits[9] && checksum === digits[10]
}

function isTurkishTaxNumberShape(value: string): boolean {
  return /^\d{10}$/.test(value)
}

function hasValidEmailShape(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/**
 * Validates only deterministic input shape. Unknown fiscal/legal rules are
 * reported for human/accounting review instead of being guessed.
 */
export function validateInvoiceRecipient(input: InvoiceRecipientInput): InvoiceRecipientValidationResult {
  const codes: string[] = []
  const legalName = text(input.legalName)
  const countryCode = text(input.countryCode)?.toUpperCase() ?? null
  const email = text(input.email)
  const taxNumber = text(input.taxNumber)
  const identityNumber = text(input.identityNumber)

  if (!legalName || legalName.length > MAX_NAME_LENGTH) codes.push('legal_name_invalid')
  if (email && !hasValidEmailShape(email)) codes.push('email_invalid')
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) codes.push('country_code_invalid')

  if (input.recipientType === 'individual') {
    if (countryCode === 'TR' && identityNumber && !isTurkishIdentityNumber(identityNumber)) codes.push('identity_number_invalid')
    if (countryCode === 'TR' && !identityNumber) codes.push('identity_number_review_required')
    if (taxNumber) codes.push('tax_number_not_expected')
  }

  if (input.recipientType === 'company') {
    if (countryCode === 'TR' && taxNumber && !isTurkishTaxNumberShape(taxNumber)) codes.push('tax_number_invalid')
    if (countryCode === 'TR' && !taxNumber) codes.push('tax_number_review_required')
    if (countryCode === 'TR' && !text(input.taxOffice)) codes.push('tax_office_review_required')
    if (identityNumber) codes.push('identity_number_not_expected')
  }

  if (input.recipientType === 'foreign') {
    if (!countryCode) codes.push('country_code_review_required')
    if (countryCode === 'TR') codes.push('foreign_country_review_required')
    if (!taxNumber && !identityNumber) codes.push('foreign_identifier_review_required')
  }

  const invalid = codes.some(code => code.endsWith('_invalid') || code.endsWith('_not_expected'))
  if (invalid) return { status: 'invalid', codes }
  if (codes.some(code => code.endsWith('_review_required'))) return { status: 'review_required', codes }
  return { status: 'valid', codes: [] }
}
