import { Repositories } from '../repositories/types';
import { AuditLog, Json } from '../db/schema';

export async function logAudit(
  repos: Repositories,
  {
    actor,
    action,
    entityType,
    entityId,
    participantId,
    before,
    after,
  }: {
    actor: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    participantId?: string | null;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
  }
): Promise<AuditLog> {
  return repos.createAuditLog({
    actor,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    participant_id: participantId || null,
    before_json: (before || null) as Json,
    after_json: (after || null) as Json,
  });
}
