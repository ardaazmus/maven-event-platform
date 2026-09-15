import { createRequire } from 'node:module'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { BadgeOutputFieldKey, BadgeProjection } from './badge-field-mapping'
// @ts-expect-error Node strip-types tests require explicit TypeScript extensions.
import { validateBadgeFrontRender, type BadgeFrontRenderInput, type BadgeRenderBox, type BadgeTextPlacement } from './badge-front-render-contract.ts'

const require = createRequire(import.meta.url)
const QRCode = require('qrcode') as {
  create: (value: string, options: { errorCorrectionLevel: 'M' }) => { modules: { size: number; data: Uint8Array } }
}

const MAX_BACKGROUND_BYTES = 25 * 1024 * 1024
const MAX_OUTPUT_BYTES = 20 * 1024 * 1024
const MAX_QR_PAYLOAD_LENGTH = 2_048
const PAGE_TOLERANCE_PT = 0.01

export type BadgePdfRendererInput = Readonly<{
  backgroundPdfBytes: Uint8Array
  backgroundAssetId: string
  pageWidthPt: number
  pageHeightPt: number
  safeArea: BadgeRenderBox
  textPlacements: ReadonlyArray<BadgeTextPlacement>
  values: BadgeProjection
  qrPlacement?: BadgeFrontRenderInput['qrPlacement']
  qrPayload?: string
  fontBytes?: Uint8Array
}>

export type BadgePdfRendererOutput = Readonly<{
  bytes: Uint8Array
  mimeType: 'application/pdf'
  pageCount: 1
  vectorQr: boolean
  qrModuleCount?: number
}>

export type BadgePdfRendererErrorCode =
  | 'BACKGROUND_REQUIRED'
  | 'BACKGROUND_INVALID'
  | 'BACKGROUND_TOO_LARGE'
  | 'BACKGROUND_ACTIVE_CONTENT'
  | 'BACKGROUND_DIMENSION_MISMATCH'
  | 'RENDER_INPUT_INVALID'
  | 'QR_PAYLOAD_REQUIRED'
  | 'QR_PAYLOAD_INVALID'
  | 'FONT_REQUIRED'
  | 'OUTPUT_TOO_LARGE'
  | 'RENDER_FAILED'

function hasPdfSignature(bytes: Uint8Array) {
  return new TextDecoder('latin1').decode(bytes.slice(0, 5)) === '%PDF-'
}

function hasActivePdfContent(bytes: Uint8Array) {
  const text = new TextDecoder('latin1').decode(bytes)
  return /\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile)\b/u.test(text)
}

function hasNonAscii(value: string) {
  return /[^\u0000-\u007f]/u.test(value)
}

function valuesContainNonAscii(values: BadgeProjection) {
  return Object.values(values).some(value => typeof value === 'string' && hasNonAscii(value))
}

function isSameDimension(left: number, right: number) {
  return Math.abs(left - right) <= PAGE_TOLERANCE_PT
}

function safeText(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').normalize('NFC')
}

function drawTextPlacement(page: PDFPage, font: PDFFont, placement: BadgeTextPlacement, values: BadgeProjection) {
  const value = values[placement.key as BadgeOutputFieldKey]
  if (!value) return
  const lines = safeText(value).split('\n').slice(0, placement.maxLines)
  const lineHeight = Math.max(8, Math.min(72, placement.box.heightPt / Math.max(1, placement.maxLines)))
  const fontSize = Math.max(6, Math.min(72, lineHeight * 0.78))
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: placement.box.xPt,
      y: placement.box.yPt + placement.box.heightPt - fontSize - index * lineHeight,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: placement.box.widthPt,
    })
  })
}

function drawVectorQr(page: PDFPage, box: BadgeRenderBox, payload: string, quietZoneModules: number) {
  const qr = QRCode.create(payload, { errorCorrectionLevel: 'M' })
  const moduleSize = Math.min(box.widthPt, box.heightPt) / (qr.modules.size + quietZoneModules * 2)
  const offsetX = box.xPt + (box.widthPt - moduleSize * (qr.modules.size + quietZoneModules * 2)) / 2
  const offsetY = box.yPt + (box.heightPt - moduleSize * (qr.modules.size + quietZoneModules * 2)) / 2

  for (let row = 0; row < qr.modules.size; row += 1) {
    for (let column = 0; column < qr.modules.size; column += 1) {
      if (qr.modules.data[row * qr.modules.size + column] !== 1) continue
      page.drawRectangle({
        x: offsetX + (column + quietZoneModules) * moduleSize,
        y: offsetY + (qr.modules.size - row - 1 + quietZoneModules) * moduleSize,
        width: moduleSize,
        height: moduleSize,
        color: rgb(0, 0, 0),
      })
    }
  }
  return qr.modules.size
}

