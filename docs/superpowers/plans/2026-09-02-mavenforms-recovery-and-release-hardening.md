# MavenForms Recovery and Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Every phase is gated; do not start a later phase while an earlier phase is missing its evidence lock.

**Goal:** Make MavenForms functionally coherent, responsive across dashboard/public/embed surfaces, secure for anonymous publishing, and verifiable for release.

**Architecture:** Use one source of truth for form publication snapshots, one server-side authorization boundary per resource, transactional database outbox events, and a small responsive design contract shared by the dashboard, builder, public renderer, and embed shell. Replace visual placeholders with real interaction tests and require independent phase evidence before progression.

**Tech Stack:** Next.js 16, React 19, TypeScript, Prisma 6, SQLite for local validation, Tailwind CSS, dnd-kit, Playwright through the in-app Browser when available.

**Spec:** `IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md`, `RELEASE-ROADMAP.md`, and the user requirements in the current task.

## Global Constraints

- Work only in the existing `D:\project\mavenform` workspace; preserve unrelated dirty files and databases.
- A phase is not complete because source text exists; it requires a reproducible command, an observable result, and a lock produced by the controller.
- Public clients receive only published, allowlisted snapshot data; internal form, workspace, owner, database, session, and integration identifiers stay server-side.
- Every write path validates tenant ownership and capability on the server.
- Every public submission is idempotent, rate-limited, bounded, validated against the published snapshot, and durably recorded before downstream delivery.
- Media is stored outside the public executable path, addressed by generated keys, validated by content bytes, scoped by workspace/form, and never served by raw filesystem paths.
- Dashboard and embed layout must reflow at 320/360/768/1280 CSS pixels without horizontal scrolling, overlap, or inaccessible controls.
- Every user-visible control must have a real handler or be removed from the UI.
- Do not mark a phase `PASSED` when any required command is absent, emits an error, or reports zero real assertions.

## Research Baseline

- OWASP ASVS 5.0 file storage requires generated/trusted path components and protection against executable upload/path traversal: https://cornucopia.owasp.org/taxonomy/asvs-5.0/05-file-handling/03-file-storage
- WCAG 2.2 requires reflow at 320 CSS pixels and text-identifiable input errors: https://www.w3.org/WAI/WCAG22/Understanding/reflow and https://www.w3.org/WAI/WCAG22/Understanding/error-identification
- `postMessage` must use an exact target origin when known and receivers must validate origin/source: https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- WordPress media integration uses server-side sideload/finalization and capability checks: https://developer.wordpress.org/block-editor/how-to-guides/client-side-media/

## Gate Protocol

The controller must verify the ordered phase manifest, exact required commands, changed-file scope, independent executor/verifier identities, evidence keys, non-zero real assertions, and manifest/file hashes. A lock is valid only when all of these are true.

Required phase order:

`M00.1 baseline` → `M00.2 build/runtime` → `M00.3 gate-controller` → `M00.4 real-test-runner` → `M00.5 security boundary` → `M00.6 responsive baseline` → `M01 functional contracts` → `M02 publication/public DTO` → `M03 media` → `M04 builder` → `M05 dashboard/cards` → `M06 submissions/export` → `M07 transactional outbox` → `M08 embed/WordPress` → `M09 accessibility` → `M10 responsive browser matrix` → `M11 backup/recovery` → `M12 independent release audit`.

For each phase the executor must:

1. Read the current manifest and previous lock files.
2. Run the phase-specific failing test first.
3. Make the smallest scoped change.
4. Run every required command, capturing exit code and relevant output.
5. Run the previous-phase smoke suite again.
6. Produce evidence with exact routes, assertions, viewport, and redacted output.
7. Have a different verifier inspect the diff and evidence.
8. Ask the controller to verify and write the lock; never write a `PASSED` lock manually.

## Microphases

### M00.1 — Baseline inventory

- Record branch, dirty files, package scripts, environment names, database state, route inventory, and current live URL.
- Do not alter application data.
- Required evidence: inventory file list, health/ready response, current lint/type/build result, known warnings.

### M00.2 — Deterministic build/runtime

- Make build independent of network-only font fetches and fail on TypeScript errors.
- Start the standalone build and prove `/api/health`, `/api/ready`, login, and a public form page.

### M00.3 — Gate-controller repair

- Replace the single-current-phase manifest with the ordered phase registry.
- Reject unknown/out-of-order phases, missing or non-passed previous locks, checksum drift, incomplete commands, out-of-scope files, fake evidence, same executor/verifier, and direct lock bypass.
- Add tests that prove each rejection and a real accepted transition.

### M00.4 — Real test runner

- Make test execution fail on stderr/EPERM, uncaught errors, zero assertions, and a non-zero child exit.
- Replace source-string-only checks for launch-critical flows with HTTP/browser behavior checks.

### M00.5 — Security boundary

- Separate anonymous public read/submit routes from authenticated workspace routes.
- Centralize DTO allowlists, origin policy, CSRF/rate-limit policy, and server-side tenant checks.

### M00.6 — Responsive baseline

- Capture dashboard, forms, builder, submissions, appearance, public, and embed DOM/screenshot evidence at 360, 768, and 1280 widths.
- Record each overlap, clipping, missing control, horizontal-scroll, and keyboard issue before fixing it.

### M01 — Functional contracts

- Define typed contracts for form, field, published snapshot, media asset, submission, export, and outbox event.
- Reject stale draft/live-field mismatches by validating submissions only against the published version and mapping values by immutable published field key.

### M02 — Publication and public DTO

- Sanitize settings, fields, theme tokens, URLs, custom CSS, and media references by recursive allowlist.
- Ensure public HTML/API never exposes workspace/owner/internal IDs or app credentials.
- Add public route tests for draft, paused, unpublished-version, forbidden keys, and invalid content.

