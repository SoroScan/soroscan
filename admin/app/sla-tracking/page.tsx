'use client';

import React, { useEffect, useState } from 'react';
import { LineChart } from '../components/LineChart';

interface SLAMetric {
  contract: number;
  latest_sla: number | null;
  latest_hour: string | null;
  avg_sla: number | null;
  violations: number;
}

interface Contract {
  id: number;
  contract_id: string;
  name: string;
  alias: string;
}

function getSLAColor(sla: number | null | undefined): string {
  if (sla === null || sla === undefined) return 'text-zinc-400';
  if (sla >= 98) return 'text-green-400';
  if (sla >= 95) return 'text-yellow-400';
  return 'text-red-400';
}

function getSLAStatus(sla: number | null | undefined): string {
  if (sla === null || sla === undefined) return 'No Data';
  if (sla >= 98) return 'Good';
  if (sla >= 95) return 'Warning';
  return 'Critical';
}

export default function SLAMetricsPage() {
  const [metrics, setMetrics] = useState<SLAMetric[]>([]);
  const [contracts, setContracts] = useState<Record<number, Contract>>({});
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const slaResponse = await fetch('/api/ingest/admin/sla-metrics/');
        const slaData = await slaResponse.json();
        setMetrics(slaData);

        // Build trend data from metrics
        const trend = slaData.map((m: SLAMetric) => ({
          name: contracts[m.contract]?.alias || contracts[m.contract]?.name || `Contract ${m.contract}`,
          sla: m.latest_sla || 0,
        }));
        setTrendData(trend);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchContracts = async () => {
    const response = await fetch('/api/contracts/');
    const data = await response.json();
    const contractsMap: Record<number, Contract> = {};
    data.results?.forEach((c: Contract) => {
      contractsMap[c.id] = c;
    });
    setContracts(contractsMap);
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6">
        <div className="text-zinc-400 font-mono">Loading SLA metrics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-mono text-zinc-100 uppercase tracking-wider mb-2">
          SLA Tracking
        </h1>
        <p className="text-sm font-mono text-zinc-500">
          Event completeness SLA metrics for tracked contracts
        </p>
      </div>

      <div className="mb-6">
        <LineChart
          data={trendData}
          lines={[
            { dataKey: 'sla', name: 'SLA %', stroke: '#00ff00' },
          ]}
          title="SLA Trend"
          description="Current SLA percentage by contract"
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <table className="w-full font-mono text-xs">
          <thead>
            <tbody className="divide-y divide-zinc-800">
              {metrics.map((metric) => (
                <tr key={metric.contract}>
                  <td className="py-2 px-3 text-zinc-300">
                    {contracts[metric.contract]?.alias || contracts[metric.contract]?.name || `Contract ${metric.contract}`}
                  </td>
                  <td className="py-2 px-3">
                    <span className={getSLAColor(metric.latest_sla)}>
                      {metric.latest_sla?.toFixed(1) ?? 'N/A'}%
                    </span>
                  </td>
                  <td className="py-2 px-3 text-zinc-500">
                    {getSLAStatus(metric.latest_sla)}
                  </td>
                  <td className="py-2 px-3 text-zinc-500">
                    {metric.avg_sla?.toFixed(1) ?? 'N/A'}%
                  </td>
                  <td className="py-2 px-3">
                    <span className={metric.violations > 0 ? 'text-red-400' : 'text-green-400'}>
                      {metric.violations}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </thead>
        </table>
      </div>
    </div>
  );
}