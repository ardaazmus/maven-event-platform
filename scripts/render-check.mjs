// UX-RENDER-01: headless Chrome ile gercek render dogrulama.
// CDP tasiyici olarak TCP yerine --remote-debugging-pipe kullanilir; boylece
// dinleyici soket acamayan kisitli ortamlarda da calisir.
// Ortam notu (2026-09-18 dogrulandi): sandbox icinde calisan Chrome child
// process'leri ERR_NETWORK_ACCESS_DENIED alir (loopback dahil); betik tam
// yetkili makinede kosar.
// Kullanim: node scripts/render-check.mjs <outDir> [chromePath]
// Demo login yapar, shell + Etkinlikler + Kayitlar goruntulerini alir,
// kritik metinlerin DOM'da gorunur oldugunu dogrular.
import { spawn } from 'node:child_process'
import { accessSync, constants, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const outDir = process.argv[2]
const viewportParts = String(process.argv[4] || '1440,900').split(',').map((v) => Number(v))
const viewportWidth = viewportParts[0] || 1440
const isNarrow = viewportWidth < 768
const smokePort = process.env.SMOKE_PORT || '3000'
if (!outDir) {
  console.error('kullanim: node scripts/render-check.mjs <outDir>')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })

const headlessShellCandidates = process.env.LOCALAPPDATA
  ? ['chromium_headless_shell-1234', 'chromium_headless_shell-1228'].map((v) =>
      path.join(process.env.LOCALAPPDATA, 'ms-playwright', v, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
    )
  : []
const chromeCandidates = [
  process.argv[3],
  ...headlessShellCandidates,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)
const chromePath = chromeCandidates.find((p) => {
  try {
    accessSync(p, constants.X_OK)
    return true
  } catch {
    return false
  }
})
if (!chromePath) throw new Error('headless browser bulunamadi')

const profileDir = path.join(outDir, 'profile')
// Her kosu temiz profille baslar; onceki demo oturum cerezi login adimini atlatmasin.
rmSync(profileDir, { recursive: true, force: true })
mkdirSync(profileDir, { recursive: true })

// Sandbox calisan kullanicinin varsayilan TEMP/LOCALAPPDATA alanina yazamayabilir.
// Yalniz test tarayicisi icin yazilabilir chrome env dizini kullan.
const chromeEnvDir = path.join(outDir, 'chrome-env')
const chromeLocalAppData = path.join(chromeEnvDir, 'Local')
const chromeRoamingAppData = path.join(chromeEnvDir, 'Roaming')
const chromeTemp = path.join(chromeEnvDir, 'Temp')
for (const dir of [chromeLocalAppData, chromeRoamingAppData, chromeTemp]) mkdirSync(dir, { recursive: true })

const browser = spawn(
  chromePath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-pipe',
    `--user-data-dir=${profileDir}`,
    `--window-size=${process.argv[4] || '1440,900'}`,
  ],
  {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      LOCALAPPDATA: chromeLocalAppData,
      APPDATA: chromeRoamingAppData,
      TEMP: chromeTemp,
      TMP: chromeTemp,
    },
  },
)

let stderrTail = ''
if (browser.stderr) {
  browser.stderr.on('data', (chunk) => {
    stderrTail = `${stderrTail}${chunk.toString()}`.slice(-2000)
  })
}

let nextId = 0
const pending = new Map()
let attachedSessionId = null

function handleMessage(raw) {
  let msg
  try {
    msg = JSON.parse(raw)
  } catch {
    return
  }
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(msg.error.message || 'cdp error'))
    else resolve(msg.result || {})
    return
  }
  if (msg.method === 'Target.attachedToTarget' && msg.params && msg.params.sessionId) {
    attachedSessionId = msg.params.sessionId
  }
}

let pipeBuffer = Buffer.alloc(0)
if (browser.stdio[4]) {
  browser.stdio[4].on('data', (chunk) => {
    pipeBuffer = Buffer.concat([pipeBuffer, chunk])
    let idx = pipeBuffer.indexOf(0)
    while (idx !== -1) {
      const raw = pipeBuffer.subarray(0, idx).toString('utf8')
      pipeBuffer = pipeBuffer.subarray(idx + 1)
      if (raw) handleMessage(raw)
      idx = pipeBuffer.indexOf(0)
    }
  })
  browser.stdio[4].on('error', () => {})
}

function send(method, params = {}, sessionId) {
  const id = (nextId += 1)
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    if (!browser.stdio[3] || !browser.stdio[3].write(`${JSON.stringify(payload)}\0`)) {
      pending.delete(id)
      reject(new Error('cdp pipe yazilamadi'))
    }
  })
}

async function evaluate(sessionId, expression, awaitPromise = true) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true }, sessionId)
  if (result.exceptionDetails) throw new Error(`evaluate: ${result.exceptionDetails.text || 'hata'}`)
  return result.result ? result.result.value : undefined
}

async function waitFor(sessionId, expression, tries = 40) {
  for (let i = 0; i < tries; i += 1) {
    if (await evaluate(sessionId, expression)) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function screenshot(sessionId, file) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId)
  writeFileSync(file, Buffer.from(data, 'base64'))
}

// Sidebar gezinmesi gercek <button> ogelerine tiklar; etiket <span> icindedir,
// leaf-div eslesmesi gezinmeyi tetiklemez.
async function clickNav(sessionId, label) {
  const clicked = await evaluate(
    sessionId,
    `(label => {
      const btns = [...document.querySelectorAll('aside button')];
      const target = btns.find((b) => b.textContent.trim() === label);
      if (!target) return 'missing';
      target.click();
      return 'ok';
    })(${JSON.stringify(label)})`,
  )
  if (clicked !== 'ok') throw new Error(`menu bulunamadi: ${label}`)
}

