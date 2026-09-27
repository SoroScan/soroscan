# TypeScript SDK Quick Start Guide

Get up and running with the SoroScan TypeScript SDK in minutes. This guide covers common patterns for fetching contract events, handling errors, and working with paginated results.

## Installation

```bash
npm install @soroscan/sdk
```

## Basic Setup

```ts
import { SoroScanClient } from "@soroscan/sdk";

const client = new SoroScanClient({
  baseUrl: "https://api.soroscan.io",
  apiKey: process.env.SOROSCAN_API_KEY, // optional
});
```

## Fetching Contract Events

### Simple Query

Fetch the 50 most recent events for a contract:

```ts
const result = await client.getEvents({
  contractId: "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
  first: 50,
});

console.log(`Found ${result.totalCount} total events`);
for (const event of result.items) {
  console.log(`${event.ledger}: ${event.type} in tx ${event.txHash}`);
}
```

### Filtered Query

Query events with specific types and ledger ranges:

```ts
const result = await client.getEvents({
  contractId: "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
  eventType: "transfer",
  startLedger: 1_000_000,
  endLedger: 1_100_000,
  first: 100,
});

console.log(`Found ${result.items.length} transfer events`);
```

### Pagination

Iterate through all events using cursor-based pagination:

```ts
async function fetchAllEvents(contractId: string) {
  let after: string | null = null;
  let allEvents = [];

  do {
    const page = await client.getEvents({
      contractId,
      first: 100,
      ...(after ? { after } : {}),
    });

    allEvents = allEvents.concat(page.items);
    console.log(`Fetched ${page.items.length} events (${allEvents.length} total)`);

    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return allEvents;
}

const events = await fetchAllEvents(
  "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF"
);
console.log(`Done! Total events: ${events.length}`);
```

## Working with Contracts

### Get Contract Details

Fetch information about a specific contract:

```ts
const contract = await client.getContract({
  contractId: "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
});

console.log(`Contract: ${contract.id}`);
console.log(`Created at ledger: ${contract.createdLedger}`);
console.log(`Total events: ${contract.totalEvents}`);

if (contract.spec?.functions) {
  console.log(`Functions: ${contract.spec.functions.map((f) => f.name).join(", ")}`);
}
```

### List Contracts

Query multiple contracts with filters:

```ts
const result = await client.getContracts({
  type: "token",
  verified: true,
  first: 25,
});

console.log(`Found ${result.items.length} verified token contracts`);
for (const contract of result.items) {
  console.log(`${contract.id}: ${contract.label || "Unlabeled"}`);
}
```

## Error Handling

### Basic Error Catching

Wrap API calls in try-catch blocks to handle errors gracefully:

```ts
import { SoroScanClient, SoroScanError } from "@soroscan/sdk";

try {
  const contract = await client.getContract({
    contractId: "CCBAD111222333444555666777888999AAABBBCCCDDDEEEFFF",
  });
} catch (err) {
  if (err instanceof SoroScanError) {
    console.error(`Error [${err.statusCode}]: ${err.code}`);
    console.error(`Message: ${err.message}`);
    if (err.details) {
      console.error(`Details:`, err.details);
    }
  } else {
    console.error("Unexpected error:", err);
  }
}
```

### Handling Specific Error Types

```ts
import {
  SoroScanError,
  SoroScanNotFoundError,
  SoroScanAuthError,
  SoroScanRateLimitError,
  SoroScanValidationError,
} from "@soroscan/sdk";

async function getContractSafely(contractId: string) {
  try {
    return await client.getContract({ contractId });
  } catch (err) {
    if (err instanceof SoroScanNotFoundError) {
      console.log("Contract not found");
      return null;
    } else if (err instanceof SoroScanAuthError) {
      console.error("Authentication failed - check your API key");
      process.exit(1);
    } else if (err instanceof SoroScanRateLimitError) {
      console.warn("Rate limited - please wait before retrying");
      // Implement exponential backoff here
      return null;
    } else if (err instanceof SoroScanValidationError) {
      console.error("Invalid request parameters");
      return null;
    } else {
      console.error("Unexpected error:", err);
      throw err;
    }
  }
}
```

### Retry Pattern with Exponential Backoff

Implement resilient API calls with automatic retries:

