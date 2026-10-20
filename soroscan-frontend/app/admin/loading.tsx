import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonText,
} from "@/components/ui/skeleton";
import { AdminDashboardLayout } from "@/components/layout/DashboardWorkspace";

export default function AdminLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading Admin Dashboard"
      className="min-h-screen bg-terminal-black font-terminal-mono"
    >
      <span className="sr-only">Loading Admin Dashboard</span>

      <AdminDashboardLayout
        header={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <SkeletonText
              lines={3}
              width={340}
              lineHeight={18}
              gap={10}
              lineWidths={["30%", "85%", "45%"]}
            />
            <div className="flex items-center gap-3">
              <Skeleton width={130} height={36} animation="pulse" />
            </div>
          </div>
        }
        metrics={
          <>
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonCard
                key={index}
                showMedia={false}
                lines={2}
                height={116}
                animation="pulse"
                animationSpeed="normal"
              />
            ))}
          </>
        }
        charts={
          <>
            <div className="lg:col-span-2 min-w-0">
              <SkeletonChart
                height={260}
                bars={12}
                animation="pulse"
                animationSpeed="normal"
              />
            </div>
            <div className="min-w-0">
              <SkeletonCard
                showMedia={false}
                lines={4}
                height={260}
                animation="pulse"
                animationSpeed="normal"
              />
            </div>
          </>
        }
        logs={
          <>
            <div className="lg:col-span-2 min-h-[400px] min-w-0 space-y-4">
              <SkeletonText lines={1} width={200} lineHeight={16} />
              <SkeletonTable
                rows={6}
                columns={4}
                rowHeight={24}
                animation="pulse"
                animationSpeed="normal"
              />
            </div>
            <div className="space-y-6 min-w-0">
              <SkeletonCard
                showMedia={false}
                lines={5}
                height={380}
                animation="pulse"
                animationSpeed="normal"
              />
            </div>
          </>
        }
      />
    </div>
  );
}
