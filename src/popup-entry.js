import {
  autoFixContrastForAA,
  clamp,
  computeContrastRatio,
  exportPaletteToCssVars,
  exportPaletteToJson,
  extractDominantPaletteFromRgba,
  formatAllColorNotations,
  generateHarmonies,
  generateShadesScale,
  hexToRgb,
  parseColorInput,
  rgbToHex,
} from './core/color-math.js';
import { resolveLocale, t } from './core/i18n.js';

const STORAGE_KEY_HISTORY = 'sunasty_cp_history';
const STORAGE_KEY_THEME = 'sunasty_cp_theme';
const MAX_HISTORY_ITEMS = 80;

let currentLocale = resolveLocale();
let currentTheme = 'light';
let activeTabName = 'pick';

let activeColor = { r: 37, g: 99, b: 235, hex: '#2563EB' };
let contrastFgHex = '#0F172A';
let contrastBgHex = '#FFFFFF';

let pagePalette = [
  { hex: '#0F172A', percentage: 28.4 },
  { hex: '#2563EB', percentage: 19.2 },
  { hex: '#F8FAFC', percentage: 16.5 },
  { hex: '#475569', percentage: 12.1 },
  { hex: '#E2E8F0', percentage: 9.8 },
  { hex: '#059669', percentage: 5.4 },
  { hex: '#D97706', percentage: 4.1 },
  { hex: '#DC2626', percentage: 2.6 },
  { hex: '#7C3AED', percentage: 1.9 },
];

let historyItems = [];
let loupeSourceFrame = null;

const storage = {
  async get(keys) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
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
        // ignore
      }
    }
    return out;
  },
  async set(obj) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.set(obj, () => resolve());
      });
    }
    for (const [k, v] of Object.entries(obj)) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {
        // ignore
      }
    }
  },
  async remove(key) {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      return new Promise((resolve) => {
        chrome.storage.local.remove(key, () => resolve());
      });
    }
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
  },
};

function showToast(msg) {
  const banner = document.getElementById('toast-banner');
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
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
  showToast(t('copiedToast', currentLocale));
}

function triggerDownload(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function applyTranslations(locale = currentLocale) {
  currentLocale = resolveLocale(locale);
  document.documentElement.lang = currentLocale.replace('_', '-');
  document.documentElement.dir = currentLocale === 'ar' ? 'rtl' : 'ltr';

  const elements = document.querySelectorAll('[data-i18n]');
  for (const el of elements) {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key, currentLocale);
    }
  }

  const histSearch = document.getElementById('history-search-input');
  if (histSearch) {
    histSearch.setAttribute('placeholder', t('histSearchPlaceholder', currentLocale));
  }
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    const label = t('themeToggleTitle', currentLocale);
    themeBtn.title = label;
    themeBtn.setAttribute('aria-label', label);
  }
}

async function applyTheme(theme, persist = true) {
  currentTheme = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  if (persist) {
    await storage.set({ [STORAGE_KEY_THEME]: currentTheme });
  }
}

function switchTab(tabName) {
  activeTabName = tabName;
  const tabBtns = document.querySelectorAll('.cp-tab-btn');
  for (const btn of tabBtns) {
    const isTarget = btn.getAttribute('data-tab') === tabName;
    btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
  }

  const panels = {
    pick: document.getElementById('panel-pick'),
    palette: document.getElementById('panel-palette'),
    contrast: document.getElementById('panel-contrast'),
    history: document.getElementById('panel-history'),
  };

  for (const [name, panel] of Object.entries(panels)) {
    if (panel) {
      panel.hidden = name !== tabName;
    }
  }

  if (tabName === 'palette') {
    renderPaletteGrid();
  } else if (tabName === 'contrast') {
    updateContrastView();
  } else if (tabName === 'history') {
    renderHistoryList();
  }
}

