import { useState, useEffect, useCallback } from "react";
import { soroscan } from "@/lib/soroscan";
import type { ContractEvent } from "@soroscan/sdk";

export function useContractEvents(contractId: string, limit = 20) {
  const [data, setData] = useState<ContractEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Initialize the SDK paginator
  const [paginator] = useState(() => 
    soroscan.events().filterByContract(contractId).paginate(limit)
  );

  const fetchNextPage = useCallback(async () => {
    if (!paginator.hasNextPage()) return;
    setLoading(true);
    try {
      const page = await paginator.nextPage();
      setData((prev) => [...prev, ...page.items]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch events"));
    } finally {
      setLoading(false);
    }
  }, [paginator]);

  useEffect(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  return {
    events: data,
    loading,
    error,
    hasNextPage: paginator.hasNextPage(),
    loadMore: fetchNextPage
  };
}