import { normalizeLabelName } from "./labels";

// Palette colors reference the active Obsidian theme's named colors so project
// and label swatches adapt to any theme. Overrides picked from this palette are
// stored as these `var(...)` strings and stay theme-adaptive; tints resolve via
// the palette match in lightColorForOverride().
export const SLATE_COLOR_PALETTE = [
  { name: "yellow", regular: "var(--color-yellow)", light: "rgba(var(--color-yellow-rgb), 0.14)" },
  { name: "red", regular: "var(--color-red)", light: "rgba(var(--color-red-rgb), 0.14)" },
  { name: "purple", regular: "var(--color-purple)", light: "rgba(var(--color-purple-rgb), 0.14)" },
  { name: "pink", regular: "var(--color-pink)", light: "rgba(var(--color-pink-rgb), 0.14)" },
  { name: "orange", regular: "var(--color-orange)", light: "rgba(var(--color-orange-rgb), 0.14)" },
  { name: "green", regular: "var(--color-green)", light: "rgba(var(--color-green-rgb), 0.14)" },
  { name: "gray", regular: "var(--text-muted)", light: "var(--background-modifier-hover)" },
  { name: "cyan", regular: "var(--color-cyan)", light: "rgba(var(--color-cyan-rgb), 0.14)" },
  { name: "blue", regular: "var(--color-blue)", light: "rgba(var(--color-blue-rgb), 0.14)" }
] as const;

export interface SlateColorPair {
  regular: string;
  light: string;
}

/**
 * Resolve a CSS color (possibly a `var(--color-*)` reference) to a concrete hex
 * value. Needed for Obsidian's native color picker, which only accepts hex.
 * Returns the input unchanged if it is already hex.
 */
export function resolveColorToHex(value: string, cache?: Map<string, string>): string {
  const trimmed = value.trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return trimmed;
  }
  const cached = cache?.get(trimmed);
  if (cached !== undefined) {
    return cached;
  }
  if (typeof document === "undefined") {
    return "#888888";
  }

  const probe = document.createElement("span");
  probe.style.color = trimmed;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();

  const match = computed.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!match) {
    return "#888888";
  }

  const toHex = (channel: string) => Number(channel).toString(16).padStart(2, "0");
  const hex = `#${toHex(match[1])}${toHex(match[2])}${toHex(match[3])}`;
  cache?.set(trimmed, hex);
  return hex;
}

export function colorForName(value: string, override?: string): SlateColorPair {
  if (override) {
    return {
      regular: override,
      light: lightColorForOverride(override)
    };
  }

  const color = SLATE_COLOR_PALETTE[hashString(value) % SLATE_COLOR_PALETTE.length];
  return {
    regular: color.regular,
    light: color.light
  };
}

export function getProjectColor(
  projectName: string,
  projectColors: Record<string, string>
): SlateColorPair {
  const override = projectColors[projectName];
  const generated = SLATE_COLOR_PALETTE[hashString(projectName) % SLATE_COLOR_PALETTE.length];
  const regular = override || generated.regular;
  return {
    regular,
    light: tintColorForProject(regular)
  };
}

export function getLabelColor(
  labelName: string,
  labelColors: Record<string, string>
): SlateColorPair {
  const normalized = normalizeLabelName(labelName);
  const direct = labelColors[normalized];
  if (direct) {
    return colorWithThemeSafeTint(normalized, direct);
  }

  const existing = Object.entries(labelColors).find(
    ([key]) => normalizeLabelName(key) === normalized
  );
  return colorWithThemeSafeTint(normalized, existing?.[1]);
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = value.charCodeAt(index) + ((hash << 5) - hash);
  }

  return Math.abs(hash);
}

function lightColorForOverride(value: string): string {
  const matchingPaletteColor = SLATE_COLOR_PALETTE.find(
    (color) => color.regular.toLowerCase() === value.toLowerCase()
  );
  if (matchingPaletteColor) {
    return matchingPaletteColor.light;
  }

  const rgb = hexToRgb(value);
  if (!rgb) {
    return value;
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
}

function tintColorForProject(value: string): string {
  return themeSafeTintForColor(value);
}

function colorWithThemeSafeTint(value: string, override?: string): SlateColorPair {
  const color = colorForName(value, override);
  return {
    regular: color.regular,
    light: themeSafeTintForColor(color.regular)
  };
}

function themeSafeTintForColor(value: string): string {
  const rgb = hexToRgb(value);
  if (!rgb) {
    return lightColorForOverride(value);
  }

  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.14)`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!match) {
    return null;
  }

  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  };
}
