(() => {
  // src/core/color-math.js
  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }
  function rgbToHex(r, g, b) {
    const cr = clamp(Math.round(r), 0, 255);
    const cg = clamp(Math.round(g), 0, 255);
    const cb = clamp(Math.round(b), 0, 255);
    return "#" + [cr, cg, cb].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  }
  function hexToRgb(hex) {
    const cleaned = String(hex ?? "").trim().replace(/^#/, "");
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
  function rgbToHsl(r, g, b) {
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
      l: Math.round(l * 100)
    };
  }
  function hslToRgb(h, s, l) {
    const hn = (h % 360 + 360) % 360 / 360;
    const sn = clamp(s, 0, 100) / 100;
    const ln = clamp(l, 0, 100) / 100;
    if (sn === 0) {
      const v = Math.round(ln * 255);
      return { r: v, g: v, b: v };
    }
    const hue2rgb = (p2, q2, t2) => {
      let tt = t2;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p2 + (q2 - p2) * 6 * tt;
      if (tt < 1 / 2) return q2;
      if (tt < 2 / 3) return p2 + (q2 - p2) * (2 / 3 - tt) * 6;
      return p2;
    };
    const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
    const p = 2 * ln - q;
    return {
      r: Math.round(hue2rgb(p, q, hn + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, hn) * 255),
      b: Math.round(hue2rgb(p, q, hn - 1 / 3) * 255)
    };
  }
  function srgbChannelToLinear(c) {
    const v = clamp(c, 0, 255) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }
  function rgbToOklch(r, g, b) {
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
    let h = Math.atan2(bVal, a) * 180 / Math.PI;
    if (h < 0) h += 360;
    return {
      L: Number(clamp(L, 0, 1).toFixed(2)),
      C: Number(C.toFixed(2)),
      h: C < 4e-3 ? 0 : Math.round(h)
    };
  }
  function formatAllColorNotations(r, g, b) {
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
      tailwind
    };
  }
  function parseColorInput(input) {
    const str = String(input ?? "").trim();
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
  var TAILWIND_PALETTE = [
    ["slate-50", "#F8FAFC"],
    ["slate-100", "#F1F5F9"],
    ["slate-200", "#E2E8F0"],
    ["slate-300", "#CBD5E1"],
    ["slate-400", "#94A3B8"],
    ["slate-500", "#64748B"],
    ["slate-600", "#475569"],
    ["slate-700", "#334155"],
    ["slate-800", "#1E293B"],
    ["slate-900", "#0F172A"],
    ["red-100", "#FEE2E2"],
    ["red-300", "#FCA5A5"],
    ["red-500", "#EF4444"],
    ["red-600", "#DC2626"],
    ["red-700", "#B91C1C"],
    ["red-900", "#7F1D1D"],
    ["orange-100", "#FFEDD5"],
    ["orange-400", "#FB923C"],
    ["orange-500", "#F97316"],
    ["orange-600", "#EA580C"],
    ["orange-800", "#9A3412"],
    ["amber-100", "#FEF3C7"],
    ["amber-400", "#FBBF24"],
    ["amber-500", "#F59E0B"],
    ["amber-600", "#D97706"],
    ["amber-800", "#92400E"],
    ["yellow-100", "#FEF9C3"],
    ["yellow-400", "#FACC15"],
    ["yellow-500", "#EAB308"],
    ["yellow-600", "#CA8A04"],
    ["emerald-100", "#D1FAE5"],
    ["emerald-400", "#34D399"],
    ["emerald-500", "#10B981"],
    ["emerald-600", "#059669"],
    ["emerald-700", "#047857"],
    ["emerald-900", "#064E3B"],
    ["teal-100", "#CCFBF1"],
    ["teal-500", "#14B8A6"],
    ["teal-600", "#0D9488"],
    ["teal-800", "#115E59"],
    ["cyan-100", "#CFFAFE"],
    ["cyan-500", "#06B6D4"],
    ["cyan-600", "#0891B2"],
    ["cyan-800", "#155E75"],
    ["sky-100", "#E0F2FE"],
    ["sky-400", "#38BDF8"],
    ["sky-500", "#0EA5E9"],
    ["sky-600", "#0284C7"],
    ["sky-800", "#075985"],
    ["blue-50", "#EFF6FF"],
    ["blue-100", "#DBEAFE"],
    ["blue-200", "#BFDBFE"],
    ["blue-300", "#93C5FD"],
    ["blue-400", "#60A5FA"],
    ["blue-500", "#3B82F6"],
    ["blue-600", "#2563EB"],
    ["blue-700", "#1D4ED8"],
    ["blue-800", "#1E40AF"],
    ["blue-900", "#1E3A8A"],
    ["indigo-100", "#E0E7FF"],
    ["indigo-500", "#6366F1"],
    ["indigo-600", "#4F46E5"],
    ["indigo-700", "#4338CA"],
    ["indigo-900", "#312E81"],
    ["violet-100", "#EDE9FE"],
    ["violet-500", "#8B5CF6"],
    ["violet-600", "#7C3AED"],
    ["violet-800", "#5B21B6"],
    ["purple-100", "#F3E8FF"],
    ["purple-500", "#A855F7"],
    ["purple-600", "#9333EA"],
    ["purple-800", "#6B21A8"],
    ["pink-100", "#FCE7F3"],
    ["pink-500", "#EC4899"],
    ["pink-600", "#DB2777"],
    ["pink-800", "#9D174D"],
    ["rose-100", "#FFE4E6"],
    ["rose-500", "#F43F5E"],
    ["rose-600", "#E11D48"],
    ["rose-800", "#9F1239"],
    ["white", "#FFFFFF"],
    ["black", "#000000"]
  ];
  function findClosestTailwindShade(r, g, b) {
    let bestName = "slate-500";
    let bestHex = "#64748B";
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
  function generateShadesScale(r, g, b) {
    const { h, s } = rgbToHsl(r, g, b);
    const stops = [
      { step: "50", l: 96 },
      { step: "100", l: 90 },
      { step: "200", l: 80 },
      { step: "300", l: 68 },
      { step: "400", l: 56 },
      { step: "500", l: 46 },
      { step: "600", l: 37 },
      { step: "700", l: 28 },
      { step: "900", l: 16 }
    ];
    return stops.map(({ step, l }) => {
      const rgb = hslToRgb(h, s, l);
      return {
        step,
        hex: rgbToHex(rgb.r, rgb.g, rgb.b)
      };
    });
  }
  function generateHarmonies(r, g, b) {
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
      triadic2: makeHex(240)
    };
  }
  function relativeLuminance(r, g, b) {
    const R = srgbChannelToLinear(r);
    const G = srgbChannelToLinear(g);
    const B = srgbChannelToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }
  function computeContrastRatio(fgHex, bgHex) {
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
      aaLarge: rawRatio >= 3,
      aaaNormal: rawRatio >= 7,
      aaaLarge: rawRatio >= 4.5
    };
  }
  function autoFixContrastForAA(fgHex, bgHex, targetRatio = 4.5) {
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
    const darken = bgLum > 0.18;
    if (darken) {
      for (let l = 50; l >= 0; l--) {
        const candRgb = hslToRgb(h, s, l);
        const candHex = rgbToHex(candRgb.r, candRgb.g, candRgb.b);
        if (computeContrastRatio(candHex, bgHex).ratio >= targetRatio) {
          return candHex;
        }
      }
      return "#000000";
    } else {
      for (let l = 50; l <= 100; l++) {
        const candRgb = hslToRgb(h, s, l);
        const candHex = rgbToHex(candRgb.r, candRgb.g, candRgb.b);
        if (computeContrastRatio(candHex, bgHex).ratio >= targetRatio) {
          return candHex;
        }
      }
      return "#FFFFFF";
    }
  }
  function extractDominantPaletteFromRgba(data, width, height, maxColors = 12) {
    const totalPixels = Math.floor(data.length / 4);
    if (totalPixels === 0) return [];
    const stride = Math.max(1, Math.floor(totalPixels / 16e3));
    const buckets = /* @__PURE__ */ new Map();
    let sampled = 0;
    for (let p = 0; p < totalPixels; p += stride) {
      const idx = p * 4;
      const a = data[idx + 3];
      if (a < 128) continue;
      const r = Math.min(255, Math.round(data[idx] / 16) * 16);
      const g = Math.min(255, Math.round(data[idx + 1] / 16) * 16);
      const b = Math.min(255, Math.round(data[idx + 2] / 16) * 16);
      const key = r << 16 | g << 8 | b;
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
        percentage: Number((item.count / sampled * 100).toFixed(1))
      });
      if (distinct.length >= maxColors) break;
    }
    return distinct.map(({ hex, count, percentage }) => ({ hex, count, percentage }));
  }
  function exportPaletteToCssVars(colors) {
    const lines = (colors ?? []).map((c, idx) => {
      const hex = typeof c === "string" ? c : c.hex;
      return `  --color-${idx + 1}: ${hex};`;
    });
    return `:root {
${lines.join("\n")}
}`;
  }
  function exportPaletteToJson(colors) {
    return JSON.stringify(colors ?? [], null, 2);
  }

  // src/core/i18n.js
  var LOCALES = {
    en: {
      extName: "Sunasty Color Picker & Eyedropper",
      extDescription: "Pick any screen color with a pixel magnifier, extract page palettes, and verify text contrast ratios locally in your browser.",
      cmdPickColor: "Open Sunasty Color Picker",
      ctxPickColor: "Inspect page colors with Sunasty",
      tabPick: "Picker",
      tabPalette: "Palette",
      tabContrast: "Contrast",
      tabHistory: "History",
      btnEyedropper: "Pick color from screen",
      btnLoupe: "Pixel loupe on tab",
      loupeTitle: "Click any pixel to sample its exact color",
      loupeClose: "Close loupe",
      labelActiveColor: "Selected color",
      labelHexCode: "Hexadecimal",
      labelRgbCode: "Red Green Blue",
      labelHslCode: "Hue Saturation Lightness",
      labelOklchCode: "Perceptual Lightness Chroma",
      labelTailwind: "Closest Tailwind shade",
      labelShades: "Tonal shade scale",
      labelHarmonies: "Color harmonies",
      harmonyComp: "Complementary",
      harmonyAnalog: "Analogous",
      harmonyTriad: "Triadic",
      btnCopy: "Copy",
      copiedToast: "Copied to clipboard",
      palTitle: "Dominant colors detected on active tab",
      palRescanBtn: "Rescan page",
      palExportCss: "Export CSS variables",
      palExportJson: "Export JSON",
      palEmpty: "Click Rescan to extract colors from the current page.",
      conForeground: "Text color",
      conBackground: "Background color",
      conSwapBtn: "Swap colors",
      conRatioLabel: "Contrast ratio",
      conPreviewTitle: "Sample interface heading",
      conPreviewBody: "Readable body text ensures clear visual hierarchy across light and dark surfaces.",
      conNormalAa: "Normal text AA (4.5)",
      conLargeAa: "Large text AA (3.0)",
      conNormalAaa: "Normal text AAA (7.0)",
      conLargeAaa: "Large text AAA (4.5)",
      conPass: "Pass",
      conFail: "Fail",
      conAutoFixBtn: "Auto-adjust text for AA compliance",
      histSearchPlaceholder: "Filter saved colors...",
      histExportCss: "Export CSS",
      histExportJson: "Export JSON",
      histClearAll: "Clear all",
      histEmpty: "No colors saved in history yet.",
      linkColorTool: "Open full color studio on Sunasty.com →",
      linkContrastTool: "Open contrast analyzer on Sunasty.com →",
      footerTools: "Sunasty.com — 170+ local tools",
      footerBy: "By Ulysan",
      themeToggleTitle: "Switch light and dark theme"
    },
    fr: {
      extName: "Sunasty Pipette & Sélecteur de Couleur",
      extDescription: "Prélevez toute couleur à l’écran avec loupe au pixel, extrayez la palette de la page et vérifiez le contraste de vos textes.",
      cmdPickColor: "Ouvrir la pipette Sunasty",
      ctxPickColor: "Inspecter les couleurs de la page avec Sunasty",
      tabPick: "Pipette",
      tabPalette: "Palette",
      tabContrast: "Contraste",
      tabHistory: "Historique",
      btnEyedropper: "Prélever à l’écran",
      btnLoupe: "Loupe pixel sur l’onglet",
      loupeTitle: "Cliquez sur un pixel pour prélever sa couleur exacte",
      loupeClose: "Fermer la loupe",
      labelActiveColor: "Couleur sélectionnée",
      labelHexCode: "Code hexadécimal",
      labelRgbCode: "Rouge Vert Bleu",
      labelHslCode: "Teinte Saturation Luminosité",
      labelOklchCode: "Espace perceptuel",
      labelTailwind: "Nuance Tailwind proche",
      labelShades: "Échelle de nuances",
      labelHarmonies: "Harmonies chromatiques",
      harmonyComp: "Complémentaire",
      harmonyAnalog: "Analogue",
      harmonyTriad: "Triadique",
      btnCopy: "Copier",
      copiedToast: "Copié dans le presse-papiers",
      palTitle: "Couleurs dominantes détectées sur l’onglet actif",
      palRescanBtn: "Analyser la page",
      palExportCss: "Exporter variables CSS",
      palExportJson: "Exporter JSON",
      palEmpty: "Cliquez sur Analyser pour extraire les couleurs de la page.",
      conForeground: "Couleur du texte",
      conBackground: "Couleur de fond",
      conSwapBtn: "Inverser",
      conRatioLabel: "Ratio de contraste",
      conPreviewTitle: "Exemple de titre d’interface",
      conPreviewBody: "Un contraste suffisant garantit une lecture confortable sur tous les écrans.",
      conNormalAa: "Texte normal AA (4.5)",
      conLargeAa: "Grand texte AA (3.0)",
      conNormalAaa: "Texte normal AAA (7.0)",
      conLargeAaa: "Grand texte AAA (4.5)",
      conPass: "Conforme",
      conFail: "Insuffisant",
      conAutoFixBtn: "Corriger automatiquement pour le niveau AA",
      histSearchPlaceholder: "Rechercher une couleur enregistrée...",
      histExportCss: "Exporter CSS",
      histExportJson: "Exporter JSON",
      histClearAll: "Tout effacer",
      histEmpty: "Aucune couleur enregistrée dans l’historique.",
      linkColorTool: "Atelier de couleurs complet sur Sunasty.com →",
      linkContrastTool: "Vérificateur de contraste sur Sunasty.com →",
      footerTools: "Sunasty.com — 170+ outils locaux",
      footerBy: "Par Ulysan",
      themeToggleTitle: "Basculer le thème clair ou sombre"
    },
    es: {
      extName: "Sunasty Selector de Color y Cuentagotas",
      extDescription: "Captura cualquier color en pantalla con lupa de píxeles, extrae la paleta de la página y comprueba el contraste de lectura.",
      cmdPickColor: "Abrir selector de color Sunasty",
      ctxPickColor: "Inspeccionar colores de la página con Sunasty",
      tabPick: "Selector",
      tabPalette: "Paleta",
      tabContrast: "Contraste",
      tabHistory: "Historial",
      btnEyedropper: "Capturar color en pantalla",
      btnLoupe: "Lupa de píxeles",
      loupeTitle: "Haz clic en cualquier píxel para capturar su color",
      loupeClose: "Cerrar lupa",
      labelActiveColor: "Color seleccionado",
      labelHexCode: "Código hexadecimal",
      labelRgbCode: "Rojo Verde Azul",
      labelHslCode: "Matiz Saturación Luminosidad",
      labelOklchCode: "Espacio perceptual",
      labelTailwind: "Tono Tailwind cercano",
      labelShades: "Escala de matices",
      labelHarmonies: "Armonías de color",
      harmonyComp: "Complementario",
      harmonyAnalog: "Análogo",
      harmonyTriad: "Triádico",
      btnCopy: "Copiar",
      copiedToast: "Copiado al portapapeles",
      palTitle: "Colores dominantes detectados en la pestaña activa",
      palRescanBtn: "Analizar página",
      palExportCss: "Exportar variables CSS",
      palExportJson: "Exportar JSON",
      palEmpty: "Haz clic en Analizar para extraer los colores de la página.",
      conForeground: "Color de texto",
      conBackground: "Color de fondo",
      conSwapBtn: "Intercambiar",
      conRatioLabel: "Relación de contraste",
      conPreviewTitle: "Título de muestra de interfaz",
      conPreviewBody: "Un texto legible mejora la jerarquía visual en superficies claras y oscuras.",
      conNormalAa: "Texto normal AA (4.5)",
      conLargeAa: "Texto grande AA (3.0)",
      conNormalAaa: "Texto normal AAA (7.0)",
      conLargeAaa: "Texto grande AAA (4.5)",
      conPass: "Apto",
      conFail: "Bajo",
      conAutoFixBtn: "Ajustar texto automáticamente para nivel AA",
      histSearchPlaceholder: "Filtrar colores guardados...",
      histExportCss: "Exportar CSS",
      histExportJson: "Exportar JSON",
      histClearAll: "Borrar todo",
      histEmpty: "No hay colores guardados en el historial.",
      linkColorTool: "Estudio de color completo en Sunasty.com →",
      linkContrastTool: "Analizador de contraste en Sunasty.com →",
      footerTools: "Sunasty.com — 170+ herramientas locales",
      footerBy: "Por Ulysan",
      themeToggleTitle: "Cambiar tema claro u oscuro"
    },
    de: {
      extName: "Sunasty Farbwähler & Pipette",
      extDescription: "Wählen Sie jede Bildschirmfarbe mit Pixellupe, extrahieren Sie Seitenpaletten und prüfen Sie den Textkontrast direkt lokal.",
      cmdPickColor: "Sunasty Farbwähler öffnen",
      ctxPickColor: "Seitenfarben mit Sunasty untersuchen",
      tabPick: "Pipette",
      tabPalette: "Palette",
      tabContrast: "Kontrast",
      tabHistory: "Verlauf",
      btnEyedropper: "Farbe vom Bildschirm wählen",
      btnLoupe: "Pixellupe im Tab",
      loupeTitle: "Klicken Sie auf ein Pixel, um die Farbe aufzunehmen",
      loupeClose: "Lupe schließen",
      labelActiveColor: "Ausgewählte Farbe",
      labelHexCode: "Hexadezimalwert",
      labelRgbCode: "Rot Grün Blau",
      labelHslCode: "Farbton Sättigung Helligkeit",
      labelOklchCode: "Wahrnehmungsraum",
      labelTailwind: "Nächster Tailwind-Farbton",
      labelShades: "Abstufungsskala",
      labelHarmonies: "Farbharmonien",
      harmonyComp: "Komplementär",
      harmonyAnalog: "Analog",
      harmonyTriad: "Triadisch",
      btnCopy: "Kopieren",
      copiedToast: "In die Zwischenablage kopiert",
      palTitle: "Dominante Farben im aktiven Tab",
      palRescanBtn: "Seite analysieren",
      palExportCss: "CSS-Variablen exportieren",
      palExportJson: "JSON exportieren",
      palEmpty: "Klicken Sie auf Analysieren, um die Seitenfarben auszulesen.",
      conForeground: "Textfarbe",
      conBackground: "Hintergrundfarbe",
      conSwapBtn: "Tauschen",
      conRatioLabel: "Kontrastverhältnis",
      conPreviewTitle: "Beispielüberschrift der Oberfläche",
      conPreviewBody: "Gut lesbarer Fließtext sorgt für klare Hierarchie auf hellen und dunklen Flächen.",
      conNormalAa: "Normaler Text AA (4.5)",
      conLargeAa: "Großer Text AA (3.0)",
      conNormalAaa: "Normaler Text AAA (7.0)",
      conLargeAaa: "Großer Text AAA (4.5)",
      conPass: "Erfüllt",
      conFail: "Zu niedrig",
      conAutoFixBtn: "Text automatisch für AA-Standard anpassen",
      histSearchPlaceholder: "Gespeicherte Farben filtern...",
      histExportCss: "CSS exportieren",
      histExportJson: "JSON exportieren",
      histClearAll: "Alles löschen",
      histEmpty: "Noch keine Farben im Verlauf gespeichert.",
      linkColorTool: "Vollständiges Farbstudio auf Sunasty.com →",
      linkContrastTool: "Kontrastprüfer auf Sunasty.com →",
      footerTools: "Sunasty.com — 170+ lokale Tools",
      footerBy: "Von Ulysan",
      themeToggleTitle: "Helles oder dunkles Design wechseln"
    },
    it: {
      extName: "Sunasty Selettore Colore e Contagocce",
      extDescription: "Cattura qualsiasi colore sullo schermo con lente pixel, estrai la tavolozza della pagina e verifica il contrasto del testo.",
      cmdPickColor: "Apri selettore colore Sunasty",
      ctxPickColor: "Ispeziona i colori della pagina con Sunasty",
      tabPick: "Contagocce",
      tabPalette: "Tavolozza",
      tabContrast: "Contrasto",
      tabHistory: "Cronologia",
      btnEyedropper: "Cattura colore dallo schermo",
      btnLoupe: "Lente pixel sulla scheda",
      loupeTitle: "Fai clic su un pixel per campionare il colore esatto",
      loupeClose: "Chiudi lente",
      labelActiveColor: "Colore selezionato",
      labelHexCode: "Codice esadecimale",
      labelRgbCode: "Rosso Verde Blu",
      labelHslCode: "Tonalità Saturazione Luminosità",
      labelOklchCode: "Spazio percettivo",
      labelTailwind: "Tinta Tailwind più vicina",
      labelShades: "Scala di sfumature",
      labelHarmonies: "Armonie cromatiche",
      harmonyComp: "Complementare",
      harmonyAnalog: "Analogo",
      harmonyTriad: "Triadico",
      btnCopy: "Copia",
      copiedToast: "Copiato negli appunti",
      palTitle: "Colori dominanti rilevati nella scheda attiva",
      palRescanBtn: "Analizza pagina",
      palExportCss: "Esporta variabili CSS",
      palExportJson: "Esporta JSON",
      palEmpty: "Fai clic su Analizza per estrarre i colori della pagina.",
      conForeground: "Colore del testo",
      conBackground: "Colore di sfondo",
      conSwapBtn: "Inverti",
      conRatioLabel: "Rapporto di contrasto",
      conPreviewTitle: "Titolo di esempio dell’interfaccia",
      conPreviewBody: "Un contrasto adeguato assicura una lettura nitida su superfici chiare e scure.",
      conNormalAa: "Testo normale AA (4.5)",
      conLargeAa: "Testo grande AA (3.0)",
      conNormalAaa: "Testo normale AAA (7.0)",
      conLargeAaa: "Testo grande AAA (4.5)",
      conPass: "Conforme",
      conFail: "Basso",
      conAutoFixBtn: "Regola automaticamente il testo per AA",
      histSearchPlaceholder: "Filtra colori salvati...",
      histExportCss: "Esporta CSS",
      histExportJson: "Esporta JSON",
      histClearAll: "Cancella tutto",
      histEmpty: "Nessun colore salvato nella cronologia.",
      linkColorTool: "Studio colore completo su Sunasty.com →",
      linkContrastTool: "Analizzatore di contrasto su Sunasty.com →",
      footerTools: "Sunasty.com — 170+ strumenti locali",
      footerBy: "Di Ulysan",
      themeToggleTitle: "Cambia tema chiaro o scuro"
    },
    pt_BR: {
      extName: "Sunasty Seletor de Cores e Conta-gotas",
      extDescription: "Capture qualquer cor da tela com lupa de pixels, extraia a paleta da página e verifique o contraste de leitura localmente.",
      cmdPickColor: "Abrir seletor de cores Sunasty",
      ctxPickColor: "Inspecionar cores da página com Sunasty",
      tabPick: "Conta-gotas",
      tabPalette: "Paleta",
      tabContrast: "Contraste",
      tabHistory: "Histórico",
      btnEyedropper: "Capturar cor da tela",
      btnLoupe: "Lupa de pixels na aba",
      loupeTitle: "Clique em qualquer pixel para capturar sua cor exata",
      loupeClose: "Fechar lupa",
      labelActiveColor: "Cor selecionada",
      labelHexCode: "Código hexadecimal",
      labelRgbCode: "Vermelho Verde Azul",
      labelHslCode: "Matiz Saturação Luminosidade",
      labelOklchCode: "Espaço perceptivo",
      labelTailwind: "Tom Tailwind mais próximo",
      labelShades: "Escala de tons",
      labelHarmonies: "Harmonias de cores",
      harmonyComp: "Complementar",
      harmonyAnalog: "Análoga",
      harmonyTriad: "Triádica",
      btnCopy: "Copiar",
      copiedToast: "Copiado para a área de transferência",
      palTitle: "Cores dominantes detectadas na aba ativa",
      palRescanBtn: "Analisar página",
      palExportCss: "Exportar variáveis CSS",
      palExportJson: "Exportar JSON",
      palEmpty: "Clique em Analisar para extrair as cores da página.",
      conForeground: "Cor do texto",
      conBackground: "Cor de fundo",
      conSwapBtn: "Inverter",
      conRatioLabel: "Taxa de contraste",
      conPreviewTitle: "Título de exemplo da interface",
      conPreviewBody: "Um bom contraste garante leitura confortável em superfícies claras e escuras.",
      conNormalAa: "Texto normal AA (4.5)",
      conLargeAa: "Texto grande AA (3.0)",
      conNormalAaa: "Texto normal AAA (7.0)",
      conLargeAaa: "Texto grande AAA (4.5)",
      conPass: "Aprovado",
      conFail: "Insuficiente",
      conAutoFixBtn: "Ajustar texto automaticamente para nível AA",
      histSearchPlaceholder: "Filtrar cores salvas...",
      histExportCss: "Exportar CSS",
      histExportJson: "Exportar JSON",
      histClearAll: "Limpar tudo",
      histEmpty: "Nenhuma cor salva no histórico.",
      linkColorTool: "Estúdio de cores completo no Sunasty.com →",
      linkContrastTool: "Verificador de contraste no Sunasty.com →",
      footerTools: "Sunasty.com — 170+ ferramentas locais",
      footerBy: "Por Ulysan",
      themeToggleTitle: "Alternar tema claro ou escuro"
    },
    ja: {
      extName: "Sunasty カラーピッカー＆スポイトツール",
      extDescription: "ピクセル拡大ルーペで画面上の色を正確に取得し、Webページの配色パレット抽出や文字のコントラスト比判定をローカルで実行します。",
      cmdPickColor: "Sunasty カラーピッカーを開く",
      ctxPickColor: "Sunastyでページの色を検査",
      tabPick: "スポイト",
      tabPalette: "パレット",
      tabContrast: "コントラスト",
      tabHistory: "履歴",
      btnEyedropper: "画面から色を抽出",
      btnLoupe: "タブ上のピクセルルーペ",
      loupeTitle: "ピクセルをクリックして正確な色を取得します",
      loupeClose: "ルーペを閉じる",
      labelActiveColor: "選択中の色",
      labelHexCode: "16進数カラーコード",
      labelRgbCode: "赤・緑・青 (RGB)",
      labelHslCode: "色相・彩度・輝度",
      labelOklchCode: "知覚均等カラースペース",
      labelTailwind: "最も近いTailwindシェード",
      labelShades: "シェードスケール",
      labelHarmonies: "カラーハーモニー",
      harmonyComp: "補色",
      harmonyAnalog: "類似色",
      harmonyTriad: "トライアド",
      btnCopy: "コピー",
      copiedToast: "クリップボードにコピーしました",
      palTitle: "現在のタブで検出された主要な配色",
      palRescanBtn: "ページを再解析",
      palExportCss: "CSS変数を出力",
      palExportJson: "JSON出力",
      palEmpty: "「ページを再解析」をクリックして色を抽出します。",
      conForeground: "文字色",
      conBackground: "背景色",
      conSwapBtn: "入れ替え",
      conRatioLabel: "コントラスト比",
      conPreviewTitle: "インターフェース見出しのサンプル",
      conPreviewBody: "十分なコントラスト比を確保することで、明るい背景でも暗い背景でも高い可読性を維持できます。",
      conNormalAa: "通常文字 AA (4.5)",
      conLargeAa: "大文字 AA (3.0)",
      conNormalAaa: "通常文字 AAA (7.0)",
      conLargeAaa: "大文字 AAA (4.5)",
      conPass: "適合",
      conFail: "不足",
      conAutoFixBtn: "AA基準を満たすよう文字色を自動調整",
      histSearchPlaceholder: "保存した色を検索...",
      histExportCss: "CSS出力",
      histExportJson: "JSON出力",
      histClearAll: "すべて削除",
      histEmpty: "保存された色の履歴はまだありません。",
      linkColorTool: "Sunasty.comで高度なカラーツールを開く →",
      linkContrastTool: "Sunasty.comでコントラストチェッカーを開く →",
      footerTools: "Sunasty.com — 170以上のローカルツール",
      footerBy: "By Ulysan",
      themeToggleTitle: "ライト・ダークテーマ切替"
    },
    zh_CN: {
      extName: "Sunasty 屏幕取色器与网页配色工具",
      extDescription: "通过像素放大镜精准拾取屏幕颜色，自动提取当前网页主题调色板，并在本地实时检测文字与背景的对比度可读性。",
      cmdPickColor: "打开 Sunasty 取色器",
      ctxPickColor: "使用 Sunasty 分析网页颜色",
      tabPick: "取色器",
      tabPalette: "网页配色",
      tabContrast: "对比度",
      tabHistory: "历史",
      btnEyedropper: "从屏幕拾取颜色",
      btnLoupe: "网页像素放大镜",
      loupeTitle: "点击任意像素以提取精确颜色",
      loupeClose: "关闭放大镜",
      labelActiveColor: "当前选中颜色",
      labelHexCode: "十六进制色值",
      labelRgbCode: "红绿蓝通道",
      labelHslCode: "色相饱和度亮度",
      labelOklchCode: "感知均匀色彩空间",
      labelTailwind: "最接近的 Tailwind 色阶",
      labelShades: "明暗色阶过渡",
      labelHarmonies: "色彩调和搭配",
      harmonyComp: "互补色",
      harmonyAnalog: "邻近色",
      harmonyTriad: "三角色",
      btnCopy: "复制",
      copiedToast: "已复制到剪贴板",
      palTitle: "从当前标签页提取的主要配色",
      palRescanBtn: "重新分析网页",
      palExportCss: "导出 CSS 变量",
      palExportJson: "导出 JSON",
      palEmpty: "点击重新分析以提取当前网页使用的颜色。",
      conForeground: "文字颜色",
      conBackground: "背景颜色",
      conSwapBtn: "互换颜色",
      conRatioLabel: "对比度比值",
      conPreviewTitle: "界面标题可读性示例",
      conPreviewBody: "良好的色彩对比度能够确保文字在浅色与深色界面上都清晰易读。",
      conNormalAa: "常规正文 AA (4.5)",
      conLargeAa: "大号文字 AA (3.0)",
      conNormalAaa: "常规正文 AAA (7.0)",
      conLargeAaa: "大号文字 AAA (4.5)",
      conPass: "达标",
      conFail: "不足",
      conAutoFixBtn: "自动调整文字亮度以符合 AA 标准",
      histSearchPlaceholder: "搜索已保存的颜色...",
      histExportCss: "导出 CSS",
      histExportJson: "导出 JSON",
      histClearAll: "清空全部",
      histEmpty: "暂无已保存的取色记录。",
      linkColorTool: "在 Sunasty.com 打开完整色彩工作台 →",
      linkContrastTool: "在 Sunasty.com 打开对比度检测工具 →",
      footerTools: "Sunasty.com — 170+ 本地工具",
      footerBy: "由 Ulysan 出品",
      themeToggleTitle: "切换浅色或深色主题"
    },
    nl: {
      extName: "Sunasty Kleurkiezer & Pipet",
      extDescription: "Kies elke schermkleur met een pixelloep, extraheer het kleurenpalet van de pagina en controleer het tekstcontrast lokaal.",
      cmdPickColor: "Open Sunasty Kleurkiezer",
      ctxPickColor: "Paginakleuren inspecteren met Sunasty",
      tabPick: "Pipet",
      tabPalette: "Palet",
      tabContrast: "Contrast",
      tabHistory: "Geschiedenis",
      btnEyedropper: "Kies kleur van scherm",
      btnLoupe: "Pixelloep op tabblad",
      loupeTitle: "Klik op een pixel om de exacte kleur te kiezen",
      loupeClose: "Sluit loep",
      labelActiveColor: "Geselecteerde kleur",
      labelHexCode: "Hexadecimale waarde",
      labelRgbCode: "Rood Groen Blauw",
      labelHslCode: "Tint Verzadiging Helderheid",
      labelOklchCode: "Perceptuele kleurruimte",
      labelTailwind: "Dichtstbijzijnde Tailwind-tint",
      labelShades: "Tintenschaal",
      labelHarmonies: "Kleurharmonieën",
      harmonyComp: "Complementair",
      harmonyAnalog: "Analoog",
      harmonyTriad: "Triadisch",
      btnCopy: "Kopiëren",
      copiedToast: "Gekopieerd naar klembord",
      palTitle: "Dominante kleuren op het actieve tabblad",
      palRescanBtn: "Pagina analyseren",
      palExportCss: "Exporteer CSS-variabelen",
      palExportJson: "Exporteer JSON",
      palEmpty: "Klik op Analyseren om de kleuren van de pagina op te halen.",
      conForeground: "Tekstkleur",
      conBackground: "Achtergrondkleur",
      conSwapBtn: "Omwisselen",
      conRatioLabel: "Contrastverhouding",
      conPreviewTitle: "Voorbeeldkop van interface",
      conPreviewBody: "Goed leesbare tekst zorgt voor een duidelijke visuele hiërarchie op elk scherm.",
      conNormalAa: "Normale tekst AA (4.5)",
      conLargeAa: "Grote tekst AA (3.0)",
      conNormalAaa: "Normale tekst AAA (7.0)",
      conLargeAaa: "Grote tekst AAA (4.5)",
      conPass: "Voldoet",
      conFail: "Te laag",
      conAutoFixBtn: "Tekst automatisch aanpassen voor AA",
      histSearchPlaceholder: "Opgeslagen kleuren filteren...",
      histExportCss: "Exporteer CSS",
      histExportJson: "Exporteer JSON",
      histClearAll: "Alles wissen",
      histEmpty: "Nog geen kleuren opgeslagen.",
      linkColorTool: "Open volledige kleurstudio op Sunasty.com →",
      linkContrastTool: "Open contrastcontrole op Sunasty.com →",
      footerTools: "Sunasty.com — 170+ lokale tools",
      footerBy: "Door Ulysan",
      themeToggleTitle: "Wissel tussen licht en donker thema"
    },
    pl: {
      extName: "Sunasty Próbnik Kolorów i Pipeta",
      extDescription: "Pobierz dowolny kolor z ekranu za pomocą lupy pikselowej, wyodrębnij paletę strony i sprawdź kontrast tekstu lokalnie.",
      cmdPickColor: "Otwórz próbnik kolorów Sunasty",
      ctxPickColor: "Zbadaj kolory strony za pomocą Sunasty",
      tabPick: "Pipeta",
      tabPalette: "Paleta",
      tabContrast: "Kontrast",
      tabHistory: "Historia",
      btnEyedropper: "Pobierz kolor z ekranu",
      btnLoupe: "Lupa pikselowa na karcie",
      loupeTitle: "Kliknij dowolny piksel, aby pobrać jego dokładny kolor",
      loupeClose: "Zamknij lupę",
      labelActiveColor: "Wybrany kolor",
      labelHexCode: "Wartość szesnastkowa",
      labelRgbCode: "Czerwony Zielony Niebieski",
      labelHslCode: "Odcień Nasycenie Jasność",
      labelOklchCode: "Przestrzeń percepcyjna",
      labelTailwind: "Najbliższy odcień Tailwind",
      labelShades: "Skala odcieni",
      labelHarmonies: "Harmonie barw",
      harmonyComp: "Dopełniający",
      harmonyAnalog: "Analogiczny",
      harmonyTriad: "Triadyczny",
      btnCopy: "Kopiuj",
      copiedToast: "Skopiowano do schowka",
      palTitle: "Dominujące kolory wykryte na aktywnej karcie",
      palRescanBtn: "Analizuj stronę",
      palExportCss: "Eksportuj zmienne CSS",
      palExportJson: "Eksportuj JSON",
      palEmpty: "Kliknij Analizuj, aby wyodrębnić kolory z bieżącej strony.",
      conForeground: "Kolor tekstu",
      conBackground: "Kolor tła",
      conSwapBtn: "Zamień",
      conRatioLabel: "Współczynnik kontrastu",
      conPreviewTitle: "Przykładowy nagłówek interfejsu",
      conPreviewBody: "Odpowiedni kontrast zapewnia wygodne czytanie na jasnych i ciemnych tłach.",
      conNormalAa: "Zwykły tekst AA (4.5)",
      conLargeAa: "Duży tekst AA (3.0)",
      conNormalAaa: "Zwykły tekst AAA (7.0)",
      conLargeAaa: "Duży tekst AAA (4.5)",
      conPass: "Zgodny",
      conFail: "Za niski",
      conAutoFixBtn: "Automatycznie dopasuj tekst do normy AA",
      histSearchPlaceholder: "Filtruj zapisane kolory...",
      histExportCss: "Eksportuj CSS",
      histExportJson: "Eksportuj JSON",
      histClearAll: "Wyczyść wszystko",
      histEmpty: "Brak zapisanych kolorów w historii.",
      linkColorTool: "Pełne studio kolorów na Sunasty.com →",
      linkContrastTool: "Analizator kontrastu na Sunasty.com →",
      footerTools: "Sunasty.com — 170+ lokalnych narzędzi",
      footerBy: "Od Ulysan",
      themeToggleTitle: "Przełącz jasny lub ciemny motyw"
    },
    ko: {
      extName: "Sunasty 컬러 피커 및 화면 스포이드",
      extDescription: "픽셀 돋보기로 화면의 모든 색상을 정확히 추출하고, 웹페이지 색상 팔레트 분석과 텍스트 대비율 검사를 브라우저에서 실행하세요.",
      cmdPickColor: "Sunasty 컬러 피커 열기",
      ctxPickColor: "Sunasty로 페이지 색상 검사",
      tabPick: "스포이드",
      tabPalette: "팔레트",
      tabContrast: "대비율",
      tabHistory: "기록",
      btnEyedropper: "화면에서 색상 추출",
      btnLoupe: "탭 픽셀 돋보기",
      loupeTitle: "픽셀을 클릭하여 정확한 색상을 추출하세요",
      loupeClose: "돋보기 닫기",
      labelActiveColor: "선택된 색상",
      labelHexCode: "16진수 색상 코드",
      labelRgbCode: "빨강 초록 파랑 채널",
      labelHslCode: "색상 채도 명도",
      labelOklchCode: "지각 균일 색공간",
      labelTailwind: "가장 가까운 Tailwind 색상",
      labelShades: "명도 단계 스케일",
      labelHarmonies: "색상 조화",
      harmonyComp: "보색",
      harmonyAnalog: "유사색",
      harmonyTriad: "삼각 배색",
      btnCopy: "복사",
      copiedToast: "클립보드에 복사되었습니다",
      palTitle: "현재 탭에서 감지된 주요 색상",
      palRescanBtn: "페이지 다시 분석",
      palExportCss: "CSS 변수 내보내기",
      palExportJson: "JSON 내보내기",
      palEmpty: "페이지 다시 분석을 눌러 현재 웹페이지의 색상을 추출하세요.",
      conForeground: "텍스트 색상",
      conBackground: "배경 색상",
      conSwapBtn: "색상 전환",
      conRatioLabel: "대비율",
      conPreviewTitle: "인터페이스 제목 텍스트 예시",
      conPreviewBody: "충분한 명도 대비는 밝은 화면과 어두운 화면 모두에서 뛰어난 가독성을 보장합니다.",
      conNormalAa: "일반 텍스트 AA (4.5)",
      conLargeAa: "큰 텍스트 AA (3.0)",
      conNormalAaa: "일반 텍스트 AAA (7.0)",
      conLargeAaa: "큰 텍스트 AAA (4.5)",
      conPass: "통과",
      conFail: "미달",
      conAutoFixBtn: "AA 기준에 맞게 텍스트 밝기 자동 보정",
      histSearchPlaceholder: "저장된 색상 검색...",
      histExportCss: "CSS 내보내기",
      histExportJson: "JSON 내보내기",
      histClearAll: "모두 지우기",
      histEmpty: "아직 저장된 색상 기록이 없습니다.",
      linkColorTool: "Sunasty.com에서 전체 컬러 스튜디오 열기 →",
      linkContrastTool: "Sunasty.com에서 대비율 검사기 열기 →",
      footerTools: "Sunasty.com — 170개 이상의 무료 로컬 도구",
      footerBy: "By Ulysan",
      themeToggleTitle: "라이트 및 다크 테마 전환"
    },
    id: {
      extName: "Sunasty Pemilih Warna & Pipet Layar",
      extDescription: "Ambil warna apa pun di layar dengan kaca pembesar piksel, ekstrak palet halaman web, dan periksa rasio kontras teks secara lokal.",
      cmdPickColor: "Buka Pemilih Warna Sunasty",
      ctxPickColor: "Periksa warna halaman dengan Sunasty",
      tabPick: "Pipet",
      tabPalette: "Palet",
      tabContrast: "Kontras",
      tabHistory: "Riwayat",
      btnEyedropper: "Ambil warna dari layar",
      btnLoupe: "Kaca pembesar piksel",
      loupeTitle: "Klik piksel mana saja untuk mengambil warnanya",
      loupeClose: "Tutup pembesar",
      labelActiveColor: "Warna terpilih",
      labelHexCode: "Kode heksadesimal",
      labelRgbCode: "Merah Hijau Biru",
      labelHslCode: "Rona Saturasi Kecerahan",
      labelOklchCode: "Ruang warna perseptual",
      labelTailwind: "Nuansa Tailwind terdekat",
      labelShades: "Skala gradasi warna",
      labelHarmonies: "Harmoni warna",
      harmonyComp: "Komplementer",
      harmonyAnalog: "Analog",
      harmonyTriad: "Triadik",
      btnCopy: "Salin",
      copiedToast: "Disalin ke papan klip",
      palTitle: "Warna dominan yang terdeteksi di tab aktif",
      palRescanBtn: "Pindai ulang halaman",
      palExportCss: "Ekspor variabel CSS",
      palExportJson: "Ekspor JSON",
      palEmpty: "Klik Pindai ulang untuk mengekstrak warna dari halaman saat ini.",
      conForeground: "Warna teks",
      conBackground: "Warna latar",
      conSwapBtn: "Tukar warna",
      conRatioLabel: "Rasio kontras",
      conPreviewTitle: "Contoh judul antarmuka",
      conPreviewBody: "Kontras yang memadai memastikan teks mudah dibaca di latar terang maupun gelap.",
      conNormalAa: "Teks normal AA (4.5)",
      conLargeAa: "Teks besar AA (3.0)",
      conNormalAaa: "Teks normal AAA (7.0)",
      conLargeAaa: "Teks besar AAA (4.5)",
      conPass: "Lulus",
      conFail: "Kurang",
      conAutoFixBtn: "Sesuaikan teks otomatis untuk standar AA",
      histSearchPlaceholder: "Saring warna tersimpan...",
      histExportCss: "Ekspor CSS",
      histExportJson: "Ekspor JSON",
      histClearAll: "Hapus semua",
      histEmpty: "Belum ada riwayat warna tersimpan.",
      linkColorTool: "Buka studio warna lengkap di Sunasty.com →",
      linkContrastTool: "Buka pemeriksa kontras di Sunasty.com →",
      footerTools: "Sunasty.com — 170+ alat lokal gratis",
      footerBy: "Oleh Ulysan",
      themeToggleTitle: "Ganti tema terang atau gelap"
    },
    tr: {
      extName: "Sunasty Renk Seçici ve Damlalık",
      extDescription: "Piksel büyüteci ile ekrandaki herhangi bir rengi seçin, sayfa renk paletini çıkarın ve metin kontrast oranını yerel olarak ölçün.",
      cmdPickColor: "Sunasty Renk Seçiciyi Aç",
      ctxPickColor: "Sayfa renklerini Sunasty ile incele",
      tabPick: "Damlalık",
      tabPalette: "Palet",
      tabContrast: "Kontrast",
      tabHistory: "Geçmiş",
      btnEyedropper: "Ekrandan renk seç",
      btnLoupe: "Sekmede piksel büyüteci",
      loupeTitle: "Tam rengini almak için herhangi bir piksele tıklayın",
      loupeClose: "Büyüteci kapat",
      labelActiveColor: "Seçilen renk",
      labelHexCode: "Onaltılık renk kodu",
      labelRgbCode: "Kırmızı Yeşil Mavi",
      labelHslCode: "Ton Doygunluk Parlaklık",
      labelOklchCode: "Algısal renk alanı",
      labelTailwind: "En yakın Tailwind tonu",
      labelShades: "Ton ölçeği",
      labelHarmonies: "Renk uyumları",
      harmonyComp: "Tamamlayıcı",
      harmonyAnalog: "Benzer",
      harmonyTriad: "Üçlü",
      btnCopy: "Kopyala",
      copiedToast: "Panoya kopyalandı",
      palTitle: "Aktif sekmede algılanan baskın renkler",
      palRescanBtn: "Sayfayı analiz et",
      palExportCss: "CSS değişkenlerini aktar",
      palExportJson: "JSON dışa aktar",
      palEmpty: "Sayfadaki renkleri çıkarmak için Analiz et düğmesine tıklayın.",
      conForeground: "Metin rengi",
      conBackground: "Arka plan rengi",
      conSwapBtn: "Değiştir",
      conRatioLabel: "Kontrast oranı",
      conPreviewTitle: "Örnek arayüz başlığı",
      conPreviewBody: "Yeterli kontrast oranı, açık ve koyu yüzeylerde net okunabilirlik sağlar.",
      conNormalAa: "Normal metin AA (4.5)",
      conLargeAa: "Büyük metin AA (3.0)",
      conNormalAaa: "Normal metin AAA (7.0)",
      conLargeAaa: "Büyük metin AAA (4.5)",
      conPass: "Uygun",
      conFail: "Yetersiz",
      conAutoFixBtn: "AA uyumu için metin rengini otomatik ayarla",
      histSearchPlaceholder: "Kaydedilen renkleri filtrele...",
      histExportCss: "CSS aktar",
      histExportJson: "JSON aktar",
      histClearAll: "Tümünü temizle",
      histEmpty: "Henüz kaydedilmiş renk geçmişi yok.",
      linkColorTool: "Sunasty.com üzerinde tam renk stüdyosunu aç →",
      linkContrastTool: "Sunasty.com üzerinde kontrast aracını aç →",
      footerTools: "Sunasty.com — 170+ ücretsiz yerel araç",
      footerBy: "Ulysan tarafından",
      themeToggleTitle: "Açık veya koyu temayı değiştir"
    },
    ru: {
      extName: "Sunasty Пипетка и Палитра Цветов",
      extDescription: "Выбирайте любой цвет на экране с пиксельной лупой, извлекайте палитру веб-страницы и проверяйте контрастность текста локально.",
      cmdPickColor: "Открыть пипетку Sunasty",
      ctxPickColor: "Исследовать цвета страницы с Sunasty",
      tabPick: "Пипетка",
      tabPalette: "Палитра",
      tabContrast: "Контраст",
      tabHistory: "История",
      btnEyedropper: "Выбрать цвет с экрана",
      btnLoupe: "Пиксельная лупа вкладки",
      loupeTitle: "Нажмите на любой пиксель для выбора точного цвета",
      loupeClose: "Закрыть лупу",
      labelActiveColor: "Выбранный цвет",
      labelHexCode: "Шестнадцатеричный код",
      labelRgbCode: "Красный Зеленый Синий",
      labelHslCode: "Тон Насыщенность Светлота",
      labelOklchCode: "Перцептивное пространство",
      labelTailwind: "Ближайший оттенок Tailwind",
      labelShades: "Шкала оттенков",
      labelHarmonies: "Цветовые гармонии",
      harmonyComp: "Комплементарный",
      harmonyAnalog: "Аналоговый",
      harmonyTriad: "Триадный",
      btnCopy: "Копировать",
      copiedToast: "Скопировано в буфер обмена",
      palTitle: "Основные цвета активной вкладки",
      palRescanBtn: "Анализировать страницу",
      palExportCss: "Экспорт CSS-переменных",
      palExportJson: "Экспорт JSON",
      palEmpty: "Нажмите Анализировать для извлечения цветов текущей страницы.",
      conForeground: "Цвет текста",
      conBackground: "Цвет фона",
      conSwapBtn: "Поменять",
      conRatioLabel: "Коэффициент контрастности",
      conPreviewTitle: "Пример заголовка интерфейса",
      conPreviewBody: "Достаточный контраст обеспечивает комфортное чтение на светлых и темных поверхностях.",
      conNormalAa: "Обычный текст AA (4.5)",
      conLargeAa: "Крупный текст AA (3.0)",
      conNormalAaa: "Обычный текст AAA (7.0)",
      conLargeAaa: "Крупный текст AAA (4.5)",
      conPass: "Норма",
      conFail: "Низкий",
      conAutoFixBtn: "Автоматически исправить цвет для уровня AA",
      histSearchPlaceholder: "Поиск сохраненных цветов...",
      histExportCss: "Экспорт CSS",
      histExportJson: "Экспорт JSON",
      histClearAll: "Очистить всё",
      histEmpty: "История сохраненных цветов пуста.",
      linkColorTool: "Полная студия цвета на Sunasty.com →",
      linkContrastTool: "Проверка контраста на Sunasty.com →",
      footerTools: "Sunasty.com — 170+ локальных инструментов",
      footerBy: "От Ulysan",
      themeToggleTitle: "Переключить светлую или темную тему"
    },
    vi: {
      extName: "Sunasty Bộ Chọn Màu & Ống Nhỏ Giọt",
      extDescription: "Lấy bất kỳ màu nào trên màn hình với kính lúp điểm ảnh, trích xuất bảng màu trang web và kiểm tra độ tương phản chữ cục bộ.",
      cmdPickColor: "Mở bộ chọn màu Sunasty",
      ctxPickColor: "Kiểm tra màu sắc trang web bằng Sunasty",
      tabPick: "Ống nhỏ giọt",
      tabPalette: "Bảng màu",
      tabContrast: "Tương phản",
      tabHistory: "Lịch sử",
      btnEyedropper: "Chọn màu trên màn hình",
      btnLoupe: "Kính lúp điểm ảnh",
      loupeTitle: "Nhấp vào điểm ảnh bất kỳ để lấy màu chính xác",
      loupeClose: "Đóng kính lúp",
      labelActiveColor: "Màu đang chọn",
      labelHexCode: "Mã thập lục phân",
      labelRgbCode: "Đỏ Lục Lam",
      labelHslCode: "Sắc độ Bão hòa Độ sáng",
      labelOklchCode: "Không gian màu cảm nhận",
      labelTailwind: "Sắc thái Tailwind gần nhất",
      labelShades: "Thang sắc độ",
      labelHarmonies: "Phối màu hài hòa",
      harmonyComp: "Bổ túc",
      harmonyAnalog: "Tương đồng",
      harmonyTriad: "Tam giác",
      btnCopy: "Sao chép",
      copiedToast: "Đã sao chép vào bộ nhớ tạm",
      palTitle: "Các màu chủ đạo phát hiện trên tab hiện tại",
      palRescanBtn: "Phân tích trang",
      palExportCss: "Xuất biến CSS",
      palExportJson: "Xuất JSON",
      palEmpty: "Nhấn Phân tích trang để trích xuất bảng màu từ trang hiện tại.",
      conForeground: "Màu chữ",
      conBackground: "Màu nền",
      conSwapBtn: "Đảo màu",
      conRatioLabel: "Tỷ lệ tương phản",
      conPreviewTitle: "Tiêu đề giao diện mẫu",
      conPreviewBody: "Độ tương phản tốt giúp văn bản hiển thị rõ ràng trên cả nền sáng và nền tối.",
      conNormalAa: "Chữ thường AA (4.5)",
      conLargeAa: "Chữ lớn AA (3.0)",
      conNormalAaa: "Chữ thường AAA (7.0)",
      conLargeAaa: "Chữ lớn AAA (4.5)",
      conPass: "Đạt",
      conFail: "Chưa đạt",
      conAutoFixBtn: "Tự động chỉnh độ sáng chữ đạt chuẩn AA",
      histSearchPlaceholder: "Lọc màu đã lưu...",
      histExportCss: "Xuất CSS",
      histExportJson: "Xuất JSON",
      histClearAll: "Xóa tất cả",
      histEmpty: "Chưa có màu nào trong lịch sử.",
      linkColorTool: "Mở bộ công cụ màu sắc đầy đủ trên Sunasty.com →",
      linkContrastTool: "Mở trình kiểm tra tương phản trên Sunasty.com →",
      footerTools: "Sunasty.com — 170+ công cụ cục bộ miễn phí",
      footerBy: "Bởi Ulysan",
      themeToggleTitle: "Chuyển giao diện sáng hoặc tối"
    },
    ar: {
      extName: "Sunasty منتقي الألوان والقطارة",
      extDescription: "التقط أي لون من الشاشة باستخدام عدسة تكبير البكسل، واستخرج لوحة ألوان الصفحة وتحقق من تباين النصوص محلياً في متصفحك.",
      cmdPickColor: "فتح منتقي الألوان Sunasty",
      ctxPickColor: "فحص ألوان الصفحة باستخدام Sunasty",
      tabPick: "القطارة",
      tabPalette: "لوحة الألوان",
      tabContrast: "التباين",
      tabHistory: "السجل",
      btnEyedropper: "التقاط لون من الشاشة",
      btnLoupe: "عدسة البكسل للتبويب",
      loupeTitle: "انقر على أي بكسل لالتقاط لونه بدقة",
      loupeClose: "إغلاق العدسة",
      labelActiveColor: "اللون المحدد",
      labelHexCode: "الرمز الست عشري",
      labelRgbCode: "أحمر أخضر أزرق",
      labelHslCode: "صبغة تشبع إضاءة",
      labelOklchCode: "الفضاء اللوني الإدراكي",
      labelTailwind: "أقرب درجة في Tailwind",
      labelShades: "تدرجات اللون",
      labelHarmonies: "تناغم الألوان",
      harmonyComp: "مكمل",
      harmonyAnalog: "متجاور",
      harmonyTriad: "ثلاثي",
      btnCopy: "نسخ",
      copiedToast: "تم النسخ إلى الحافظة",
      palTitle: "الألوان السائدة المكتشفة في التبويب النشط",
      palRescanBtn: "تحليل الصفحة",
      palExportCss: "تصدير متغيرات CSS",
      palExportJson: "تصدير JSON",
      palEmpty: "انقر على تحليل الصفحة لاستخراج الألوان المستخدمة.",
      conForeground: "لون النص",
      conBackground: "لون الخلفية",
      conSwapBtn: "تبديل",
      conRatioLabel: "نسبة التباين",
      conPreviewTitle: "عنوان واجهة تجريبي",
      conPreviewBody: "يضمن التباين الجيد قراءة واضحة ومريحة على الأسطح الفاتحة والداكنة.",
      conNormalAa: "نص عادي AA (4.5)",
      conLargeAa: "نص كبير AA (3.0)",
      conNormalAaa: "نص عادي AAA (7.0)",
      conLargeAaa: "نص كبير AAA (4.5)",
      conPass: "مطابق",
      conFail: "غير مطابق",
      conAutoFixBtn: "تعديل النص تلقائياً للتوافق مع معيار AA",
      histSearchPlaceholder: "تصفية الألوان المحفوظة...",
      histExportCss: "تصدير CSS",
      histExportJson: "تصدير JSON",
      histClearAll: "مسح الكل",
      histEmpty: "لا توجد ألوان محفوظة في السجل بعد.",
      linkColorTool: "فتح استوديو الألوان الكامل على Sunasty.com ←",
      linkContrastTool: "فتح فاحص التباين على Sunasty.com ←",
      footerTools: "Sunasty.com — أكثر من 170 أداة محلية مجانية",
      footerBy: "بواسطة Ulysan",
      themeToggleTitle: "تبديل المظهر الفاتح أو الداكن"
    }
  };
  function resolveLocale(overrideLang) {
    if (overrideLang && LOCALES[overrideLang]) {
      return overrideLang;
    }
    let raw = overrideLang || "";
    if (!raw && typeof location !== "undefined") {
      const params = new URLSearchParams(location.search);
      const qLang = params.get("lang");
      if (qLang) raw = qLang;
    }
    if (!raw && typeof chrome !== "undefined" && chrome.i18n?.getUILanguage) {
      raw = chrome.i18n.getUILanguage();
    }
    if (!raw && typeof navigator !== "undefined") {
      raw = navigator.language || "en";
    }
    const norm = String(raw).replace("-", "_");
    if (LOCALES[norm]) return norm;
    if (norm.toLowerCase().startsWith("pt")) return "pt_BR";
    if (norm.toLowerCase().startsWith("zh")) return "zh_CN";
    const short = norm.split("_")[0].toLowerCase();
    if (LOCALES[short]) return short;
    return "en";
  }
  function t(key, locale = "en", vars = {}) {
    const dict = LOCALES[locale] || LOCALES.en;
    let str = dict[key] ?? LOCALES.en[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
    return str;
  }

  // src/popup-entry.js
  var STORAGE_KEY_HISTORY = "sunasty_cp_history";
  var STORAGE_KEY_THEME = "sunasty_cp_theme";
  var MAX_HISTORY_ITEMS = 80;
  var currentLocale = resolveLocale();
  var currentTheme = "light";
  var activeTabName = "pick";
  var activeColor = { r: 37, g: 99, b: 235, hex: "#2563EB" };
  var contrastFgHex = "#0F172A";
  var contrastBgHex = "#FFFFFF";
  var pagePalette = [
    { hex: "#0F172A", percentage: 28.4 },
    { hex: "#2563EB", percentage: 19.2 },
    { hex: "#F8FAFC", percentage: 16.5 },
    { hex: "#475569", percentage: 12.1 },
    { hex: "#E2E8F0", percentage: 9.8 },
    { hex: "#059669", percentage: 5.4 },
    { hex: "#D97706", percentage: 4.1 },
    { hex: "#DC2626", percentage: 2.6 },
    { hex: "#7C3AED", percentage: 1.9 }
  ];
  var historyItems = [];
  var loupeSourceFrame = null;
  var storage = {
    async get(keys) {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, (res) => resolve(res || {}));
        });
      }
      const out = {};
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) {
        try {
          const raw = localStorage.getItem(k);
          if (raw !== null) out[k] = JSON.parse(raw);
        } catch {
        }
      }
      return out;
    },
    async set(obj) {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set(obj, () => resolve());
        });
      }
      for (const [k, v] of Object.entries(obj)) {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch {
        }
      }
    },
    async remove(key) {
      if (typeof chrome !== "undefined" && chrome.storage?.local) {
        return new Promise((resolve) => {
          chrome.storage.local.remove(key, () => resolve());
        });
      }
      try {
        localStorage.removeItem(key);
      } catch {
      }
    }
  };
  function showToast(msg) {
    const banner = document.getElementById("toast-banner");
    if (!banner) return;
    banner.textContent = msg;
    banner.hidden = false;
    clearTimeout(banner._timer);
    banner._timer = setTimeout(() => {
      banner.hidden = true;
    }, 1800);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    showToast(t("copiedToast", currentLocale));
  }
  function triggerDownload(filename, content, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function applyTranslations(locale = currentLocale) {
    currentLocale = resolveLocale(locale);
    document.documentElement.lang = currentLocale.replace("_", "-");
    document.documentElement.dir = currentLocale === "ar" ? "rtl" : "ltr";
    const elements = document.querySelectorAll("[data-i18n]");
    for (const el of elements) {
      const key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = t(key, currentLocale);
      }
    }
    const histSearch = document.getElementById("history-search-input");
    if (histSearch) {
      histSearch.setAttribute("placeholder", t("histSearchPlaceholder", currentLocale));
    }
    const themeBtn = document.getElementById("btn-theme-toggle");
    if (themeBtn) {
      const label = t("themeToggleTitle", currentLocale);
      themeBtn.title = label;
      themeBtn.setAttribute("aria-label", label);
    }
  }
  async function applyTheme(theme, persist = true) {
    currentTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", currentTheme);
    if (persist) {
      await storage.set({ [STORAGE_KEY_THEME]: currentTheme });
    }
  }
  function switchTab(tabName) {
    activeTabName = tabName;
    const tabBtns = document.querySelectorAll(".cp-tab-btn");
    for (const btn of tabBtns) {
      const isTarget = btn.getAttribute("data-tab") === tabName;
      btn.setAttribute("aria-selected", isTarget ? "true" : "false");
    }
    const panels = {
      pick: document.getElementById("panel-pick"),
      palette: document.getElementById("panel-palette"),
      contrast: document.getElementById("panel-contrast"),
      history: document.getElementById("panel-history")
    };
    for (const [name, panel] of Object.entries(panels)) {
      if (panel) {
        panel.hidden = name !== tabName;
      }
    }
    if (tabName === "palette") {
      renderPaletteGrid();
    } else if (tabName === "contrast") {
      updateContrastView();
    } else if (tabName === "history") {
      renderHistoryList();
    }
  }
  async function selectColor(colorStr, recordToHistory = true) {
    const parsed = parseColorInput(colorStr);
    if (!parsed) return;
    activeColor = parsed;
    const notations = formatAllColorNotations(parsed.r, parsed.g, parsed.b);
    const swatchEl = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("active-color-swatch")
    );
    const inputEl = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("active-color-input")
    );
    const twBadge = document.getElementById("tailwind-badge");
    if (swatchEl) swatchEl.value = notations.hex.toLowerCase();
    if (inputEl && document.activeElement !== inputEl) inputEl.value = notations.hex;
    if (twBadge) twBadge.textContent = notations.tailwind.name;
    const setCode = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setCode("val-hex", notations.hex);
    setCode("val-rgb", notations.rgbStr);
    setCode("val-hsl", notations.hslStr);
    setCode("val-oklch", notations.oklchStr);
    const shadesStrip = document.getElementById("shades-strip");
    if (shadesStrip) {
      shadesStrip.innerHTML = "";
      const shades = generateShadesScale(parsed.r, parsed.g, parsed.b);
      for (const s of shades) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "shade-cell";
        btn.title = `${s.step}: ${s.hex}`;
        btn.innerHTML = `
        <span class="shade-box" style="background:${s.hex};"></span>
        <span class="shade-step">${s.step}</span>
      `;
        btn.addEventListener("click", () => {
          selectColor(s.hex, true);
          copyText(s.hex);
        });
        shadesStrip.appendChild(btn);
      }
    }
    const harmoniesStrip = document.getElementById("harmonies-strip");
    if (harmoniesStrip) {
      harmoniesStrip.innerHTML = "";
      const harm = generateHarmonies(parsed.r, parsed.g, parsed.b);
      const list = [
        harm.complementary,
        harm.analogous1,
        harm.analogous2,
        harm.triadic1,
        harm.triadic2
      ];
      for (const hex of list) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "harmony-btn";
        btn.title = hex;
        btn.innerHTML = `<span class="harmony-dot" style="background:${hex};"></span><span>${hex}</span>`;
        btn.addEventListener("click", () => {
          selectColor(hex, true);
          copyText(hex);
        });
        harmoniesStrip.appendChild(btn);
      }
    }
    if (recordToHistory) {
      await appendColorToHistory(notations);
    }
  }
  function renderLoupeMagnifierGrid(cx, cy) {
    if (!loupeSourceFrame) return;
    const gridCanvas = (
      /** @type {HTMLCanvasElement | null} */
      document.getElementById("loupe-grid-canvas")
    );
    const readout = document.getElementById("loupe-coord-readout");
    if (!gridCanvas) return;
    const ctx = gridCanvas.getContext("2d");
    if (!ctx) return;
    const gridCount = 9;
    const half = Math.floor(gridCount / 2);
    const cellSize = 13;
    gridCanvas.width = gridCount * cellSize;
    gridCanvas.height = gridCount * cellSize;
    const { data, width, height } = loupeSourceFrame;
    const centerX = clamp(Math.round(cx), 0, width - 1);
    const centerY = clamp(Math.round(cy), 0, height - 1);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const sx = clamp(centerX + dx, 0, width - 1);
        const sy = clamp(centerY + dy, 0, height - 1);
        const idx = (sy * width + sx) * 4;
        const hex = rgbToHex(data[idx], data[idx + 1], data[idx + 2]);
        const gx = (dx + half) * cellSize;
        const gy = (dy + half) * cellSize;
        ctx.fillStyle = hex;
        ctx.fillRect(gx, gy, cellSize, cellSize);
        ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
        ctx.lineWidth = 1;
        ctx.strokeRect(gx + 0.5, gy + 0.5, cellSize - 1, cellSize - 1);
      }
    }
    const cOffset = half * cellSize;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.strokeRect(cOffset + 1, cOffset + 1, cellSize - 2, cellSize - 2);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1;
    ctx.strokeRect(cOffset, cOffset, cellSize, cellSize);
    const cIdx = (centerY * width + centerX) * 4;
    const centerHex = rgbToHex(data[cIdx], data[cIdx + 1], data[cIdx + 2]);
    if (readout) {
      readout.textContent = `${centerHex} (${centerX}, ${centerY})`;
    }
    return centerHex;
  }
  async function openPixelLoupe(dataUrl) {
    const workspace = document.getElementById("loupe-workspace");
    const srcCanvas = (
      /** @type {HTMLCanvasElement | null} */
      document.getElementById("loupe-source-canvas")
    );
    if (!workspace || !srcCanvas) return;
    workspace.hidden = false;
    if (dataUrl) {
      const img = new Image();
      const ok = await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = dataUrl;
      });
      if (ok) {
        const dispW = 224;
        const dispH = 117;
        srcCanvas.width = dispW;
        srcCanvas.height = dispH;
        const ctx = srcCanvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0, dispW, dispH);
          const imgData = ctx.getImageData(0, 0, dispW, dispH);
          loupeSourceFrame = { data: imgData.data, width: dispW, height: dispH };
        }
      }
    }
    if (!loupeSourceFrame) {
      const dispW = 224;
      const dispH = 117;
      srcCanvas.width = dispW;
      srcCanvas.height = dispH;
      const ctx = srcCanvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 0, dispW, dispH);
        const swatches = ["#0F172A", "#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED"];
        swatches.forEach((col, i) => {
          ctx.fillStyle = col;
          ctx.fillRect(10 + i * 35, 18, 28, 42);
        });
        ctx.fillStyle = "#334155";
        ctx.fillRect(10, 74, 200, 12);
        ctx.fillStyle = "#cbd5e1";
        ctx.fillRect(10, 94, 150, 10);
        const imgData = ctx.getImageData(0, 0, dispW, dispH);
        loupeSourceFrame = { data: imgData.data, width: dispW, height: dispH };
      }
    }
    renderLoupeMagnifierGrid(54, 34);
  }
  function renderPaletteGrid() {
    const grid = document.getElementById("palette-grid");
    if (!grid) return;
    grid.innerHTML = "";
    for (const item of pagePalette) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "palette-card";
      card.innerHTML = `
      <span class="palette-swatch" style="background:${item.hex};"></span>
      <span class="palette-info">
        <span class="palette-hex">${item.hex}</span>
        <span class="palette-pct">${item.percentage}%</span>
      </span>
    `;
      card.addEventListener("click", () => {
        selectColor(item.hex, true);
        copyText(item.hex);
      });
      grid.appendChild(card);
    }
  }
  async function scanActivePagePalette() {
    if (typeof chrome !== "undefined" && chrome.tabs?.captureVisibleTab) {
      try {
        const dataUrl = await new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(null, { format: "png" }, (url) => {
            if (chrome.runtime?.lastError || !url) resolve(null);
            else resolve(url);
          });
        });
        if (dataUrl) {
          await extractPaletteFromDataUrl(dataUrl);
          return;
        }
      } catch {
      }
    }
    renderPaletteGrid();
  }
  async function extractPaletteFromDataUrl(dataUrl) {
    const img = new Image();
    const ok = await new Promise((resolve) => {
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = dataUrl;
    });
    if (!ok) return;
    const w = Math.min(360, img.naturalWidth || 360);
    const h = Math.min(240, img.naturalHeight || 240);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const extracted = extractDominantPaletteFromRgba(imgData.data, w, h, 9);
    if (extracted.length > 0) {
      pagePalette = extracted;
      renderPaletteGrid();
    }
  }
  function updateContrastView() {
    const fgSwatch = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-fg-swatch")
    );
    const fgInput = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-fg-input")
    );
    const bgSwatch = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-bg-swatch")
    );
    const bgInput = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-bg-input")
    );
    if (fgSwatch) fgSwatch.value = contrastFgHex.toLowerCase();
    if (fgInput && document.activeElement !== fgInput) fgInput.value = contrastFgHex;
    if (bgSwatch) bgSwatch.value = contrastBgHex.toLowerCase();
    if (bgInput && document.activeElement !== bgInput) bgInput.value = contrastBgHex;
    const previewBox = document.getElementById("contrast-preview-box");
    if (previewBox) {
      previewBox.style.backgroundColor = contrastBgHex;
      previewBox.style.color = contrastFgHex;
    }
    const res = computeContrastRatio(contrastFgHex, contrastBgHex);
    const ratioEl = document.getElementById("contrast-ratio-value");
    if (ratioEl) {
      ratioEl.textContent = `${res.ratio.toFixed(2)} : 1`;
    }
    const setBadge = (id, pass) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = pass ? t("conPass", currentLocale) : t("conFail", currentLocale);
    };
    setBadge("badge-aa-normal", res.aaNormal);
    setBadge("badge-aa-large", res.aaLarge);
    setBadge("badge-aaa-normal", res.aaaNormal);
    setBadge("badge-aaa-large", res.aaaLarge);
  }
  async function loadHistoryState() {
    const stored = await storage.get([STORAGE_KEY_HISTORY]);
    if (Array.isArray(stored[STORAGE_KEY_HISTORY])) {
      historyItems = stored[STORAGE_KEY_HISTORY];
    } else {
      historyItems = [
        { hex: "#2563EB", rgbStr: "rgb(37, 99, 235)", tailwind: "blue-600" },
        { hex: "#0F172A", rgbStr: "rgb(15, 23, 42)", tailwind: "slate-900" },
        { hex: "#059669", rgbStr: "rgb(5, 150, 105)", tailwind: "emerald-600" }
      ];
    }
    updateHistoryPill();
  }
  function updateHistoryPill() {
    const pill = document.getElementById("history-count-pill");
    if (!pill) return;
    if (historyItems.length > 0) {
      pill.textContent = String(historyItems.length);
      pill.hidden = false;
    } else {
      pill.hidden = true;
    }
  }
  async function appendColorToHistory(notations) {
    historyItems = historyItems.filter((h) => h.hex !== notations.hex);
    historyItems.unshift({
      hex: notations.hex,
      rgbStr: notations.rgbStr,
      tailwind: notations.tailwind.name
    });
    if (historyItems.length > MAX_HISTORY_ITEMS) {
      historyItems = historyItems.slice(0, MAX_HISTORY_ITEMS);
    }
    await storage.set({ [STORAGE_KEY_HISTORY]: historyItems });
    updateHistoryPill();
  }
  function renderHistoryList() {
    const listEl = document.getElementById("history-list");
    const emptyEl = document.getElementById("history-empty");
    const searchInput = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("history-search-input")
    );
    if (!listEl || !emptyEl) return;
    const q = (searchInput?.value || "").trim().toLowerCase();
    const filtered = q ? historyItems.filter(
      (h) => h.hex.toLowerCase().includes(q) || h.tailwind && h.tailwind.toLowerCase().includes(q)
    ) : historyItems;
    listEl.innerHTML = "";
    if (filtered.length === 0) {
      emptyEl.hidden = false;
      return;
    }
    emptyEl.hidden = true;
    for (const item of filtered) {
      const row = document.createElement("div");
      row.className = "history-row";
      row.innerHTML = `
      <div class="history-row-left">
        <span class="palette-swatch" style="background:${item.hex};width:22px;height:22px;"></span>
        <code class="notation-val">${item.hex}</code>
        <span class="mono-badge">${item.tailwind || ""}</span>
      </div>
      <div style="display:flex;gap:4px;">
        <button type="button" class="btn btn-xs btn-secondary js-hist-copy">${t("btnCopy", currentLocale)}</button>
        <button type="button" class="btn btn-xs btn-danger-ghost js-hist-del">✕</button>
      </div>
    `;
      row.querySelector(".history-row-left")?.addEventListener("click", () => {
        selectColor(item.hex, false);
        switchTab("pick");
      });
      row.querySelector(".js-hist-copy")?.addEventListener("click", () => copyText(item.hex));
      row.querySelector(".js-hist-del")?.addEventListener("click", async () => {
        historyItems = historyItems.filter((h) => h.hex !== item.hex);
        await storage.set({ [STORAGE_KEY_HISTORY]: historyItems });
        updateHistoryPill();
        renderHistoryList();
      });
      listEl.appendChild(row);
    }
  }
  async function initPopup() {
    const params = new URLSearchParams(location.search);
    const urlTheme = params.get("theme");
    const saved = await storage.get([STORAGE_KEY_THEME]);
    if (urlTheme === "light" || urlTheme === "dark") {
      await applyTheme(urlTheme, false);
    } else if (saved[STORAGE_KEY_THEME]) {
      await applyTheme(saved[STORAGE_KEY_THEME], false);
    } else {
      await applyTheme("light", false);
    }
    applyTranslations(params.get("lang") || void 0);
    document.getElementById("btn-theme-toggle")?.addEventListener("click", () => {
      applyTheme(currentTheme === "dark" ? "light" : "dark", true);
    });
    const tabBtns = document.querySelectorAll(".cp-tab-btn");
    for (const btn of tabBtns) {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-tab");
        if (target) switchTab(target);
      });
    }
    document.getElementById("btn-eyedropper")?.addEventListener("click", async () => {
      if (typeof window.EyeDropper === "function") {
        try {
          const dropper = new window.EyeDropper();
          const result = await dropper.open();
          if (result && result.sRGBHex) {
            await selectColor(result.sRGBHex, true);
            await copyText(activeColor.hex);
            return;
          }
        } catch {
        }
      }
      await openPixelLoupe();
    });
    document.getElementById("btn-loupe")?.addEventListener("click", async () => {
      let dataUrl = null;
      if (typeof chrome !== "undefined" && chrome.tabs?.captureVisibleTab) {
        dataUrl = await new Promise((resolve) => {
          chrome.tabs.captureVisibleTab(null, { format: "png" }, (url) => {
            if (chrome.runtime?.lastError || !url) resolve(null);
            else resolve(url);
          });
        });
      }
      await openPixelLoupe(dataUrl || void 0);
    });
    document.getElementById("btn-close-loupe")?.addEventListener("click", () => {
      const ws = document.getElementById("loupe-workspace");
      if (ws) ws.hidden = true;
    });
    const loupeSrcCanvas = (
      /** @type {HTMLCanvasElement | null} */
      document.getElementById("loupe-source-canvas")
    );
    if (loupeSrcCanvas) {
      const getCoords = (e) => {
        const rect = loupeSrcCanvas.getBoundingClientRect();
        const x = Math.round((e.clientX - rect.left) / rect.width * loupeSrcCanvas.width);
        const y = Math.round((e.clientY - rect.top) / rect.height * loupeSrcCanvas.height);
        return { x, y };
      };
      loupeSrcCanvas.addEventListener("mousemove", (e) => {
        const { x, y } = getCoords(e);
        renderLoupeMagnifierGrid(x, y);
      });
      loupeSrcCanvas.addEventListener("click", async (e) => {
        const { x, y } = getCoords(e);
        const hex = renderLoupeMagnifierGrid(x, y);
        if (hex) {
          await selectColor(hex, true);
          await copyText(hex);
        }
      });
    }
    const swatchEl = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("active-color-swatch")
    );
    const inputEl = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("active-color-input")
    );
    swatchEl?.addEventListener("input", () => {
      selectColor(swatchEl.value, true);
    });
    inputEl?.addEventListener("input", () => {
      const parsed = parseColorInput(inputEl.value);
      if (parsed) selectColor(parsed.hex, true);
    });
    for (const btn of document.querySelectorAll(".js-copy-val")) {
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-target");
        const val = targetId ? document.getElementById(targetId)?.textContent : "";
        if (val) copyText(val);
      });
    }
    document.getElementById("btn-rescan-palette")?.addEventListener("click", () => {
      scanActivePagePalette();
    });
    document.getElementById("btn-palette-css")?.addEventListener("click", () => {
      triggerDownload("sunasty-palette.css", exportPaletteToCssVars(pagePalette), "text/css;charset=utf-8");
    });
    document.getElementById("btn-palette-json")?.addEventListener("click", () => {
      triggerDownload("sunasty-palette.json", exportPaletteToJson(pagePalette), "application/json;charset=utf-8");
    });
    const fgSwatch = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-fg-swatch")
    );
    const fgInput = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-fg-input")
    );
    const bgSwatch = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-bg-swatch")
    );
    const bgInput = (
      /** @type {HTMLInputElement | null} */
      document.getElementById("contrast-bg-input")
    );
    fgSwatch?.addEventListener("input", () => {
      contrastFgHex = fgSwatch.value.toUpperCase();
      updateContrastView();
    });
    fgInput?.addEventListener("input", () => {
      const p = parseColorInput(fgInput.value);
      if (p) {
        contrastFgHex = p.hex;
        updateContrastView();
      }
    });
    bgSwatch?.addEventListener("input", () => {
      contrastBgHex = bgSwatch.value.toUpperCase();
      updateContrastView();
    });
    bgInput?.addEventListener("input", () => {
      const p = parseColorInput(bgInput.value);
      if (p) {
        contrastBgHex = p.hex;
        updateContrastView();
      }
    });
    document.getElementById("btn-contrast-swap")?.addEventListener("click", () => {
      const tmp = contrastFgHex;
      contrastFgHex = contrastBgHex;
      contrastBgHex = tmp;
      updateContrastView();
    });
    document.getElementById("btn-contrast-autofix")?.addEventListener("click", () => {
      contrastFgHex = autoFixContrastForAA(contrastFgHex, contrastBgHex, 4.5);
      updateContrastView();
    });
    document.getElementById("history-search-input")?.addEventListener("input", renderHistoryList);
    document.getElementById("btn-hist-css")?.addEventListener("click", () => {
      triggerDownload("sunasty-colors-history.css", exportPaletteToCssVars(historyItems), "text/css;charset=utf-8");
    });
    document.getElementById("btn-hist-json")?.addEventListener("click", () => {
      triggerDownload("sunasty-colors-history.json", exportPaletteToJson(historyItems), "application/json;charset=utf-8");
    });
    document.getElementById("btn-hist-clear")?.addEventListener("click", async () => {
      historyItems = [];
      await storage.set({ [STORAGE_KEY_HISTORY]: [] });
      updateHistoryPill();
      renderHistoryList();
    });
    await loadHistoryState();
    await selectColor("#2563EB", false);
    renderPaletteGrid();
    updateContrastView();
    const initialTab = params.get("tab");
    if (initialTab && ["pick", "palette", "contrast", "history"].includes(initialTab)) {
      switchTab(initialTab);
    }
  }
  globalThis.__SUNASTY_COLOR__ = {
    selectColor,
    openPixelLoupe,
    renderLoupeMagnifierGrid,
    switchTab,
    applyTranslations,
    applyTheme,
    setContrastColors(fg, bg) {
      contrastFgHex = fg;
      contrastBgHex = bg;
      updateContrastView();
    },
    extractPaletteFromDataUrl
  };
  document.addEventListener("DOMContentLoaded", () => {
    initPopup();
  });
})();
