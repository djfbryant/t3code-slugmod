import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_PREFERENCE,
  normalizeThemePreference,
  readStoredThemePreference,
  resolveThemeAppearance,
} from "./themePreference";

function createStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    get length() {
      return data.size;
    },
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

describe("themePreference", () => {
  it("keeps the default preference stable", () => {
    expect(DEFAULT_THEME_PREFERENCE).toEqual({
      family: "default",
      mode: "system",
    });
  });

  it("normalizes legacy preference strings", () => {
    expect(normalizeThemePreference("light")).toEqual({
      family: "default",
      mode: "light",
    });
    expect(normalizeThemePreference("dark")).toEqual({
      family: "default",
      mode: "dark",
    });
    expect(normalizeThemePreference("system")).toEqual({
      family: "default",
      mode: "system",
    });
  });

  it("maps the earlier mistaken family name to gruvbox", () => {
    expect(
      normalizeThemePreference({
        family: "grundig",
        mode: "dark",
      }),
    ).toEqual({
      family: "gruvbox",
      mode: "dark",
    });
  });

  it("resolves the current appearance from the preference and system state", () => {
    expect(resolveThemeAppearance({ family: "gruvbox", mode: "system" }, true)).toBe("dark");
    expect(resolveThemeAppearance({ family: "gruvbox", mode: "light" }, true)).toBe("light");
  });

  it("migrates legacy stored theme strings into the new preference shape", () => {
    const storage = createStorage({
      "t3code:theme": "dark",
    });

    expect(readStoredThemePreference(storage)).toEqual({
      family: "default",
      mode: "dark",
    });
    expect(storage.getItem("t3code:theme")).toBeNull();
    expect(storage.getItem("t3code:theme:v2")).toBe(
      JSON.stringify({
        family: "default",
        mode: "dark",
      }),
    );
  });

  it("upgrades old v2 theme storage with the wrong family name", () => {
    const storage = createStorage({
      "t3code:theme:v2": JSON.stringify({
        family: "grundig",
        mode: "dark",
      }),
    });

    expect(readStoredThemePreference(storage)).toEqual({
      family: "gruvbox",
      mode: "dark",
    });
    expect(storage.getItem("t3code:theme")).toBeNull();
    expect(storage.getItem("t3code:theme:v2")).toBe(
      JSON.stringify({
        family: "gruvbox",
        mode: "dark",
      }),
    );
  });
});
