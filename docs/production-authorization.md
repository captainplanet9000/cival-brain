# Private Brain access

Rollout owner confirmed on 10 October 2026: `civallee4@gmail.com`.
The existing verified account supports password sign-in. The configured production
Supabase project is `eglvktbuuhlyjpnoukkm`; legacy setup URLs in historical source
are not the authority for deployment. Both reviewed migrations were applied and
ten legacy tasks imported with their IDs preserved. Vercel's `second-brain`
project has a server-only owner allowlist and private Office integration token.
Tokens and downloaded environment files remain outside the repository.

Apply `migrations/202610090001_durable_brain_tasks.sql` and then
`migrations/202610090002_private_ops_and_atomic_missions.sql` to the verified
Brain database before deploying these routes. The second migration revokes
browser-role grants on private operations tables and adds a service-only,
transactional mission creation function. An invalid step rolls back the mission.
Local PostgreSQL verification is in `tests/private-storage.sql`; run it only in
a disposable test database. It creates temporary fixtures and rolls them back.
Production migration and the owner account remain separate release steps.

Mission updates accept only title and status; terminal status timestamps are
server generated. Event writes validate supported fields, discard supplied
identities/timestamps and share the streamed 32 KiB request limit. Event queries
accept 1–200 rows. Private routes return actionable storage errors rather than
raw database diagnostics.

The dashboard and APIs require a verified Supabase Auth user. Grant operator
access with server-only `CIVAL_BRAIN_ADMIN_EMAILS` (comma-separated confirmed
owner emails), or set `cival_brain_role` to `owner`/`admin` in the user's
server-managed `app_metadata`. Editable `user_metadata` does not grant access.
Do not enable public registration as an administrator provisioning mechanism.

Sign in at `/login` using the provisioned account. The access token stays in an
HttpOnly, SameSite Strict cookie, expires within an hour, and is verified with
Supabase `getUser` on protected requests. Sign out clears the cookie. Writes
from browser sessions require a matching Origin. Private responses are not cached.

`SUPABASE_SERVICE_ROLE_KEY` is required for privileged server database access;
there is no fallback to the anonymous key. This key never belongs in a
`NEXT_PUBLIC_` variable. Database RLS and grants still require a separate audit.

Office uses a separate server-only `CIVAL_BRAIN_TOKEN` of at least 32 characters.
It permits GET only for the seven integration read endpoints and POST only to
`/api/integrations/cival-office`. It cannot use arbitrary mutations or setup APIs.
Install the same token on Office through its environment or private
`.agent-office/cival-brain.secret` file. Protect that file with the operator's
Windows ACL; never store it in source control or browser settings.

Deploy only after the owner account and allowlist are configured on the verified
Brain project. The local changes do not secure an older deployed build.
Verify anonymous API reads/writes return 401, owner login works, foreign Origin
writes return 403, and a retried Office UUID produces exactly one database event.
Local policy and unauthenticated HTTP tests are recorded in the repair artifacts.
# Durable tasks rollout

Apply `migrations/202610090001_durable_brain_tasks.sql` to the verified Brain database before deploying the updated task API. It enables RLS and revokes direct browser access. Import any existing `data/tasks.json` using `node --experimental-strip-types scripts/import-legacy-tasks.mjs data/tasks.json` with server credentials supplied through the environment. The importer preserves ids, skips existing database rows, and never deletes the source file. The task API returns an explicit 503 if storage is not ready; it never falls back to ephemeral filesystem writes.
