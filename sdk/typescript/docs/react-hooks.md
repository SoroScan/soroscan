# React Hooks (`@soroscan/sdk/hooks`)

Issue #1282 — TypeScript SDK React Hooks Integration

Optional React hooks that wrap common SoroScan operations with loading and error
state. GraphQL hooks use **Apollo Client**; webhook management uses the REST
`SoroScanClient`.

## Installation

```bash
npm install @soroscan/sdk @apollo/client graphql react
```

## Setup

```tsx
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { SoroScanClient, SoroScanHooksProvider } from "@soroscan/sdk/hooks";

const apollo = new ApolloClient({
  uri: "https://api.soroscan.io/graphql/",
  cache: new InMemoryCache(),
});

const rest = new SoroScanClient({
  baseUrl: "https://api.soroscan.io",
  apiKey: process.env.SOROSCAN_API_KEY,
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apollo}>
      <SoroScanHooksProvider client={rest}>{children}</SoroScanHooksProvider>
    </ApolloProvider>
  );
}
```

## `useEvents`

Fetch paginated events and optionally subscribe to live updates.

```tsx
import { useEvents } from "@soroscan/sdk/hooks";

function EventFeed({ contractId }: { contractId: string }) {
  const { data, loading, error, latestEvent, fetchMore, hasNextPage } =
    useEvents({ contractId, subscribe: true });

  if (loading) return <p>Loading…</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {latestEvent && <li key={`live-${latestEvent.id}`}>Live: {latestEvent.type}</li>}
      {data?.map((event) => (
        <li key={event.id}>{event.type} @ {event.ledger}</li>
      ))}
      {hasNextPage && <button onClick={() => fetchMore()}>Load more</button>}
    </ul>
  );
}
```

## `useContract`

Load tracked contract metadata from GraphQL.

```tsx
import { useContract } from "@soroscan/sdk/hooks";

function ContractCard({ contractId }: { contractId: string }) {
  const { data, loading, error } = useContract({ contractId });
  if (loading) return null;
  if (error || !data) return <p>Unavailable</p>;
  return <h2>{data.label}</h2>;
}
```

## `useWebhook`

Manage webhook subscriptions via the REST SDK.

```tsx
import { useWebhook } from "@soroscan/sdk/hooks";

function WebhookPanel({ contractId }: { contractId: string }) {
  const { data, loading, subscribe, remove, mutating } = useWebhook({
    contractId,
  });

  if (loading) return null;

  return (
    <div>
      {data?.map((hook) => (
        <div key={hook.id}>
          {hook.url}
          <button onClick={() => remove(hook.id)} disabled={mutating}>
            Delete
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          subscribe({ targetUrl: "https://example.com/hook", eventType: "transfer" })
        }
        disabled={mutating}
      >
        Add webhook
      </button>
    </div>
  );
}
```

## Types

All hook option and result types are exported from `@soroscan/sdk/hooks`:

- `UseEventsOptions`, `UseEventsResult`
- `UseContractOptions`, `UseContractResult`
- `UseWebhookOptions`, `UseWebhookResult`
