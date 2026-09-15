// @ts-expect-error The Node strip-types contract tests execute the sibling TypeScript module directly.
import { authorizeBadgeDownload, type BadgeDownloadRequester } from './badge-download-contract.ts'
import type { BadgeArtifactDescriptor } from './badge-artifact-storage-contract'

function downloadStatusForArtifact(artifact: BadgeArtifactDescriptor) {
  if (artifact.state === 'READY') return 'READY'
  return artifact.state === 'QUARANTINED' ? 'PROCESSING' : 'BLOCKED'
}

export function authorizeBadgeArtifactDelivery(input: Readonly<{
  requester: BadgeDownloadRequester
  artifact: BadgeArtifactDescriptor
  nowMs: number
  ttlSeconds?: number
}>) {
  return authorizeBadgeDownload({
    requester: input.requester,
    artifact: {
      artifactId: input.artifact.artifactId,
      workspaceId: input.artifact.workspaceId,
      formId: input.artifact.formId,
      visibility: input.artifact.visibility,
      status: downloadStatusForArtifact(input.artifact),
    },
    nowMs: input.nowMs,
    ...(input.ttlSeconds === undefined ? {} : { ttlSeconds: input.ttlSeconds }),
  })
}
