"use client";

import { useEffect, useMemo, useState } from "react";

type Theme = "auto" | "light" | "dark";

type Props = {
  /** Start-åpen panel (valgfritt) */
  initialOpen?: boolean;
  /** Start-tema (valgfritt). Hvis ikke gitt, lastes fra localStorage eller "auto". */
  theme?: Theme;
  /** Callback ved temaendring (valgfritt) */
  onThemeChange?: (t: Theme) => void;

  /** Valgfritt: vis/bygg egne filterinnhold i panelet */
  children?: React.ReactNode;
};

/**
 * Flytende filterpanel (FAB -> panel).
 * Denne komponenten er selvstendig og vil ikke feile build dersom den ikke brukes.
 * Den håndterer tema-toggle via data-theme på <html>.
 */
export default function FloatingFilter({
  initialOpen = false,
  theme: themeProp,
  onThemeChange,
  children,
}: Props) {
  const [open, setOpen] = useState(initialOpen);
  const [theme, setTheme] = useState<Theme>(themeProp || "auto");

  // Tillatte temaer til UI-knapper
  const THEME_OPTS = useMemo(
    () =>
      [
        { v: "auto", label: "Auto" },
        { v: "light", label: "Lyst" },
        { v: "dark", label: "Mørkt" },
      ] as Array<{ v: Theme; label: string }>,
    []
  );

  // Lese preferanse fra localStorage (kun første gang hvis prop ikke er satt)
  useEffect(() => {
    if (themeProp) return; // styres utenfra
    try {
      const saved = localStorage.getItem("theme-preference") as Theme | null;
      if (saved === "auto" || saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    } catch {
      // ignore
    }
  }, [themeProp]);

  // Bruk media query for auto
  const systemPrefersDark = useMemo(
    () => (typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)") : null),
    []
  );

  // Funksjon for å apply tema på <html data-theme="...">
  function applyTheme(t: Theme) {
    const root = document.documentElement;
    if (!root) return;
    if (t === "auto") {
      const dark = systemPrefersDark?.matches ?? false;
      root.setAttribute("data-theme", dark ? "dark" : "light");
    } else {
      root.setAttribute("data-theme", t);
    }
    // Hint til UA for native form-styles etc.
    (root.style as any).colorScheme = t === "auto" ? (systemPrefersDark?.matches ? "dark" : "light") : t;
  }

  // Kjør apply ved mount og når theme endres
  useEffect(() => {
    if (typeof document === "undefined") return;
    applyTheme(theme);
    onThemeChange?.(theme);
    try {
      localStorage.setItem("theme-preference", theme);
    } catch {
      // ignore
    }
    // Re-apply når OS-tema endres og vi står i auto
    if (systemPrefersDark) {
      const listener = () => {
        if (theme === "auto") applyTheme("auto");
      };
      systemPrefersDark.addEventListener?.("change", listener);
      return () => systemPrefersDark.removeEventListener?.("change", listener);
    }
  }, [theme, onThemeChange, systemPrefersDark]);

  // Hjelper for klikkskifte
  function handleThemeClick(next: Theme) {
    setTheme(next);
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        className="fixed left-4 bottom-4 z-40 rounded-full shadow-lg px-4 py-3 border bg-white dark:bg-neutral-900"
        aria-expanded={open}
        aria-controls="floating-filter-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Lukk filter" : "Filter"}
      </button>

      {/* Panel */}
      {open && (
        <div
          id="floating-filter-panel"
          role="dialog"
          aria-modal="false"
          className="fixed left-4 bottom-20 z-40 w-[min(92vw,360px)] rounded-2xl border shadow-xl p-4 bg-white dark:bg-neutral-900"
        >
          <div className="mb-3 font-semibold">Innstillinger</div>

          {/* Tema-toggle */}
          <div className="mb-2 text-sm">Tema</div>
          <div className="flex gap-2 mb-4">
            {THEME_OPTS.map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => handleThemeClick(opt.v)}
                className={[
                  "px-3 py-1.5 rounded border text-sm",
                  theme === opt.v ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-black dark:border-white" : "bg-white dark:bg-neutral-800",
                ].join(" ")}
                aria-pressed={theme === opt.v}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Valgfritt ekstra filterinnhold */}
          {children ? (
            <div className="mt-2">{children}</div>
          ) : (
            <div className="text-sm opacity-80">
              Detaljerte filtre ligger i sidepanelet. Denne knappen kan brukes til tema og (senere) hurtigfiltre.
            </div>
          )}
        </div>
      )}
    </>
  );
}
