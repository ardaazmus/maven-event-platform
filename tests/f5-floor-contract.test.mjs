import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// F5-R1: floor runtime + plan/hold sözleşme kilidi (serverless static).

const client = readFileSync('src/lib/api-client.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/floor-view.tsx', 'utf8')
const bindings = readFileSync('src/app/api/events/[id]/plan-bindings/route.ts', 'utf8')
const holds = readFileSync('src/app/api/events/[id]/holds/route.ts', 'utf8')

// İki GET çağrısında tek-seviye çözüm
assert(client.includes('return data.data as T'), 'api tek seviyeyi acmali')
assert(view.includes('api<Binding[]>'), 'binding tek-seviye cozulmeli')
assert(view.includes('api<Hold[]>'), 'hold tek-seviye cozulmeli')
assert(!view.includes('{ data: Binding[] }'), 'binding cift cozumu olmamali')
assert(!view.includes('{ data: Hold[] }'), 'hold cift cozumu olmamali')

// Geometri kopyalanmaz: metadata-only niyeti iki tarafta yazmali
assert(view.includes('Plan geometrisi'), 'view geometri siniri yazmali')
assert(bindings.includes('Geometri Floor Editor'), 'route geometri siniri yazmali')
assert(!bindings.includes('geometry') && !bindings.includes('coordinates'), 'route geometri donmemeli')

// Binding select allowlist: yalnız metadata alanları
assert(bindings.includes('externalPlanId') && bindings.includes('planVersion'), 'binding metadata donmeli')
assert(bindings.includes('take: 100'), 'binding bounded olmali')

// Hold: conflict + token kanal ayrımı + ttl
assert(holds.includes('Space already held'), 'hold conflict 409 olmali')
assert(holds.includes('holdToken'), 'hold token uretmeli')
assert(!holds.includes('holdToken: true') || holds.includes('ayri kanaldan'), 'liste token sizdirmamali')
assert(holds.includes('ttlMinutes') || holds.includes('expiresAt'), 'hold vadeli olmali')

// Event gate + durumlar
assert(view.includes('if (!selectedEventId) return'), 'event guard olmali')
assert(view.includes('Önce etkinlik seçin'), 'secim-yok gerekcesi olmali')
assert(view.includes('data-testid="floor-view"'), 'testid korunmali')

console.log('f5-floor-contract: PASS')
