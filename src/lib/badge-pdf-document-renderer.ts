import { createRequire } from 'node:module'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import type { BadgeProjection } from './badge-field-mapping'
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

export type BadgePdfFaceInput = Readonly<{
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

export type BadgePdfDocumentRendererInput = Readonly<{
  backgroundPdfBytes: Uint8Array
  faceMode: 'SINGLE_FACE' | 'DUAL_FACE'
  faces: ReadonlyArray<BadgePdfFaceInput>
}>

export type BadgePdfDocumentRendererOutput = Readonly<{
  bytes: Uint8Array
  mimeType: 'application/pdf'
  pageCount: 1 | 2
  vectorQr: boolean
  qrModuleCount: number
}>

export type BadgePdfDocumentRendererErrorCode =
  | 'BACKGROUND_REQUIRED'
  | 'BACKGROUND_INVALID'
  | 'BACKGROUND_TOO_LARGE'
  | 'BACKGROUND_ACTIVE_CONTENT'
  | 'BACKGROUND_PAGE_COUNT_MISMATCH'
  | 'BACKGROUND_DIMENSION_MISMATCH'
  | 'FACE_PLAN_INVALID'
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
  const value = values[placement.key]
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

function validateFace(face: BadgePdfFaceInput) {
  const plan: BadgeFrontRenderInput = {
    pageWidthPt: face.pageWidthPt,
    pageHeightPt: face.pageHeightPt,
    safeArea: face.safeArea,
    backgroundAssetId: face.backgroundAssetId,
    textPlacements: face.textPlacements,
    values: face.values,
    ...(face.qrPlacement ? { qrPlacement: face.qrPlacement } : {}),
  }
  if (!validateBadgeFrontRender(plan).ok) return { ok: false as const, code: 'FACE_PLAN_INVALID' as const }
  if (face.qrPlacement && !face.qrPayload) return { ok: false as const, code: 'QR_PAYLOAD_REQUIRED' as const }
  if (face.qrPayload && (face.qrPayload.length > MAX_QR_PAYLOAD_LENGTH || /[\u0000-\u001f]/u.test(face.qrPayload))) {
    return { ok: false as const, code: 'QR_PAYLOAD_INVALID' as const }
  }
  if (valuesContainNonAscii(face.values) && !face.fontBytes?.byteLength) return { ok: false as const, code: 'FONT_REQUIRED' as const }
  return { ok: true as const }
}

export async function renderBadgePdfDocument(
  input: BadgePdfDocumentRendererInput,
): Promise<{ ok: true; output: BadgePdfDocumentRendererOutput } | { ok: false; code: BadgePdfDocumentRendererErrorCode }> {
  if (!input.backgroundPdfBytes.byteLength) return { ok: false, code: 'BACKGROUND_REQUIRED' }
  if (input.backgroundPdfBytes.byteLength > MAX_BACKGROUND_BYTES) return { ok: false, code: 'BACKGROUND_TOO_LARGE' }
  if (!hasPdfSignature(input.backgroundPdfBytes)) return { ok: false, code: 'BACKGROUND_INVALID' }
  if (hasActivePdfContent(input.backgroundPdfBytes)) return { ok: false, code: 'BACKGROUND_ACTIVE_CONTENT' }

  const expectedPageCount = input.faceMode === 'SINGLE_FACE' ? 1 : input.faceMode === 'DUAL_FACE' ? 2 : 0
  if (expectedPageCount === 0 || input.faces.length !== expectedPageCount) return { ok: false, code: 'BACKGROUND_PAGE_COUNT_MISMATCH' }
  for (const face of input.faces) {
    const validation = validateFace(face)
    if (!validation.ok) return validation
  }

  try {
    const source = await PDFDocument.load(input.backgroundPdfBytes, { ignoreEncryption: false, updateMetadata: false })
    if (source.getPageCount() !== expectedPageCount) return { ok: false, code: 'BACKGROUND_PAGE_COUNT_MISMATCH' }
    for (const [index, face] of input.faces.entries()) {
      const page = source.getPage(index)
      if (!isSameDimension(page.getWidth(), face.pageWidthPt) || !isSameDimension(page.getHeight(), face.pageHeightPt)) {
        return { ok: false, code: 'BACKGROUND_DIMENSION_MISMATCH' }
      }
    }

    const output = await PDFDocument.create()
    const pages = await output.copyPages(source, input.faces.map((_, index) => index))
    let vectorQr = false
    let qrModuleCount = 0
    for (const [index, face] of input.faces.entries()) {
      const page = output.addPage(pages[index])
      if (face.fontBytes?.byteLength) output.registerFontkit(fontkit)
      const font = face.fontBytes?.byteLength
        ? await output.embedFont(face.fontBytes, { subset: true })
        : await output.embedFont(StandardFonts.Helvetica)
      face.textPlacements.forEach(placement => drawTextPlacement(page, font, placement, face.values))
      if (face.qrPlacement && face.qrPayload) {
        qrModuleCount += drawVectorQr(page, face.qrPlacement.box, face.qrPayload, face.qrPlacement.quietZoneModules)
        vectorQr = true
      }
    }
    const bytes = await output.save({ useObjectStreams: true, addDefaultPage: false })
    if (bytes.byteLength > MAX_OUTPUT_BYTES) return { ok: false, code: 'OUTPUT_TOO_LARGE' }
    return {
      ok: true,
      output: {
        bytes,
        mimeType: 'application/pdf',
        pageCount: expectedPageCount as 1 | 2,
        vectorQr,
        qrModuleCount,
      },
    }
  } catch {
    return { ok: false, code: 'RENDER_FAILED' }
  }
}
