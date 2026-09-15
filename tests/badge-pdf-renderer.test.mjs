import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { renderBadgePdf } from '../src/lib/badge-pdf-renderer.ts'

const background = await PDFDocument.create()
const backgroundPage = background.addPage([300, 180])
backgroundPage.drawRectangle({ x: 0, y: 0, width: 300, height: 180 })
const backgroundBytes = await background.save({ useObjectStreams: true })

const input = {
  backgroundPdfBytes: backgroundBytes,
  backgroundAssetId: 'template-asset-1',
  pageWidthPt: 300,
  pageHeightPt: 180,
  safeArea: { xPt: 12, yPt: 12, widthPt: 276, heightPt: 156 },
  textPlacements: [
    { key: 'firstName', box: { xPt: 20, yPt: 120, widthPt: 120, heightPt: 24 }, maxChars: 80, maxLines: 1 },
  ],
  values: { firstName: 'Ada' },
  qrPlacement: { box: { xPt: 210, yPt: 24, widthPt: 64, heightPt: 64 }, vector: true, quietZoneModules: 4 },
  qrPayload: 'https://example.invalid/badge/opaque-token-1',
}

const rendered = await renderBadgePdf(input)
assert.equal(rendered.ok, true)
assert.equal(rendered.output.mimeType, 'application/pdf')
assert.equal(rendered.output.pageCount, 1)
assert.equal(rendered.output.vectorQr, true)
assert.ok(rendered.output.qrModuleCount >= 21)
assert.equal(new TextDecoder().decode(rendered.output.bytes.slice(0, 5)), '%PDF-')
const outputDocument = await PDFDocument.load(rendered.output.bytes)
assert.equal(outputDocument.getPageCount(), 1)

assert.deepEqual(await renderBadgePdf({ ...input, qrPayload: undefined }), { ok: false, code: 'QR_PAYLOAD_REQUIRED' })
assert.deepEqual(await renderBadgePdf({ ...input, backgroundPdfBytes: new Uint8Array([1, 2, 3]) }), { ok: false, code: 'BACKGROUND_INVALID' })
assert.deepEqual(await renderBadgePdf({ ...input, values: { firstName: 'Çağrı' } }), { ok: false, code: 'FONT_REQUIRED' })
assert.deepEqual(await renderBadgePdf({ ...input, pageWidthPt: 301 }), { ok: false, code: 'BACKGROUND_DIMENSION_MISMATCH' })
assert.deepEqual(await renderBadgePdf({ ...input, textPlacements: [{ ...input.textPlacements[0], box: { xPt: 0, yPt: 0, widthPt: 400, heightPt: 24 } }] }), { ok: false, code: 'RENDER_INPUT_INVALID' })

console.log('badge-pdf-renderer: all assertions passed')
