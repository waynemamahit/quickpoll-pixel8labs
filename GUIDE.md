# Comprehensive CI/CD and Resource Setup Guide

This guide walks through creating the Cloudflare resources used by this starter, configuring CI/CD variables/secrets, and running the project locally. Resource IDs (KV, D1, Hyperdrive, Vectorize) are stored in CI/CD variables so the repository code can reference them via environment bindings.

## Part 1 — Create a Cloudflare API Token

A correctly permissioned API token is crucial for the pipeline to work.

1.  **Navigate to API Tokens:** Go to **My Profile > API Tokens** in your Cloudflare dashboard.
2.  **Create a Custom Token:** Click **Create Token**, then find "Custom token" and click **Get started**.
3.  **Name Your Token:** Use a descriptive name like `CI-CD-Deployment-Token`.
4.  **Set Permissions:** Grant the following permissions exactly as listed.

| Resource    | Permission          | Level    |
| :---------- | :------------------ | :------- |
| **User**    | **Memberships**     | **Read** |
| **User**    | **API Tokens**      | **Read** |
| **Account** | **Workers Scripts** | **Edit** |
| Account     | Workers KV Storage  | Edit     |
| Account     | D1                  | Edit     |
| Account     | Hyperdrive          | Edit     |
| Account     | Workers AI          | Edit     |
| Account     | Vectorize           | Edit     |
| Account     | Browser Rendering   | Edit     |

5.  **Set Account Resources:** Under **Account Resources**, select your account.
6.  **Client IP Address Filtering:** Leave this section **blank**.
7.  **Create and Copy the Token:** Click **Continue to summary**, then **Create Token**. Copy the generated token immediately.

---

## Part 2 — Create Cloudflare Resources (wrangler)

Use the Wrangler CLI to create the namespaced resources you need. Run these locally and copy the resulting `id` (or database_id) values for CI/CD variables.

Notes:
- You must be authenticated with Wrangler (`wrangler login`) or have WRANGLER_API_TOKEN configured locally when running these commands.
- Replace names with those you want in your account.

### KV namespaces

```cmd
wrangler kv:namespace create "CF_KV_STAGING"
wrangler kv:namespace create "CF_KV_PRODUCTION"
```

Copy the printed `id` values for each namespace.

### D1 databases

```cmd
wrangler d1 create "staging_db"
wrangler d1 create "production_db"
```

Save each `database_id` output.

### Hyperdrive configs (if you use Hyperdrive)

Hyperdrive requires a connection string to a PostgreSQL instance. For production use a managed DB; for local development you can run Postgres with `docker-compose`.

```cmd
# Staging Hyperdrive
wrangler hyperdrive create "staging-hyperdrive" --connection-string="postgres://user:pass@host:5432/db"

# Production Hyperdrive
wrangler hyperdrive create "production-hyperdrive" --connection-string="postgres://user:pass@host:5432/db"
```

Record the IDs or names returned by these commands.

### Vectorize indexes (optional)

```cmd
wrangler vectorize create "staging-vector-index" --dimensions=1024 --metric=cosine
```

---

## Part 3 — Configure CI/CD Secrets & Variables

Add the API token as a secret in your CI/CD provider and save the resource IDs as repository variables/secrets. The pipelines in this repository use a helper script (`scripts/gen-wrangler.js`) to generate a `wrangler.json` file with injected environment bindings from `wrangler.jsonc` before build/deploy. CI providers should store the resource values using the `STAGING_...` and `PRODUCTION_...` prefixed names described below.

1) CLOUDFLARE API Token (secret)

- Name: `CLOUDFLARE_API_TOKEN`
- Value: token you created in Part 1

2) Resource variables (repository variables / secrets)

Store resource IDs and names as CI variables. Use the `STAGING_` and `PRODUCTION_` prefixes so pipelines can map them into the worker bindings. Example names:

- `STAGING_VALUE_FROM_CLOUDFLARE`
- `STAGING_KV_ID`
- `STAGING_D1_DB_ID`
- `STAGING_HYPERDRIVE_DB_ID`
- `STAGING_VECTORIZE_INDEX_NAME`

