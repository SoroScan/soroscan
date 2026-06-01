# Webhook Test UI - Visual Guide

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Webhook Tester Interface                     │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  Webhook List    │         Payload Editor (Top Half)           │
│  ─────────────   │  ┌──────────────────────────────────────┐   │
│  • webhook-1     │  │ Payload                              │   │
│  • webhook-2     │  │ ✓ valid JSON                         │   │
│  • webhook-3     │  │                                      │   │
│                  │  │ {                                    │   │
│                  │  │   "event_type": "test",              │   │
│                  │  │   "payload": {...}                   │   │
│                  │  │ }                                    │   │
│                  │  │                                      │   │
│                  │  │ Target: https://webhook.example.com  │   │
│                  │  │ [↻ Retry] [Send Test]                │   │
│                  │  └──────────────────────────────────────┘   │
│                  │                                              │
│                  │         Response Viewer (Bottom Half)       │
│                  │  ┌──────────────────────────────────────┐   │
│                  │  │ HTTP 200 OK | 245ms | 1.2KB          │   │
│                  │  │ [↻ Retry]                            │   │
│                  │  │                                      │   │
│                  │  │ Response Body | Response Headers     │   │
│                  │  │ Request                              │   │
│                  │  │                                      │   │
│                  │  │ {                                    │   │
│                  │  │   "success": true,                   │   │
│                  │  │   "message": "Webhook received"      │   │
│                  │  │ }                                    │   │
│                  │  │                                      │   │
│                  │  └──────────────────────────────────────┘   │
│                  │                                              │
│                  │  ▲ History (collapsed)                      │
└──────────────────┴──────────────────────────────────────────────┘
```

## Response Tabs

### 1. Response Body Tab
Shows the response body from the webhook endpoint.
- JSON responses are formatted
- Text responses displayed as-is
- Size indicator in status bar

### 2. Response Headers Tab
Shows all HTTP response headers received.
- Header name (blue)
- Header value (gray)
- Count of headers in tab label

### 3. Request Tab (NEW)
Shows request details sent to the webhook.

```
Request Headers
─────────────────────────────────────────
Content-Type                application/json

Timing
─────────────────────────────────────────
Total                     245ms
```

## Error State (NEW)

```
┌──────────────────────────────────────────┐
│ ✗ Request Failed                         │
│                                          │
│ Connection refused: ECONNREFUSED         │
│                                          │
│ [Retry Request]                          │
└──────────────────────────────────────────┘
```

## Retry Buttons

### Location 1: Payload Editor Footer
```
Target: https://webhook.example.com
[↻ Retry] [Send Test]
```
- Retry button disabled during sending
- Retries with last payload and webhook

### Location 2: Response Viewer Status Bar
```
HTTP 200 OK | 245ms | 1.2KB [↻ Retry]
```
- Quick retry from response view
- Maintains same payload

### Location 3: Error State
```
[Retry Request]
```
- Prominent retry button on errors
- Encourages retry on failure

## Workflow Examples

### Example 1: Send and Inspect
1. Select webhook from sidebar
2. Edit payload in editor
3. Click "Send Test"
4. View response body in Response Body tab
5. Click "Request" tab to see headers and timing
6. Click "Response Headers" tab to see response headers

### Example 2: Retry on Error
1. Send test request
2. Request fails with error message
3. Click "Retry Request" button
4. Request resent with same payload
5. View new response

### Example 3: Quick Retry
1. Send test request
2. View response
3. Click "↻ Retry" button in status bar
4. Request resent immediately
5. New response displayed

### Example 4: History Replay
1. Expand History panel at bottom
2. Click on previous request
3. Payload and response loaded
4. Click "↻ Retry" to resend
5. New response displayed

## Color Scheme

- **Green**: Success (2xx status codes)
- **Amber**: Redirect (3xx status codes)
- **Orange**: Client error (4xx status codes)
- **Red**: Server error (5xx status codes)
- **Blue**: Request headers, keys
- **Green**: Request values
- **Gray**: Response headers, neutral text

## Accessibility Features

- All buttons have tooltips
- Keyboard navigation supported
- Color not sole indicator (icons and text used)
- Proper ARIA labels on interactive elements
- Semantic HTML structure
