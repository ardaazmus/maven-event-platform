import assert from "node:assert"
import { readFileSync } from "node:fs"

const schema = readFileSync("prisma/schema.prisma", "utf8")
for (const m of ["model Lead {", "model Connection {"]) {
  assert(schema.includes(m), `${m} olmali`)
}
for (const f of ["ownerId", "fullName", "requesterPersonId", "targetPersonId", "pending"]) {
  assert(schema.includes(f), `${f} olmali`)
}

// Kabul: additive migration ile veritabaninda (Lead + Connection tablolari mevcut olmali).
for (const line of readFileSync(".env", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"|"$/g, "")
}
const { PrismaClient } = await import("@prisma/client")
const prisma = new PrismaClient()
try {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('Lead', 'Connection')"
  )
  const names = tables.map((t) => t.name).sort()
  assert.deepStrictEqual(names, ["Connection", "Lead"])
} finally {
  await prisma.$disconnect()
}

console.log("network-model.test: PASS")
