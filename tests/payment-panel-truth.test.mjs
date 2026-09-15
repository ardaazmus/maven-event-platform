import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/form-builder-view.tsx', 'utf8')
const panel = src.slice(src.indexOf('function PaymentPanel'), src.indexOf('function IntegrationsPanel'))
const securityNotice = src.slice(src.indexOf('function PaymentSecurityNotice'), src.indexOf('function IntegrationSecurityNotice'))

assert(panel.includes("status: 'planned'"), 'payment providers must remain explicitly planned before server integration')
assert(panel.includes('Planlandı'), 'planned provider state must be visible to the user')
assert(!panel.includes("status: 'connected'"), 'payment UI must not claim a hardcoded connected provider')
assert(!panel.includes('>Bağla<'), 'payment UI must not expose an unhandled connect action')
assert(panel.includes('disabled className="w-full h-9'), 'currency must not look editable before persistence exists')
assert(panel.includes('disabled type="number"'), 'tax must not look editable before persistence exists')
assert((panel.match(/<Switch disabled/g) || []).length >= 2, 'unimplemented payment switches must be disabled')
assert(securityNotice.includes('Kart numarası, son kullanma tarihi ve CVV/CVC MavenForms sunucularında hiçbir şekilde tutulmaz.'), 'payment panel must prominently state that card data is never stored')
assert(securityNotice.includes('Google Pay yalnızca sağlayıcı destekli gateway tokenization ile açılır.'), 'Google Pay must use gateway tokenization')
assert(securityNotice.includes('webhook imzası'), 'payment status must require verified provider webhooks')

const integrations = src.slice(src.indexOf('function IntegrationsPanel'), src.indexOf('function ReportsPanel'))
assert(integrations.includes('Entegrasyon secret’ları'), 'integrations panel must state server-only secret handling')
assert(!integrations.includes("status: 'connected'"), 'integrations panel must not claim a hardcoded connected provider')
assert(!integrations.includes('>Bağla<'), 'integrations panel must not expose an unhandled connect action')

console.log('payment-panel-truth.test: PASS (PAY-01)')
