import { act, renderHook } from "@testing-library/react";
import { useFavorites } from "@/lib/hooks/useFavorites";

const STORAGE_KEY = "soroscan-contract-favorites";

describe("useFavorites", () => {
  beforeEach(() => localStorage.clear());

  it("starts with an empty set and reports unknown contracts as not favorited", () => {
    const { result } = renderHook(() => useFavorites());

    expect([...result.current.favorites]).toEqual([]);
    expect(result.current.isFavorite("CONTRACT_A")).toBe(false);
  });

  it("adds a favorite and saves it to localStorage", () => {
    const { result } = renderHook(() => useFavorites());

    act(() => result.current.toggleFavorite("CONTRACT_A"));
    expect(result.current.isFavorite("CONTRACT_A")).toBe(true);
    expect([...result.current.favorites]).toEqual(["CONTRACT_A"]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual(["CONTRACT_A"]);
  });

  it("removes a favorite on the second toggle without affecting the others", () => {
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite("CONTRACT_A");
      result.current.toggleFavorite("CONTRACT_B");
    });

    act(() => result.current.toggleFavorite("CONTRACT_A"));
    expect(result.current.isFavorite("CONTRACT_A")).toBe(false);
    expect(result.current.isFavorite("CONTRACT_B")).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")).toEqual(["CONTRACT_B"]);
  });

  it("persists favorites across unmount and remount", () => {
    const first = renderHook(() => useFavorites());
    act(() => first.result.current.toggleFavorite("CONTRACT_X"));
    first.unmount();

    const second = renderHook(() => useFavorites());
    expect(second.result.current.isFavorite("CONTRACT_X")).toBe(true);
    expect(second.result.current.favorites.size).toBe(1);
  });

  it("deduplicates repeated contract IDs found in saved storage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["A", "A", "B"]));
    const { result } = renderHook(() => useFavorites());

    expect([...result.current.favorites]).toEqual(["A", "B"]);
    expect(result.current.favorites.size).toBe(2);
  });

  it("handles an explicitly saved empty list and persists removal of the last favorite", () => {
    localStorage.setItem(STORAGE_KEY, "[]");
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites.size).toBe(0);

    act(() => result.current.toggleFavorite("ONLY"));
    act(() => result.current.toggleFavorite("ONLY"));
    expect(result.current.favorites.size).toBe(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });
});
