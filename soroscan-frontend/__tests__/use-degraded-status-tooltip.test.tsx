import { act, renderHook } from '@testing-library/react';
import {
  TooltipUtils,
  useCommonDegradationTooltips,
  useDegradedStatusTooltip,
  useTooltipAnalytics,
} from '@/hooks/useDegradedStatusTooltip';
import {
  COMMON_DEGRADATION_SCENARIOS,
  DEGRADATION_CONTENT_TEMPLATES,
  formatTooltipForContext,
  generateAccessibleTooltipContent,
  type DegradationContext,
  type DegradationSeverity,
  type DegradationType,
} from '@/lib/tooltip-content-guidelines';

const context: DegradationContext = {
  type: 'performance',
  severity: 'moderate',
  details: { responseTime: 2500, errorRate: 5 },
  autoRecoveryActive: true,
  estimatedResolution: '10 minutes',
};

const otherContext: DegradationContext = {
  type: 'connectivity',
  severity: 'severe',
  details: { errorRate: 20 },
};

describe('useDegradedStatusTooltip', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns an empty, non-loading tooltip for a null context', () => {
    const { result } = renderHook(() => useDegradedStatusTooltip(null));
    expect(result.current.content).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.validation).toBeUndefined();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  const severities: DegradationSeverity[] = ['minor', 'moderate', 'severe'];
  const uiContexts = ['dashboard', 'contractList', 'contractDetail', 'mobile'] as const;

  it.each(severities)('renders %s severity text for every UI context', severity => {
    const input: DegradationContext = { ...context, severity };
    for (const uiContext of uiContexts) {
      const { result, unmount } = renderHook(() =>
        useDegradedStatusTooltip(input, { uiContext })
      );
      expect(result.current.content).toBe(formatTooltipForContext(input, uiContext));
      expect(result.current.content).toContain(
        uiContext === 'mobile'
          ? DEGRADATION_CONTENT_TEMPLATES.performance.descriptions[severity]
          : uiContext === 'contractList'
            ? 'Performance Degraded'
            : 'Performance'
      );
      unmount();
    }
  });

  it('uses screen-reader content when accessibleFormat is true', () => {
    const { result } = renderHook(() =>
      useDegradedStatusTooltip(context, { accessibleFormat: true })
    );
    expect(result.current.content).toBe(generateAccessibleTooltipContent(context));
    expect(result.current.content).toContain('2500 milliseconds');
  });

  it('prioritizes custom content and returns validation results', () => {
    const { result } = renderHook(() =>
      useDegradedStatusTooltip(context, { customContent: 'lowercase without punctuation' })
    );
    expect(result.current.content).toBe('lowercase without punctuation');
    expect(result.current.validation).toEqual(
      expect.objectContaining({
        isValid: true,
        warnings: expect.arrayContaining([
          'Tooltip content should start with a capital letter',
          'Tooltip content should end with proper punctuation',
        ]),
      })
    );
  });

  it('skips validation when validateContent is disabled', () => {
    const { result } = renderHook(() =>
      useDegradedStatusTooltip(context, {
        customContent: 'lowercase without punctuation',
        validateContent: false,
      })
    );
    expect(result.current.content).toBe('lowercase without punctuation');
    expect(result.current.validation).toBeUndefined();
  });

  it('refreshes timestamp and clears loading after the timeout', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-25T10:00:00Z'));
    const { result } = renderHook(() => useDegradedStatusTooltip(context));
    const initial = result.current.lastUpdated.getTime();
    act(() => {
      jest.setSystemTime(new Date('2026-11-25T10:00:01Z'));
      result.current.refresh();
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.lastUpdated.getTime()).toBeGreaterThan(initial);
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.isLoading).toBe(false);
  });

  it('updates the context and clears loading after the shorter timeout', () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useDegradedStatusTooltip(context));
    act(() => result.current.updateContext(otherContext));
    expect(result.current.content).toBe(formatTooltipForContext(otherContext, 'dashboard'));
    expect(result.current.isLoading).toBe(true);
    act(() => jest.advanceTimersByTime(50));
    expect(result.current.isLoading).toBe(false);
  });

  it('responds to changes in the context prop', () => {
    const { result, rerender } = renderHook(
      ({ input }: { input: DegradationContext | null }) =>
        useDegradedStatusTooltip(input),
      { initialProps: { input: context as DegradationContext | null } }
    );
    rerender({ input: otherContext });
    expect(result.current.content).toBe(formatTooltipForContext(otherContext, 'dashboard'));
    rerender({ input: null });
    expect(result.current.content).toBe('');
  });

  it('refreshes on an interval and stops the interval on unmount', () => {
    jest.useFakeTimers();
    const { result, unmount } = renderHook(() =>
      useDegradedStatusTooltip(context, { refreshInterval: 1000 })
    );
    expect(jest.getTimerCount()).toBe(1);
    act(() => jest.advanceTimersByTime(1000));
    expect(result.current.isLoading).toBe(true);
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.isLoading).toBe(false);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not schedule an interval when refreshInterval is zero', () => {
    jest.useFakeTimers();
    const { unmount } = renderHook(() =>
      useDegradedStatusTooltip(context, { refreshInterval: 0 })
    );
    expect(jest.getTimerCount()).toBe(0);
    unmount();
  });

  it('returns a fallback when tooltip formatting throws', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { result } = renderHook(() =>
      useDegradedStatusTooltip(context, {
        uiContext: 'unrecognized' as 'dashboard',
      })
    );
    expect(result.current.content).toBe('Contract experiencing performance issues');
    expect(warn).toHaveBeenCalled();
  });
});

