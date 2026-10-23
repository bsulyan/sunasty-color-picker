# Sunasty Color Picker & Eyedropper

Chrome extension (Manifest V3) for picking screen colors, converting between `HEX`, `RGB`, `HSL`, and `OKLCH`, extracting webpage palettes, and checking `WCAG 2.1` text contrast ratios.

Web tools: [Sunasty Color Picker](https://sunasty.com/color-picker/) | [Sunasty Contrast Checker](https://sunasty.com/contrast-checker/) | [Ulysan](https://ulysan.fr/)

---

## Overview

`sunasty-color-picker` runs locally in the browser with no external network requests or telemetry.

### Features

- **Screen eyedropper & pixel loupe**: uses Chromium's native `EyeDropper` API (`Alt+Shift+C`) alongside a 9x9 pixel magnifier canvas (`chrome.tabs.captureVisibleTab`) for inspecting images, `<canvas>`, video frames, and UI elements.
- **Color conversions**: instant conversion and one-click copy for `HEX`, `RGB`, `HSL`, perceptual `OKLCH` (Oklab matrix transformation), and nearest Tailwind CSS shade matching.
- **Tonal scale & harmonies**: generates a 9-step lightness scale (`50` to `900`) and complementary, analogous, and triadic harmonies from the active color.
- **Webpage palette extractor**: quantizes visible tab pixels to surface the dominant colors used on the active page, with export to CSS custom properties (`.css`) or `.json`.
- **WCAG 2.1 contrast checker**: computes relative luminance ratios (`1:1` to `21:1`), evaluates `AA` and `AAA` compliance for normal and large text, and includes one-click foreground lightness adjustment to meet `AA` (`4.5:1`).
- **Color history**: persists sampled colors in `chrome.storage.local` with search and CSS/JSON export.

---

## Development

### Prerequisites

- Node.js 20+
- npm

### Build

```bash
npm install
npm run build
```

This bundles `src/popup-entry.js` into `popup.js` with `esbuild`, generates the localized `_locales/` files and PNG icons in `icons/`, writes `manifest.json`, and creates the extension archive in `dist/`.

### Test

```bash
npm test
```

Runs the Node unit tests (`src/core/color-math.js` conversions, OKLCH, WCAG contrast ratios, palette quantization) followed by Playwright Chromium E2E tests on `popup.html`.

### Load unpacked in Chrome

1. Run `npm run build`.
2. Open `chrome://extensions` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the repository root folder.

---

## Note en français

Extension Chrome (Manifest V3) combinant pipette à l'écran (`EyeDropper` et loupe au pixel), convertisseur `HEX` / `RGB` / `HSL` / `OKLCH`, extracteur de palette de la page active et vérificateur de contraste `WCAG 2.1 AA / AAA`. Retrouvez également l'outil web complet sur [sunasty.com/color-picker](https://sunasty.com/color-picker/).

## License

[MIT](./LICENSE) — Copyright (c) 2026 [Bastien Sulyan (Ulysan)](https://ulysan.fr/)