export async function renderBadgePdf(
  input: BadgePdfRendererInput,
): Promise<{ ok: true; output: BadgePdfRendererOutput } | { ok: false; code: BadgePdfRendererErrorCode }> {
  if (!input.backgroundPdfBytes.byteLength) return { ok: false, code: 'BACKGROUND_REQUIRED' }
  if (input.backgroundPdfBytes.byteLength > MAX_BACKGROUND_BYTES) return { ok: false, code: 'BACKGROUND_TOO_LARGE' }
  if (!hasPdfSignature(input.backgroundPdfBytes)) return { ok: false, code: 'BACKGROUND_INVALID' }
  if (hasActivePdfContent(input.backgroundPdfBytes)) return { ok: false, code: 'BACKGROUND_ACTIVE_CONTENT' }

  const frontPlan: BadgeFrontRenderInput = {
    pageWidthPt: input.pageWidthPt,
    pageHeightPt: input.pageHeightPt,
    safeArea: input.safeArea,
    backgroundAssetId: input.backgroundAssetId,
    textPlacements: input.textPlacements,
    values: input.values,
    ...(input.qrPlacement ? { qrPlacement: input.qrPlacement } : {}),
  }
  if (!validateBadgeFrontRender(frontPlan).ok) return { ok: false, code: 'RENDER_INPUT_INVALID' }
  if (input.qrPlacement && !input.qrPayload) return { ok: false, code: 'QR_PAYLOAD_REQUIRED' }
  if (input.qrPayload && (input.qrPayload.length > MAX_QR_PAYLOAD_LENGTH || /[\u0000-\u001f]/u.test(input.qrPayload))) {
    return { ok: false, code: 'QR_PAYLOAD_INVALID' }
  }
  if (valuesContainNonAscii(input.values) && !input.fontBytes?.byteLength) return { ok: false, code: 'FONT_REQUIRED' }

  try {
    const source = await PDFDocument.load(input.backgroundPdfBytes, { ignoreEncryption: false, updateMetadata: false })
    if (source.getPageCount() !== 1) return { ok: false, code: 'BACKGROUND_INVALID' }
    const sourcePage = source.getPage(0)
    if (!isSameDimension(sourcePage.getWidth(), input.pageWidthPt) || !isSameDimension(sourcePage.getHeight(), input.pageHeightPt)) {
      return { ok: false, code: 'BACKGROUND_DIMENSION_MISMATCH' }
    }

    const output = await PDFDocument.create()
    if (input.fontBytes?.byteLength) output.registerFontkit(fontkit)
    const [page] = await output.copyPages(source, [0])
    output.addPage(page)
    const font = input.fontBytes?.byteLength
      ? await output.embedFont(input.fontBytes, { subset: true })
      : await output.embedFont(StandardFonts.Helvetica)
    input.textPlacements.forEach(placement => drawTextPlacement(page, font, placement, input.values))
    const qrModuleCount = input.qrPlacement && input.qrPayload
      ? drawVectorQr(page, input.qrPlacement.box, input.qrPayload, input.qrPlacement.quietZoneModules)
      : undefined
    const bytes = await output.save({ useObjectStreams: true, addDefaultPage: false })
    if (bytes.byteLength > MAX_OUTPUT_BYTES) return { ok: false, code: 'OUTPUT_TOO_LARGE' }
    return {
      ok: true,
      output: {
        bytes,
        mimeType: 'application/pdf',
        pageCount: 1,
        vectorQr: Boolean(qrModuleCount),
        ...(qrModuleCount ? { qrModuleCount } : {}),
      },
    }
  } catch {
    return { ok: false, code: 'RENDER_FAILED' }
  }
}
