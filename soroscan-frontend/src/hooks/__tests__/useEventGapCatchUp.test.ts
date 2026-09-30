import { renderHook, act } from '@testing-library/react';
import { useEventGapCatchUp } from '../useEventGapCatchUp';

describe('useEventGapCatchUp', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('does not trigger a catch-up fetch while disconnected', () => {
    const fetchGap = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useEventGapCatchUp({ isConnected: false, fetchGap })
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(fetchGap).not.toHaveBeenCalled();
    expect(result.current.isCatchingUp).toBe(false);
  });

  it('triggers a catch-up fetch when isConnected transitions from false to true', async () => {
    const fetchGap = jest.fn().mockResolvedValue(undefined);

    const { result, rerender } = renderHook(
      ({ isConnected }: { isConnected: boolean }) =>
        useEventGapCatchUp({ isConnected, fetchGap }),
      { initialProps: { isConnected: false } }
    );

    expect(fetchGap).not.toHaveBeenCalled();

    await act(async () => {
      rerender({ isConnected: true });
    });

    expect(fetchGap).toHaveBeenCalledTimes(1);
    expect(result.current.isCatchingUp).toBe(false);
  });

  it('does not re-trigger the catch-up fetch when isConnected stays true', async () => {
    const fetchGap = jest.fn().mockResolvedValue(undefined);

    const { rerender } = renderHook(
      ({ isConnected }: { isConnected: boolean }) =>
        useEventGapCatchUp({ isConnected, fetchGap }),
      { initialProps: { isConnected: true } }
    );

    await act(async () => {
      rerender({ isConnected: true });
    });

    expect(fetchGap).toHaveBeenCalledTimes(1);
  });
});
