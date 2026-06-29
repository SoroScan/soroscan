'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Contract {
  id: number;
  contract_id: string;
  name: string;
  is_active: boolean;
}

interface HealthStatus {
  status: string;
  lastEventTime: string | null;
  minutesSinceLastEvent: number;
  errorMessage: string | null;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function HealthDashboard() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [healthData, setHealthData] = useState<Record<string, HealthStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/ingest/contracts/?page_size=100`);
        if (!res.ok) throw new Error('Failed to fetch contracts');
        const data = await res.json();
        setContracts(data.results || []);
        
        // Fetch health for each active contract
        const activeContracts = (data.results || []).filter((c: Contract) => c.is_active);
        
        const healthResults: Record<string, HealthStatus> = {};
        await Promise.all(
          activeContracts.map(async (c: Contract) => {
            try {
              const hRes = await fetch(`${BASE_URL}/api/ingest/contracts/${c.id}/health/`);
              if (hRes.ok) {
                const hData = await hRes.json();
                healthResults[c.id] = hData;
              }
            } catch (err) {
              console.error(`Failed to fetch health for ${c.id}`);
            }
          })
        );
        
        setHealthData(healthResults);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'degraded': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-mono text-zinc-300">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white uppercase tracking-wider mb-2">
            Contract Health Dashboard
          </h1>
          <p className="text-sm text-zinc-500">
            Monitor the real-time indexing status of active contracts
          </p>
        </div>
        <Link 
          href="/"
          className="text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-4 py-2 rounded transition-colors"
        >
          Back to Home
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950 border border-red-900 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-zinc-500">Loading health data...</div>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-semibold">Contract</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Last Event Time</th>
                <th className="px-6 py-4 font-semibold">Idle Time</th>
                <th className="px-6 py-4 font-semibold">Error Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {contracts.filter(c => c.is_active).map((contract) => {
                const health = healthData[contract.id];
                const status = health?.status || 'unknown';
                
                return (
                  <tr key={contract.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-zinc-200">{contract.name || 'Unnamed Contract'}</div>
                      <div className="text-xs text-zinc-500 mt-1" title={contract.contract_id}>
                        {contract.contract_id.substring(0, 12)}...{contract.contract_id.substring(48)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded text-xs border ${getStatusColor(status)} uppercase font-semibold tracking-wide`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">
                      {health?.lastEventTime ? new Date(health.lastEventTime).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {health?.minutesSinceLastEvent !== undefined ? (
                        <span className={health.minutesSinceLastEvent > 30 ? 'text-yellow-400' : 'text-zinc-400'}>
                          {health.minutesSinceLastEvent} min
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-xs text-red-400/80">
                      {health?.errorMessage || '-'}
                    </td>
                  </tr>
                );
              })}
              {contracts.filter(c => c.is_active).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No active contracts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
