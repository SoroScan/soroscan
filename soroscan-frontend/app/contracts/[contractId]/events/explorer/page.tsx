import { EventExplorerView } from "@/components/ingest/EventExplorerView";

export default function ContractExplorerPage({
  params,
}: {
  params: { contractId: string };
}) {
  const { contractId } = params;
  return <EventExplorerView contractId={contractId} />;
}
