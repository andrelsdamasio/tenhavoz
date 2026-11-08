"use client";

import { useEffect, useState } from "react";
import {
  BASIC_COLORS,
  hexToRgb,
  isTooLightForWhiteText,
  parseHexInput,
  rgbToHex,
  type Rgb,
} from "@/lib/color";

const START_COLOR = "#4338ca";

interface ColorPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  /** No modo avançado aparecem também as cores sugeridas, o RGB e o código. */
  advanced: boolean;
  suggested?: string[];
}

function Swatch({
  color,
  label,
  selected,
  onClick,
}: {
  color: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Usar a cor ${label}`}
      aria-pressed={selected}
      title={label}
      className={`h-9 w-9 rounded-full border-2 transition duration-150 hover:scale-110 active:scale-95 ${
        selected ? "scale-110 border-brand-600 ring-2 ring-brand-100" : "border-transparent"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}

const CHANNELS: { key: keyof Rgb; label: string; accent: string }[] = [
  { key: "r", label: "Vermelho (R)", accent: "accent-red-600" },
  { key: "g", label: "Verde (G)", accent: "accent-green-600" },
  { key: "b", label: "Azul (B)", accent: "accent-blue-600" },
];

export default function ColorPicker({ value, onChange, advanced, suggested = [] }: ColorPickerProps) {
  const [hexDraft, setHexDraft] = useState(value ?? "");

  // Mantém o campo de código em sincronia quando a cor muda por outro caminho
  // (clicar numa cor pronta, arrastar um controle de RGB).
  useEffect(() => {
    setHexDraft(value ?? "");
  }, [value]);

  const rgb = hexToRgb(value ?? START_COLOR);
  const basicHexes = BASIC_COLORS.map((c) => c.hex.toLowerCase());
  const extraSuggested = suggested.filter((c) => !basicHexes.includes(c.toLowerCase()));

  function setChannel(key: keyof Rgb, raw: string) {
    const n = Math.min(255, Math.max(0, Math.round(Number(raw) || 0)));
    onChange(rgbToHex({ ...rgb, [key]: n }));
  }

  function commitHex(text: string) {
    setHexDraft(text);
    const parsed = parseHexInput(text);
    if (parsed) onChange(parsed);
  }

  const hexInvalid = hexDraft.trim() !== "" && parseHexInput(hexDraft) === null;
  const tooLight = value !== null && isTooLightForWhiteText(value);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Cor padrão do tema"
          aria-pressed={value === null}
          title="Cor padrão"
          className={`flex h-9 w-9 items-center justify-center rounded-full border-2 bg-white text-xs text-gray-400 transition duration-150 hover:scale-110 active:scale-95 ${
            value === null ? "border-brand-600" : "border-gray-200 hover:border-gray-300"
          }`}
        >
          ✕
        </button>
        {BASIC_COLORS.map((c) => (
          <Swatch
            key={c.hex}
            color={c.hex}
            label={c.name}
            selected={value?.toLowerCase() === c.hex.toLowerCase()}
            onClick={() => onChange(c.hex)}
          />
        ))}
      </div>

      {advanced && extraSuggested.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-gray-500">Cores sugeridas</p>
          <div className="flex flex-wrap items-center gap-2">
            {extraSuggested.map((color) => (
              <Swatch
                key={color}
                color={color}
                label={color}
                selected={value?.toLowerCase() === color.toLowerCase()}
                onClick={() => onChange(color)}
              />
            ))}
          </div>
        </div>
      )}

      {advanced && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="mb-3 text-sm font-medium">Escolher por RGB ou código</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className="h-20 w-full shrink-0 rounded-lg border border-gray-200 transition-colors duration-200 sm:w-24"
              style={{ backgroundColor: value ?? START_COLOR }}
              aria-hidden="true"
            />
            <div className="flex-1 space-y-2">
              {CHANNELS.map(({ key, label, accent }) => (
                <div key={key} className="flex items-center gap-3">
                  <label htmlFor={`rgb-${key}`} className="w-28 text-xs text-gray-600">
                    {label}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={255}
                    value={rgb[key]}
                    onChange={(e) => setChannel(key, e.target.value)}
                    aria-label={label}
                    className={`h-2 flex-1 cursor-pointer ${accent}`}
                  />
                  <input
                    id={`rgb-${key}`}
                    type="number"
                    min={0}
                    max={255}
                    value={rgb[key]}
                    onChange={(e) => setChannel(key, e.target.value)}
                    className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <label htmlFor="hex-code" className="w-28 text-xs text-gray-600">
                  Código (hex)
                </label>
                <input
                  id="hex-code"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={7}
                  placeholder="#4338ca"
                  value={hexDraft}
                  onChange={(e) => commitHex(e.target.value)}
                  aria-invalid={hexInvalid}
                  className={`w-28 rounded-md border px-2 py-1 font-mono text-sm ${
                    hexInvalid ? "border-red-400" : "border-gray-300"
                  }`}
                />
                {hexInvalid && <span className="text-xs text-red-600">Use 3 ou 6 dígitos, ex.: #1d4ed8</span>}
              </div>
            </div>
          </div>
          {tooLight && (
            <p className="mt-3 text-xs text-amber-700">
              Essa cor é muito clara: o texto branco pode ficar difícil de ler. Prefira um tom mais escuro.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
