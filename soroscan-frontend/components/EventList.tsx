// components/EventList.tsx
import { useContractEvents } from "@/hooks/useContractEvents";

export function EventList({ contractId }: { contractId: string }) {
  const { events, loading, error, hasNextPage, loadMore } = useContractEvents(contractId);

  if (error) {
    return <div className="text-red-500">Error loading events: {error.message}</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Contract Events</h2>
      
      {events.length === 0 && !loading && (
        <p>No events found for this contract.</p>
      )}

      <ul className="divide-y divide-gray-200">
        {events.map((event) => (
          <li key={event.id} className="py-3">
            <span className="font-mono text-sm">{event.txHash}</span> - 
            <span className="ml-2 font-semibold">{event.type}</span>
          </li>
        ))}
      </ul>

      {loading && <p className="animate-pulse">Loading...</p>}

      {hasNextPage && !loading && (
        <button 
          onClick={loadMore}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Load More
        </button>
      )}
    </div>
  );
}


