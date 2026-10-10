const statuses = new Set(['backlog', 'in-progress', 'review', 'done']);
const priorities = new Set(['low', 'medium', 'high', 'critical']);
export function taskInput(value: unknown, partial = false): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid task');
  const body = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const [key, limit] of [['title', 300], ['description', 20000]] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || body[key].length > limit || (key === 'title' && !body[key].trim())) throw new Error(`Invalid ${key}`);
      result[key] = body[key];
    }
  }
  for (const [key, allowed] of [['status', statuses], ['priority', priorities]] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== 'string' || !allowed.has(body[key])) throw new Error(`Invalid ${key}`);
      result[key] = body[key];
    }
  }
  if (body.tags !== undefined) {
    if (!Array.isArray(body.tags) || body.tags.length > 50 || body.tags.some(t => typeof t !== 'string' || t.length > 100)) throw new Error('Invalid tags');
    result.tags = [...new Set(body.tags)];
  }
  if (!partial) {
    if (!result.title) throw new Error('A title is required');
    result.description ??= ''; result.status ??= 'backlog'; result.priority ??= 'medium'; result.tags ??= [];
  } else if (!Object.keys(result).length) throw new Error('No task changes supplied');
  return result;
}
export async function readTaskBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 32768) { await reader.cancel(); throw new Error('Task is too large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const value = JSON.parse(new TextDecoder().decode(bytes));
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid task');
  return value;
}
