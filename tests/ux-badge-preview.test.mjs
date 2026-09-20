import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const view = readFileSync('src/components/mavenforms/views/badge-studio-view.tsx', 'utf8')

// Adim-3 panel kimligi ve gostergesi
assert(view.includes('Adım 3/7'), 'adim gostergesi olmali')
assert(view.includes('data-testid="badge-preview-panel"'), 'panel test kimligi tasimali')

// Gercek endpointlere bagli: surum secimi + tek uretim
assert(view.includes('/badges/templates/selection'), 'surum secimi endpointine gitmeli')
assert(view.includes('/badges/generate'), 'uretim endpointine gitmeli')
assert(view.includes("selectionMode: 'SINGLE'"), 'onizleme tek kayit olmali')
assert(view.includes('submissionIds: [submissionId]'), 'tek kayit ID tasinmali')
assert(view.includes('DUAL_FACE') && view.includes('SINGLE_FACE'), 'yuz modu sablon sayfasina uymali')

// Toplu uretim, export ve indirme bu adimda yok
assert(!view.includes('/badges/export'), 'export baglantisi olmamali')
assert(!view.includes("'ALL'") && !view.includes('"ALL"'), 'toplu secim modu olmamali')
assert(!view.includes('<a ') || !view.includes('download'), 'indirme bagi olmamali')

// Karantina dili
assert(view.includes('karantina'), 'karantina sonucu yazmali')
assert(view.includes('tarama'), 'tarama gerekliligi yazmali')

// Form baglami kilidi korunur
assert(view.includes('if (!selectedFormId) return'), 'erken-cikis guard seklinde olmali')
assert(view.includes('Kayıt ID girin'), 'kayit ID girdisi olmali')

console.log('ux-badge-preview.test: PASS (uretim onizleme adim-3 kilitli)')
