import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const builder = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const createRoute = readFileSync('src/app/api/forms/[id]/notifications/route.ts', 'utf8')
const updateRoute = readFileSync('src/app/api/forms/[id]/notifications/[notifId]/route.ts', 'utf8')

assert(builder.includes('hasPublicEmailField'), 'builder must derive user-confirmation eligibility from public email fields')
assert(builder.includes('disabled={!hasPublicEmailField}'), 'user confirmation option must be disabled without a public email field')
assert(builder.includes('Kullanıcı onayı için formda public bir e-posta alanı gerekir'), 'builder must explain missing email eligibility')
assert(createRoute.includes("body.type === 'user_confirmation'"), 'create route must guard user confirmation server-side')
assert(updateRoute.includes("(body.type ?? existing.type) === 'user_confirmation'"), 'update route must guard the resulting user confirmation type server-side')
assert(createRoute.includes("'Kullanıcı onayı için public e-posta alanı gerekli'"), 'create route must expose a stable eligibility error')
assert(updateRoute.includes("'Kullanıcı onayı için public e-posta alanı gerekli'"), 'update route must expose a stable eligibility error')

console.log('notification-email-eligibility.test: PASS (AC-NOTIFICATION-EMAIL-ELIGIBILITY-01)')