let failed = false
const watchdog = setTimeout(() => {
  console.error('render-check: FAIL watchdog timeout')
  try { browser.kill() } catch { /* yok say */ }
  process.exit(1)
}, 150000)
try {
  await new Promise((r) => setTimeout(r, 2000))
  if (browser.exitCode !== null) throw new Error(`tarayici erken kapandi (exit ${browser.exitCode}): ${stderrTail}`)
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' })
  if (!targetId) throw new Error('hedef sekme acilamadi')
  console.log('cdp pipe ready')
  const attached = await send('Target.attachToTarget', { targetId, flatten: true })
  const sessionId = attached.sessionId || attachedSessionId
  if (!sessionId) throw new Error('cdp oturumu acilamadi')
  await send('Page.enable', {}, sessionId)
  await send('Page.navigate', { url: `http://127.0.0.1:${smokePort}/` }, sessionId)
  await new Promise((r) => setTimeout(r, 4000))
  console.log('navigated')

  // Login formu: demo kimlik dogrulama zaten on-doldurulu
  const loginReady = await waitFor(sessionId, `!!document.querySelector('input[type=\"password\"]')`)
  if (!loginReady) throw new Error('login formu bulunamadi')
  await evaluate(
    sessionId,
    `(() => {
      const form = document.querySelector('form');
      if (!form) return false;
      const submit = form.querySelector('button[type=\"submit\"]');
      if (!submit) return false;
      submit.click();
      return true;
    })()`,
  )
  const shellReady = await waitFor(sessionId, `document.body.innerText.includes('Genel Bakış')`, 60)
  if (!shellReady) throw new Error('shell acilmadi (Genel Bakış yok)')
  await new Promise((r) => setTimeout(r, 1500))
  await screenshot(sessionId, path.join(outDir, '01-shell.png'))

  const mustSee = isNarrow ? ['Etkinlik'] : ['Etkinlikler', 'Kayıtlar', 'Etkinlik', 'Yeni Etkinlik']
  for (const text of mustSee) {
    const seen = await evaluate(sessionId, `document.body.innerText.includes(${JSON.stringify(text)})`)
    if (!seen) throw new Error(`shell metni yok: ${text}`)
  }

  if (!isNarrow) {
  // Etkinlikler menusune tikla (desktop sidebar)
  await clickNav(sessionId, 'Etkinlikler')
  await new Promise((r) => setTimeout(r, 1500))
  await screenshot(sessionId, path.join(outDir, '02-events.png'))
  const eventsSeen = await waitFor(sessionId, `document.body.innerText.includes('Bağlam seçmek') || document.body.innerText.includes('Etkinlikler yükleniyor') || document.body.innerText.includes('Henüz etkinlik yok')`)
  if (!eventsSeen) throw new Error('etkinlik listesi acilmadi')

  // Kayitlar menusune tikla
  await clickNav(sessionId, 'Kayıtlar')
  await new Promise((r) => setTimeout(r, 1500))
  await screenshot(sessionId, path.join(outDir, '03-registrations.png'))
  const inboxSeen = await waitFor(sessionId, `document.body.innerText.includes('Önce etkinlik seçin') || document.body.innerText.includes('Kayıtlar yükleniyor') || document.body.innerText.includes('Bu etkinlikte kayıt yok')`)
  if (!inboxSeen) throw new Error('kayit inbox acilmadi')
  }

  if (!isNarrow) {
    // Birincil Yeni Etkinlik aksiyonu dogrudan olusturma akisini acar.
    await clickNav(sessionId, 'Yeni Etkinlik')
    await new Promise((r) => setTimeout(r, 1500))
    await screenshot(sessionId, path.join(outDir, '04-new-event.png'))
    const createSeen = await waitFor(sessionId, `document.body.innerText.includes('Etkinlik adı')`)
    if (!createSeen) throw new Error('yeni etkinlik akisi acilmadi')
  } else {
    // Dar mobil: topbar menusu uzerinden Etkinlikler.
    const menuOpened = await evaluate(sessionId, `(() => {
      const btn = document.querySelector('button[aria-label="Menüyü aç"]');
      if (!btn) return false;
      btn.click();
      return true;
    })()`)
    if (!menuOpened) throw new Error('mobil menu bulunamadi')
    await new Promise((r) => setTimeout(r, 1000))
    await screenshot(sessionId, path.join(outDir, '02-events-mobile-menu.png'))
    const mobileNav = await evaluate(sessionId, `(() => {
      const items = [...document.querySelectorAll('[role="menuitem"]')];
      const target = items.find((el) => el.textContent.trim() === 'Etkinlikler');
      if (!target) return 'missing';
      target.click();
      return 'ok';
    })()`)
    if (mobileNav !== 'ok') throw new Error('mobil Etkinlikler ogesi bulunamadi')
    await new Promise((r) => setTimeout(r, 1500))
    await screenshot(sessionId, path.join(outDir, '03-events-mobile.png'))
    const mobileEventsSeen = await waitFor(sessionId, `document.body.innerText.includes('Bağlam seçmek') || document.body.innerText.includes('Etkinlikler yükleniyor') || document.body.innerText.includes('Henüz etkinlik yok')`)
    if (!mobileEventsSeen) throw new Error('mobil etkinlik listesi acilmadi')
  }

  try { await send('Browser.close') } catch { /* yok say */ }
  clearTimeout(watchdog)
  console.log(`render-check: PASS (${outDir})`)
} catch (error) {
  failed = true
  console.error(`render-check: FAIL ${error instanceof Error ? error.message : error}`)
} finally {
  try { browser.kill() } catch { /* yok say */ }
}
process.exit(failed ? 1 : 0)
