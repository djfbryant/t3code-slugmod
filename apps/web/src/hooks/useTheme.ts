import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_THEME_PREFERENCE,
  getThemeStorageKeys,
  readStoredAccentColor,
  readStoredThemePreference,
  resolveThemeAppearance,
  type AccentColor,
  type ThemeFamily,
  type ThemeMode,
  type ThemePreference,
  writeStoredAccentColor,
  writeStoredThemePreference,
} from "../lib/themePreference";

type ThemeSnapshot = {
  preference: ThemePreference;
  systemDark: boolean;
  accentColor: AccentColor;
};

const MEDIA_QUERY = "(prefers-color-scheme: dark)";

let listeners: Array<() => void> = [];
let lastSnapshot: ThemeSnapshot | null = null;
let lastDesktopTheme: "light" | "dark" | null = null;

function emitChange() {
  for (const listener of listeners) listener();
}

function getSystemDark(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(MEDIA_QUERY).matches;
}

function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") {
    return DEFAULT_THEME_PREFERENCE;
  }
  return readStoredThemePreference(window.localStorage);
}

function readAccentColor(): AccentColor {
  if (typeof window === "undefined") {
    return DEFAULT_ACCENT_COLOR;
  }
  return readStoredAccentColor(window.localStorage);
}

function applyAccentColor(color: AccentColor) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.dataset.accent = color;
}

function applyTheme(preference: ThemePreference, suppressTransitions = false) {
  if (typeof document === "undefined") {
    return;
  }

  if (suppressTransitions) {
    document.documentElement.classList.add("no-transitions");
  }

  const resolvedTheme = resolveThemeAppearance(preference, getSystemDark());
  document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  document.documentElement.dataset.themeFamily = preference.family;
  document.documentElement.dataset.themeAppearance = resolvedTheme;
  syncDesktopTheme(resolvedTheme);

  if (suppressTransitions) {
    // Force a reflow so the no-transitions class takes effect before removal.
    // oxlint-disable-next-line no-unused-expressions
    document.documentElement.offsetHeight;
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("no-transitions");
    });
  }
}

function syncDesktopTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") {
    return;
  }
  const bridge = window.desktopBridge;
  if (!bridge || lastDesktopTheme === theme) {
    return;
  }

  lastDesktopTheme = theme;
  void bridge.setTheme(theme).catch(() => {
    if (lastDesktopTheme === theme) {
      lastDesktopTheme = null;
    }
  });
}

function setThemePreference(preference: ThemePreference) {
  if (typeof window === "undefined") {
    return;
  }

  const current = readThemePreference();
  if (current.family === preference.family && current.mode === preference.mode) {
    return;
  }

  writeStoredThemePreference(window.localStorage, preference);
  applyTheme(preference, true);
  emitChange();
}

function setAccentColorPreference(color: AccentColor) {
  if (typeof window === "undefined") {
    return;
  }

  writeStoredAccentColor(window.localStorage, color);
  applyAccentColor(color);
  emitChange();
}

function getSnapshot(): ThemeSnapshot {
  const preference = readThemePreference();
  const systemDark = preference.mode === "system" ? getSystemDark() : false;
  const accentColor = readAccentColor();

  if (
    lastSnapshot &&
    lastSnapshot.preference.family === preference.family &&
    lastSnapshot.preference.mode === preference.mode &&
    lastSnapshot.systemDark === systemDark &&
    lastSnapshot.accentColor === accentColor
  ) {
    return lastSnapshot;
  }

  lastSnapshot = { preference, systemDark, accentColor };
  return lastSnapshot;
}

function subscribe(listener: () => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  listeners.push(listener);

  const mq = window.matchMedia(MEDIA_QUERY);
  const handleChange = () => {
    const preference = readThemePreference();
    if (preference.mode === "system") {
      applyTheme(preference, true);
    }
    emitChange();
  };
  mq.addEventListener("change", handleChange);

  const [storageKey, legacyStorageKey] = getThemeStorageKeys();
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey || event.key === legacyStorageKey) {
      applyTheme(readThemePreference(), true);
      emitChange();
    }
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    listeners = listeners.filter((existingListener) => existingListener !== listener);
    mq.removeEventListener("change", handleChange);
    window.removeEventListener("storage", handleStorage);
  };
}

if (typeof window !== "undefined") {
  applyTheme(readThemePreference());
  applyAccentColor(readAccentColor());
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const preference = snapshot.preference;

  const resolvedTheme: "light" | "dark" = resolveThemeAppearance(preference, snapshot.systemDark);

  const setThemeFamily = useCallback((family: ThemeFamily) => {
    setThemePreference({
      family,
      mode: readThemePreference().mode,
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemePreference({
      family: readThemePreference().family,
      mode,
    });
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemePreference(next);
  }, []);

  const resetTheme = useCallback(() => {
    setThemePreference(DEFAULT_THEME_PREFERENCE);
    setAccentColorPreference(DEFAULT_ACCENT_COLOR);
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorPreference(color);
  }, []);

  // Keep DOM in sync on mount/change.
  useEffect(() => {
    applyTheme(preference);
  }, [preference]);

  useEffect(() => {
    applyAccentColor(snapshot.accentColor);
  }, [snapshot.accentColor]);

  return {
    themeFamily: preference.family,
    themeMode: preference.mode,
    setThemeFamily,
    setThemeMode,
    setTheme,
    resetTheme,
    accentColor: snapshot.accentColor,
    setAccentColor,
    resolvedTheme,
  } as const;
}
