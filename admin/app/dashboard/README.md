# Data Visualization Dashboard

Interactive charts and visualizations for SoroScan analytics.

## Features

- Line charts for time series data
- Bar charts for comparisons
- Pie charts for distributions
- Heatmaps for activity patterns
- Responsive grid layout
- Terminal aesthetic styling

## Components

### LineChart
Time series visualization with multiple data series. Supports hover tooltips and click interactions.

### BarChart
Comparison charts for side-by-side data analysis. Interactive bars with drill-down capability.

### PieChart
Distribution and breakdown visualization with percentage labels. Click slices for details.

### Heatmap
Activity heatmap showing intensity across two dimensions. Custom color gradients from dark to bright green.

### DashboardGrid
Responsive grid layout that adapts from 1 to 4 columns based on screen size.

## Usage

Navigate to `/dashboard` to view the example dashboard with all chart types.

## Customization

Charts use a terminal color palette:
- Primary: #00ff00 (green)
- Secondary: #00ffff (cyan)
- Tertiary: #ff00ff (magenta)
- Quaternary: #ffff00 (yellow)

Edit the `TERMINAL_COLORS` constant in each component to customize colors.

## Integration

Connect charts to your data source:

```tsx
import { LineChart } from '@/app/components';

const { data } = useQuery(GET_METRICS);

<LineChart
  data={data.metrics}
  lines={[{ dataKey: 'value', name: 'Metric' }]}
  title="My Chart"
/>
```

## Export

Each chart includes an export button for downloading as an image (requires html2canvas library).
