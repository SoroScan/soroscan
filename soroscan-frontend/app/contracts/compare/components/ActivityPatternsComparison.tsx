"use client";

import * as React from "react";
import { Card } from "@/components/terminal/Card";
import type { Contract } from "@/components/ingest/contract-types";

interface ActivityData {
  hour: string;
  eventCount: number;
}

interface ActivityPatternsComparisonProps {
  contract1: Contract;
  contract2: Contract;
}

export function ActivityPatternsComparison({
  contract1,
  contract2,
}: ActivityPatternsComparisonProps) {
  const [activity1, setActivity1] = React.useState<ActivityData[]>([]);
  const [activity2, setActivity2] = React.useState<ActivityData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchActivity = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // TODO: Replace with actual GraphQL query
        // Placeholder: Generate mock hourly activity
        const mockActivity = (): ActivityData[] => {
          const now = new Date();
          return Array.from({ length: 24 }).map((_, i) => {
            const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
            return {
              hour: hour.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              eventCount: Math.floor(Math.random() * 500),
            };
          });
        };

        setActivity1(mockActivity().reverse());
        setActivity2(mockActivity().reverse());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivity();
  }, [contract1, contract2]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-8">Loading activity patterns...</div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="bg-red-900/30 border border-red-500 text-red-300 p-3">
          Error: {error}
        </div>
      </Card>
    );
  }

  const renderActivityChart = (activities: ActivityData[], title: string) => {
    const maxCount = Math.max(...activities.map((a) => a.eventCount), 1);
    const avgCount = Math.round(
      activities.reduce((sum, a) => sum + a.eventCount, 0) / activities.length
    );

    return (
      <div>
        <div className="mb-3">
          <h4 className="text-green-300 font-bold">{title}</h4>
          <div className="text-xs text-green-400/70 mt-1">
            Average: {avgCount.toLocaleString()} events/hour
          </div>
        </div>

        {/* Mini Bar Chart */}
        <div className="space-y-1">
          {activities.slice(0, 12).map((activity, idx) => {
            const barHeight = (activity.eventCount / maxCount) * 100;
            return (
              <div key={idx} className="flex items-center gap-2">
                <div className="text-xs text-green-400/60 w-8 text-right font-mono">
                  {activity.hour}
                </div>
                <div className="flex-1 bg-green-400/10 border border-green-400/20 h-6 relative">
                  <div
                    className="bg-green-400/40 h-full transition-all"
                    style={{ width: `${barHeight}%` }}
                  />
                  <div className="absolute inset-0 flex items-center px-1">
                    <div className="text-xs text-green-300 font-mono">
                      {activity.eventCount}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border-r border-green-400/20 pr-8">
          {renderActivityChart(activity1, `${contract1.name} - Last 12 Hours`)}
        </div>
        <div className="pl-8">
          {renderActivityChart(activity2, `${contract2.name} - Last 12 Hours`)}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-green-400/20">
        <h4 className="text-green-300 font-bold mb-3">Comparison Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-green-400/70">Peak Activity</div>
            <div className="text-green-300 font-bold">
              {Math.max(...activity1.map((a) => a.eventCount)).toLocaleString()}
            </div>
            <div className="text-xs text-green-400/60">
              vs {Math.max(...activity2.map((a) => a.eventCount)).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-green-400/70">Total (12h)</div>
            <div className="text-green-300 font-bold">
              {activity1
                .reduce((sum, a) => sum + a.eventCount, 0)
                .toLocaleString()}
            </div>
            <div className="text-xs text-green-400/60">
              vs{" "}
              {activity2
                .reduce((sum, a) => sum + a.eventCount, 0)
                .toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-green-400/70">Avg/Hour</div>
            <div className="text-green-300 font-bold">
              {Math.round(
                activity1.reduce((sum, a) => sum + a.eventCount, 0) /
                  activity1.length
              ).toLocaleString()}
            </div>
            <div className="text-xs text-green-400/60">
              vs{" "}
              {Math.round(
                activity2.reduce((sum, a) => sum + a.eventCount, 0) /
                  activity2.length
              ).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-green-400/70">Variance</div>
            <div className="text-green-300 font-bold">
              {(
                Math.max(
                  ...activity1.map((a) => a.eventCount),
                  0
                ) - Math.min(...activity1.map((a) => a.eventCount), 0)
              ).toLocaleString()}
            </div>
            <div className="text-xs text-green-400/60">
              vs{" "}
              {(
                Math.max(
                  ...activity2.map((a) => a.eventCount),
                  0
                ) - Math.min(...activity2.map((a) => a.eventCount), 0)
              ).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
