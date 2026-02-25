import { TimelineView } from "@/components/ingest/TimelineView";

export default function ContractTimelinePage({
  params,
}: {
  params: { contractId: string };
}) {
  const { contractId } = params;
  return <TimelineView contractId={contractId} />;
}