- `PRODUCTION_VALUE_FROM_CLOUDFLARE`
- `PRODUCTION_KV_ID`
- `PRODUCTION_D1_DB_ID`
- `PRODUCTION_HYPERDRIVE_DB_ID`
- `PRODUCTION_VECTORIZE_INDEX_NAME`

How pipelines use these values
- The repository CI jobs (GitHub Actions, GitLab CI, Bitbucket Pipelines) first build the application. Then they call `node scripts/gen-wrangler.js <env>` (where `<env>` is `staging` or `production`).
- This script reads the environment variables (looking for the `STAGING_` or `PRODUCTION_` prefix) and generates a `wrangler.json` file in `build/server/` with the resolved values.
- Finally, `wrangler deploy` is run using this generated configuration.

Example (what the pipeline does under the hood):

```bash
# Pipeline environment has variables like PRODUCTION_KV_ID set

# 1. Build the app
pnpm build

# 2. Generate wrangler.json for production
node scripts/gen-wrangler.js production

# 3. Deploy using the generated config
npx wrangler deploy --config build/server/wrangler.json
```

Where to set variables per provider

- GitHub Actions: add the `PRODUCTION_*` / `STAGING_*` variables under *Settings → Secrets and variables → Variables* (or *Secrets* if you prefer secrets for sensitive values).
- GitLab CI: add variables under *Settings → CI / CD → Variables*. Use the same prefixed names above.
- Bitbucket Pipelines: add repository variables (or secured variables) named with the same prefixes.

Local development
- For local preview you can create a `.dev.vars` file in the repo root and the generator script will read values from it when invoked with `local`.

These variables are referenced by your CI job to populate the Worker environment bindings at deploy time. You generally do not need to edit `wrangler.jsonc` in the repository — CI will inject these values when publishing.

---

## Part 4 — Run the Project Locally

For local dev you may not need all Cloudflare resources — but the project supports connecting to staging resources for a close-to-production experience.

### 1) Local Postgres for Hyperdrive (optional)

If you use Hyperdrive locally, start the included Docker Compose Postgres service:

```cmd
docker-compose up -d
```

This creates a Postgres instance compatible with the Hyperdrive settings in `wrangler.jsonc`.

### 2) Configure `.dev.vars`

Create or edit `.dev.vars` at the repository root and add your staging resource IDs and `WRANGLER_ENV`.

Example `.dev.vars`:

```
VALUE_FROM_CLOUDFLARE="Hello from Cloudflare Staging!"
KV_ID="a1b2c3d4e5f6"
D1_DB_ID="b2c3d4e5f6a1"
HYPERDRIVE_DB_ID="c3d4e5f6a1b2"
VECTORIZE_INDEX_NAME="staging-vector-index"
```

Important: `.dev.vars` is for local development only — do not commit secrets to the repo.

### 3) Start development

```cmd
pnpm install
pnpm dev
```

This runs the Vite dev server and the local SSR process. The client should be available at `http://localhost:5173`.

### 4) Preview production build locally

```cmd
pnpm build
pnpm preview
```

`pnpm preview` serves the production build using the worker/server bundle. It uses `scripts/gen-wrangler.js local` to generate a temporary `wrangler.json` from your `.dev.vars` and runs `wrangler dev --local`.

To preview with remote resources (actually connecting to Cloudflare):

```cmd
pnpm preview:remote
```

---

## Part 5 — Accessing Bindings in Application Code

Bindings are available on the Hono context `c.env` (or via Worker globals depending on runtime). Types are generated where configured.

- Durable Objects: `c.env.DURABLE_OBJECTS` (example in `server/durable_objects/counter.do.ts`)

```ts
const durable = c.env.DURABLE_OBJECTS.get(id);
```

- Workers AI (if configured):

```ts
const response = await c.env.AI.run('@cf/meta/llama-2-7b-chat-int8', { prompt: '...' });
```

- Vectorize:

```ts
const matches = await c.env.VECTORIZE.query(vector, { topK: 5 });
```

- Browser rendering bindings:

```ts
const browser = await puppeteer.get(c.env.BROWSER);
```

---

If you want, I can also:

- Generate a sample GitHub Actions workflow that uses the `CLOUDFLARE_API_TOKEN` and the repo variables to deploy to staging and production.
- Scan `package.json` and `wrangler.jsonc` to confirm exact script names used by `pnpm`.

If you'd like either of those, tell me which CI provider to target.
