import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const note = readFileSync('docs/research-sources/2026-09-17-ui-ux-rakip-arastirmasi.md', 'utf8')

// En az 3 rakip/kaynak URL
const urls = note.match(/https?:\/\/\S+/g) || []
assert(urls.length >= 3, `not en az 3 URL içermeli (bulunan: ${urls.length})`)
for (const u of [
  'https://www.cvent.com/en/blog/events/event-registration-examples',
  'https://www.eventbrite.com/blog/event-checkout-ds00/',
  'https://docs.seats.io/docs/tutorial/submit-hold-token',
]) {
  assert(note.includes(u), `kaynak URL notta olmalı: ${u}`)
}

// TR karar maddeleri kilitli
for (const k of ['### K-01', '### K-02', '### K-03', '### K-04', '### K-05', '### K-06']) {
  assert(note.includes(k), `karar maddesi notta olmalı: ${k}`)
}

// Dürüst-etiket kuralı: canlı kanıt iddiası yok, dayanak şeffaf
assert(note.includes('## Dürüst-etiket kuralı'), 'dürüst-etiket bölümü olmalı')
assert(note.includes('canlı provider, staging veya saha kanıtı değildir'), 'araştırma sınırı yazılmalı')
assert(note.includes('Dış bağımlılık gerektiren iddia yoktur'), 'dış bağımlılık yokluğu yazılmalı')

// Ölü-eylem girdisi: K-04 envanter kuralını taşır
assert(note.includes('UI-OLU-EYLEM-ENVANTERI.md'), 'ölü-eylem envanter bağı yazılmalı')
assert(note.includes('(yakında)'), 'dürüst pasiflik etiketi yazılmalı')

console.log(`ui-ux-research.test: PASS (${urls.length} URL, 6 karar, dürüst-etiket kilitli)`)
