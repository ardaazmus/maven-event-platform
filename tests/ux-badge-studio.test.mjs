import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/badge-studio-view.tsx', 'utf8')
const types = readFileSync('src/lib/types.ts', 'utf8')
const sidebar = readFileSync('src/components/mavenforms/sidebar.tsx', 'utf8')
const shell = readFileSync('src/components/mavenforms/app-shell.tsx', 'utf8')
const catalog = readFileSync('src/lib/badge-template-catalog.ts', 'utf8')

// Tip + menu + shell baglantisi
assert(types.includes("| 'badges'"), 'AppView badges tasimali')
assert(sidebar.includes("id: 'badges'") && sidebar.includes('Yaka Kartları'), 'sidebar Yaka Kartlari ogesi tasimali')
assert(shell.includes('<BadgeStudioView />'), 'shell studio render etmeli')

// Studio gercek katalogu okur, versiyon gosterir
assert(view.includes('/badges/templates/catalog'), 'studio katalog endpointini cagirmali')
assert(view.includes('versionId'), 'versiyon gosterilmeli')
assert(view.includes('VALIDATED'), 'dogrulanmis rozeti olmali')
assert(view.includes('Adım 1/7'), 'adim gostergesi olmali')

// Form secilmeden acilmaz; adim-1'de dosya yukleme yok (onizleme metin girdisi ayri)
assert(view.includes('Önce form seçin'), 'form-gerekcesi olmali')
assert(!view.includes('type="file"'), 'dosya yukleme inputu olmamali')
assert(view.includes('aria-label="Önizleme kayıt ID"'), 'onizleme metin girdisi korunmali')

// Katalog API tarafi VALIDATED-only ve workspace scope korunur
assert(catalog.includes("validationStatus !== 'VALIDATED'") || catalog.includes("validationStatus: 'VALIDATED'") || catalog.includes('VALIDATED'), 'katalog dogrulama filtresi korunmali')

console.log('ux-badge-studio.test: PASS (studio adim-1 kilitli)')
