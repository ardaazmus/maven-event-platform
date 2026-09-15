import assert from 'node:assert'
import { readFileSync } from 'node:fs'

const src = readFileSync('src/app/api/forms/[id]/export/route.ts','utf8')
const xlsx = readFileSync('src/lib/xlsx-export.ts','utf8')
assert(src.includes('can.readSubmissions'), 'must check readSubmissions')
assert(src.includes('workspaceId'), 'must scope by workspaceId')
assert(src.includes('Content-Disposition') && src.includes('attachment'), 'must be attachment')
assert(src.includes('text/csv'), 'must be csv')
assert(src.includes('xlsx') && src.includes('XLSX_MIME'), 'route must expose xlsx')
assert(xlsx.includes('PK') === false && xlsx.includes('zipStore') && xlsx.includes('xl/worksheets/sheet1.xml'), 'must build an xlsx package')
assert(src.includes('take') && src.includes('1000'), 'must paginate/limit')

const view = readFileSync('src/components/mavenforms/views/submissions-view.tsx','utf8')
assert(view.includes('/api/forms/') && view.includes('/export'), 'view must call export API, not toast only')
assert(!view.includes('İndirme linki e-posta ile gönderilecek'), 'must not be mock toast only')

console.log('export.test: PASS (AC-FORM-07)')
