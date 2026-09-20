import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// F4-R2: check-in runtime + onsite tarama sözleşme kilidi (serverless static).

const client = readFileSync('src/lib/api-client.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/checkin-view.tsx', 'utf8')
const route = readFileSync('src/app/api/checkin/route.ts', 'utf8')

// İki GET çağrısında tek-seviye çözüm
assert(client.includes('return data.data as T'), 'api tek seviyeyi acmali')
assert(view.includes('api<OccurrenceOption[]>'), 'oturum listesi tek-seviye cozulmeli')
assert(view.includes('api<FeedRow[]>'), 'akis tek-seviye cozulmeli')
assert(!view.includes('{ data: OccurrenceOption[] }'), 'oturum cift cozumu olmamali')
assert(!view.includes('{ data: FeedRow[] }'), 'akis cift cozumu olmamali')

// Event + occurrence gate zinciri
assert(view.includes('if (!selectedEventId) return'), 'event guard olmali')
assert(view.includes('if (!occurrenceId) return'), 'occurrence guard olmali')
assert(view.includes('Önce etkinlik seçin'), 'event gerekcesi olmali')
assert(view.includes('Akışı görmek için oturum seçin'), 'oturum gerekcesi olmali')
assert(view.includes('Salt-okunur operatör akışı'), 'salt-okunur niyeti yazmali')

// Tarama sözleşmesi: kimlik + duplicate + zaman penceresi
assert(route.includes('export async function GET'), 'akis GET olmali')
assert(route.includes('export async function POST'), 'tarama POST olmali')
assert(route.includes('qrCode'), 'tarama QR ile kimlik aramali')
assert(route.includes('Duplicate scan'), 'duplicate 409 olmali')
assert(route.includes('Future timestamp'), 'gelecek zaman reddi olmali')
assert(route.includes('Timestamp too old'), 'eski zaman reddi olmali')
assert(route.includes('take: 100'), 'akis bounded olmali')

// Rozet üretimi check-in sayılmaz; akış yalnız tarama eventlerini okur
assert(!view.includes('/badges/'), 'akis rozet uretimine baglanmamali')

console.log('f4-checkin-contract: PASS')
