export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * Formats (r, g, b) integers (0-255) into an uppercase #RRGGBB string.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  const cr = clamp(Math.round(r), 0, 255);
  const cg = clamp(Math.round(g), 0, 255);
  const cb = clamp(Math.round(b), 0, 255);
  return (
    '#' +
    [cr, cg, cb]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

/**
 * Parses a 3-digit or 6-digit hex color string into { r, g, b }.
 * @param {string} hex
 * @returns {{ r: number; g: number; b: number } | null}
 */
export function hexToRgb(hex) {
  const cleaned = String(hex ?? '')
    .trim()
    .replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const r = Number.parseInt(cleaned[0] + cleaned[0], 16);
    const g = Number.parseInt(cleaned[1] + cleaned[1], 16);
    const b = Number.parseInt(cleaned[2] + cleaned[2], 16);
    return { r, g, b };
  }
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    const r = Number.parseInt(cleaned.slice(0, 2), 16);
    const g = Number.parseInt(cleaned.slice(2, 4), 16);
    const b = Number.parseInt(cleaned.slice(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

/**
 * Converts sRGB (0-255) to HSL ({ h: 0-360, s: 0-100, l: 0-100 }).
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function rgbToHsl(r, g, b) {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Converts HSL ({ h: 0-360, s: 0-100, l: 0-100 }) to sRGB ({ r, g, b }).
 * @param {number} h
 * @param {number} s
 * @param {number} l
 */
export function hslToRgb(h, s, l) {
  const hn = (((h % 360) + 360) % 360) / 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const v = Math.round(ln * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;

  return {
    r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hn) * 255),
    b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255),
  };
}

function srgbChannelToLinear(c) {
  const v = clamp(c, 0, 255) / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/**
 * Converts sRGB (0-255) to perceptual OKLCH ({ L: 0-1, C: 0-0.4, h: 0-360 }).
 * Uses Björn Ottosson's Oklab matrix transformation.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function rgbToOklch(r, g, b) {
  const lr = srgbChannelToLinear(r);
  const lg = srgbChannelToLinear(g);
  const lb = srgbChannelToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let h = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return {
    L: Number(clamp(L, 0, 1).toFixed(2)),
    C: Number(C.toFixed(2)),
    h: C < 0.004 ? 0 : Math.round(h),
  };
}

/**
 * Formats an RGB triplet into all standard CSS color strings.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function formatAllColorNotations(r, g, b) {
  const hex = rgbToHex(r, g, b);
  const rgbStr = `rgb(${clamp(Math.round(r), 0, 255)}, ${clamp(Math.round(g), 0, 255)}, ${clamp(Math.round(b), 0, 255)})`;
  const hsl = rgbToHsl(r, g, b);
  const hslStr = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
  const oklch = rgbToOklch(r, g, b);
  const oklchStr = `oklch(${oklch.L} ${oklch.C} ${oklch.h})`;
  const tailwind = findClosestTailwindShade(r, g, b);

  return {
    r: clamp(Math.round(r), 0, 255),
    g: clamp(Math.round(g), 0, 255),
    b: clamp(Math.round(b), 0, 255),
    hex,
    rgbStr,
    hsl,
    hslStr,
    oklch,
    oklchStr,
    tailwind,
  };
}

/**
 * Parses a user-entered color string (hex, rgb(...), hsl(...)) into { r, g, b, hex }.
 * @param {string} input
 */
export function parseColorInput(input) {
  const str = String(input ?? '').trim();
  if (!str) return null;

  const hexMatch = hexToRgb(str);
  if (hexMatch) {
    return { ...hexMatch, hex: rgbToHex(hexMatch.r, hexMatch.g, hexMatch.b) };
  }

  const rgbRegex = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i;
  const mRgb = rgbRegex.exec(str);
  if (mRgb) {
    const r = clamp(Number.parseInt(mRgb[1], 10), 0, 255);
    const g = clamp(Number.parseInt(mRgb[2], 10), 0, 255);
    const b = clamp(Number.parseInt(mRgb[3], 10), 0, 255);
    return { r, g, b, hex: rgbToHex(r, g, b) };
  }

  const hslRegex = /^hsla?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})%?\s*[, ]\s*(\d{1,3})%?/i;
  const mHsl = hslRegex.exec(str);
  if (mHsl) {
    const h = Number.parseInt(mHsl[1], 10);
    const s = Number.parseInt(mHsl[2], 10);
    const l = Number.parseInt(mHsl[3], 10);
    const rgb = hslToRgb(h, s, l);
    return { ...rgb, hex: rgbToHex(rgb.r, rgb.g, rgb.b) };
  }

  return null;
}

