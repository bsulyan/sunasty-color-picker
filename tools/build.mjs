#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';
import sharp from 'sharp';
import { zipSync } from 'fflate';
import { LOCALES, SUPPORTED_LOCALES } from '../src/core/i18n.js';

const __filename = fileURLToPath(import.meta.url);
const TOOLS_DIR = path.dirname(__filename);
const ROOT_DIR = path.resolve(TOOLS_DIR, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const ZIP_PATH = path.join(DIST_DIR, 'sunasty-color-picker-v1.0.1.zip');

const RUNTIME_ENTRIES = [
  'manifest.json',
  'popup.html',
  'popup.css',
  'popup.js',
  'background.js',
  'icons',
  '_locales',
];

function createIconSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 128 128" fill="none">
  <rect x="6" y="6" width="116" height="116" rx="28" fill="#0F172A"/>
  <rect x="8" y="8" width="112" height="112" rx="26" stroke="#334155" stroke-width="2"/>
  <rect x="22" y="82" width="18" height="18" rx="5" fill="#2563EB"/>
  <rect x="44" y="82" width="18" height="18" rx="5" fill="#10B981"/>
  <rect x="66" y="82" width="18" height="18" rx="5" fill="#F59E0B"/>
  <path d="M84.5 24.5C88.9183 20.0817 96.0817 20.0817 100.5 24.5C104.918 28.9183 104.918 36.0817 100.5 40.5L88.5 52.5L72.5 36.5L84.5 24.5Z" fill="#38BDF8"/>
  <path d="M67 31L94 58" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"/>
  <path d="M72.5 36.5L88.5 52.5L56.5 84.5L38.5 88.5L42.5 70.5L72.5 36.5Z" fill="#FFFFFF"/>
  <path d="M56.5 84.5L38.5 88.5L42.5 70.5L63.5 49.5L77.5 63.5L56.5 84.5Z" fill="#E2E8F0"/>
  <circle cx="33" cy="94" r="5.5" fill="#38BDF8"/>
</svg>`;
}

async function generateIcons() {
  const iconsDir = path.join(ROOT_DIR, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  for (const size of [16, 32, 48, 128]) {
    const svgBuffer = Buffer.from(createIconSvg(size));
    const outPath = path.join(iconsDir, `icon-${size}.png`);
    await sharp(svgBuffer).resize(size, size).png({ compressionLevel: 9 }).toFile(outPath);
  }
}

function generateLocales() {
  const localesRoot = path.join(ROOT_DIR, '_locales');
  for (const lang of SUPPORTED_LOCALES) {
    const dict = LOCALES[lang];
    if (!dict) throw new Error(`Missing locale dictionary for: ${lang}`);
    if (dict.extName.length > 75) {
      throw new Error(`[${lang}] extName exceeds 75 chars (${dict.extName.length})`);
    }
    if (dict.extDescription.length > 132) {
      throw new Error(`[${lang}] extDescription exceeds 132 chars (${dict.extDescription.length})`);
    }

    const langDir = path.join(localesRoot, lang);
    fs.mkdirSync(langDir, { recursive: true });

    const messagesJson = {};
    for (const [key, value] of Object.entries(dict)) {
      messagesJson[key] = { message: String(value) };
    }
    messagesJson.cmdPickColor = { message: String(dict.cmdPickColor || dict.extName) };
    messagesJson.actionTitle = { message: String(dict.cmdPickColor || dict.extName) };

    fs.writeFileSync(
      path.join(langDir, 'messages.json'),
      JSON.stringify(messagesJson, null, 2) + '\n',
      'utf8'
    );
  }
}

function generateManifest() {
  const manifest = {
    manifest_version: 3,
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    version: '1.0.2',
    default_locale: 'en',
    author: 'Bastien Sulyan (Ulysan)',
    homepage_url: 'https://sunasty.com/color-picker/',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_title: '__MSG_extName__',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    background: {
      service_worker: 'background.js',
    },
    permissions: ['activeTab', 'storage', 'scripting', 'contextMenus'],
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Alt+Shift+C',
          mac: 'Alt+Shift+C',
        },
        description: '__MSG_cmdPickColor__',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
  };

  fs.writeFileSync(path.join(ROOT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
}

async function bundleScripts() {
  await esbuild.build({
    entryPoints: [path.join(SRC_DIR, 'popup-entry.js')],
    bundle: true,
    format: 'iife',
    target: ['chrome109'],
    outfile: path.join(ROOT_DIR, 'popup.js'),
    minify: false,
    legalComments: 'none',
    charset: 'utf8',
    tsconfigRaw: '{}',
  });
}

function collectDirForZip(dir, baseDir, acc) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      collectDirForZip(full, baseDir, acc);
    } else {
      const rel = path.relative(baseDir, full).replace(/\\/g, '/');
      acc[rel] = new Uint8Array(fs.readFileSync(full));
    }
  }
}

function collectRuntimeFilesForZip(rootDir) {
  const acc = {};
  for (const item of RUNTIME_ENTRIES) {
    const full = path.join(rootDir, item);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      collectDirForZip(full, rootDir, acc);
    } else {
      acc[item] = new Uint8Array(fs.readFileSync(full));
    }
  }
  return acc;
}

async function main() {
  fs.mkdirSync(DIST_DIR, { recursive: true });
  await generateIcons();
  generateLocales();
  generateManifest();
  await bundleScripts();

  const filesMap = collectRuntimeFilesForZip(ROOT_DIR);
  const zipped = zipSync(filesMap, { level: 9 });
  fs.writeFileSync(ZIP_PATH, Buffer.from(zipped));

  console.log(`Built extension -> ${ROOT_DIR}`);
  console.log(`Packaged ZIP (${Object.keys(filesMap).length} files, ${zipped.byteLength} bytes) -> ${ZIP_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
