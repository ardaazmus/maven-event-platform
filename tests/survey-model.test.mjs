import assert from "node:assert"
import { readFileSync } from "node:fs"

const schema = readFileSync("prisma/schema.prisma", "utf8")
for (const m of ["model Survey {", "model SurveyResponse {"]) {
  assert(schema.includes(m), `${m} olmali`)
}
for (const f of ["answersJson", "respondentName", "responses SurveyResponse[]", "surveys       Survey[]", "draft"]) {
  assert(schema.includes(f), `${f} olmali`)
}

console.log("survey-model.test: PASS")