async function selectColor(colorStr, recordToHistory = true) {
  const parsed = parseColorInput(colorStr);
  if (!parsed) return;

  activeColor = parsed;
  const notations = formatAllColorNotations(parsed.r, parsed.g, parsed.b);

  const swatchEl = /** @type {HTMLInputElement | null} */ (document.getElementById('active-color-swatch'));
  const inputEl = /** @type {HTMLInputElement | null} */ (document.getElementById('active-color-input'));
  const twBadge = document.getElementById('tailwind-badge');

  if (swatchEl) swatchEl.value = notations.hex.toLowerCase();
  if (inputEl && document.activeElement !== inputEl) inputEl.value = notations.hex;
  if (twBadge) twBadge.textContent = notations.tailwind.name;

  const setCode = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setCode('val-hex', notations.hex);
  setCode('val-rgb', notations.rgbStr);
  setCode('val-hsl', notations.hslStr);
  setCode('val-oklch', notations.oklchStr);

  // Render 9-step shade scale
  const shadesStrip = document.getElementById('shades-strip');
  if (shadesStrip) {
    shadesStrip.innerHTML = '';
    const shades = generateShadesScale(parsed.r, parsed.g, parsed.b);
    for (const s of shades) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shade-cell';
      btn.title = `${s.step}: ${s.hex}`;
      btn.innerHTML = `
        <span class="shade-box" style="background:${s.hex};"></span>
        <span class="shade-step">${s.step}</span>
      `;
      btn.addEventListener('click', () => {
        selectColor(s.hex, true);
        copyText(s.hex);
      });
      shadesStrip.appendChild(btn);
    }
  }

  // Render color harmonies
  const harmoniesStrip = document.getElementById('harmonies-strip');
  if (harmoniesStrip) {
    harmoniesStrip.innerHTML = '';
    const harm = generateHarmonies(parsed.r, parsed.g, parsed.b);
    const list = [
      harm.complementary,
      harm.analogous1,
      harm.analogous2,
      harm.triadic1,
      harm.triadic2,
    ];
    for (const hex of list) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'harmony-btn';
      btn.title = hex;
      btn.innerHTML = `<span class="harmony-dot" style="background:${hex};"></span><span>${hex}</span>`;
      btn.addEventListener('click', () => {
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

/**
 * Renders the magnified 9x9 pixel grid on #loupe-grid-canvas centered at (cx, cy)
 * in loupeSourceFrame.
 */
function renderLoupeMagnifierGrid(cx, cy) {
  if (!loupeSourceFrame) return;
  const gridCanvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('loupe-grid-canvas'));
  const readout = document.getElementById('loupe-coord-readout');
  if (!gridCanvas) return;

  const ctx = gridCanvas.getContext('2d');
  if (!ctx) return;

  const gridCount = 9;
  const half = Math.floor(gridCount / 2);
  const cellSize = 13; // 9 * 13 = 117px
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
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(gx + 0.5, gy + 0.5, cellSize - 1, cellSize - 1);
    }
  }

  // Highlight center pixel [4, 4]
  const cOffset = half * cellSize;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(cOffset + 1, cOffset + 1, cellSize - 2, cellSize - 2);
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1;
  ctx.strokeRect(cOffset, cOffset, cellSize, cellSize);

  const cIdx = (centerY * width + centerX) * 4;
  const centerHex = rgbToHex(data[cIdx], data[cIdx + 1], data[cIdx + 2]);
  if (readout) {
    readout.textContent = `${centerHex} (${centerX}, ${centerY})`;
  }
  return centerHex;
}

/**
 * Loads a captured tab image Data URL (or synthetic sample canvas) into the Pixel Loupe.
 * @param {string} [dataUrl]
 */
async function openPixelLoupe(dataUrl) {
  const workspace = document.getElementById('loupe-workspace');
  const srcCanvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('loupe-source-canvas'));
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
      const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(img, 0, 0, dispW, dispH);
        const imgData = ctx.getImageData(0, 0, dispW, dispH);
        loupeSourceFrame = { data: imgData.data, width: dispW, height: dispH };
      }
    }
  }

  // If no tab capture was available (e.g. standalone test), draw a clean UI sample canvas
  if (!loupeSourceFrame) {
    const dispW = 224;
    const dispH = 117;
    srcCanvas.width = dispW;
    srcCanvas.height = dispH;
    const ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, dispW, dispH);
      const swatches = ['#0F172A', '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED'];
      swatches.forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.fillRect(10 + i * 35, 18, 28, 42);
      });
      ctx.fillStyle = '#334155';
      ctx.fillRect(10, 74, 200, 12);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(10, 94, 150, 10);
      const imgData = ctx.getImageData(0, 0, dispW, dispH);
      loupeSourceFrame = { data: imgData.data, width: dispW, height: dispH };
    }
  }

  renderLoupeMagnifierGrid(54, 34);
}