### M03 — Media storage and picker

- Validate extension, declared MIME, detected MIME, magic bytes, size, dimensions, and image content.
- Store generated keys under workspace/form folders; make failure cleanup atomic.
- Make global media selection explicit and functional; add attachment/visibility rules and a clean/blocked scan state.
- Render real previews, select the uploaded asset, persist alt text, show errors/retry, and test cross-form isolation.

### M04 — Builder layout system

- Make drag/drop create, reorder, move, duplicate, delete, and undo actual persisted form-document operations.
- Keep the persisted model flat and add bounded Grid/Bento layout presets, responsive column controls, keyboard parity, and safe handling of old field-only documents. Nested containers and freeform masonry are intentionally out of scope.

### M05 — Dashboard/cards/settings

- Keep exactly one card settings affordance: a visible `Ayarlar` button in the lower-right normal flow; remove the duplicate bottom-right ellipsis.
- Keep card media in a true 16:9 box, reserve footer space, and prevent dates/text from sitting under controls.
- Connect card actions to real routes and test keyboard/focus behavior.

### M06 — Submissions and export

- Implement real CSV and XLSX responses with correct MIME, extension, escaping, bounded pagination, filters, and authorization.
- Connect email/PDF/delete/detail actions or remove them until implemented.
- Make selected-form summary/statistics come from a scoped server endpoint, not only an optimistic list count.

### M07 — Transactional outbox

- Create DB outbox records in the same transaction as the submission and counter update.
- Add idempotent claim/lease/retry/dead-letter processing and a real dispatcher boundary.
- Prove restart recovery and duplicate delivery behavior.

### M08 — Embed and WordPress

- Use slug/public version references only; never embed workspace tokens or internal IDs.
- Use exact allowed parent origins, strict message validation, responsive iframe resize, WordPress nonce/capability checks, and server-side media import rules.

### M09 — Accessibility

- Associate visible labels, required state, `aria-invalid`, error text/live regions, focus movement, keyboard drag alternatives, and success/error status messages.

### M10 — Responsive browser matrix

- Verify dashboard/cards, builder, appearance/media picker, submissions/detail, public form, and WordPress/embed at 360/768/1280.
- Require no horizontal scroll at 320 CSS pixels, no overlap, no inaccessible clipped control, and no framework/console errors.

### M11 — Backup/recovery

- Test migration on a copy, backup, restore, media reference integrity, outbox recovery, and documented rollback.

### M12 — Independent release audit

- Fresh verifier reruns the complete smoke suite, real browser flows, security regression, responsive matrix, build, and recovery test.
- Release is `NO-GO` if any gate is missing, any public boundary is unverified, any UI action is a placeholder, or any required test has untrusted output.

## First Execution Batch

Execute only `M00.3`, `M00.4`, `M05`, `M06`, and `M07` after the baseline is recorded. Re-run all prior checks after each batch. Do not claim release readiness until `M12` is independently locked.

## Implementation checkpoint — 2026-09-02

Completed in the current working tree:

- `M00.3` gate-controller replacement: the ordered registry is `phase-manifest.v2.json`; the legacy `.agents/mavenforms-phase-manifest.json` is preserved as historical input because it is not writable in this workspace. The controller now validates previous locks, exact commands, acceptance IDs, evidence, independent identities, changed-file scope, file hashes, and controller authorization. Existing old locks intentionally fail checksum validation and must not be silently reused.
- `M00.4` real test runner: `scripts/run-tests.mjs` executes every `tests/*.test.mjs`, uses the appropriate runtime, fails non-zero children, and does not accept a test merely because its process exits zero without a PASS marker.
- `M03` media: form/global scope, upload validation, generated storage paths, image decoding/dimensions, cleanup on persistence failure, picker selection, and signed public media delivery.
- `M05` card and navigation correction: one lower-right `Ayarlar` action per card, 16:9 media area, normal-flow footer, mobile navigation fallback, and no overlay text layer.
- `M06` submissions/export: server-backed selected-form summary, delete/email/print actions, public-only anonymous submit route, and valid XLSX/CSV responses.
- `M07` submission transaction: email/webhook outbox rows are created in the same database transaction as the submission and counters.
- `M08` embed hardening: published-only script generation, encoded slug, bounded height, exact origin plus iframe-source checks, and no unnecessary browser permissions.
- `M04` first functional increment: palette items can be dragged into the canvas; media blocks persist their selected asset through the field update path; the debounce timer survives renders.
- Latest UI recovery: narrow card footers now stack statistics and date/settings into separate normal-flow rows; the Forms screen keeps an `Öne çıkan form` workspace with server-backed KPIs and recent responses; `Form ayarları` opens the full builder settings tab set; submissions use one cancellable request effect so search cannot abort the initial load and raise a false network toast.

Current verification result:

- `node scripts/run-tests.mjs`: 35/35 passed.
- `bun run lint`: passed.
- `bunx tsc --noEmit`: passed.
- `bun run build`: passed; Next.js reports only the existing middleware-to-proxy deprecation warning.
- Live browser: cards show five accessible settings buttons with no duplicate card ellipsis/overlay text; selected responses show form identity, server summary, and response table; published public form renders without console warnings.
- Live API: login 200, XLSX export 200 with ZIP signature and correct MIME, published embed script 200, draft embed script 404.

Not release-closed yet:

- `M00.5` through `M12` require fresh locked evidence under the new manifest; no old PASSED lock is trusted after checksum drift.
- Antivirus/quarantine integration, durable outbox dispatcher/retry/dead-letter execution, real 360/768/1280 browser matrix, WordPress live installation test, and backup/restore rehearsal remain release gates. Nested container/Bento tree schema is cancelled and is not a release gate.
