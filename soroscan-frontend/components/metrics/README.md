# Event Rate Meter Component

Real-time event ingestion rate visualization for SoroScan smart contracts.

## Features

- ✅ Real-time gauge display of events per second
- ✅ WebSocket integration for live updates
- ✅ Customizable threshold indicators (warning/critical)
- ✅ Peak rate tracking
- ✅ Connection status monitoring
- ✅ Smooth animations and transitions
- ✅ Fully tested with Jest + React Testing Library

## Components

### `EventRateMeter`

Core gauge component that displays the current event rate.

**Props:**
```typescript
interface EventRateMeterProps {
  contractId: string;           // Contract ID (for display)
  currentRate: number;          // Current events/second
  threshold?: {
    warning?: number;           // Warning threshold (default: 100)
    critical?: number;          // Critical threshold (default: 500)
  };
  isConnected?: boolean;        // WebSocket connection status
  onRateChange?: (rate: number) => void;  // Callback on rate change
}
```

**Example:**
```tsx
import { EventRateMeter } from "@/components/metrics";

export default function Dashboard() {
  return (
    <EventRateMeter
      contractId="CAQAA5L65..."
      currentRate={42.5}
      threshold={{ warning: 100, critical: 500 }}
      isConnected={true}
    />
  );
}
```

### `EventRateMeterContainer`

Wrapper component that manages WebSocket connection and real-time updates.

**Props:**
```typescript
interface EventRateMeterContainerProps {
  contractId: string;
  contractName?: string;        // Display name (defaults to contractId)
  warningThreshold?: number;
  criticalThreshold?: number;
  className?: string;
}
```

**Example:**
```tsx
import { EventRateMeterContainer } from "@/components/metrics";

export default function ContractMetrics() {
  return (
    <EventRateMeterContainer
      contractId="CAQAA5L65..."
      contractName="Payment Contract"
      warningThreshold={100}
      criticalThreshold={500}
      className="w-full max-w-md"
    />
  );
}
```

## Hooks

### `useEventRate(contractId)`

Hook for managing WebSocket connection and receiving real-time event rates.

**Returns:**
```typescript
{
  rate: number;           // Current events/second
  isConnected: boolean;   // WebSocket connection status
  error: string | null;   // Connection error message
}
```

**Example:**
```tsx
import { useEventRate } from "@/components/metrics";

export default function CustomMeter() {
  const { rate, isConnected, error } = useEventRate("CAQAA5L65...");

  return (
    <div>
      <p>Rate: {rate.toFixed(1)} events/second</p>
      <p>Connected: {isConnected ? "Yes" : "No"}</p>
      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### `useCalculatedEventRate(events, windowSeconds)`

Hook for calculating event rate from a stream of event timestamps.

**Parameters:**
- `events`: Array of timestamps (ms since epoch)
- `windowSeconds`: Time window for calculation (default: 5)

**Returns:**
- Event rate as events per second

**Example:**
```tsx
import { useCalculatedEventRate } from "@/components/metrics";

export default function RateDisplay() {
  const [eventTimestamps, setEventTimestamps] = React.useState<number[]>([]);
  const rate = useCalculatedEventRate(eventTimestamps, 5);

  return <div>Rate: {rate.toFixed(2)} events/second</div>;
}
```

## Status Indicators

The gauge uses color coding to indicate system health:

- **🟢 Healthy (Green)**: Rate < warning threshold
- **🟡 Warning (Yellow)**: Rate between warning and critical thresholds
- **🔴 Critical (Red)**: Rate exceeds critical threshold
- **⚪ Disconnected (Gray)**: WebSocket not connected

## WebSocket Integration

The component expects a WebSocket endpoint at `/ws/events/<contract_id>/` that sends:

**Event Message:**
```json
{
  "type": "event",
  "data": { /* event payload */ }
}
```

**Rate Update Message:**
```json
{
  "type": "rate_update",
  "rate": 42.5
}
```

## Gauge Customization

The gauge dynamically scales based on the current rate:

```typescript
// Default thresholds
const defaultThresholds = {
  warning: 100,
  critical: 500
};

// Gauge zones:
// 0 ________|________ warning (yellow) |________ critical (red) |________ max
```

## Testing

All components and hooks are fully tested:

```bash
# Run tests
npm test EventRateMeter
npm test useEventRate

# Run with coverage
npm test -- --coverage --testPathPattern="EventRateMeter|useEventRate"
```

**Test Coverage:**
- ✅ Rendering in different states
- ✅ Real-time rate updates
- ✅ Threshold transitions
- ✅ WebSocket connection/disconnection
- ✅ Error handling
- ✅ Peak rate tracking
- ✅ Custom thresholds

## Integration Examples

### In Dashboard
```tsx
import { EventRateMeterContainer } from "@/components/metrics";

export default function DashboardPage() {
  const contracts = useContracts();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {contracts.map((contract) => (
        <EventRateMeterContainer
          key={contract.id}
          contractId={contract.id}
          contractName={contract.name}
        />
      ))}
    </div>
  );
}
```

### In Contract Details
```tsx
import { EventRateMeter } from "@/components/metrics";

export default function ContractDetails({ contract }) {
  const { rate, isConnected } = useEventRate(contract.id);

  return (
    <div>
      <h1>{contract.name}</h1>
      <EventRateMeter
        contractId={contract.id}
        currentRate={rate}
        isConnected={isConnected}
      />
      {/* Other contract details */}
    </div>
  );
}
```

## Performance Notes

- Component re-renders only when rate changes significantly
- WebSocket connection is shared via context (when using Container)
- Gauge animation is CSS-based for smooth 60fps rendering
- Peak rate tracking has minimal memory overhead

## Browser Compatibility

- Chrome 75+
- Firefox 68+
- Safari 12+
- Edge 79+

WebSocket support required (available in all modern browsers).
