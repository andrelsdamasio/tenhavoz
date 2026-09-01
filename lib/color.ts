/**
 * Deriva variações (mais escura/mais clara) de uma cor hex escolhida pela
 * pessoa que cria a campanha, pra dar às templates um botão + hover +
 * fundos claros coerentes sem precisar guardar uma rampa de cores inteira
 * por campanha — só o hex base fica salvo em campaigns.theme_color.
 */

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;

  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

export interface ThemeShades {
  base: string;
  dark: string;
  light: string;
  lighter: string;
}

/** base = a cor escolhida; dark = pra hover; light/lighter = fundos suaves. */
export function deriveThemeShades(hex: string): ThemeShades {
  if (!isValidHexColor(hex)) {
    throw new Error(`Cor hex inválida: "${hex}"`);
  }

  const [h, s] = hexToHsl(hex);

  return {
    base: hex,
    dark: hslToHex(h, Math.min(100, s), 40),
    light: hslToHex(h, Math.max(15, s * 0.3), 94),
    lighter: hslToHex(h, Math.max(10, s * 0.25), 97),
  };
}

/** CSS custom properties prontas pra usar em `style` no elemento raiz da template. */
export function themeShadesToCssVars(shades: ThemeShades): Record<string, string> {
  return {
    "--tc-base": shades.base,
    "--tc-dark": shades.dark,
    "--tc-light": shades.light,
    "--tc-lighter": shades.lighter,
  };
}
