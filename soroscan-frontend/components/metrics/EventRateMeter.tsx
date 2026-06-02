"use client";

import * as React from "react";

interface EventRateMeterProps {
  contractId: string;
  currentRate: number; // events per second
  threshold?: {
    warning?: number; // events/sec - yellow zone
    critical?: number; // events/sec - red zone
  };
  isConnected?: boolean;
  onRateChange?: (rate: number) => void;
}

interface GaugeConfig {
  min: number;
  max: number;
  threshold: number;
  critical: number;
}

export function EventRateMeter({
  contractId,
  currentRate,
  threshold = {
    warning: 100,
    critical: 500,
  },
  isConnected = true,
  onRateChange,
}: EventRateMeterProps) {
  const [displayRate, setDisplayRate] = React.useState(currentRate);
  const [peakRate, setPeakRate] = React.useState(currentRate);
  const gaugeRef = React.useRef<SVGSVGElement>(null);

  // Determine gauge configuration based on current rate
  const gaugeConfig: GaugeConfig = {
    min: 0,
    max: Math.max(1000, currentRate * 1.5),
    threshold: threshold.warning || 100,
    critical: threshold.critical || 500,
  };

  // Update display rate with smooth animation
  React.useEffect(() => {
    const newDisplayRate = Math.max(displayRate * 0.95, currentRate);
    setDisplayRate(newDisplayRate);

    if (currentRate > peakRate) {
      setPeakRate(currentRate);
    }
  }, [currentRate]);

  // Get color based on rate
  const getColor = (rate: number) => {
    if (rate >= gaugeConfig.critical) {
      return "#ef4444"; // red
    }
    if (rate >= gaugeConfig.threshold) {
      return "#eab308"; // yellow
    }
    return "#22c55e"; // green
  };

  // Calculate angle for gauge needle (180 degrees total arc)
  const calculateAngle = (value: number) => {
    const percent = Math.min(value / gaugeConfig.max, 1);
    return percent * 180 - 90; // -90 to 90 degrees
  };

  const angle = calculateAngle(displayRate);
  const color = getColor(displayRate);

  // Status label
  const getStatus = () => {
    if (!isConnected) return "disconnected";
    if (displayRate >= gaugeConfig.critical) return "critical";
    if (displayRate >= gaugeConfig.threshold) return "warning";
    return "healthy";
  };

  const statusColor: Record<string, string> = {
    healthy: "text-green-400",
    warning: "text-yellow-600",
    critical: "text-red-500",
    disconnected: "text-gray-500",
  };

  return (
    <div className="bg-black border border-green-400/30 rounded p-6 text-center">
      {/* Title */}
      <div className="mb-4">
        <h3 className="text-green-300 font-bold text-lg">Event Rate Meter</h3>
        <p className="text-green-400/70 text-xs mt-1 font-mono">{contractId}</p>
      </div>

      {/* Gauge SVG */}
      <div className="flex justify-center mb-6">
        <svg
          ref={gaugeRef}
          width="240"
          height="140"
          viewBox="0 0 240 140"
          className="drop-shadow-lg"
        >
          {/* Background arc */}
          <path
            d="M 20 120 A 100 100 0 0 1 220 120"
            fill="none"
            stroke="#22c55e"
            strokeWidth="8"
            opacity="0.1"
          />

          {/* Threshold zone (yellow) */}
          <path
            d={`M ${20 + 100 * Math.cos((gaugeConfig.threshold / gaugeConfig.max) * Math.PI - Math.PI / 2))} ${120 + 100 * Math.sin((gaugeConfig.threshold / gaugeConfig.max) * Math.PI - Math.PI / 2)} A 100 100 0 0 1 ${20 + 100 * Math.cos((gaugeConfig.critical / gaugeConfig.max) * Math.PI - Math.PI / 2))} ${120 + 100 * Math.sin((gaugeConfig.critical / gaugeConfig.max) * Math.PI - Math.PI / 2)}`}
            fill="none"
            stroke="#eab308"
            strokeWidth="8"
            opacity="0.3"
          />

          {/* Critical zone (red) */}
          <path
            d={`M ${20 + 100 * Math.cos((gaugeConfig.critical / gaugeConfig.max) * Math.PI - Math.PI / 2))} ${120 + 100 * Math.sin((gaugeConfig.critical / gaugeConfig.max) * Math.PI - Math.PI / 2)} A 100 100 0 0 1 220 120`}
            fill="none"
            stroke="#ef4444"
            strokeWidth="8"
            opacity="0.3"
          />

          {/* Needle */}
          <g transform={`translate(120, 120) rotate(${angle})`}>
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="-85"
              stroke={color}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="6" fill={color} />
          </g>

          {/* Center circle */}
          <circle cx="120" cy="120" r="8" fill="#22c55e" />

          {/* Min/Max labels */}
          <text
            x="20"
            y="130"
            fontSize="10"
            fill="#22c55e"
            textAnchor="start"
            opacity="0.6"
          >
            0
          </text>
          <text
            x="220"
            y="130"
            fontSize="10"
            fill="#22c55e"
            textAnchor="end"
            opacity="0.6"
          >
            {gaugeConfig.max}
          </text>
        </svg>
      </div>

      {/* Rate Display */}
      <div className="mb-4">
        <div className="text-4xl font-bold text-green-300 font-mono">
          {displayRate.toFixed(1)}
        </div>
        <div className="text-sm text-green-400/70">events/second</div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected ? `${color === "#22c55e" ? "bg-green-400" : color === "#eab308" ? "bg-yellow-600" : "bg-red-500"}` : "bg-gray-500"
          } animate-pulse`}
        />
        <span
          className={`text-sm font-mono ${
            statusColor[getStatus()] || "text-gray-500"
          }`}
        >
          {getStatus().toUpperCase()}
        </span>
      </div>

      {/* Peak Rate */}
      <div className="mb-4 text-xs text-green-400/60 border-t border-green-400/20 pt-4">
        <div className="flex justify-between">
          <span>Peak Rate:</span>
          <span className="font-mono text-green-300">{peakRate.toFixed(1)}/s</span>
        </div>
      </div>

      {/* Thresholds */}
      <div className="text-xs text-green-400/50 space-y-1">
        <div className="flex justify-between">
          <span className="text-yellow-600/70">⚠ Warning:</span>
          <span className="font-mono">{gaugeConfig.threshold}/s</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-500/70">🔴 Critical:</span>
          <span className="font-mono">{gaugeConfig.critical}/s</span>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="mt-4 p-2 bg-red-900/30 border border-red-500/50 text-red-400 text-xs rounded">
          Attempting to reconnect...
        </div>
      )}
    </div>
  );
}
