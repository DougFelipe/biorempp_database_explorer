import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLazyTabData } from '@/shared/hooks/useLazyTabData';

describe('useLazyTabData', () => {
  it('does not fetch until the tab becomes active', async () => {
    const fetcher = vi.fn().mockResolvedValue('overview');
    const { result, rerender } = renderHook(
      ({ isActive, resetKeys }) => useLazyTabData({ isActive, fetcher, resetKeys }),
      {
        initialProps: { isActive: false, resetKeys: ['K00001'] },
      }
    );

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.hasLoaded).toBe(false);

    rerender({ isActive: true, resetKeys: ['K00001'] });

    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(result.current.data).toBe('overview');
    });
  });

  it('loads only once for the same reset cycle even after tab toggles', async () => {
    const fetcher = vi.fn().mockResolvedValue('overview');
    const { result, rerender } = renderHook(
      ({ isActive, resetKeys }) => useLazyTabData({ isActive, fetcher, resetKeys }),
      {
        initialProps: { isActive: true, resetKeys: ['K00001'] },
      }
    );

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    rerender({ isActive: false, resetKeys: ['K00001'] });
    rerender({ isActive: true, resetKeys: ['K00001'] });

    await waitFor(() => {
      expect(result.current.hasLoaded).toBe(true);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('resets and refetches when resetKeys change', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const { result, rerender } = renderHook(
      ({ resetKeys }) => useLazyTabData({ isActive: true, fetcher, resetKeys }),
      {
        initialProps: { resetKeys: ['K00001'] },
      }
    );

    await waitFor(() => {
      expect(result.current.data).toBe('first');
    });

    rerender({ resetKeys: ['K00002'] });

    await waitFor(() => {
      expect(result.current.data).toBe('second');
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('reload forces a new fetch cycle', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    const { result } = renderHook(() => useLazyTabData({ isActive: true, fetcher, resetKeys: ['K00001'] }));

    await waitFor(() => {
      expect(result.current.data).toBe('first');
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.data).toBe('second');
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
