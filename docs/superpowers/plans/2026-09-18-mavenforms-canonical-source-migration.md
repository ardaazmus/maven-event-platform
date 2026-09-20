# MavenForms Canonical Source Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/` the only normative product and workflow source while preserving earlier root documents as non-normative historical references.

**Architecture:** Keep the master-plan folder as the product/domain authority. Keep short root bootstrap files as navigational adapters only. Move the old root planning records into `docs/legacy/root-docs/`, add an explicit legacy policy, and make packet/workflow checks reject new work that does not declare the canonical source.

**Tech Stack:** Markdown, Node.js workflow scripts, JSON packets, Node assertion tests.

**Spec:** `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/00_OKU_BENI.md`, `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/12_GELISTIRME_KONTROL_SISTEMI.md`, and `MAVENFORMS_EVENT_MANAGEMENT_UX_REDESIGN_MASTER_PLAN_2026-09-18.md`.

## Global Constraints

- The master-plan folder is the only normative product/domain source.
- Old records are preserved under `docs/legacy/root-docs/` and must not block or redefine new work.
- Existing product features, security boundaries, release evidence and historical decisions are preserved; only their document authority changes.
- New packets must declare the canonical source and use the 15-minute/allowed-files/evidence workflow.
- `LOCAL_PASS` is never a production approval; R-10 external gates remain fail-closed.
- Do not delete user files, reset the worktree, or alter application data.

---

### Task 1: Add canonical source policy

**Files:**
- Create: `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/16_KANONIK_KAYNAK_VE_MIGRASYON_POLITIKASI_2026-09-18.md`
- Create: `docs/workflow/packets/F9-11.json`

- [ ] **Step 1: Write the canonical source policy**

  Define authority order, legacy handling, packet metadata, feature preservation, and migration rules. Explicitly state that the master-plan folder governs Event, Form, Registration, Person, Order, Payment, Invoice, Ticket, Credential, Check-in, Floor Plan and later tenant phases.

- [ ] **Step 2: Add the READY packet**

  Set `sourceOfTruth` to `docs/MavenForms_Platform_Core_Master_Plan_2026-09-17/`, list the policy and root adapters in `reads`, restrict `allowedFiles` to the governance files, and include context-check as the verification command.

- [ ] **Step 3: Run the baseline**

  Run `node scripts/workflow.mjs begin docs/workflow/packets/F9-11.json`.

### Task 2: Rewrite root bootstrap documents

**Files:**
- Modify: `AGENTS.md`
- Modify: `PROJECT_CONTEXT.md`
- Modify: `STATUS.md`
- Modify: `CLAUDE.md`
- Modify: `GEMINI.md`
- Modify: `.github/copilot-instructions.md`
- Modify: `.github/instructions/mavenforms.instructions.md`
- Modify: `.cursor/rules/mavenforms-core.mdc`
- Modify: `docs/workflow/README.md`

- [ ] **Step 1: Replace conflicting authority routes**

  Remove the old root roadmap/execution-plan hierarchy from bootstrap instructions. Route every task first to the master-plan folder, then to the relevant packet and source files.

- [ ] **Step 2: Preserve current release truth**

  Keep the current R-10 NO-GO, external dependency, provider-neutral and local-evidence boundaries in `STATUS.md` without allowing them to redefine the product domain.

- [ ] **Step 3: Add legacy rule**

  State that `docs/legacy/root-docs/**`, historical plans, old worklogs and superseded packets are read-only references and cannot create gates, change phase order or block canonical work.

### Task 3: Convert conflicting root plans into compatibility bridges

**Files:**
- Modify: `AI-RELEASE-EXECUTION-PLAN.md`
- Modify: `RELEASE-ROADMAP.md`
- Modify: `IMPLEMENTATION-AUDIT-AND-MICROPHASE-PLAN.md`
- Modify: `CLOUD-DEBUG-HANDOFF.md`
- Modify: `RELEASE-CHECKLIST.md`
- Modify: `RELEASE-DECISION.md`
- Modify: `worklog.md`

- [ ] **Step 1: Replace each root file with a short non-normative bridge**

  Link to the master-plan folder and the archived original. Preserve only the current status needed for compatibility tests; label all old content as historical.

- [ ] **Step 2: Keep release safety visible**

  The bridge for `RELEASE-DECISION.md` must retain the current NO-GO/external-evidence statement, while explicitly saying it cannot override the master-plan domain model.

- [ ] **Step 3: Do not delete archive copies**

  Verify every replaced root file has an exact copy under `docs/legacy/root-docs/`.

### Task 4: Enforce canonical packet routing

**Files:**
- Modify: `scripts/context-check.mjs`
- Modify: `scripts/workflow.mjs`
- Modify: `tests/workflow.test.mjs`
- Modify: `tests/workflow-legacy-packets.test.mjs`
- Create: `tests/canonical-source-of-truth.test.mjs`

- [ ] **Step 1: Make context-check require the canonical plan**

  Require the master-plan folder, canonical policy and current UX redesign plan. Stop requiring the archived root roadmaps as normative inputs.

- [ ] **Step 2: Require canonical metadata for new packets**

  A runnable non-superseded packet must declare `sourceOfTruth` equal to the master-plan folder. Keep superseded packets structurally inspectable but non-runnable.

- [ ] **Step 3: Add regression assertions**

  Assert that old root documents contain the legacy marker, the archive copies exist, the new packet declares canonical source, and a packet without canonical source is rejected by `loadPacket`.

- [ ] **Step 4: Run focused tests**

  Run `node tests/canonical-source-of-truth.test.mjs`, `node tests/workflow.test.mjs`, and `node tests/workflow-legacy-packets.test.mjs`.

### Task 5: Verify the migration

**Files:**
- Modify: `docs/workflow/packets/F9-11.json`
- Create: `artifacts/workflow/F9-11/baseline.json`
- Create: `artifacts/workflow/F9-11/verified.json`

- [ ] **Step 1: Run context checks**

  Run `node scripts/context-check.mjs`.

- [ ] **Step 2: Run packet verification**

  Run `node scripts/workflow.mjs verify docs/workflow/packets/F9-11.json`.

- [ ] **Step 3: Review scope**

  Confirm only the packet’s allowed governance files changed in this task, and report unrelated pre-existing dirty files separately.

---

## Self-review checklist

- [ ] Master plan folder is the only normative product source.
- [ ] Old root documents remain recoverable in `docs/legacy/root-docs/`.
- [ ] No feature, security rule or release evidence was deleted; only authority and routing changed.
- [ ] New packets cannot bypass the master-plan source declaration.
- [ ] Superseded packets remain readable but cannot run.
- [ ] R-10 and external evidence remain fail-closed.
- [ ] Root bootstrap files stay within their size limits.
