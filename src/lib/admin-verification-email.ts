import { connect as connectTcp, type Socket } from 'node:net'
import { connect as connectTls, type TLSSocket } from 'node:tls'
import { randomUUID } from 'node:crypto'

export interface AdminVerificationEmailInput {
  recipient: string
  code: string
  actionLabel: string
  expiresInMinutes: number
}

const SMTP_TIMEOUT_MS = 15_000
const SMTP_RESPONSE_LIMIT = 262_144
type SmtpSocket = Socket | TLSSocket

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`missing_${name.toLowerCase()}`)
  return value
}

function emailAddress(value: string): string {
  const match = value.match(/<([^<>\s]+)>/) ?? value.match(/^([^\s]+)$/)
  const address = match?.[1] ?? ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || /[\r\n]/.test(address)) throw new Error('invalid_email_address')
  return address
}

function base64Lines(value: string): string {
  const encoded = Buffer.from(value, 'utf8').toString('base64')
  return encoded.match(/.{1,76}/g)?.join('\r\n') ?? ''
}

function socketConnect(host: string, port: number, secure: boolean): Promise<SmtpSocket> {
  return new Promise((resolve, reject) => {
    const socket = secure ? connectTls({ host, port, servername: host, rejectUnauthorized: true }) : connectTcp({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error('smtp_connection_timeout'))
    }, SMTP_TIMEOUT_MS)
    socket.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    socket.once(secure ? 'secureConnect' : 'connect', () => {
      clearTimeout(timer)
      resolve(socket)
    })
  })
}

function upgradeToTls(socket: Socket, host: string): Promise<TLSSocket> {
  return new Promise((resolve, reject) => {
    const tlsSocket = connectTls({ socket, servername: host, rejectUnauthorized: true })
    const timer = setTimeout(() => {
      tlsSocket.destroy()
      reject(new Error('smtp_tls_timeout'))
    }, SMTP_TIMEOUT_MS)
    tlsSocket.once('error', error => {
      clearTimeout(timer)
      reject(error)
    })
    tlsSocket.once('secureConnect', () => {
      clearTimeout(timer)
      resolve(tlsSocket)
    })
  })
}

function readResponse(socket: SmtpSocket): Promise<{ code: number; lines: string[] }> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => {
      cleanup()
      reject(new Error('smtp_response_timeout'))
    }, SMTP_TIMEOUT_MS)
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString()
      if (buffer.length > SMTP_RESPONSE_LIMIT) {
        cleanup()
        reject(new Error('smtp_response_too_large'))
        return
      }
      const lines = buffer.split('\r\n')
      buffer = lines.pop() ?? ''
      const completed = lines.filter(Boolean)
      const last = completed.at(-1) ?? ''
      if (!/^\d{3}(?: |$)/.test(last)) return
      cleanup()
      resolve({ code: Number(last.slice(0, 3)), lines: completed })
    }
    const onError = (error: Error) => {
      cleanup()
      reject(error)
    }
    const cleanup = () => {
      clearTimeout(timer)
      socket.off('data', onData)
      socket.off('error', onError)
    }
    socket.on('data', onData)
    socket.once('error', onError)
  })
}

async function command(socket: SmtpSocket, value: string, accepted: number[]): Promise<{ code: number; lines: string[] }> {
  socket.write(`${value}\r\n`)
  const response = await readResponse(socket)
  if (!accepted.includes(response.code)) throw new Error(`smtp_command_failed_${response.code}`)
  return response
}

function capabilities(lines: string[]): Set<string> {
  return new Set(lines.map(line => line.slice(4).trim().split(/\s+/)[0]?.toUpperCase()).filter(Boolean))
}

function authPlain(user: string, password: string): string {
  return Buffer.from(`\0${user}\0${password}`, 'utf8').toString('base64')
}

function authLogin(user: string, password: string): string[] {
  return [Buffer.from(user, 'utf8').toString('base64'), Buffer.from(password, 'utf8').toString('base64')]
}

export async function sendAdminVerificationEmail(input: AdminVerificationEmailInput): Promise<void> {
  const host = requiredEnv('SMTP_HOST')
  const port = Number(requiredEnv('SMTP_PORT'))
  const user = requiredEnv('SMTP_USER')
  const password = requiredEnv('SMTP_PASSWORD')
  const from = emailAddress(requiredEnv('SMTP_FROM'))
  const recipient = emailAddress(input.recipient)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('invalid_smtp_port')
  if (!input.actionLabel || /[\r\n]/.test(input.actionLabel)) throw new Error('invalid_action_label')

  let socket: SmtpSocket | undefined
  try {
    socket = await socketConnect(host, port, port === 465)
    const greeting = await readResponse(socket)
    if (greeting.code !== 220) throw new Error(`smtp_greeting_failed_${greeting.code}`)
    let response = await command(socket, 'EHLO mavenforms', [250])
    let caps = capabilities(response.lines)
    if (port !== 465) {
      if (!caps.has('STARTTLS')) throw new Error('smtp_tls_required')
      await command(socket, 'STARTTLS', [220])
      socket = await upgradeToTls(socket as Socket, host)
      response = await command(socket, 'EHLO mavenforms', [250])
      caps = capabilities(response.lines)
    }
    if (!caps.has('AUTH')) throw new Error('smtp_auth_not_advertised')
    if (response.lines.some(line => /AUTH.*PLAIN/i.test(line))) {
      await command(socket, `AUTH PLAIN ${authPlain(user, password)}`, [235])
    } else if (response.lines.some(line => /AUTH.*LOGIN/i.test(line))) {
      await command(socket, 'AUTH LOGIN', [334])
      const loginValues = authLogin(user, password)
      await command(socket, loginValues[0], [334])
      await command(socket, loginValues[1], [235])
    } else throw new Error('smtp_auth_method_not_supported')
    await command(socket, `MAIL FROM:<${from}>`, [250])
    await command(socket, `RCPT TO:<${recipient}>`, [250, 251])
    await command(socket, 'DATA', [354])
    const subject = `=?UTF-8?B?${Buffer.from('MavenForms admin doğrulama kodu', 'utf8').toString('base64')}?=`
    const text = [
      'MavenForms güvenlik doğrulaması',
      '',
      `İstenen işlem: ${input.actionLabel}`,
      `Doğrulama kodu: ${input.code}`,
      `Bu kod ${input.expiresInMinutes} dakika geçerlidir ve tek kullanımlıktır.`,
      '',
      'Bu işlemi siz başlatmadıysanız bu e-postayı yok sayın.',
    ].join('\n')
    const message = [
      `From: ${from}`,
      `To: ${recipient}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${randomUUID()}@mavenforms.local>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64Lines(text),
      '.',
    ].join('\r\n')
    await command(socket, message, [250])
    await command(socket, 'QUIT', [221, 250])
  } catch (error) {
    socket?.destroy()
    throw error
  }
}