```ts
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (
        err instanceof SoroScanRateLimitError ||
        (err instanceof SoroScanError && err.statusCode >= 500)
      ) {
        if (attempt === maxRetries) throw err;

        const delayMs = initialDelayMs * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw err;
      }
    }
  }

  throw new Error("Retry logic error");
}

// Usage
const events = await fetchWithRetry(() =>
  client.getEvents({
    contractId: "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
    first: 50,
  })
);
```

## Working with Webhooks

### Create a Webhook

Subscribe to live contract events via webhooks:

```ts
const webhook = await client.subscribeWebhook({
  url: "https://myapp.com/webhooks/soroscan",
  triggers: ["event.created"],
  contractId: "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
});

console.log(`Webhook created with ID: ${webhook.id}`);
console.log(`Secret for signing payloads: ${webhook.secret}`);
```

### List Webhooks

Get all webhooks registered with your API key:

```ts
const result = await client.listWebhooks();

console.log(`You have ${result.items.length} webhook(s)`);
for (const webhook of result.items) {
  console.log(`${webhook.id}: ${webhook.url} (${webhook.status})`);
}
```

### Update a Webhook

Modify webhook configuration:

```ts
const updated = await client.updateWebhook("wh_12345", {
  status: "paused",
  triggers: ["event.created", "transaction.success"],
});

console.log(`Webhook updated: ${updated.status}`);
```

### Delete a Webhook

Remove a webhook subscription:

```ts
await client.deleteWebhook("wh_12345");
console.log("Webhook deleted");
```

## Advanced Patterns

### Batch Processing Events

Process events in parallel batches:

```ts
async function processEventsInBatches(
  contractId: string,
  batchSize: number = 100,
  concurrency: number = 3
) {
  let after: string | null = null;
  const queue: Promise<void>[] = [];

  do {
    const page = await client.getEvents({
      contractId,
      first: batchSize,
      ...(after ? { after } : {}),
    });

    // Process batch
    const batchPromise = (async () => {
      console.log(`Processing batch of ${page.items.length} events...`);
      for (const event of page.items) {
        // Your processing logic
        console.log(`Event: ${event.type} at ledger ${event.ledger}`);
      }
    })();

    queue.push(batchPromise);

    // Maintain concurrency limit
    if (queue.length >= concurrency) {
      await Promise.race(queue);
      queue.splice(
        queue.findIndex((p) => !p),
        1
      );
    }

    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  await Promise.all(queue);
}

await processEventsInBatches(
  "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF"
);
```

### Monitoring Recent Events

Poll for new events at regular intervals:

```ts
async function monitorEvents(contractId: string, intervalMs: number = 5000) {
  let lastLedger = 0;

  setInterval(async () => {
    try {
      const result = await client.getEvents({
        contractId,
        first: 10,
      });

      for (const event of result.items) {
        if (event.ledger > lastLedger) {
          console.log(`[NEW] ${event.type} at ledger ${event.ledger}`);
          lastLedger = Math.max(lastLedger, event.ledger);
        }
      }
    } catch (err) {
      console.error("Error monitoring events:", err);
    }
  }, intervalMs);
}

// Start monitoring
monitorEvents("CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF", 3000);
```

### Type-Safe Event Handling

Work with strongly typed event data:

```ts
import type { ContractEvent } from "@soroscan/sdk";

function handleTransferEvent(event: ContractEvent) {
  if (event.type !== "transfer") return;

  const payload = event.value as {
    from: string;
    to: string;
    amount: string;
  };

  console.log(`Transfer from ${payload.from} to ${payload.to}: ${payload.amount}`);
}

const result = await client.getEvents({
  contractId: "CCAAA111222333444555666777888999AAABBBCCCDDDEEEFFF",
  eventType: "transfer",
  first: 50,
});

for (const event of result.items) {
  handleTransferEvent(event);
}
```

## Resource Limits

- **Rate limiting**: 100 requests/minute for public endpoints, higher for authenticated requests
- **Page size**: Maximum 200 events per page
- **Timeout**: Default 30 seconds (configurable via `timeoutMs`)

## Next Steps

- Read the [full API reference](./README.md)
- Check out [example projects](../../examples)
- Join the [SoroScan community](https://discord.gg/soroscan)

## Support

For issues and questions:
- [GitHub Issues](https://github.com/SoroScan/soroscan/issues)
- [Discord Community](https://discord.gg/soroscan)
- [Documentation](https://docs.soroscan.io)
