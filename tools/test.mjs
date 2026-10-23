#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

import {
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToOklch,
  formatAllColorNotations,
  parseColorInput,
  findClosestTailwindShade,
  generateShadesScale,
  generateHarmonies,
  computeContrastRatio,
  autoFixContrastForAA,
  extractDominantPaletteFromRgba,
  exportPaletteToCssVars,
  exportPaletteToJson,
} from '../src/core/color-math.js';
import { SUPPORTED_LOCALES } from '../src/core/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const TOOLS_DIR = path.dirname(__filename);
const EXT_DIR = path.resolve(TOOLS_DIR, '..');

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch {
    return await chromium.launch({ channel: 'chrome', headless: true });
  }
}

function runUnitTests() {
  console.log('Running unit tests...');

  assert.equal(rgbToHex(37, 99, 235), '#2563EB');
  assert.deepEqual(hexToRgb('#2563EB'), { r: 37, g: 99, b: 235 });
  assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 });
  assert.equal(hexToRgb('invalid'), null);

  const hsl = rgbToHsl(37, 99, 235);
  assert.equal(hsl.h, 221);
  assert.equal(hsl.s, 83);
  assert.equal(hsl.l, 53);
  const rgbBack = hslToRgb(hsl.h, hsl.s, hsl.l);
  assert.ok(Math.abs(rgbBack.r - 37) <= 2);
  assert.ok(Math.abs(rgbBack.g - 99) <= 2);
  assert.ok(Math.abs(rgbBack.b - 235) <= 2);

  const oklch = rgbToOklch(37, 99, 235);
  assert.ok(oklch.L > 0.5 && oklch.L < 0.6);
  assert.ok(oklch.C > 0.15 && oklch.C < 0.25);
  assert.ok(oklch.h > 250 && oklch.h < 270);

  const notations = formatAllColorNotations(37, 99, 235);
  assert.equal(notations.hex, '#2563EB');
  assert.equal(notations.rgbStr, 'rgb(37, 99, 235)');
  assert.equal(notations.hslStr, 'hsl(221, 83%, 53%)');
  assert.match(notations.oklchStr, /^oklch\(/);
  assert.equal(notations.tailwind.name, 'blue-600');
  assert.equal(notations.tailwind.distance, 0);

  assert.equal(parseColorInput('#10b981')?.hex, '#10B981');
  assert.equal(parseColorInput('10b981')?.hex, '#10B981');
  assert.equal(parseColorInput('rgb(16, 185, 129)')?.hex, '#10B981');
  assert.equal(parseColorInput('hsl(221, 83%, 53%)')?.hex, '#2463EB');
  assert.equal(parseColorInput('not-a-color'), null);

  const tw = findClosestTailwindShade(15, 23, 42);
  assert.equal(tw.name, 'slate-900');
  assert.equal(tw.distance, 0);

  const shades = generateShadesScale(37, 99, 235);
  assert.equal(shades.length, 9);
  assert.equal(shades[0].step, '50');
  assert.equal(shades[8].step, '900');

  const harmonies = generateHarmonies(37, 99, 235);
  assert.equal(harmonies.base, '#2563EB');
  assert.match(harmonies.complementary, /^#[0-9A-F]{6}$/);
  assert.match(harmonies.triadic1, /^#[0-9A-F]{6}$/);

  assert.equal(computeContrastRatio('#FFFFFF', '#000000').ratio, 21);
  assert.equal(computeContrastRatio('#2563EB', '#2563EB').ratio, 1);

  const wcagPass = computeContrastRatio('#0F172A', '#FFFFFF');
  assert.equal(wcagPass.aaNormal, true);
  assert.equal(wcagPass.aaaNormal, true);

  const wcagFail = computeContrastRatio('#94A3B8', '#FFFFFF');
  assert.equal(wcagFail.aaNormal, false);

  const fixedHex = autoFixContrastForAA('#94A3B8', '#FFFFFF', 4.5);
  const fixedCheck = computeContrastRatio(fixedHex, '#FFFFFF');
  assert.ok(fixedCheck.ratio >= 4.5);

  const width = 20;
  const height = 20;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    if (i < 250) {
      rgba[offset] = 15;
      rgba[offset + 1] = 23;
      rgba[offset + 2] = 42;
      rgba[offset + 3] = 255;
    } else {
      rgba[offset] = 37;
      rgba[offset + 1] = 99;
      rgba[offset + 2] = 235;
      rgba[offset + 3] = 255;
    }
  }
  const palette = extractDominantPaletteFromRgba(rgba, width, height, 8);
  assert.ok(palette.length >= 2);
  assert.equal(palette[0].hex, '#0F172A');

  const cssVars = exportPaletteToCssVars(palette);
  assert.match(cssVars, /:root \{/);
  assert.match(cssVars, /--color-1: #0F172A;/);

  const jsonExport = JSON.parse(exportPaletteToJson(palette));
  assert.equal(jsonExport[0].hex, '#0F172A');

  const manifestPath = path.join(EXT_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.default_locale, 'en');
  assert.equal(SUPPORTED_LOCALES.length, 16);

  for (const lang of SUPPORTED_LOCALES) {
    const msgPath = path.join(EXT_DIR, '_locales', lang, 'messages.json');
    assert.ok(fs.existsSync(msgPath), `Missing messages.json for ${lang}`);
  }

  console.log('Unit tests passed.');
}

async function runPlaywrightE2E() {
  console.log('Running Playwright E2E tests...');
  const browser = await launchBrowser();

  try {
    const context = await browser.newContext({
      viewport: { width: 400, height: 560 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));

    const popupUrl = pathToFileURL(path.join(EXT_DIR, 'popup.html')).href;
    await page.goto(popupUrl, { waitUntil: 'networkidle' });

    const hexValue = await page.locator('#val-hex').textContent();
    assert.equal(hexValue.trim(), '#2563EB');

    await page.fill('#active-color-input', '#10B981');
    await page.dispatchEvent('#active-color-input', 'input');
    assert.equal((await page.locator('#val-hex').textContent()).trim(), '#10B981');
    assert.equal((await page.locator('#tailwind-badge').textContent()).trim(), 'emerald-500');

    await page.evaluate(async () => {
      await window.__SUNASTY_COLOR__.openPixelLoupe();
    });
    assert.equal(await page.locator('#loupe-workspace').isVisible(), true);
    await page.click('#btn-close-loupe');

    await page.click('#tab-btn-palette');
    const paletteCount = await page.locator('.palette-card').count();
    assert.ok(paletteCount >= 6);

    await page.click('#tab-btn-contrast');
    await page.evaluate(() => {
      window.__SUNASTY_COLOR__.setContrastColors('#94A3B8', '#FFFFFF');
    });

    const ratioBefore = parseFloat(await page.locator('#contrast-ratio-value').textContent());
    assert.ok(ratioBefore < 4.5);

    await page.click('#btn-contrast-autofix');
    const ratioAfter = parseFloat(await page.locator('#contrast-ratio-value').textContent());
    assert.ok(ratioAfter >= 4.5);

    await page.click('#tab-btn-history');
    const historyItems = await page.locator('.history-row').count();
    assert.ok(historyItems >= 3);

    await page.evaluate(() => {
      window.__SUNASTY_COLOR__.applyTranslations('ar');
    });
    assert.equal(await page.getAttribute('html', 'dir'), 'rtl');

    await page.evaluate(() => {
      window.__SUNASTY_COLOR__.applyTranslations('en');
    });

    assert.equal(errors.length, 0, `Unexpected console/page errors: ${errors.join('; ')}`);
    console.log('Playwright E2E tests passed.');
  } finally {
    await browser.close();
  }
}

async function main() {
  runUnitTests();
  await runPlaywrightE2E();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
