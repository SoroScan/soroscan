import {
  Skeleton,
  SkeletonCard,
  SkeletonText,
} from "@/components/ui/skeleton";

export default function LiveStreamLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Live Stream"
      className="min-h-screen bg-terminal-black text-terminal-green font-terminal-mono flex flex-col p-4 sm:p-8"
    >
      <span className="sr-only">Loading Live Stream</span>

      {/* Header bar skeleton */}
      <div className="flex flex-col gap-4 mb-4 border-b border-terminal-green/30 pb-4 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton width={24} height={24} className="rounded-full shrink-0" animation="pulse" />
            <SkeletonText
              lines={2}
              width={320}
              lineHeight={16}
              gap={8}
              lineWidths={["60%", "90%"]}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Skeleton width={140} height={36} animation="pulse" />
            <Skeleton width={120} height={36} animation="pulse" />
            <Skeleton width={100} height={36} animation="pulse" />
          </div>
        </div>

        {/* Filter controls bar skeleton */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-terminal-green/10">
          <Skeleton width={60} height={20} animation="pulse" />
          <Skeleton width={192} height={28} animation="pulse" />
          <Skeleton width={140} height={28} animation="pulse" />
          <Skeleton width={130} height={28} animation="pulse" />
          <div className="ml-auto">
            <Skeleton width={150} height={16} animation="pulse" />
          </div>
        </div>
      </div>

      {/* Stream console skeleton */}
      <div className="flex-1 rounded border border-terminal-green/30 bg-terminal-dark/80 p-4 space-y-3">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonCard
            key={index}
            showMedia={false}
            lines={3}
            height={96}
            animation="pulse"
            animationSpeed="normal"
            className="border border-terminal-green/15 bg-terminal-black/60"
          />
        ))}
      </div>
    </div>
  );
}
