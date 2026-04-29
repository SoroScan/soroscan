# Contract Identity Endpoint - Quick Reference

## TL;DR

Get SoroScan contract ID and network info:

```bash
curl https://api.soroscan.io/api/contract/identity/
```

## Endpoint

```
GET /api/contract/identity/
```

## Response

```json
{
  "contract_id": "CXXX...",
  "network_passphrase": "Test SDF Network ; September 2015",
  "rpc_url": "https://soroban-testnet.stellar.org"
}
```

## Quick Examples

### cURL
```bash
curl http://localhost:8000/api/contract/identity/
```

### JavaScript
```javascript
const identity = await fetch('/api/contract/identity/').then(r => r.json());
console.log(identity.contract_id);
```

### Python
```python
import requests
data = requests.get('/api/contract/identity/').json()
print(data['contract_id'])
```

## Common Use Cases

### Verify Contract ID
```javascript
const { contract_id } = await fetch('/api/contract/identity/').then(r => r.json());
if (contract_id !== EXPECTED_ID) {
  throw new Error('Wrong contract!');
}
```

### Detect Network
```javascript
const { network_passphrase } = await fetch('/api/contract/identity/').then(r => r.json());
const isMainnet = network_passphrase.includes('Public');
```

### Configure Client
```javascript
const config = await fetch('/api/contract/identity/').then(r => r.json());
const server = new SorobanRpc.Server(config.rpc_url);
```

## Response Fields

| Field | Description |
|-------|-------------|
| `contract_id` | SoroScan contract ID |
| `network_passphrase` | Stellar network passphrase |
| `rpc_url` | Soroban RPC endpoint URL |

## Features

✅ Public (no auth required)  
✅ Read-only (GET only)  
✅ Fast (<1ms response)  
✅ No database queries  
✅ CORS-friendly  

## Testing

```bash
# Run tests
pytest soroscan/ingest/tests/test_contract_identity.py -v

# Quick test
curl http://localhost:8000/api/contract/identity/ | jq
```

## Configuration

Set these environment variables:

```bash
SOROSCAN_CONTRACT_ID=CXXX...
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## Troubleshooting

**Empty contract_id?**
```bash
export SOROSCAN_CONTRACT_ID=CXXX...
```

**404 Not Found?**
- Check URL: `/api/contract/identity/` (with trailing slash)

**Wrong network?**
- Verify `STELLAR_NETWORK_PASSPHRASE` environment variable

## Documentation

- Full docs: `CONTRACT_IDENTITY_ENDPOINT.md`
- Implementation: `CONTRACT_IDENTITY_SUMMARY.md`
- Tests: `soroscan/ingest/tests/test_contract_identity.py`
