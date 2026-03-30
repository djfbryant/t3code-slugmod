export type ThemeFamily = "default" | "gruvbox";
export type ThemeMode = "system" | "light" | "dark";
export type AccentColor = "blue" | "violet" | "purple" | "pink" | "red" | "orange" | "green" | "teal";

export type ThemePreference = Readonly<{
  family: ThemeFamily;
  mode: ThemeMode;
}>;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = {
  family: "default",
  mode: "system",
} as const;

export const DEFAULT_ACCENT_COLOR: AccentColor = "blue";

const ACCENT_STORAGE_KEY = "t3code:accent";

const ACCENT_COLORS: readonly AccentColor[] = [
  "blue",
  "violet",
  "purple",
  "pink",
  "red",
  "orange",
  "green",
  "teal",
];

function isAccentColor(value: unknown): value is AccentColor {
  return ACCENT_COLORS.includes(value as AccentColor);
}

export function readStoredAccentColor(storage: Storage): AccentColor {
  const stored = storage.getItem(ACCENT_STORAGE_KEY);
  if (stored && isAccentColor(stored)) return stored;
  return DEFAULT_ACCENT_COLOR;
}

export function writeStoredAccentColor(storage: Storage, color: AccentColor): void {
  storage.setItem(ACCENT_STORAGE_KEY, color);
}

const STORAGE_KEY = "t3code:theme:v2";
const LEGACY_STORAGE_KEY = "t3code:theme";

function isThemeFamily(value: unknown): value is ThemeFamily {
  return value === "default" || value === "gruvbox";
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function isDefaultThemePreference(preference: ThemePreference): boolean {
  return (
    preference.family === DEFAULT_THEME_PREFERENCE.family &&
    preference.mode === DEFAULT_THEME_PREFERENCE.mode
  );
}

export function resolveThemeAppearance(
  preference: ThemePreference,
  systemDark: boolean,
): "light" | "dark" {
  if (preference.mode === "system") {
    return systemDark ? "dark" : "light";
  }
  return preference.mode;
}

export function normalizeThemePreference(raw: unknown): ThemePreference | null {
  if (raw && typeof raw === "object") {
    const family = (raw as { family?: unknown }).family;
    const mode = (raw as { mode?: unknown }).mode;
    if (isThemeMode(mode)) {
      if (isThemeFamily(family)) {
        return { family, mode };
      }
      if (family === "grundig") {
        return { family: "gruvbox", mode };
      }
    }
  }

  if (raw === "light" || raw === "dark" || raw === "system") {
    return { family: "default", mode: raw };
  }

  return null;
}

function readJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function readStoredThemePreference(storage: Storage): ThemePreference {
  const stored = storage.getItem(STORAGE_KEY);
  if (stored) {
    const preference = normalizeThemePreference(readJson(stored));
    if (preference) {
      const normalized = JSON.stringify(preference);
      if (stored !== normalized) {
        writeStoredThemePreference(storage, preference);
      } else if (storage.getItem(LEGACY_STORAGE_KEY) !== null) {
        storage.removeItem(LEGACY_STORAGE_KEY);
      }
      return preference;
    }
  }

  const legacy = storage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    const preference = normalizeThemePreference(legacy);
    if (preference) {
      writeStoredThemePreference(storage, preference);
      storage.removeItem(LEGACY_STORAGE_KEY);
      return preference;
    }
  }

  return DEFAULT_THEME_PREFERENCE;
}

export function writeStoredThemePreference(storage: Storage, preference: ThemePreference): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preference));
  storage.removeItem(LEGACY_STORAGE_KEY);
}

export function getThemeStorageKeys(): readonly [string, string] {
  return [STORAGE_KEY, LEGACY_STORAGE_KEY] as const;
}
