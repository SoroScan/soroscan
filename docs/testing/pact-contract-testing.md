# Pact Contract Testing Guide

SoroScan uses **Consumer-Driven Contract Testing** with [Pact](https://pact.io/) to ensure ongoing API compatibility between our client SDKs (TypeScript and Python) and the Django backend without requiring full end-to-end multi-service deployments in every test run.

---

## 1. Overview & Architecture

Consumer-driven contract testing reverses traditional integration testing:
1. **Consumers** (TypeScript SDK & Python SDK) declare the HTTP requests they intend to make and the exact response shapes they require.
2. Running consumer tests generates JSON contract files stored in `pacts/`.
3. The **Provider** (Django REST API) replays these recorded interactions against its real endpoint implementations and asserts that responses satisfy the consumer contracts.

```
+------------------------------------+       +------------------------------------+
|  TypeScript SDK (Consumer Test)    |       |     Python SDK (Consumer Test)     |
|  sdk/typescript/test/pact/         |       |     sdk/python/tests/              |
+------------------------------------+       +------------------------------------+
                   \                                   /
                    \                                 /
                     v                               v
             +-----------------------------------------------+
             |                pacts/*.json                   |
             |  - soroscan-typescript-sdk-soroscan-api.json |
             |  - soroscan-python-sdk-soroscan-api.json     |
             +-----------------------------------------------+
                                     |
                                     v
             +-----------------------------------------------+
             |       Django API Provider Verification        |
             |       soroscan/pact_tests/                    |
             |       (Database & Redis Test Environment)     |
             +-----------------------------------------------+
```

---

## 2. Consumer Flow (SDKs)

### TypeScript SDK (`sdk/typescript`)
The TypeScript SDK uses `@pact-foundation/pact` (V4) with Vitest.

- **Location:** `sdk/typescript/test/pact/consumer.pact.test.ts`
- **Output:** `pacts/soroscan-typescript-sdk-soroscan-api.json`

Key patterns:
```typescript
import { PactV4, MatchersV3 } from "@pact-foundation/pact";

const { like, eachLike, string, integer } = MatchersV3;

const pact = new PactV4({
  consumer: "soroscan-typescript-sdk",
  provider: "soroscan-api",
  dir: PACTS_DIR,
});

await pact
  .addInteraction()
  .given("contract events exist")
  .uponReceiving("a request to list events")
  .withRequest("GET", "/v1/events", (builder) => {
    builder.query({ first: "5" });
  })
  .willRespondWith(200, (builder) => {
    builder.headers({ "Content-Type": "application/json" });
    builder.jsonBody({
      items: eachLike({
        id: string("evt_001"),
        ledger: integer(123456),
        contractId: string("CCAAA"),
      }),
    });
  })
  .executeTest(async (mockServer) => {
    const client = new SoroScanClient({ baseUrl: mockServer.url });
    const events = await client.events.list({ first: 5 });
    expect(events.items.length).toBeGreaterThan(0);
  });
```

### Python SDK (`sdk/python`)
The Python SDK uses `pact-python` with `pytest`.

- **Location:** `sdk/python/tests/test_pact_consumer.py`
- **Output:** `pacts/soroscan-python-sdk-soroscan-api.json`

---

## 3. Provider Flow & Provider States (Django Backend)

When the Django provider runs contract verification, it needs initial database state (e.g. contracts, events, valid API keys) to return valid responses.

### Provider States (`soroscan/pact_provider.py`)
Provider state setup handlers configure database fixtures before executing each interaction:
- `"the API is healthy"`: Verifies basic health endpoints without DB dependencies.
- `"contract events exist"`: Seeds a test `TrackedContract` and `ContractEvent` records.
- `"valid API credentials exist"`: Seeds a test user with a known API key (`PACT_API_KEY`).

### Security Lock
Provider state seeding is strictly gated behind the environment flag:
```bash
PACT_PROVIDER_STATES_ENABLED=1
```
In production, this endpoint returns `HTTP 403 Forbidden` and does not register in URL routing.

---

## 4. Local Execution Commands

### Step 1: Generate or refresh contracts (Consumers)

```bash
# 1. Generate TypeScript SDK contract
cd sdk/typescript
npm install
npm run test:pact

# 2. Generate Python SDK contract
cd ../python
pip install -e ".[dev]" pact-python
pytest tests/test_pact_consumer.py -v
```

### Step 2: Verify contracts against the Django API (Provider)

```bash
cd django-backend

# Ensure dependencies are installed
pip install -r requirements.txt

# Run provider verification test
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/test_soroscan" \
REDIS_URL="redis://localhost:6379/0" \
DJANGO_SETTINGS_MODULE="soroscan.settings_test" \
PACT_PROVIDER_STATES_ENABLED="1" \
pytest soroscan/pact_tests/test_provider_verification.py -v
```

---

## 5. CI/CD Workflow (`.github/workflows/pact-tests.yml`)

The repository runs contract testing on every push and PR modifying `pacts/`, `sdk/`, or `django-backend/`:

1. **`consumer-typescript` Job:** Runs `npm run test:pact` and uploads `pacts/*.json` as artifacts.
2. **`consumer-python` Job:** Runs `pytest tests/test_pact_consumer.py` and uploads pact artifacts.
3. **`provider-verification` Job:**
   - Starts PostgreSQL 15 and Redis 7 service containers.
   - Downloads generated pact files from consumer jobs.
   - Executes `soroscan/pact_tests/test_provider_verification.py` with `PACT_PROVIDER_STATES_ENABLED=1`.
   - Runs `soroscan/pact_tests/test_v1_views.py` to ensure unit test coverage of provider routes.

---

## 6. Troubleshooting Contract Mismatches

| Error Symptom | Probable Cause | Remediation |
|---|---|---|
| `Header 'content-type' with value 'text/html' did not match expected 'application/json'` | Unhandled exception in backend view resulting in a 500 error page | Check Django server logs; ensure endpoint returns DRF `Response` or `JsonResponse`. |
| `Missing key: items` or property casing mismatch | SDK expects `camelCase` but backend serialized `snake_case` | Ensure serializers use camelCase alias fields matching SDK client models. |
| `Status code 404 did not match expected 200` | Missing route URL in Django `urls.py` or URL pattern mismatch | Compare consumer request path with `soroscan/urls.py` and API route definitions. |
| `Provider state '...' not found` | Consumer declared a state not implemented in `soroscan/pact_provider.py` | Add the missing state to `_handle_provider_state` and `apply_provider_state`. |
| `No pact files found in pacts/` | Consumer tests failed or did not output to the expected directory | Run consumer tests locally and verify `dir: PACTS_DIR` points to the repository root `pacts/`. |
