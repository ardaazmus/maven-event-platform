import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/components/mavenforms/views/settings-view.tsx','utf8')
assert(src.includes('DEFERRED'), 'must have DEFERRED for unconfigured SMTP')
assert(src.includes('SMTP_HOST') || src.includes('SMTP'), 'must check SMTP env')
assert(!src.includes('connected') || src.includes('DEFERRED') || src.includes('disconnected'), 'must not show fake connected without DEFERRED')
assert(src.includes('Kart numarası, son kullanma tarihi ve CVV/CVC MavenForms uygulamasında hiçbir şekilde tutulmaz.'), 'billing must state that card data is never stored')
assert(!src.includes('•••• •••• •••• 4242'), 'billing must not show a hardcoded card')
assert(!src.includes('MavenForms Business'), 'billing must not show hardcoded invoice history')
assert(src.includes('Fatura geçmişi, güvenli faturalama sağlayıcısı bağlantısı tamamlandığında gerçek verilerle gösterilecektir.'), 'billing invoice history must disclose unimplemented state')

console.log('settings-truth.test: PASS (AC-SETTINGS-01)')
