# MavenForms Copilot adapter

Read `AGENTS.md`, then `PROJECT_CONTEXT.md` and `STATUS.md`. Use `docs/workflow/README.md` for the task packet workflow. Do not load the full plans or worklog unless the current task requires them.

Before code, select a `status: READY` 15-minute packet under `docs/workflow/packets/` and run its baseline. Keep changes inside `allowedFiles`; verify with `node scripts/workflow.mjs verify <packet>`. A local pass is not a release approval. Preserve the fixed PAY → INV/F → Paraşüt → document → delivery → pilot → FORM-UX → SaaS order and all server-side security boundaries.
