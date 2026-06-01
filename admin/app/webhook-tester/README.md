# Webhook Tester - Enhanced Testing Interface

A comprehensive webhook testing tool for SoroScan with request/response inspection, retry functionality, and timing analysis.

## Features

### Core Features
- 🎯 **Webhook Selection**: Browse and select from available webhooks
- ✏️ **Payload Editing**: Edit JSON payloads with syntax highlighting
- 📤 **Test Sending**: Send test requests to webhook endpoints
- 📊 **Response Inspection**: View response body, headers, and request details
- 🔄 **Retry Functionality**: Retry requests with the same payload
- 📜 **History Tracking**: View and replay past requests

### Advanced Features
- ⏱️ **Timing Breakdown**: See request timing information
- 🔍 **Request Inspection**: View all request headers sent
- 🎨 **Syntax Highlighting**: Color-coded JSON editing
- ⚠️ **Error Handling**: Clear error messages with retry options
- 💾 **History Management**: Keep last 50 requests

## Usage

### Basic Workflow

1. **Select Webhook**
   - Click on a webhook in the left sidebar
   - Payload auto-fills with webhook's contract_id and event_type

2. **Edit Payload**
   - Modify JSON in the editor
   - Use "Format" button to auto-format
   - Use "Reset" button to restore default

3. **Send Test**
   - Click "Send Test" button
   - Wait for response
   - View results in bottom panel

4. **Inspect Response**
   - Click "Response Body" tab to see response
   - Click "Response Headers" tab to see headers
   - Click "Request" tab to see request details

5. **Retry Request**
   - Click "↻ Retry" button to resend
   - Or click "Retry Request" on error
   - Same payload and webhook used

### Advanced Usage

#### View Request Details
1. Send a test request
2. Click "Request" tab in response viewer
3. See request headers and timing

#### Replay from History
1. Expand "History" panel at bottom
2. Click on a previous request
3. Payload and response loaded
4. Click "↻ Retry" to resend

#### Handle Errors
1. If request fails, error message shown
2. Click "Retry Request" button
3. Request resent automatically
4. View new response

## Architecture

### Components

```
WebhookTesterPage
├── WebhookSelector
│   └── Lists available webhooks
├── PayloadEditor
│   ├── JSON editor with syntax highlighting
│   ├── Format/Reset buttons
│   └── Send/Retry buttons
├── ResponseViewer
│   ├── Response Body tab
│   ├── Response Headers tab
│   ├── Request tab (new)
│   └── Retry button
└── HistoryPanel
    └── List of past requests
```

### State Management

**Context**: `WebhookTesterContext`
- Webhooks list
- Selected webhook
- Payload and validation
- Response and errors
- Request headers
- History entries
- Retry functionality

**Key Functions**:
- `sendTest()` - Send test request
- `retryLastRequest()` - Retry last request
- `selectHistoryEntry()` - Load history entry

## API Integration

### Endpoints Used

**GET** `/api/ingest/webhooks/?page_size=100`
- Fetch available webhooks

**POST** `/api/ingest/webhooks/{id}/test/`
- Send test request to webhook
- Body: JSON payload
- Response: HTTP status, headers, body

## Customization

### Styling

All components use Tailwind CSS with a dark theme (zinc-950 background).

**Color Scheme**:
- Success (2xx): `text-green-400`
- Redirect (3xx): `text-amber-400`
- Client Error (4xx): `text-orange-400`
- Server Error (5xx): `text-red-400`

### Configuration

**Base URL**: `http://localhost:8000` (in `context.tsx`)

To change:
```typescript
const BASE_URL = 'http://your-api-url';
```

**History Limit**: 50 entries (in `context.tsx`)

To change:
```typescript
setHistory(prev => [entry, ...prev].slice(0, 100)); // Change 50 to 100
```

## Development

### File Structure

```
webhook-tester/
├── page.tsx                    # Main page component
├── context.tsx                 # State management
├── types.ts                    # TypeScript interfaces
├── components/
│   ├── WebhookSelector.tsx    # Webhook list
│   ├── PayloadEditor.tsx      # JSON editor
│   ├── ResponseViewer.tsx     # Response display
│   └── HistoryPanel.tsx       # History list
├── README.md                   # This file
├── CHANGES.md                  # Change log
├── FEATURE_SUMMARY.md         # Feature overview
├── UI_GUIDE.md                # Visual guide
└── IMPLEMENTATION.md          # Technical details
```

### Adding Features

1. **New Tab in Response Viewer**
   ```typescript
   type Tab = 'body' | 'headers' | 'request' | 'new-tab';
   
   // Add button
   {t === 'new-tab' && 'New Tab'}
   
   // Add content
   {tab === 'new-tab' && (
     <div>New tab content</div>
   )}
   ```

2. **New Button in Payload Editor**
   ```typescript
   <button onClick={handleNewAction}>
     New Button
   </button>
   ```

3. **New State in Context**
   ```typescript
   const [newState, setNewState] = useState(initialValue);
   
   // Add to context interface
   newState: Type;
   setNewState: (value: Type) => void;
   
   // Add to provider value
   <WebhookTesterContext.Provider value={{
     // ... existing ...
     newState, setNewState,
   }}>
   ```

## Troubleshooting

### Webhooks Not Loading
- Check API endpoint is accessible
- Verify `BASE_URL` is correct
- Check browser console for errors

### Requests Failing
- Verify webhook URL is correct
- Check webhook is active
- Verify payload is valid JSON
- Check network connectivity

### Retry Not Working
- Ensure previous request completed
- Check webhook is still selected
- Verify payload hasn't changed

## Performance

- **Initial Load**: ~500ms (fetch webhooks)
- **Send Request**: Depends on webhook endpoint
- **History**: Limited to 50 entries for performance
- **Memory**: ~2-5MB typical usage

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive design)

## Related Documentation

- [Feature Summary](./FEATURE_SUMMARY.md) - Overview of all features
- [UI Guide](./UI_GUIDE.md) - Visual guide and workflows
- [Implementation Details](./IMPLEMENTATION.md) - Technical implementation
- [Change Log](./CHANGES.md) - Complete change history

## Support

For issues or feature requests, please refer to issue #544 in the SoroScan repository.
