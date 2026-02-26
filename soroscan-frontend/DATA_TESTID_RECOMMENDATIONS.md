# Data-TestID Recommendations

To improve E2E test stability and maintainability, add `data-testid` attributes to key interactive elements.

## Why data-testid?

- **Stable selectors**: Won't break when CSS classes or text changes
- **Clear intent**: Shows which elements are important for testing
- **Better performance**: Faster selector queries
- **Maintainability**: Easy to update tests when UI changes

## Naming Convention

Use kebab-case with descriptive names:
- `data-testid="action-description"`
- `data-testid="section-element-name"`

Examples:
- `data-testid="register-contract-button"`
- `data-testid="event-type-filter"`
- `data-testid="contract-table"`

## Recommended Additions

### Event Explorer (`components/ingest/EventExplorerView.tsx`)

```tsx
// Filters section
<select
  id="event-type-select"
  data-testid="event-type-filter"
  className={styles.fieldInput}
  value={pendingType}
  onChange={(event) => setPendingType(event.target.value)}
>

<input
  id="date-since"
  data-testid="date-from-filter"
  className={styles.fieldInput}
  type="datetime-local"
  value={pendingSince}
  onChange={(event) => setPendingSince(event.target.value)}
/>

<input
  id="date-until"
  data-testid="date-to-filter"
  className={styles.fieldInput}
  type="datetime-local"
  value={pendingUntil}
  onChange={(event) => setPendingUntil(event.target.value)}
/>

// Action buttons
<button
  type="button"
  data-testid="apply-filters-button"
  className={styles.btn}
  onClick={applyFilters}
>
  Apply Filters
</button>

<button
  type="button"
  data-testid="clear-filters-button"
  className={`${styles.btn} ${styles.secondaryBtn}`}
  onClick={clearFilters}
>
  Clear Filters
</button>

<button
  type="button"
  data-testid="export-events-button"
  className={styles.btn}
  onClick={() => setIsExportOpen(true)}
>
  Export Events
</button>

// Table
<table data-testid="events-table" className={styles.eventTable}>

// Pagination
<button
  type="button"
  data-testid="previous-page-button"
  className={`${styles.btn} ${styles.secondaryBtn}`}
  disabled={page <= 1}
  onClick={() => setPage((current) => Math.max(1, current - 1))}
>
  Previous
</button>

<span data-testid="current-page" className={styles.pill}>
  Page {page}
</span>

<button
  type="button"
  data-testid="next-page-button"
  className={`${styles.btn} ${styles.secondaryBtn}`}
  disabled={!hasNext}
  onClick={() => setPage((current) => current + 1)}
>
  Next
</button>

// Status message
<div
  data-testid="status-message"
  className={`${styles.status} ${status.isError ? styles.error : ""}`}
  aria-live="polite"
>
  {status.message}
</div>
```

### Contracts Page (`app/contracts/page.tsx`)

```tsx
// Main heading
<h1
  data-testid="contracts-page-title"
  className="text-3xl font-terminal-mono text-terminal-green mb-2"
>
  [CONTRACT_REGISTRY]
</h1>

// Register button
<Button
  data-testid="register-contract-button"
  variant="primary"
  onClick={() => setIsRegisterModalOpen(true)}
>
  Register Contract
</Button>

// Error message
{error && (
  <Card>
    <div
      data-testid="error-message"
      className="p-4 border border-terminal-danger bg-terminal-danger/10 text-terminal-danger"
    >
      {error}
    </div>
  </Card>
)}

// Loading state
<div
  data-testid="loading-indicator"
  className="text-center py-12 text-terminal-gray font-terminal-mono"
>
  LOADING...
</div>

// Contracts table
<ContractTable
  data-testid="contracts-table"
  contracts={contracts}
  onDelete={handleDeleteClick}
/>
```

### Contract Table (`app/contracts/components/ContractTable.tsx`)

```tsx
<table data-testid="contracts-table">
  <tbody>
    {contracts.map((contract) => (
      <tr key={contract.id} data-testid={`contract-row-${contract.id}`}>
        <td data-testid={`contract-name-${contract.id}`}>
          {contract.name}
        </td>
        <td>
          <button
            data-testid={`delete-contract-${contract.id}`}
            onClick={() => onDelete(contract.id)}
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Register Modal (`app/contracts/components/RegisterModal.tsx`)

```tsx
<form data-testid="register-contract-form" onSubmit={handleSubmit}>
  <input
    data-testid="contract-id-input"
    name="contractId"
    placeholder="Contract ID"
  />
  
  <input
    data-testid="contract-name-input"
    name="name"
    placeholder="Contract Name"
  />
  
  <textarea
    data-testid="contract-description-input"
    name="description"
    placeholder="Description"
  />
  
  <button
    data-testid="submit-contract-button"
    type="submit"
  >
    Register
  </button>
  
  <button
    data-testid="cancel-button"
    type="button"
    onClick={onClose}
  >
    Cancel
  </button>
