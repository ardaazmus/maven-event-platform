export type IyzicoBuyer = {
  id: string
  name: string
  surname: string
  email: string
  identityNumber?: string
  gsmNumber?: string
  registrationDate?: string
  lastLoginDate?: string
  registrationAddress?: string
  city?: string
  country?: string
  zipCode?: string
  ip?: string
}

type BuyerValidationResult =
  | { ok: true; buyer: IyzicoBuyer }
  | { ok: false; reason: 'input_invalid' | 'forbidden_field' | 'required_field_invalid' | 'email_invalid' | 'field_invalid' }

const allowedFields = new Set(['id', 'name', 'surname', 'email', 'identityNumber', 'gsmNumber', 'registrationDate', 'lastLoginDate', 'registrationAddress', 'city', 'country', 'zipCode', 'ip'])
const forbiddenFields = new Set(['secret', 'secretKey', 'apiKey', 'webhookSecret', 'cardNumber', 'cvv', 'cvc', 'pan', 'credentials'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validates the provider buyer payload without accepting card data or credentials. */
export function validateIyzicoBuyer(value: unknown): BuyerValidationResult {
  if (!isRecord(value)) return { ok: false, reason: 'input_invalid' }
  if (Object.keys(value).some(key => forbiddenFields.has(key))) return { ok: false, reason: 'forbidden_field' }
  if (Object.keys(value).some(key => !allowedFields.has(key))) return { ok: false, reason: 'field_invalid' }
  for (const key of Object.keys(value)) {
    const field = value[key]
    if (typeof field !== 'string' || !field || field.length > 500 || /[\r\n\0]/.test(field)) return { ok: false, reason: 'field_invalid' }
  }
  for (const required of ['id', 'name', 'surname']) {
    if (typeof value[required] !== 'string' || !value[required]) return { ok: false, reason: 'required_field_invalid' }
  }
  if (typeof value.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) return { ok: false, reason: 'email_invalid' }
  return { ok: true, buyer: value as IyzicoBuyer }
}
