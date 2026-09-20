import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// EF-04B: kayıt inbox runtime + event-bağlı liste sözleşmesi (serverless static).

const client = readFileSync('src/lib/api-client.ts', 'utf8')
const view = readFileSync('src/components/mavenforms/views/registration-inbox-view.tsx', 'utf8')
const route = readFileSync('src/app/api/registrations/route.ts', 'utf8')

// Tek-seviye çözüm, çift body.data yok
assert(client.includes('return data.data as T'), 'api tek seviyeyi acmali')
assert(view.includes('api<InboxRow[]>'), 'inbox tek-seviye cozum kullanmali')
assert(!view.includes('{ data: InboxRow[] }'), 'inbox cift data cozumu yapmamali')

// Event bağlı liste: seçim-yok guard + eventId query
assert(view.includes('if (!selectedEventId) return'), 'secim-yok guard olmali')
assert(view.includes('/api/registrations?eventId='), 'liste eventId ile cagrilmali')
assert(view.includes('Önce etkinlik seçin'), 'secim-yok gerekcesi olmali')
assert(route.includes("searchParams.get('eventId')"), 'server eventId okumali')
assert(route.includes('eventId gerekli'), 'server eventId zorunlulugu olmali')
assert(route.includes('assertEventReadable(event'), 'server scope dogrulamasi olmali')

// Submission Registration değildir: inbox yalnız canonical projection okur
assert(!view.includes('/api/forms/'), 'inbox form submission okumamali')
assert(!view.includes('Submission'), 'inbox submission tipi kullanmamali')
assert(view.includes('salt-okunur liste'), 'salt-okunur niyeti yazmali')

// Durumlar korunur
assert(view.includes('Kayıtlar yükleniyor'), 'yukleniyor durumu olmali')
assert(view.includes('Kayıt listesi alınamadı'), 'hata durumu olmali')
assert(view.includes('Bu etkinlikte kayıt yok'), 'bos durumu olmali')
assert(view.includes('data-testid="registration-inbox"'), 'testid korunmali')

console.log('ef-registration-inbox: PASS')
