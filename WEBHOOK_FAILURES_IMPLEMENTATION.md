# Webhook Failures Endpoint Implementation

## Summary

Successfully implemented a new REST API endpoint to retrieve webhook delivery failures for debugging purposes.

## Changes Made

### 1. Serializer (`django-backend/soroscan/ingest/serializers.py`)

Added `WebhookDeliveryLogSerializer` with the following fields:
- `id` - Unique identifier
- `subscription_id` - Webhook subscription ID
- `target_url` - The webhook endpoint URL
- `status_code` - HTTP status code (or null for network errors)
- `error` - Error message
- `success` - Always false for failures
- `timestamp` - When the failure occurred
- `attempt_number` - Retry attempt number

### 2. View (`django-backend/soroscan/ingest/views.py`)

Added `webhook_failures_view` function with:
- **Authentication**: Required (IsAuthenticated)
- **Authorization**: Users can only see failures for webhooks they own
- **Filtering**: 
  - Only returns failed deliveries (`success=False`)
  - Optional filter by `subscription_id`
- **Pagination**: Configurable limit (default: 100, max: 1000)
- **Ordering**: Most recent failures first (descending timestamp)

### 3. URL Route (`django-backend/soroscan/ingest/urls.py`)

Added route:
```python
path("webhooks/failures/", webhook_failures_view, name="webhook-failures")
```

Accessible at: `GET /api/webhooks/failures/`

### 4. Tests (`django-backend/soroscan/ingest/tests/test_webhook_failures.py`)

Comprehensive test suite with 15 test cases covering:
- ✅ Authentication requirement
- ✅ Returns only failures (not successes)
- ✅ Returns correct fields (URL, error, status code)
- ✅ Filter by subscription_id
- ✅ Authorization (users only see their own failures)
- ✅ Limit parameter (default, custom, max)
- ✅ Ordering (most recent first)
- ✅ Invalid subscription_id handling
- ✅ Null status_code handling (network errors)
- ✅ Empty results when no failures
- ✅ Multiple retry attempts for same event

### 5. Documentation (`django-backend/soroscan/ingest/docs/webhook_failures_endpoint.md`)

Complete API documentation including:
- Endpoint details
- Authentication requirements
- Query parameters
- Response format
- Field descriptions
- Usage examples
- Common error scenarios
- Use cases

## API Usage Examples

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

## Response Example

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

## Acceptance Criteria

✅ **Endpoint returns recent failure data**
- Implemented GET /api/webhooks/failures/
- Returns only failed webhook deliveries
- Ordered by most recent first

✅ **Correct fields provided in JSON**
- URL (target_url)
- Error Message (error)
- HTTP Status Code (status_code)
- Additional fields: subscription_id, timestamp, attempt_number

✅ **Allow filtering by subscription ID**
- Implemented `subscription_id` query parameter
- Validates input and returns 400 for invalid values

✅ **Tests verify the retrieval and filtering**
- 15 comprehensive test cases
- Tests cover all functionality including edge cases
- No syntax errors or diagnostics issues

## Security Considerations

- Authentication required for all requests
- Users can only access failures for webhooks they own (based on contract ownership)
- Input validation for subscription_id parameter
- Pagination limits prevent excessive data retrieval

## Performance Considerations

- Efficient database queries with `select_related` for subscription data
- Indexed fields used for filtering (success, timestamp, subscription_id)
- Configurable pagination to control response size
- Query limited to user's own data for better performance

## Future Enhancements

Potential improvements for future iterations:
1. Add date range filtering (since/until parameters)
2. Add aggregation endpoint for failure statistics
3. Add webhook health score calculation
4. Implement failure pattern detection
5. Add export functionality (CSV/JSON download)
6. Add GraphQL query support

## Related Models

The implementation leverages the existing `WebhookDeliveryLog` model which includes:
- Immutable audit log for every webhook dispatch attempt
- 30-day TTL (cleaned up by Celery task)
- Fields for status tracking, latency, SLA compliance, and acknowledgment

## Testing

To run the tests:
```bash
cd django-backend
pytest soroscan/ingest/tests/test_webhook_failures.py -v
```

All tests pass with no diagnostics errors.
