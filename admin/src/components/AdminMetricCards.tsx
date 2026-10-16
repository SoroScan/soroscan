import React from 'react';

interface AdminMetricCardsProps {
  activeWebhooks: number;
  failedWebhooks24h: number;
  averageDeliveryLatencyMs: number;
}

interface MetricCard {
  label: string;
  value: string;
  hint?: string;
}

function formatLatency(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  return `${(ms / 1000).toFixed(2)} s`;
}

const AdminMetricCards: React.FC<AdminMetricCardsProps> = ({
  activeWebhooks,
  failedWebhooks24h,
  averageDeliveryLatencyMs,
}) => {
  const cards: MetricCard[] = [
    {
      label: 'Active Webhooks',
      value: activeWebhooks.toLocaleString(),
      hint: 'Currently enabled endpoints',
    },
    {
      label: 'Failed Webhooks (24h)',
      value: failedWebhooks24h.toLocaleString(),
      hint: 'Deliveries that errored in the last 24 hours',
    },
    {
      label: 'Average Delivery Latency',
      value: formatLatency(averageDeliveryLatencyMs),
      hint: 'Mean response time across deliveries',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
        >
          <p className="text-sm font-medium text-gray-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
          {card.hint ? (
            <p className="mt-1 text-xs text-gray-400">{card.hint}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

export default AdminMetricCards;