/**
 * Reference Tailwind palette for nearest shade matching.
 */
const TAILWIND_PALETTE = [
  ['slate-50', '#F8FAFC'], ['slate-100', '#F1F5F9'], ['slate-200', '#E2E8F0'],
  ['slate-300', '#CBD5E1'], ['slate-400', '#94A3B8'], ['slate-500', '#64748B'],
  ['slate-600', '#475569'], ['slate-700', '#334155'], ['slate-800', '#1E293B'], ['slate-900', '#0F172A'],
  ['red-100', '#FEE2E2'], ['red-300', '#FCA5A5'], ['red-500', '#EF4444'], ['red-600', '#DC2626'], ['red-700', '#B91C1C'], ['red-900', '#7F1D1D'],
  ['orange-100', '#FFEDD5'], ['orange-400', '#FB923C'], ['orange-500', '#F97316'], ['orange-600', '#EA580C'], ['orange-800', '#9A3412'],
  ['amber-100', '#FEF3C7'], ['amber-400', '#FBBF24'], ['amber-500', '#F59E0B'], ['amber-600', '#D97706'], ['amber-800', '#92400E'],
  ['yellow-100', '#FEF9C3'], ['yellow-400', '#FACC15'], ['yellow-500', '#EAB308'], ['yellow-600', '#CA8A04'],
  ['emerald-100', '#D1FAE5'], ['emerald-400', '#34D399'], ['emerald-500', '#10B981'], ['emerald-600', '#059669'], ['emerald-700', '#047857'], ['emerald-900', '#064E3B'],
  ['teal-100', '#CCFBF1'], ['teal-500', '#14B8A6'], ['teal-600', '#0D9488'], ['teal-800', '#115E59'],
  ['cyan-100', '#CFFAFE'], ['cyan-500', '#06B6D4'], ['cyan-600', '#0891B2'], ['cyan-800', '#155E75'],
  ['sky-100', '#E0F2FE'], ['sky-400', '#38BDF8'], ['sky-500', '#0EA5E9'], ['sky-600', '#0284C7'], ['sky-800', '#075985'],
  ['blue-50', '#EFF6FF'], ['blue-100', '#DBEAFE'], ['blue-200', '#BFDBFE'], ['blue-300', '#93C5FD'],
  ['blue-400', '#60A5FA'], ['blue-500', '#3B82F6'], ['blue-600', '#2563EB'], ['blue-700', '#1D4ED8'],
  ['blue-800', '#1E40AF'], ['blue-900', '#1E3A8A'],
  ['indigo-100', '#E0E7FF'], ['indigo-500', '#6366F1'], ['indigo-600', '#4F46E5'], ['indigo-700', '#4338CA'], ['indigo-900', '#312E81'],
  ['violet-100', '#EDE9FE'], ['violet-500', '#8B5CF6'], ['violet-600', '#7C3AED'], ['violet-800', '#5B21B6'],
  ['purple-100', '#F3E8FF'], ['purple-500', '#A855F7'], ['purple-600', '#9333EA'], ['purple-800', '#6B21A8'],
  ['pink-100', '#FCE7F3'], ['pink-500', '#EC4899'], ['pink-600', '#DB2777'], ['pink-800', '#9D174D'],
  ['rose-100', '#FFE4E6'], ['rose-500', '#F43F5E'], ['rose-600', '#E11D48'], ['rose-800', '#9F1239'],
  ['white', '#FFFFFF'], ['black', '#000000'],
];