</form>
```

### Delete Confirmation Modal (`app/contracts/components/DeleteConfirmModal.tsx`)

```tsx
<div data-testid="delete-confirmation-modal" role="dialog">
  <h2 data-testid="delete-modal-title">
    Delete {contractName}?
  </h2>
  
  <button
    data-testid="confirm-delete-button"
    onClick={onConfirm}
    disabled={isDeleting}
  >
    {isDeleting ? 'Deleting...' : 'Delete'}
  </button>
  
  <button
    data-testid="cancel-delete-button"
    onClick={onCancel}
  >
    Cancel
  </button>
</div>
```

### Export Events Modal (`components/ingest/ExportEventsModal.tsx`)

```tsx
<div data-testid="export-modal" role="dialog">
  <select data-testid="export-format-select">
    <option value="csv">CSV</option>
    <option value="json">JSON</option>
  </select>
  
  <button
    data-testid="confirm-export-button"
    onClick={handleExport}
  >
    Export
  </button>
  
  <button
    data-testid="cancel-export-button"
    onClick={onClose}
  >
    Cancel
  </button>
</div>
```

### Dashboard (`app/dashboard/components/EventExplorerDashboard.tsx`)

```tsx
<div data-testid="dashboard-container">
  <h1 data-testid="dashboard-title">Dashboard</h1>
  
  <div data-testid="metrics-section">
    <div data-testid="total-events-metric">
      Total Events: {totalEvents}
    </div>
    
    <div data-testid="total-contracts-metric">
      Total Contracts: {totalContracts}
    </div>
  </div>
  
  <button
    data-testid="refresh-dashboard-button"
    onClick={handleRefresh}
  >
    Refresh
  </button>
  
  <div data-testid="recent-events-section">
    {/* Recent events list */}
  </div>
</div>
```

### Webhook Components (if they exist)

```tsx
// Webhook list
<div data-testid="webhooks-list">
  {webhooks.map((webhook) => (
    <div key={webhook.id} data-testid={`webhook-${webhook.id}`}>
      <span data-testid={`webhook-name-${webhook.id}`}>
        {webhook.name}
      </span>
      
      <button
        data-testid={`test-webhook-${webhook.id}`}
        onClick={() => testWebhook(webhook.id)}
      >
        Test
      </button>
      
      <button
        data-testid={`delete-webhook-${webhook.id}`}
        onClick={() => deleteWebhook(webhook.id)}
      >
        Delete
      </button>
    </div>
  ))}
</div>

// Create webhook button
<button
  data-testid="create-webhook-button"
  onClick={openCreateModal}
>
  Create Webhook
</button>

// Webhook form
<form data-testid="webhook-form">
  <input
    data-testid="webhook-name-input"
    name="name"
    placeholder="Webhook Name"
  />
  
  <input
    data-testid="webhook-url-input"
    name="url"
    placeholder="Webhook URL"
  />
  
  <button
    data-testid="submit-webhook-button"
    type="submit"
  >
    Create
  </button>
</form>
```

## Implementation Priority

### High Priority (Critical User Flows)
1. Event Explorer filters and actions
2. Contract registration form
3. Contract deletion confirmation
4. Export modal

### Medium Priority (Important Features)
1. Dashboard metrics
2. Webhook management
3. Table rows and cells
4. Navigation links

### Low Priority (Nice to Have)
1. Loading indicators
2. Error messages
3. Status badges
4. Tooltips

## Usage in Tests

After adding data-testid attributes, update tests to use them:

### Before
```typescript
await page.click('button:has-text("Apply Filters")');
```

### After
```typescript
await page.click('[data-testid="apply-filters-button"]');
```

### Benefits
- Faster selector queries
- More stable tests
- Clearer test intent
- Easier maintenance

## Best Practices

1. **Be specific**: Use descriptive names that indicate purpose
2. **Be consistent**: Follow the same naming pattern throughout
3. **Be unique**: Each testid should be unique on the page
4. **Be semantic**: Name based on function, not appearance
5. **Be stable**: Don't change testids unless necessary

## Testing the Changes

After adding data-testid attributes:

```bash
# Run tests to verify they still work
pnpm run test:e2e

# Update tests to use new testids
# Then run again to verify improvements
pnpm run test:e2e
```

## Migration Strategy

1. **Add testids incrementally** - start with critical flows
2. **Update tests gradually** - don't break existing tests
3. **Document changes** - note which components have testids
4. **Review in PRs** - ensure new components include testids
5. **Maintain consistency** - follow naming conventions

## Example PR Checklist

When adding a new feature:
- [ ] Add data-testid to interactive elements
- [ ] Add data-testid to form inputs
- [ ] Add data-testid to buttons
- [ ] Add data-testid to modals/dialogs
- [ ] Write E2E tests using testids
- [ ] Update documentation if needed

## Resources

- [Testing Library - data-testid](https://testing-library.com/docs/queries/bytestid/)
- [Playwright - Best Practices](https://playwright.dev/docs/best-practices)
- [Kent C. Dodds - Making your UI tests resilient](https://kentcdodds.com/blog/making-your-ui-tests-resilient-to-change)
