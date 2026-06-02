/**
 * Metrics components for SoroScan dashboard
 * 
 * Export all metrics-related components and hooks
 */

export { EventRateMeter } from "./EventRateMeter";
export type { EventRateMeterProps } from "./EventRateMeter";

export { EventRateMeterContainer } from "./EventRateMeterContainer";
export type { EventRateMeterContainerProps } from "./EventRateMeterContainer";

export { useEventRate, useCalculatedEventRate } from "./useEventRate";
export type { EventRateData } from "./useEventRate";