/**
 * Finds the closest Tailwind CSS shade name for an RGB color.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function findClosestTailwindShade(r, g, b) {
  let bestName = 'slate-500';
  let bestHex = '#64748B';
  let bestDist = Infinity;

  for (const [name, hex] of TAILWIND_PALETTE) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    const dr = r - rgb.r;
    const dg = g - rgb.g;
    const db = b - rgb.b;
    const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
    if (dist < bestDist) {
      bestDist = dist;
      bestName = name;
      bestHex = hex;
    }
  }

  return { name: bestName, hex: bestHex, distance: Math.round(Math.sqrt(bestDist)) };
}

/**
 * Generates a 9-step shade scale (50, 100, 200, 300, 400, 500, 600, 700, 800, 900 -> 9 stops)
 * from any base RGB color.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {Array<{ step: string; hex: string }>}
 */
export function generateShadesScale(r, g, b) {
  const { h, s } = rgbToHsl(r, g, b);
  const stops = [
    { step: '50', l: 96 },
    { step: '100', l: 90 },
    { step: '200', l: 80 },
    { step: '300', l: 68 },
    { step: '400', l: 56 },
    { step: '500', l: 46 },
    { step: '600', l: 37 },
    { step: '700', l: 28 },
    { step: '900', l: 16 },
  ];

  return stops.map(({ step, l }) => {
    const rgb = hslToRgb(h, s, l);
    return {
      step,
      hex: rgbToHex(rgb.r, rgb.g, rgb.b),
    };
  });
}

/**
 * Generates Complementary, Analogous, and Triadic color harmonies.
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function generateHarmonies(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  const makeHex = (deg) => {
    const rgb = hslToRgb((h + deg + 360) % 360, clamp(s, 25, 95), clamp(l, 25, 75));
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  };

  return {
    base: rgbToHex(r, g, b),
    complementary: makeHex(180),
    analogous1: makeHex(-30),
    analogous2: makeHex(30),
    triadic1: makeHex(120),
    triadic2: makeHex(240),
  };
}

/**
 * Computes WCAG 2.1 relative luminance (0.0 to 1.0) for an sRGB triplet.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 */