function renderPaletteGrid() {
  const grid = document.getElementById('palette-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (const item of pagePalette) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'palette-card';
    card.innerHTML = `
      <span class="palette-swatch" style="background:${item.hex};"></span>
      <span class="palette-info">
        <span class="palette-hex">${item.hex}</span>
        <span class="palette-pct">${item.percentage}%</span>
      </span>
    `;
    card.addEventListener('click', () => {
      selectColor(item.hex, true);
      copyText(item.hex);
    });
    grid.appendChild(card);
  }
}

async function scanActivePagePalette() {
  if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
    try {
      const dataUrl = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
          if (chrome.runtime?.lastError || !url) resolve(null);
          else resolve(url);
        });
      });
      if (dataUrl) {
        await extractPaletteFromDataUrl(dataUrl);
        return;
      }
    } catch {
      // fallback below
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
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
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
  const fgSwatch = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-fg-swatch'));
  const fgInput = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-fg-input'));
  const bgSwatch = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-bg-swatch'));
  const bgInput = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-bg-input'));

  if (fgSwatch) fgSwatch.value = contrastFgHex.toLowerCase();
  if (fgInput && document.activeElement !== fgInput) fgInput.value = contrastFgHex;
  if (bgSwatch) bgSwatch.value = contrastBgHex.toLowerCase();
  if (bgInput && document.activeElement !== bgInput) bgInput.value = contrastBgHex;

  const previewBox = document.getElementById('contrast-preview-box');
  if (previewBox) {
    previewBox.style.backgroundColor = contrastBgHex;
    previewBox.style.color = contrastFgHex;
  }

  const res = computeContrastRatio(contrastFgHex, contrastBgHex);
  const ratioEl = document.getElementById('contrast-ratio-value');
  if (ratioEl) {
    ratioEl.textContent = `${res.ratio.toFixed(2)} : 1`;
  }

  const setBadge = (id, pass) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = pass ? t('conPass', currentLocale) : t('conFail', currentLocale);
  };

  setBadge('badge-aa-normal', res.aaNormal);
  setBadge('badge-aa-large', res.aaLarge);
  setBadge('badge-aaa-normal', res.aaaNormal);
  setBadge('badge-aaa-large', res.aaaLarge);
}

async function loadHistoryState() {
  const stored = await storage.get([STORAGE_KEY_HISTORY]);
  if (Array.isArray(stored[STORAGE_KEY_HISTORY])) {
    historyItems = stored[STORAGE_KEY_HISTORY];
  } else {
    historyItems = [
      { hex: '#2563EB', rgbStr: 'rgb(37, 99, 235)', tailwind: 'blue-600' },
      { hex: '#0F172A', rgbStr: 'rgb(15, 23, 42)', tailwind: 'slate-900' },
      { hex: '#059669', rgbStr: 'rgb(5, 150, 105)', tailwind: 'emerald-600' },
    ];
  }
  updateHistoryPill();
}

function updateHistoryPill() {
  const pill = document.getElementById('history-count-pill');
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
    tailwind: notations.tailwind.name,
  });
  if (historyItems.length > MAX_HISTORY_ITEMS) {
    historyItems = historyItems.slice(0, MAX_HISTORY_ITEMS);
  }
  await storage.set({ [STORAGE_KEY_HISTORY]: historyItems });
  updateHistoryPill();
}

