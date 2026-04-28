# Webhook Failures Endpoint

## Overview

The webhook failures endpoint allows users to debug why their webhooks are failing by retrieving recent failure logs with detailed error information.

## Endpoint

```
GET /api/webhooks/failures/
```

## Authentication

Requires authentication. Users can only see failures for webhooks they own (based on contract ownership).

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subscription_id` | integer | No | Filter failures by specific webhook subscription ID |
| `limit` | integer | No | Maximum number of results (default: 100, max: 1000) |

## Response Format

Returns a JSON array of webhook delivery failure objects:

```json
[
  {
    "id": 123,
    "subscription_id": 45,
    "target_url": "https://example.com/webhook",
    "status_code": 503,
    "error": "Service Unavailable",
    "success": false,
    "timestamp": "2026-04-28T10:30:00Z",
    "attempt_number": 2
  }
]
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier for the delivery log entry |
| `subscription_id` | integer | ID of the webhook subscription |
| `target_url` | string | The webhook endpoint URL that failed |
| `status_code` | integer or null | HTTP status code returned (null for network errors) |
| `error` | string | Error message describing the failure |
| `success` | boolean | Always false for this endpoint |
| `timestamp` | datetime | When the delivery attempt occurred |
| `attempt_number` | integer | Retry attempt number (1 = first attempt, 2+ = retries) |

## Examples

### Get all recent failures

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.soroscan.io/api/webhooks/failures/
```

### Filter by subscription

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.soroscan.io/api/webhooks/failures/?subscription_id=45"
```

### Limit results

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.soroscan.io/api/webhooks/failures/?limit=50"
```

## Common Error Scenarios

### Network Errors
When the webhook endpoint is unreachable, `status_code` will be `null` and `error` will contain the network error message:

```json
{
  "status_code": null,
  "error": "Connection timeout"
}
```

### HTTP Errors
When the webhook endpoint returns an error status code:

```json
{
  "status_code": 500,
  "error": "Internal Server Error"
}
```

### Service Unavailable
Temporary failures that may succeed on retry:

```json
{
  "status_code": 503,
  "error": "Service Unavailable"
}
```

## Ordering

Results are ordered by timestamp in descending order (most recent failures first).

## Use Cases

1. **Debugging webhook issues**: Quickly identify why webhooks are failing
2. **Monitoring webhook health**: Track failure patterns over time
3. **Troubleshooting specific subscriptions**: Filter by subscription_id to focus on a particular webhook
4. **Analyzing retry behavior**: See multiple attempts for the same event

## Related Endpoints

- `GET /api/webhooks/` - List all webhook subscriptions
- `GET /api/webhooks/{id}/` - Get details of a specific webhook
- `POST /api/webhooks/{id}/test/` - Send a test webhook delivery

## Implementation Details

- Only failed deliveries (`success=False`) are returned
- Users can only see failures for webhooks attached to contracts they own
- The endpoint uses efficient database queries with proper indexing
- Results are paginated with configurable limits
