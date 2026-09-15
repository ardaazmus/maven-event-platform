export type SyntheticGraphFixture = Readonly<{
  source: 'synthetic'
  seed: string
  networkSample: '192.0.2.10'
  workspace: Readonly<{ id: string }>
  user: Readonly<{ id: string; email: string }>
  form: Readonly<{ id: string; workspaceId: string; slug: string }>
  submission: Readonly<{ id: string; formId: string; submittedById: string; email: string }>
  payment: Readonly<{ id: string; workspaceId: string; formId: string; submissionId: string; provider: 'iyzico'; providerOrderId: string }>
  invoice: Readonly<{ id: string; workspaceId: string; paymentOrderId: string; state: 'paid_ready_for_invoicing' }>
  edges: readonly Readonly<{ from: string; to: string; relation: string }>[]
}>

export type SyntheticGraphFixtureResult =
  | Readonly<{ ok: true; graph: SyntheticGraphFixture }>
  | Readonly<{ ok: false; reason: 'seed_invalid' }>

const SAFE_SEED_PATTERN = /^[A-Za-z0-9_-]{1,40}$/

function id(kind: string, seed: string): string {
  return `${kind}-synthetic-${seed}`
}

/** Creates an in-memory, non-PII graph for payment and invoice integration tests. */
export function createSyntheticGraphFixture(seed: unknown): SyntheticGraphFixtureResult {
  if (typeof seed !== 'string' || !SAFE_SEED_PATTERN.test(seed)) return { ok: false, reason: 'seed_invalid' }

  const workspaceId = id('workspace', seed)
  const userId = id('user', seed)
  const formId = id('form', seed)
  const submissionId = id('submission', seed)
  const paymentId = id('payment', seed)
  const invoiceId = id('invoice', seed)
  const graph: SyntheticGraphFixture = {
    source: 'synthetic',
    seed,
    networkSample: '192.0.2.10',
    workspace: { id: workspaceId },
    user: { id: userId, email: `participant-${seed}@test.invalid` },
    form: { id: formId, workspaceId, slug: `event-${seed}` },
    submission: { id: submissionId, formId, submittedById: userId, email: `participant-${seed}@test.invalid` },
    payment: { id: paymentId, workspaceId, formId, submissionId, provider: 'iyzico', providerOrderId: `order-${seed}` },
    invoice: { id: invoiceId, workspaceId, paymentOrderId: paymentId, state: 'paid_ready_for_invoicing' },
    edges: [
      { from: workspaceId, to: formId, relation: 'owns' },
      { from: formId, to: submissionId, relation: 'receives' },
      { from: userId, to: submissionId, relation: 'submitted' },
      { from: submissionId, to: paymentId, relation: 'binds' },
      { from: paymentId, to: invoiceId, relation: 'authorizes' },
    ],
  }
  return { ok: true, graph }
}

/** Verifies the minimum same-workspace/form/payment/invoice graph invariants. */
export function isValidSyntheticGraphFixture(value: unknown): value is SyntheticGraphFixture {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const graph = value as Partial<SyntheticGraphFixture>
  return graph.source === 'synthetic'
    && graph.networkSample === '192.0.2.10'
    && typeof graph.seed === 'string'
    && SAFE_SEED_PATTERN.test(graph.seed)
    && graph.form?.workspaceId === graph.workspace?.id
    && graph.submission?.formId === graph.form?.id
    && graph.submission?.submittedById === graph.user?.id
    && graph.payment?.workspaceId === graph.workspace?.id
    && graph.payment?.formId === graph.form?.id
    && graph.payment?.submissionId === graph.submission?.id
    && graph.payment?.provider === 'iyzico'
    && graph.invoice?.workspaceId === graph.workspace?.id
    && graph.invoice?.paymentOrderId === graph.payment?.id
    && graph.user?.email === graph.submission?.email
    && graph.user?.email.endsWith('@test.invalid') === true
}
