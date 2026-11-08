import { describe, expect, it } from "vitest";
import {
  BASIC_COLORS,
  contrastWithWhite,
  hexToRgb,
  isBasicColor,
  isTooLightForWhiteText,
  isValidHexColor,
  parseHexInput,
  rgbToHex,
} from "./color";

describe("cores", () => {
  it("todas as cores básicas são hex válidos e únicos", () => {
    const hexes = BASIC_COLORS.map((c) => c.hex);
    expect(hexes.every(isValidHexColor)).toBe(true);
    expect(new Set(hexes).size).toBe(hexes.length);
    expect(BASIC_COLORS.length).toBeGreaterThanOrEqual(12);
  });

  it("converte entre RGB e hex", () => {
    expect(hexToRgb("#1d4ed8")).toEqual({ r: 29, g: 78, b: 216 });
    expect(rgbToHex({ r: 29, g: 78, b: 216 })).toBe("#1d4ed8");
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
  });

  it("limita RGB fora de 0–255 e valores quebrados", () => {
    expect(rgbToHex({ r: 300, g: -5, b: 127.6 })).toBe("#ff0080");
    expect(rgbToHex({ r: NaN, g: 0, b: 0 })).toBe("#000000");
  });

  it("aceita variações de código hex digitado", () => {
    expect(parseHexInput("#1A2B3C")).toBe("#1a2b3c");
    expect(parseHexInput("1a2b3c")).toBe("#1a2b3c");
    expect(parseHexInput(" #abc ")).toBe("#aabbcc");
    expect(parseHexInput("#12")).toBeNull();
    expect(parseHexInput("#gggggg")).toBeNull();
    expect(parseHexInput("")).toBeNull();
  });

  it("avisa quando a cor é clara demais para texto branco", () => {
    expect(isTooLightForWhiteText("#ffffff")).toBe(true);
    expect(isTooLightForWhiteText("#fde047")).toBe(true);
    expect(isTooLightForWhiteText("#111827")).toBe(false);
    expect(contrastWithWhite("#000000")).toBeGreaterThan(20);
  });

  it("reconhece cor básica", () => {
    expect(isBasicColor("#DC2626")).toBe(true);
    expect(isBasicColor("#123456")).toBe(false);
  });

  it("as cores básicas funcionam com texto branco", () => {
    expect(BASIC_COLORS.filter((c) => isTooLightForWhiteText(c.hex))).toEqual([]);
  });
});
