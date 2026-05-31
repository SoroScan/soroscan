# Issue #612: Webhook Tester Dashboard - Implementation Checklist

**Status**: In Progress  
**Estimated Completion**: 2-3 days  
**Owner**: [Assign team member]

---

## MVP Deliverables

### 1. Delivery Log List View
- [ ] Create `admin/app/webhook-tester/components/DeliveryLogList.tsx`
- [ ] Display: timestamp, status (✓/✗/⏳), response time, response code
- [ ] Status icons: green checkmark (success), red X (failed), loading spinner
- [ ] Table format (responsive: collapse to cards on mobile)
- [ ] Sorting: by timestamp (newest first)
- [ ] Pagination: 25 items per page
- [ ] Click row → expand to show full response body

**GraphQL Query Needed**:
```graphql
query getWebhookDeliveries($webhookId: ID!, $limit: Int, $offset: Int) {
  webhookDeliveries(webhookId: $webhookId, limit: $limit, offset: $offset) {
    id
    timestamp
    status       # 'success' | 'failed' | 'pending'
    responseTime # ms
    responseCode # 200, 500, timeout, etc
    responseBody
    requestBody
  }
}
```

### 2. Webhook Detail View
- [ ] Create `admin/app/webhook-tester/components/WebhookDetailView.tsx`
- [ ] Show: endpoint URL (copyable), headers (expandable), payload template
- [ ] Edit mode toggle (show/hide "Edit" button)
- [ ] Copy buttons for: URL, headers JSON, payload template
- [ ] Display last tested timestamp
- [ ] Display success rate (X/Y deliveries succeeded)

**GraphQL Query Needed**:
```graphql
query getWebhookDetail($id: ID!) {
  webhook(id: $id) {
    id
    name
    endpoint
    headers  # as JSON string
    payloadTemplate
    isActive
    lastTestedAt
    deliveryStats { successCount, totalCount }
  }
}
```

### 3. Test Webhook Form
- [ ] Create `admin/app/webhook-tester/components/TestWebhookForm.tsx`
- [ ] Separate from PayloadEditor (clear UX boundary)
- [ ] Field: "Override Payload" (optional JSON textarea)
- [ ] Button: "Send Test Webhook"
- [ ] Show loading spinner during request
- [ ] Display success/error toast on completion
- [ ] Show request preview before sending (collapsible)

### 4. Real-Time Log Updates
- [ ] Subscribe to webhook delivery updates (if GraphQL subscriptions available)
- [ ] Auto-append new deliveries to log
- [ ] OR: Add "Refresh" button if polling is used

### 5. Mobile Responsive Layout
- [ ] On mobile: stack webhook selector, editor, viewer vertically
- [ ] Use Tailwind breakpoints: `flex-col md:flex-row`
- [ ] Table → cards: show status, timestamp, response time on card
- [ ] Touch-friendly: larger tap targets (44px minimum)

### 6. Error States
- [ ] Network error → red banner with "Network failed. Retry?"
- [ ] Failed delivery → show error message in response viewer
- [ ] Timeout (> 30s) → show spinning timer, allow cancel
- [ ] Invalid JSON in payload → inline error message

### 7. Accessibility
- [ ] Add `aria-label` to status icons (e.g., aria-label="Success")
- [ ] Add `aria-live="polite"` to toast notifications
- [ ] Ensure tab order is logical (sidebar → editor → viewer)
- [ ] Test with keyboard only (no mouse)

### 8. Dark Mode
- [ ] Verify all colors work on dark background (`bg-zinc-950`)
- [ ] Status colors: green-500 (success), red-500 (failed), blue-500 (pending)
- [ ] Text: `text-zinc-100` (primary), `text-zinc-400` (muted)
- [ ] Borders: `border-zinc-800` or `border-zinc-700`

---

## Files to Create/Modify

```
admin/app/webhook-tester/
├── page.tsx (update layout if needed)
├── context.tsx (add deliveries to context state)
├── components/
│   ├── DeliveryLogList.tsx 📝 NEW
│   ├── WebhookDetailView.tsx 📝 NEW
│   ├── TestWebhookForm.tsx 📝 NEW
│   └── [existing components] ✅
```

---

## Acceptance Tests

### Functional
- [ ] Load webhook selector → displays list of webhooks
- [ ] Select webhook → detail view shows endpoint and headers
- [ ] Edit payload → send test → delivery appears in log within 2s
- [ ] Click delivery row → response body expands
- [ ] Copy URL button → URL in clipboard
- [ ] On mobile: all content visible without horizontal scroll

### Visual
- [ ] Dark mode: no white text on light background
- [ ] Status icons clearly visible (not too small)
- [ ] Timestamps readable (consistent format, e.g., "May 30, 2024 2:45 PM")
- [ ] Chart/timeline clear (if any added)

### Accessibility
- [ ] Tab through all interactive elements
- [ ] Screen reader reads status icons (e.g., "Success")
- [ ] Keyboard: Enter to send, Escape to close modals

---

## Questions for Backend Team

- [ ] Do webhook delivery logs exist in database?
- [ ] Can we query `webhookDeliveries` with pagination?
- [ ] Are there GraphQL subscriptions for real-time delivery updates?
- [ ] What's the maximum response body size stored?
- [ ] Rate limiting on test webhook endpoint?

---

## References

- Existing components: `admin/app/webhook-tester/components/`
- UI library: Shadcn/Tailwind (verify patterns in `admin/components/`)
- Chart example: `admin/app/components/LineChart.tsx`, `BarChart.tsx`
