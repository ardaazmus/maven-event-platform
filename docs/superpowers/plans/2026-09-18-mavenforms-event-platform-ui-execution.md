# MavenForms Event Platform UI Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Turn the existing Event-first UX design into a dependency-ordered F0–F9 execution plan that completes all locally verifiable work without claiming external or production evidence.

**Architecture:** Keep the master-plan folder as the normative domain and phase authority. Use the UX design file as the detailed implementation specification and the 15-minute READY packet workflow as the execution unit. Each phase produces a working, testable slice and cannot open the next production gate until its exit evidence exists.

**Tech Stack:** Markdown, JSON workflow packets, existing MavenForms TypeScript/Next.js code, existing Node test runner, local database/readiness checks, receipts and evidence registry.

**Spec:** `MAVENFORMS_EVENT_MANAGEMENT_UX_REDESIGN_MASTER_PLAN_2026-09-18.md`, `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/11_YOL_HARITASI.md`, `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/12_GELISTIRME_KONTROL_SISTEMI.md`, `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/14_KABUL_TEST_MATRISI.md`.

## Global Constraints

- `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/` is the only normative product/domain/phase source.
- The UX file is the detailed implementation specification; it cannot override F0–F9 order or release gates.
- Every implementation unit is a READY packet with `timeboxMinutes: 15`, explicit `allowedFiles`, `reads`, acceptance and checks.
- Every packet includes success, duplicate/retry, unauthorized and failure/recovery evidence where the behavior permits it.
- Existing features remain available through an owner, deep link/read model and API/contract/test evidence.
- `LOCAL_PASS` is not pilot, provider or production evidence; external gates remain fail-closed.
- Do not delete user data, reset migrations, expose secrets/PII, or make production/public changes without explicit authorization.

---

## Task 1: Lock the execution ledger

**Files:**
- Modify: `MAVENFORMS_EVENT_MANAGEMENT_UX_REDESIGN_MASTER_PLAN_2026-09-18.md`
- Create: `docs/workflow/packets/F9-12.json`

**Interfaces:**
- Consumes: canonical F0–F9 phase order and existing UX decisions.
- Produces: one ordered phase ledger and packet metadata that future UI/domain packets must follow.

- [ ] **Step 1: Add the ordered ledger**

  Add the F0–F9 table, micro-output order, evidence classes and transition rules. Keep UX-0…UX-7 subordinate to the technical phases.

- [ ] **Step 2: Add external boundaries**

  Mark provider, AV/quarantine, object storage, merchant staging, sender-domain, finance/legal and field-device proof as `EXTERNAL_DEPENDENCY`; define the local contract/test work that must still be completed.

- [ ] **Step 3: Add the continuous CLI prompt**

  Include the source hierarchy, phase order, packet loop, feature-preservation rule, stop conditions and reporting format in the UX file so a separate CLI can execute it without conversation history.

- [ ] **Step 4: Verify document consistency**

  Check that the new ledger does not change the master-plan F0–F9 order, does not turn external evidence into local evidence, and does not remove any existing feature or safety gate.

---

## Task 2: Prepare the next implementation packet sequence

**Files:**
- Create: `docs/workflow/packets/F0-UX-01.json` through the next missing packet only
- Modify: no application code in this planning task

**Interfaces:**
- Consumes: the ledger from Task 1 and current packet schema.
- Produces: small READY packets whose `previous`, `reads`, `allowedFiles`, acceptance and checks form a chain.

- [ ] **Step 1: Start at the actual current phase**

  Inspect current receipts and `STATUS.md`; do not invent that F0 or F1 is complete from the existence of this plan.

- [ ] **Step 2: Create one packet at a time**

  Use the next missing local output only. Keep the packet to one invariant or one user-visible behavior and no more than 15 minutes.

- [ ] **Step 3: Verify packet routing**

  Require `sourceOfTruth: docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`, run context-check, and ensure all implementation files are inside `allowedFiles`.

---

## Task 3: Execute each phase with the same evidence cycle

**Files:**
- Modify: only the current packet’s `allowedFiles`
- Test: the current packet’s declared test files and existing relevant suites
- Create: the current packet’s baseline/verified receipts

**Interfaces:**
- Consumes: previous phase exit evidence and current source/test contracts.
- Produces: a locally verified slice, receipt, and explicit next dependency.

- [ ] **Step 1: Run preflight and baseline**

  Run `node scripts/workflow.mjs begin docs/workflow/packets/<ID>.json` and preserve the baseline. Read only the packet’s scope and direct call sites.

- [ ] **Step 2: Write or identify the smallest failing check**

  Cover the requested behavior and its trust boundary before implementation. Do not replace an existing test with a weaker mock.

- [ ] **Step 3: Implement the smallest safe slice**

  Reuse existing helpers and contracts. Keep domain ownership canonical: Event, Person, Registration, Order, Payment, Invoice, Credential, Badge, Check-in and Floor Plan must not be simulated by a new field on Submission.

- [ ] **Step 4: Run the complete local check set**

  Run the packet checks plus applicable typecheck, lint, build, database/readiness, accessibility and responsive checks. A UI-only visual result is insufficient.

- [ ] **Step 5: Verify and record limits**

  Run `node scripts/workflow.mjs verify docs/workflow/packets/<ID>.json`. Record changed files, exact commands, result, evidence class, external dependency and feature-preservation status.

---

## Task 4: Close the local backlog without opening external gates

**Files:**
- Modify: current phase files only
- Create/Modify: phase receipts and status entries allowed by the packet

**Interfaces:**
- Consumes: local source/test evidence.
- Produces: `LOCAL_PASS` for local work and separate `EXTERNAL_DEPENDENCY` records for unavailable proof.

- [ ] **Step 1: Complete independent local work**

  Continue through the ordered ledger while a task is locally testable. Do not stop merely because a provider is unavailable if the provider-neutral contract, state machine, error path, retry, audit and UI readiness can be completed locally.

- [ ] **Step 2: Keep blocked production behavior closed**

  Do not enable live payment, automatic e-document, real scanning, public tenant provisioning or production release solely because local tests pass.

- [ ] **Step 3: Stop only for real authority boundaries**

  Ask for user input only for credentials/accounts, destructive data changes, production/public actions or a product decision that materially changes scope. Diagnose and repair ordinary local failures within the current phase.

---

## Self-review checklist

- [ ] F0–F9 order exactly matches `11_YOL_HARITASI.md`.
- [ ] UX phases are subordinate implementation slices, not a replacement roadmap.
- [ ] Every small phase has a measurable output, test, evidence and exit condition.
- [ ] External dependencies are named and never represented as local success.
- [ ] Badge PDF/PNG/JPEG/WebP input, safe upload, versioning, mapping, snapshot and output are covered.
- [ ] Event, Person, Registration, Ticket, Order, Payment, Invoice, Credential, Badge, Check-in and Floor Plan ownership is preserved.
- [ ] Forms, Finance, Documents, Badge, Check-in and Floor Plan have separate UI surfaces with explicit context/deep links.
- [ ] Existing features have owner + deep link/read model + API/contract/test evidence.
- [ ] Another CLI can start from the exact UX file without relying on conversation history.