describe('useCommonDegradationTooltips', () => {
  it('exposes brief, detailed and accessible content for each predefined scenario', () => {
    const { result } = renderHook(() => useCommonDegradationTooltips());
    for (const name of Object.keys(COMMON_DEGRADATION_SCENARIOS) as Array<
      keyof typeof COMMON_DEGRADATION_SCENARIOS
    >) {
      const scenario = COMMON_DEGRADATION_SCENARIOS[name];
      expect(result.current[name].brief).toBe(formatTooltipForContext(scenario, 'contractList'));
      expect(result.current[name].detailed).toBe(formatTooltipForContext(scenario, 'contractDetail'));
      expect(result.current[name].accessible).toBe(generateAccessibleTooltipContent(scenario));
    }
  });
});

describe('useTooltipAnalytics', () => {
  it('records shows by type, content errors and the existing running view-time calculation', () => {
    const { result } = renderHook(() => useTooltipAnalytics());
    expect(result.current.metrics.tooltipShows).toBe(0);
    expect(result.current.metrics.contentErrors).toBe(0);
    expect(result.current.metrics.mostViewedTypes.size).toBe(0);

    act(() => {
      result.current.trackTooltipShow('performance');
      result.current.trackTooltipShow('performance');
      result.current.trackTooltipShow('connectivity');
      result.current.trackContentError();
      result.current.trackViewTime(20);
    });
    expect(result.current.metrics.tooltipShows).toBe(3);
    expect(result.current.metrics.mostViewedTypes.get('performance')).toBe(2);
    expect(result.current.metrics.mostViewedTypes.get('connectivity')).toBe(1);
    expect(result.current.metrics.contentErrors).toBe(1);
    expect(result.current.metrics.averageViewTime).toBe(10);

    act(() => result.current.trackViewTime(30));
    expect(result.current.metrics.averageViewTime).toBe(20);
  });
});

describe('TooltipUtils', () => {
  it.each([
    ['healthy', 'operating normally'],
    ['paused', 'temporarily suspended'],
    ['error', 'critical errors'],
    ['offline', 'offline or unreachable'],
    ['degraded', 'reduced functionality'],
  ] as const)('describes %s health', (status, phrase) => {
    expect(TooltipUtils.getHealthStatusTooltip(status)).toContain(phrase);
  });

  it('uses degradation details when supplied', () => {
    expect(TooltipUtils.getHealthStatusTooltip('degraded', context)).toContain('2500ms');
  });

  it('normalizes markdown and bullets for screen readers', () => {
    expect(TooltipUtils.formatForScreenReader('**Alert**\n• Investigate now')).toBe(
      'Alert. Investigate now'
    );
  });

  it('keeps short mobile text and truncates longer text', () => {
    expect(TooltipUtils.truncateForMobile('Short note', 20)).toBe('Short note');
    const long = 'A repeated diagnostic message that is deliberately much too long for compact mode';
    const shortened = TooltipUtils.truncateForMobile(long, 35);
    expect(shortened).toMatch(/\.\.\.$/);
    expect(shortened.length).toBeLessThanOrEqual(35);
    expect(long.startsWith(shortened.slice(0, -3))).toBe(true);
  });

  it('builds a compact summary using error rate or response time and recovery status', () => {
    expect(TooltipUtils.getCompactSummary(context)).toBe(
      'Performance Degraded (5% errors) - Auto-recovering'
    );
    expect(
      TooltipUtils.getCompactSummary({
        type: 'performance',
        severity: 'minor',
        details: { responseTime: 600 },
      })
    ).toBe('Performance Degraded (600ms)');
    expect(TooltipUtils.getCompactSummary({ type: 'performance', severity: 'minor' })).toBe(
      'Performance Degraded'
    );
  });

  it('supports all defined degradation types without an exception', () => {
    for (const type of Object.keys(DEGRADATION_CONTENT_TEMPLATES) as DegradationType[]) {
      expect(
        TooltipUtils.getCompactSummary({ type, severity: 'minor' })
      ).toContain(DEGRADATION_CONTENT_TEMPLATES[type].title);
    }
  });
});