function renderHistoryList() {
  const listEl = document.getElementById('history-list');
  const emptyEl = document.getElementById('history-empty');
  const searchInput = /** @type {HTMLInputElement | null} */ (document.getElementById('history-search-input'));
  if (!listEl || !emptyEl) return;

  const q = (searchInput?.value || '').trim().toLowerCase();
  const filtered = q
    ? historyItems.filter(
        (h) =>
          h.hex.toLowerCase().includes(q) ||
          (h.tailwind && h.tailwind.toLowerCase().includes(q))
      )
    : historyItems;

  listEl.innerHTML = '';
  if (filtered.length === 0) {
    emptyEl.hidden = false;
    return;
  }
  emptyEl.hidden = true;

  for (const item of filtered) {
    const row = document.createElement('div');
    row.className = 'history-row';
    row.innerHTML = `
      <div class="history-row-left">
        <span class="palette-swatch" style="background:${item.hex};width:22px;height:22px;"></span>
        <code class="notation-val">${item.hex}</code>
        <span class="mono-badge">${item.tailwind || ''}</span>
      </div>
      <div style="display:flex;gap:4px;">
        <button type="button" class="btn btn-xs btn-secondary js-hist-copy">${t('btnCopy', currentLocale)}</button>
        <button type="button" class="btn btn-xs btn-danger-ghost js-hist-del">✕</button>
      </div>
    `;
    row.querySelector('.history-row-left')?.addEventListener('click', () => {
      selectColor(item.hex, false);
      switchTab('pick');
    });
    row.querySelector('.js-hist-copy')?.addEventListener('click', () => copyText(item.hex));
    row.querySelector('.js-hist-del')?.addEventListener('click', async () => {
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
  const urlTheme = params.get('theme');
  const saved = await storage.get([STORAGE_KEY_THEME]);

  if (urlTheme === 'light' || urlTheme === 'dark') {
    await applyTheme(urlTheme, false);
  } else if (saved[STORAGE_KEY_THEME]) {
    await applyTheme(saved[STORAGE_KEY_THEME], false);
  } else {
    await applyTheme('light', false);
  }

  applyTranslations(params.get('lang') || undefined);

  document.getElementById('btn-theme-toggle')?.addEventListener('click', () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark', true);
  });

  // Tab navigation
  const tabBtns = document.querySelectorAll('.cp-tab-btn');
  for (const btn of tabBtns) {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');
      if (target) switchTab(target);
    });
  }

  // Eyedropper button
  document.getElementById('btn-eyedropper')?.addEventListener('click', async () => {
    if (typeof window.EyeDropper === 'function') {
      try {
        const dropper = new window.EyeDropper();
        const result = await dropper.open();
        if (result && result.sRGBHex) {
          await selectColor(result.sRGBHex, true);
          await copyText(activeColor.hex);
          return;
        }
      } catch {
        // User cancelled or EyeDropper unavailable in headless environment
      }
    }
    await openPixelLoupe();
  });

  // Pixel Loupe button & canvas events
  document.getElementById('btn-loupe')?.addEventListener('click', async () => {
    let dataUrl = null;
    if (typeof chrome !== 'undefined' && chrome.tabs?.captureVisibleTab) {
      dataUrl = await new Promise((resolve) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
          if (chrome.runtime?.lastError || !url) resolve(null);
          else resolve(url);
        });
      });
    }
    await openPixelLoupe(dataUrl || undefined);
  });

  document.getElementById('btn-close-loupe')?.addEventListener('click', () => {
    const ws = document.getElementById('loupe-workspace');
    if (ws) ws.hidden = true;
  });

  const loupeSrcCanvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('loupe-source-canvas'));
  if (loupeSrcCanvas) {
    const getCoords = (e) => {
      const rect = loupeSrcCanvas.getBoundingClientRect();
      const x = Math.round(((e.clientX - rect.left) / rect.width) * loupeSrcCanvas.width);
      const y = Math.round(((e.clientY - rect.top) / rect.height) * loupeSrcCanvas.height);
      return { x, y };
    };
    loupeSrcCanvas.addEventListener('mousemove', (e) => {
      const { x, y } = getCoords(e);
      renderLoupeMagnifierGrid(x, y);
    });
    loupeSrcCanvas.addEventListener('click', async (e) => {
      const { x, y } = getCoords(e);
      const hex = renderLoupeMagnifierGrid(x, y);
      if (hex) {
        await selectColor(hex, true);
        await copyText(hex);
      }
    });
  }

  // Active color inputs
  const swatchEl = /** @type {HTMLInputElement | null} */ (document.getElementById('active-color-swatch'));
  const inputEl = /** @type {HTMLInputElement | null} */ (document.getElementById('active-color-input'));

  swatchEl?.addEventListener('input', () => {
    selectColor(swatchEl.value, true);
  });
  inputEl?.addEventListener('input', () => {
    const parsed = parseColorInput(inputEl.value);
    if (parsed) selectColor(parsed.hex, true);
  });

  // Copy buttons
  for (const btn of document.querySelectorAll('.js-copy-val')) {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const val = targetId ? document.getElementById(targetId)?.textContent : '';
      if (val) copyText(val);
    });
  }

  // Palette tab events
  document.getElementById('btn-rescan-palette')?.addEventListener('click', () => {
    scanActivePagePalette();
  });
  document.getElementById('btn-palette-css')?.addEventListener('click', () => {
    triggerDownload('sunasty-palette.css', exportPaletteToCssVars(pagePalette), 'text/css;charset=utf-8');
  });
  document.getElementById('btn-palette-json')?.addEventListener('click', () => {
    triggerDownload('sunasty-palette.json', exportPaletteToJson(pagePalette), 'application/json;charset=utf-8');
  });

  // Contrast tab events
  const fgSwatch = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-fg-swatch'));
  const fgInput = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-fg-input'));
  const bgSwatch = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-bg-swatch'));
  const bgInput = /** @type {HTMLInputElement | null} */ (document.getElementById('contrast-bg-input'));

  fgSwatch?.addEventListener('input', () => {
    contrastFgHex = fgSwatch.value.toUpperCase();
    updateContrastView();
  });
  fgInput?.addEventListener('input', () => {
    const p = parseColorInput(fgInput.value);
    if (p) {
      contrastFgHex = p.hex;
      updateContrastView();
    }
  });
  bgSwatch?.addEventListener('input', () => {
    contrastBgHex = bgSwatch.value.toUpperCase();
    updateContrastView();
  });
  bgInput?.addEventListener('input', () => {
    const p = parseColorInput(bgInput.value);
    if (p) {
      contrastBgHex = p.hex;
      updateContrastView();
    }
  });

  document.getElementById('btn-contrast-swap')?.addEventListener('click', () => {
    const tmp = contrastFgHex;
    contrastFgHex = contrastBgHex;
    contrastBgHex = tmp;
    updateContrastView();
  });

  document.getElementById('btn-contrast-autofix')?.addEventListener('click', () => {
    contrastFgHex = autoFixContrastForAA(contrastFgHex, contrastBgHex, 4.5);
    updateContrastView();
  });

  // History tab events
  document.getElementById('history-search-input')?.addEventListener('input', renderHistoryList);
  document.getElementById('btn-hist-css')?.addEventListener('click', () => {
    triggerDownload('sunasty-colors-history.css', exportPaletteToCssVars(historyItems), 'text/css;charset=utf-8');
  });
  document.getElementById('btn-hist-json')?.addEventListener('click', () => {
    triggerDownload('sunasty-colors-history.json', exportPaletteToJson(historyItems), 'application/json;charset=utf-8');
  });
  document.getElementById('btn-hist-clear')?.addEventListener('click', async () => {
    historyItems = [];
    await storage.set({ [STORAGE_KEY_HISTORY]: [] });
    updateHistoryPill();
    renderHistoryList();
  });

  await loadHistoryState();
  await selectColor('#2563EB', false);
  renderPaletteGrid();
  updateContrastView();

  const initialTab = params.get('tab');
  if (initialTab && ['pick', 'palette', 'contrast', 'history'].includes(initialTab)) {
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
  extractPaletteFromDataUrl,
};

document.addEventListener('DOMContentLoaded', () => {
  initPopup();
});
