# SoroScan Frontend

Next.js frontend for SoroScan contract timeline and event explorer pages.

## Prerequisites

- Node.js
- pnpm, installed through Corepack (ships with Node.js). `package.json` pins the
  exact pnpm version through the `packageManager` field.

```bash
corepack enable
pnpm --version
```

## Local Development

From `soroscan-frontend/`:

```bash
pnpm install
pnpm run codegen
pnpm dev
```

Open `http://localhost:3000`.

Run `pnpm run codegen` again whenever the GraphQL schema or `.graphql` documents
change. `pnpm build` runs codegen automatically before `next build`.

## Environment

Create `.env.local` when running outside Docker:

```env
# Django backend base URL used by app/api/graphql proxy route
BACKEND_BASE_URL=http://localhost:8000
# Optional direct override for GraphQL endpoint
# BACKEND_GRAPHQL_URL=http://localhost:8000/graphql/

# HTTP endpoint of the Django Strawberry GraphQL API (Apollo Client)
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8000/graphql/
# WebSocket endpoint used for GraphQL subscriptions (graphql-ws) and the live
# event monitor. Leave unset to disable real-time features.
NEXT_PUBLIC_WS_URL=ws://localhost:8000/graphql/
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GRAPHQL_URL` | `http://localhost:8000/graphql/` | Apollo Client HTTP endpoint for GraphQL queries and mutations |
| `NEXT_PUBLIC_WS_URL` | unset | GraphQL subscription endpoint (`graphql-ws`); real-time features report "Unavailable" when unset |

`.env.example` lists the same `NEXT_PUBLIC_*` defaults, plus
`NEXT_PUBLIC_DEFAULT_CONTRACT_ID` for the `/monitor` page.

In Docker Compose, `BACKEND_BASE_URL` is set to `http://web:8000`.

## GraphQL Codegen

Generated types are written to `src/generated/` (committed to the repository).

```bash
# From the local schema at src/schema.graphql
pnpm run codegen

# Against a running local backend (Bash, Git Bash, Linux, or macOS)
GRAPHQL_ENDPOINT=http://localhost:8000/graphql/ pnpm run codegen

# Watch .graphql documents and regenerate automatically
pnpm run codegen:watch
```

## Routes

- `/` - Landing page
- `/gallery` - Terminal component gallery
- `/contracts/[contractId]/timeline` - Contract timeline
- `/contracts/[contractId]/events/explorer` - Contract event explorer

## Data Access

Frontend pages call `/api/graphql` (Next route handler), which proxies to Django `/graphql/`.
This keeps browser requests same-origin and avoids CORS/CSRF issues.
