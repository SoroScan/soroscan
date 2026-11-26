import { act, renderHook, waitFor } from "@testing-library/react";
import { useTheme } from "@/hooks/useTheme";

function setPreferredLight(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-color-scheme: light)" && matches,
      media: query,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe("useTheme", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    setPreferredLight(false);
  });

  afterEach(() => {
    document.documentElement.classList.remove("dark");
    jest.restoreAllMocks();
  });

  it("defaults to dark when there is no saved or light system preference", async () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    await waitFor(() => expect(result.current.mounted).toBe(true));
  });

  it("uses the system light preference when storage is empty", () => {
    setPreferredLight(true);
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("prefers a saved valid theme over system preferences", () => {
    setPreferredLight(true);
    localStorage.setItem("theme", "dark");
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("toggles both ways, updates the document class and persists the selection", () => {
    const { result } = renderHook(() => useTheme());

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("light");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("restores the persisted theme after remounting", () => {
    const first = renderHook(() => useTheme());
    act(() => first.result.current.toggleTheme());
    first.unmount();

    const second = renderHook(() => useTheme());
    expect(second.result.current.theme).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("ignores an invalid saved theme and falls back to the system setting", () => {
    localStorage.setItem("theme", "not-a-theme");
    setPreferredLight(true);

    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });
});
