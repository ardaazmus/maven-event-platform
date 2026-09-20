import assert from 'node:assert'
import { readFileSync } from 'node:fs'

// F8-R1: modül view tek-seviye çözüm kilidi (serverless static).

const client = readFileSync('src/lib/api-client.ts', 'utf8')
assert(client.includes('return data.data as T'), 'api tek seviyeyi acmali')

const views = {
  abstract: ['src/components/mavenforms/views/abstract-view.tsx', 'api<AbstractRow[]>', '{ data: AbstractRow[] }'],
  network: ['src/components/mavenforms/views/network-view.tsx', 'api<LeadRow[]>', '{ data: LeadRow[] }'],
  program: ['src/components/mavenforms/views/program-view.tsx', 'api<ProgramRow[]>', '{ data: ProgramRow[] }'],
  sponsor: ['src/components/mavenforms/views/sponsor-view.tsx', 'api<SponsorRow[]>', '{ data: SponsorRow[] }'],
  survey: ['src/components/mavenforms/views/survey-view.tsx', 'api<SurveyRow[]>', '{ data: SurveyRow[] }'],
}
for (const [name, [file, single, doubled]] of Object.entries(views)) {
  const source = readFileSync(file, 'utf8')
  assert(source.includes(single), `${name} tek-seviye cozum kullanmali`)
  assert(!source.includes(doubled), `${name} cift data cozumu yapmamali`)
}

// Program konuşmacı POST: created doğrudan { id } tüketilir
const program = readFileSync('src/components/mavenforms/views/program-view.tsx', 'utf8')
assert(program.includes('api<{ id: string }>('), 'konusmaci POST tek-seviye olmali')
assert(program.includes('speakerId: created.id'), 'konusmaci id dogrudan okunmali')
assert(!program.includes('created.data'), 'konusmaci cift cozumu olmamali')

// Reports binding okuma: tek-seviye
const reports = readFileSync('src/components/mavenforms/views/reports-view.tsx', 'utf8')
assert(reports.includes('api<Array<{ form: { id: string } }>>'), 'reports binding tek-seviye olmali')
assert(!reports.includes('bound.data'), 'reports cift cozumu olmamali')

console.log('f8-module-views: PASS')
