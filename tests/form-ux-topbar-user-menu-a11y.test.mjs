import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const topbar = readFileSync('src/components/mavenforms/topbar.tsx', 'utf8')

assert.match(topbar, /<button className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-muted\/50 transition-colors" aria-label=\{`Kullanıcı menüsü: \$\{user\?\.name \|\| 'Kullanıcı'\}`\} title="Kullanıcı menüsünü aç">/, 'user menu trigger needs a dynamic accessible name and tooltip')
assert.match(topbar, /Profilim/, 'profile action must remain available')
assert.match(topbar, /Hesap Ayarları/, 'account settings action must remain available')
assert.match(topbar, /Çıkış Yap/, 'logout action must remain available')

console.log('form-ux-topbar-user-menu-a11y.test: PASS')
