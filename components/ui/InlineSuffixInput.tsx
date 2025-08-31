"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

type Props = {
  value: number | string;
  onChangeValue: (next: number) => void;
  suffix: string;               // f.eks. "kWh/mnd"
  inputClassName?: string;      // f.eks. "input" for å treffe eksisterende styling
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  disabled?: boolean;
  "aria-label"?: string;
};

export default function InlineSuffixInput({
  value,
  onChangeValue,
  suffix,
  inputClassName = "input",
  min,
  max,
  step,
  placeholder,
  disabled,
  "aria-label": ariaLabel,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suffixRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [leftPx, setLeftPx] = useState<number>(0);

  // Les aktuell font fra input for korrekt måling
  const readFont = useCallback(() => {
    const el = inputRef.current;
    if (!el) return "normal 16px system-ui";
    const cs = getComputedStyle(el);
    // Canvas bruker "font: <style> <variant> <weight> <size>/<line-height> <family>"
    // men <style>/<variant> er sjelden nødvendig. Dette holder godt:
    return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  }, []);

  const ensureCanvas = useCallback(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    return canvasRef.current!;
  }, []);

  const measureText = useCallback((text: string) => {
    const canvas = ensureCanvas();
    const ctx = canvas.getContext("2d");
    if (!ctx) return 0;
    ctx.font = readFont();
    const metrics = ctx.measureText(text);
    return metrics.width;
  }, [ensureCanvas, readFont]);

  // Re-posisjoner suffiks basert på gjeldende verdi/placeholder og input-padding
  const reposition = useCallback(() => {
    const input = inputRef.current;
    const suf = suffixRef.current;
    if (!input || !suf) return;

    const cs = getComputedStyle(input);
    const padLeft = parseFloat(cs.paddingLeft || "0");
    const padRight = parseFloat(cs.paddingRight || "0");
    const borderLeft = parseFloat(cs.borderLeftWidth || "0");
    const borderRight = parseFloat(cs.borderRightWidth || "0");

    const text = (input.value ?? "").toString();
    const base = text.length > 0 ? text : ""; // tom streng → start helt i venstre
    const w = measureText(base);

    const suffixWidth = suf.getBoundingClientRect().width;
    const inputWidth = input.clientWidth; // innholdsbredde uten border
    // venstre pos relativt til input-innhold:
    let left = borderLeft + padLeft + w + 6; // 6px buffer
    // Unngå overflow til høyre
    const maxLeft = inputWidth - borderRight - padRight - suffixWidth - 2;
    if (left > maxLeft) left = Math.max(borderLeft + padLeft + 6, maxLeft);

    setLeftPx(left);
  }, [measureText]);

  // Mål ved mount + når verdi endres
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    reposition();
  }, [value, reposition]);

  // Reposisjoner på resize / fontendring (grovt via ResizeObserver)
  useEffect(() => {
    if (!inputRef.current) return;
    const ro = new ResizeObserver(() => reposition());
    ro.observe(inputRef.current);
    const onWin = () => reposition();
    window.addEventListener("resize", onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, [reposition]);

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    // Tolker tom string som 0 for enkelhets skyld
    const raw = e.currentTarget.value;
    const num = raw === "" ? 0 : Number(raw);
    onChangeValue(Number.isFinite(num) ? num : 0);
  };

  return (
    <div
      ref={wrapRef}
      style={{ position: "relative", display: "block" }}
    >
      <input
        ref={inputRef}
        className={inputClassName}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-label={ariaLabel}
        // Litt ekstra høyre-padding i tilfelle teksten blir lang (hindrer overlapp med caret)
        style={{ paddingRight: "90px" }}
      />
      <span
        ref={suffixRef}
        style={{
          position: "absolute",
          left: `${leftPx}px`,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--muted)",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          // samsvar med inputtekst
          font: "inherit",
        }}
        aria-hidden
      >
        {suffix}
      </span>
    </div>
  );
}