export function relativeLuminance(r, g, b) {
  const R = srgbChannelToLinear(r);
  const G = srgbChannelToLinear(g);
  const B = srgbChannelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Computes WCAG 2.1 contrast ratio and AA/AAA compliance levels between two hex colors.
 *
 * @param {string} fgHex
 * @param {string} bgHex
 */
export function computeContrastRatio(fgHex, bgHex) {
  const fg = hexToRgb(fgHex) || { r: 15, g: 23, b: 42 };
  const bg = hexToRgb(bgHex) || { r: 255, g: 255, b: 255 };

  const lum1 = relativeLuminance(fg.r, fg.g, fg.b);
  const lum2 = relativeLuminance(bg.r, bg.g, bg.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const rawRatio = (brightest + 0.05) / (darkest + 0.05);
  const ratio = Number(rawRatio.toFixed(2));

  return {
    ratio,
    aaNormal: rawRatio >= 4.5,
    aaLarge: rawRatio >= 3.0,
    aaaNormal: rawRatio >= 7.0,
    aaaLarge: rawRatio >= 4.5,
  };
}

/**
 * Automatically adjusts the foreground color lightness so that its WCAG contrast ratio
 * against bgHex reaches at least targetRatio (default 4.5 for WCAG AA Normal text).
 *
 * @param {string} fgHex
 * @param {string} bgHex
 * @param {number} [targetRatio=4.5]
 * @returns {string} Adjusted foreground #RRGGBB
 */
export function autoFixContrastForAA(fgHex, bgHex, targetRatio = 4.5) {
  const current = computeContrastRatio(fgHex, bgHex);
  if (current.ratio >= targetRatio) {
    return rgbToHex(
      (hexToRgb(fgHex) || { r: 0 }).r,
      (hexToRgb(fgHex) || { g: 0 }).g,
      (hexToRgb(fgHex) || { b: 0 }).b
    );
  }

  const fgRgb = hexToRgb(fgHex) || { r: 37, g: 99, b: 235 };
  const bgRgb = hexToRgb(bgHex) || { r: 255, g: 255, b: 255 };
  const { h, s } = rgbToHsl(fgRgb.r, fgRgb.g, fgRgb.b);
  const bgLum = relativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b);

  // If background is light (lum > 0.18), darken foreground; otherwise lighten foreground
  const darken = bgLum > 0.18;

  if (darken) {
    for (let l = 50; l >= 0; l--) {
      const candRgb = hslToRgb(h, s, l);
      const candHex = rgbToHex(candRgb.r, candRgb.g, candRgb.b);
      if (computeContrastRatio(candHex, bgHex).ratio >= targetRatio) {
        return candHex;
      }
    }
    return '#000000';
  } else {
    for (let l = 50; l <= 100; l++) {
      const candRgb = hslToRgb(h, s, l);
      const candHex = rgbToHex(candRgb.r, candRgb.g, candRgb.b);
      if (computeContrastRatio(candHex, bgHex).ratio >= targetRatio) {
        return candHex;
      }
    }
    return '#FFFFFF';
  }
}

/**
 * Extracts the dominant color palette from an RGBA buffer (e.g. from captureVisibleTab),
 * clustering similar colors by 5-bit quantization and sorting by frequency.
 *
 * @param {Uint8ClampedArray} data
 * @param {number} width
 * @param {number} height
 * @param {number} [maxColors=12]
 * @returns {Array<{ hex: string; count: number; percentage: number }>}
 */
export function extractDominantPaletteFromRgba(data, width, height, maxColors = 12) {
  const totalPixels = Math.floor(data.length / 4);
  if (totalPixels === 0) return [];

  const stride = Math.max(1, Math.floor(totalPixels / 16000));
  const buckets = new Map();
  let sampled = 0;

  for (let p = 0; p < totalPixels; p += stride) {
    const idx = p * 4;
    const a = data[idx + 3];
    if (a < 128) continue;

    // Quantize to multiples of 16 to group near-identical shades
    const r = Math.min(255, Math.round(data[idx] / 16) * 16);
    const g = Math.min(255, Math.round(data[idx + 1] / 16) * 16);
    const b = Math.min(255, Math.round(data[idx + 2] / 16) * 16);

    const key = (r << 16) | (g << 8) | b;
    let entry = buckets.get(key);
    if (!entry) {
      entry = { rSum: 0, gSum: 0, bSum: 0, count: 0 };
      buckets.set(key, entry);
    }
    entry.rSum += data[idx];
    entry.gSum += data[idx + 1];
    entry.bSum += data[idx + 2];
    entry.count += 1;
    sampled += 1;
  }

  if (sampled === 0) return [];

  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
  const distinct = [];

  for (const item of sorted) {
    const avgR = Math.round(item.rSum / item.count);
    const avgG = Math.round(item.gSum / item.count);
    const avgB = Math.round(item.bSum / item.count);

    // Skip if too close to an already selected dominant color
    const tooClose = distinct.some((d) => {
      const dist = Math.hypot(d.r - avgR, d.g - avgG, d.b - avgB);
      return dist < 24;
    });
    if (tooClose) continue;

    distinct.push({
      r: avgR,
      g: avgG,
      b: avgB,
      hex: rgbToHex(avgR, avgG, avgB),
      count: item.count,
      percentage: Number(((item.count / sampled) * 100).toFixed(1)),
    });

    if (distinct.length >= maxColors) break;
  }

  return distinct.map(({ hex, count, percentage }) => ({ hex, count, percentage }));
}

/**
 * Formats an array of hex strings or palette objects as CSS custom properties.
 * @param {Array<string | { hex: string }>} colors
 * @returns {string}
 */
export function exportPaletteToCssVars(colors) {
  const lines = (colors ?? []).map((c, idx) => {
    const hex = typeof c === 'string' ? c : c.hex;
    return `  --color-${idx + 1}: ${hex};`;
  });
  return `:root {\n${lines.join('\n')}\n}`;
}

/**
 * Formats an array of colors as a clean JSON string.
 * @param {Array<unknown>} colors
 * @returns {string}
 */
export function exportPaletteToJson(colors) {
  return JSON.stringify(colors ?? [], null, 2);
}
