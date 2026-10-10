/** Authorization comes from verified Auth records, never editable user metadata. */
export function isBrainAdministrator(user: {
  email?: string; email_confirmed_at?: string;
  app_metadata?: Record<string, unknown>;
} | null, allowlist = process.env.CIVAL_BRAIN_ADMIN_EMAILS ?? ''): boolean {
  if (!user?.email_confirmed_at || !user.email) return false;
  const emails = allowlist.split(',').map(email => email.trim().toLowerCase()).filter(Boolean);
  return emails.includes(user.email.toLowerCase()) ||
    ['owner', 'admin'].includes(String(user.app_metadata?.cival_brain_role ?? ''));
}

export const OFFICE_READ_PATHS = new Set([
  '/api/ops/business-units', '/api/tasks', '/api/office/agents', '/api/documents',
  '/api/brain-memories/stats', '/api/motion/stats', '/api/ops/missions',
]);

export function officePermission(path: string, method: string): boolean {
  return (method === 'GET' && OFFICE_READ_PATHS.has(path)) ||
    (method === 'POST' && path === '/api/integrations/cival-office');
}

export async function validOfficeToken(supplied: string): Promise<boolean> {
  const token = process.env.CIVAL_BRAIN_TOKEN;
  if (!token || token.length < 32 || supplied.length !== token.length) return false;
  const encode = new TextEncoder();
  const [a, b] = await Promise.all([supplied, token].map(value =>
    crypto.subtle.digest('SHA-256', encode.encode(value))));
  const left = new Uint8Array(a), right = new Uint8Array(b);
  let mismatch = 0;
  for (let i = 0; i < left.length; i++) mismatch |= left[i] ^ right[i];
  return mismatch === 0;
}
