# Contract Identity Endpoint

## Overview

A public API endpoint that allows clients to verify where events are coming from by exposing the SoroScan contract ID and network configuration.

## Endpoint

```
GET /api/contract/identity/
```

## Authentication

None required - this is a public endpoint.

## Response

```json
{
  "contract_id": "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "network_passphrase": "Test SDF Network ; September 2015",
  "rpc_url": "https://soroban-testnet.stellar.org"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `contract_id` | string | The SoroScan contract ID from `SOROSCAN_CONTRACT_ID` environment variable |
| `network_passphrase` | string | The Stellar network passphrase from `STELLAR_NETWORK_PASSPHRASE` |
| `rpc_url` | string | The Soroban RPC URL from `SOROBAN_RPC_URL` |

## Examples

### cURL

```bash
curl https://api.soroscan.io/api/contract/identity/
```

### JavaScript (fetch)

```javascript
fetch('https://api.soroscan.io/api/contract/identity/')
  .then(response => response.json())
  .then(data => {
    console.log('Contract ID:', data.contract_id);
    console.log('Network:', data.network_passphrase);
    console.log('RPC URL:', data.rpc_url);
  });
```

### Python (requests)

```python
import requests

response = requests.get('https://api.soroscan.io/api/contract/identity/')
data = response.json()

print(f"Contract ID: {data['contract_id']}")
print(f"Network: {data['network_passphrase']}")
print(f"RPC URL: {data['rpc_url']}")
```

### TypeScript

```typescript
interface ContractIdentity {
  contract_id: string;
  network_passphrase: string;
  rpc_url: string;
}

async function getContractIdentity(): Promise<ContractIdentity> {
  const response = await fetch('https://api.soroscan.io/api/contract/identity/');
  return response.json();
}

const identity = await getContractIdentity();
console.log(identity.contract_id);
```

## Use Cases

### 1. Verify Event Source

Clients can verify that events are coming from the expected SoroScan contract:

```javascript
const identity = await fetch('/api/contract/identity/').then(r => r.json());

// Verify contract ID matches expected value
if (identity.contract_id !== EXPECTED_CONTRACT_ID) {
  throw new Error('Events are from unexpected contract!');
}
```

### 2. Network Detection

Determine which Stellar network the indexer is connected to:

```javascript
const identity = await fetch('/api/contract/identity/').then(r => r.json());

const isMainnet = identity.network_passphrase.includes('Public');
const isTestnet = identity.network_passphrase.includes('Test');

console.log(`Connected to ${isMainnet ? 'Mainnet' : 'Testnet'}`);
```

### 3. Multi-Network Support

Configure client based on the network:

```javascript
const identity = await fetch('/api/contract/identity/').then(r => r.json());

const config = {
  contractId: identity.contract_id,
  rpcUrl: identity.rpc_url,
  networkPassphrase: identity.network_passphrase,
};

// Use config to initialize Stellar SDK
const server = new SorobanRpc.Server(config.rpcUrl);
```

### 4. Health Check

Verify the indexer is properly configured:

```javascript
const identity = await fetch('/api/contract/identity/').then(r => r.json());

if (!identity.contract_id) {
  console.error('Indexer not configured with contract ID!');
}

if (!identity.rpc_url) {
  console.error('Indexer not configured with RPC URL!');
}
```

## Configuration

The endpoint reads from these environment variables:

```bash
# .env file
SOROSCAN_CONTRACT_ID=CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## Error Handling

The endpoint always returns 200 OK with the current configuration. If environment variables are not set, empty strings are returned:

```json
{
  "contract_id": "",
  "network_passphrase": "",
  "rpc_url": ""
}
```

Clients should validate that required fields are non-empty.

## Security Considerations

- **Public endpoint**: No authentication required
- **Read-only**: Only GET method is supported
- **No sensitive data**: Only exposes public configuration
- **CORS-friendly**: Can be called from any origin

## Testing

Run the test suite:

```bash
pytest soroscan/ingest/tests/test_contract_identity.py -v
```

Test coverage includes:
- Returns correct contract ID
- Returns correct network passphrase
- Returns correct RPC URL
- All required fields present
- Publicly accessible (no auth)
- Reflects environment configuration
- Handles empty values
- Returns valid JSON
- GET method only
- Mainnet/testnet configurations
- Consistent responses
- Correct URL path

## Integration

### Frontend Integration

```typescript
// services/soroscan.ts
export async function getContractIdentity() {
  const response = await fetch('/api/contract/identity/');
  if (!response.ok) {
    throw new Error('Failed to fetch contract identity');
  }
  return response.json();
}

// Usage in component
useEffect(() => {
  getContractIdentity().then(identity => {
    setContractId(identity.contract_id);
    setNetwork(identity.network_passphrase);
  });
}, []);
```

### SDK Integration

```python
# soroscan_sdk/client.py
class SoroScanClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self._identity = None
    
    def get_identity(self):
        if not self._identity:
            response = requests.get(f"{self.base_url}/api/contract/identity/")
            response.raise_for_status()
            self._identity = response.json()
        return self._identity
    
    @property
    def contract_id(self):
        return self.get_identity()["contract_id"]
    
    @property
    def network(self):
        return self.get_identity()["network_passphrase"]
```

## Monitoring

### Prometheus Metrics

The endpoint is automatically included in standard HTTP metrics:

```promql
# Request rate
rate(http_requests_total{endpoint="/api/contract/identity/"}[5m])

# Response time
histogram_quantile(0.95, http_request_duration_seconds{endpoint="/api/contract/identity/"})
```

### Logging

Requests are logged with standard Django logging:

```
INFO "GET /api/contract/identity/ HTTP/1.1" 200 156
```

## Troubleshooting

### Empty contract_id

**Problem**: `contract_id` is empty string

**Solution**: Set `SOROSCAN_CONTRACT_ID` environment variable

```bash
export SOROSCAN_CONTRACT_ID=CXXXXXXX...
```

### Wrong network

**Problem**: `network_passphrase` doesn't match expected network

**Solution**: Verify `STELLAR_NETWORK_PASSPHRASE` is correct

```bash
# Testnet
export STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Mainnet
export STELLAR_NETWORK_PASSPHRASE="Public Global Stellar Network ; September 2015"
```

### 404 Not Found

**Problem**: Endpoint returns 404

**Solution**: Verify URL path is correct: `/api/contract/identity/`

## Related Endpoints

- `GET /api/health/` - Health check endpoint
- `GET /api/networks/` - List of supported networks
- `GET /api/contracts/` - List tracked contracts

## Changelog

### v1.0.0
- Initial implementation
- Returns contract_id, network_passphrase, and rpc_url
- Public endpoint with no authentication
