const statuses = new Set(['approved', 'in_progress', 'completed', 'failed', 'cancelled']);
export const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function missionUpdates(body: Record<string, unknown>) {
  if (!uuid(body.id)) throw new Error('Invalid mission id');
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 300) throw new Error('Invalid title');
    updates.title = body.title;
  }
  if (body.status !== undefined) {
    if (typeof body.status !== 'string' || !statuses.has(body.status)) throw new Error('Invalid status');
    updates.status = body.status;
    updates.completed_at = ['completed', 'failed', 'cancelled'].includes(body.status) ? new Date().toISOString() : null;
  }
  if (!Object.keys(updates).length) throw new Error('No mission changes');
  return updates;
}

export function eventInput(body: Record<string, unknown>) {
  const event: Record<string, unknown> = {};
  for (const [key, limit] of [['agent_id', 200], ['kind', 100], ['title', 300], ['summary', 20000]] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || body[key].length > limit || (key === 'kind' && !body[key].trim())) throw new Error('Invalid event');
      event[key] = body[key];
    }
  }
  if (!event.kind) throw new Error('Event kind required');
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 50 || body.tags.some(t => typeof t !== 'string' || t.length > 100)) throw new Error('Invalid tags');
    event.tags = [...new Set(body.tags)];
  }
  if (body.metadata !== undefined) {
    if (!body.metadata || typeof body.metadata !== 'object' || Array.isArray(body.metadata)) throw new Error('Invalid metadata');
    event.metadata = body.metadata;
  }
  return event;
}
