import net from 'node:net'
import { execFileSync } from 'node:child_process'
import assert from 'node:assert'

// R5 shadow rehearsal ortam probu: yalnızca localhost Postgres, trust auth (parola yok).
const port = Number(process.env.PG_PROBE_PORT || 5433)
const sock = await new Promise((resolve) => {
  const s = net.connect(port, '127.0.0.1')
  s.on('connect', () => { s.end(); resolve(true) })
  s.on('error', () => resolve(false))
  setTimeout(() => { s.destroy(); resolve(false) }, 5000)
})
assert(sock, `postgres 127.0.0.1:${port} kapalı`)

const version = execFileSync('docker', ['exec', 'mf-pg-shadow', 'psql', '-U', 'postgres', '-tAc', 'SHOW server_version;'], { encoding: 'utf8' }).trim()
assert(/^\d+\./.test(version), `sürüm okunamadı: ${version}`)
console.log(`pg-probe: PASS (127.0.0.1:${port}, postgres ${version}, trust auth, parola yok)`)
