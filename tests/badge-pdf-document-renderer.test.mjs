import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { renderBadgePdfDocument } from '../src/lib/badge-pdf-document-renderer.ts'

async function background(pageCount) {
  const pdf = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) pdf.addPage([300, 180])
  return pdf.save()
}

function face(values = { firstName: 'Ada', lastName: 'Lovelace' }) {
  return {
    backgroundAssetId: 'template-v1',
    pageWidthPt: 300,
    pageHeightPt: 180,
    safeArea: { xPt: 10, yPt: 10, widthPt: 280, heightPt: 160 },
    textPlacements: [{ key: 'firstName', box: { xPt: 20, yPt: 100, widthPt: 100, heightPt: 30 }, maxChars: 40, maxLines: 1 }],
    values,
    qrPlacement: { box: { xPt: 210, yPt: 30, widthPt: 60, heightPt: 60 }, vector: true, quietZoneModules: 4 },
    qrPayload: 'opaqueBadgeToken1234',
  }
}

const single = await renderBadgePdfDocument({ backgroundPdfBytes: await background(1), faceMode: 'SINGLE_FACE', faces: [face()] })
assert.equal(single.ok, true)
assert.equal(single.output.pageCount, 1)
assert.equal(single.output.vectorQr, true)
assert.ok(single.output.qrModuleCount > 0)
assert.equal((await PDFDocument.load(single.output.bytes)).getPageCount(), 1)

const dual = await renderBadgePdfDocument({ backgroundPdfBytes: await background(2), faceMode: 'DUAL_FACE', faces: [face(), face({ firstName: 'Grace' })] })
assert.equal(dual.ok, true)
assert.equal(dual.output.pageCount, 2)
assert.equal((await PDFDocument.load(dual.output.bytes)).getPageCount(), 2)

const wrongPageCount = await renderBadgePdfDocument({ backgroundPdfBytes: await background(2), faceMode: 'SINGLE_FACE', faces: [face()] })
assert.deepEqual(wrongPageCount, { ok: false, code: 'BACKGROUND_PAGE_COUNT_MISMATCH' })

const missingQrPayload = await renderBadgePdfDocument({ backgroundPdfBytes: await background(1), faceMode: 'SINGLE_FACE', faces: [{ ...face(), qrPayload: undefined }] })
assert.deepEqual(missingQrPayload, { ok: false, code: 'QR_PAYLOAD_REQUIRED' })

const unicode = await renderBadgePdfDocument({ backgroundPdfBytes: await background(1), faceMode: 'SINGLE_FACE', faces: [face({ firstName: 'Çağrı' })] })
assert.deepEqual(unicode, { ok: false, code: 'FONT_REQUIRED' })

console.log('badge-pdf-document-renderer: all assertions passed')
