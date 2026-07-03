/**
 * Pre-generates all 114 surah PDFs (Arabic + Arabic+Urdu) into public/surah-pdfs/
 * Data: fawazahmed0/quran-api (CDN, no rate limits)
 * Fonts: Amiri Quran Full (Arabic) + Noto Nastaliq Urdu (Urdu)
 *
 * Usage: node scripts/generate-surah-pdfs.mjs
 *        node scripts/generate-surah-pdfs.mjs --surah=1   (single surah)
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import PDFDocument from 'pdfkit';
import { prepareRtlTextForPdf } from './rtl-text.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = resolve(ROOT, 'public/surah-pdfs');
const SURAH_INDEX_PATH = resolve(ROOT, 'src/data/surah-index.json');

const ARABIC_EDITION = 'ara-quranuthmanienc';
const URDU_EDITION = 'urd-fatehmuhammadja';
const API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';

const FONT_URLS = {
  arabic: `${API_BASE}/fonts/amiri-quran-full.ttf`,
  urdu: `${API_BASE}/fonts/noto-nastaliq-urdu-regular.ttf`,
};

const fontCache = new Map();

async function loadFont(key) {
  if (fontCache.has(key)) return fontCache.get(key);
  const response = await fetch(FONT_URLS[key]);
  if (!response.ok) throw new Error(`Font fetch failed: ${key} (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fontCache.set(key, buffer);
  return buffer;
}

async function loadQuranText() {
  const [arabicRes, urduRes] = await Promise.all([
    fetch(`${API_BASE}/editions/${ARABIC_EDITION}.json`),
    fetch(`${API_BASE}/editions/${URDU_EDITION}.json`),
  ]);

  if (!arabicRes.ok || !urduRes.ok) {
    throw new Error('Unable to fetch Quran text from fawazahmed0/quran-api');
  }

  const arabicData = await arabicRes.json();
  const urduData = await urduRes.json();

  const arabicVerses = arabicData.quran ?? arabicData;
  const urduVerses = urduData.quran ?? urduData;

  const bySurah = new Map();

  for (const verse of arabicVerses) {
    const surahId = Number(verse.chapter);
    if (!bySurah.has(surahId)) bySurah.set(surahId, []);
    bySurah.get(surahId).push({
      ayahNumber: Number(verse.verse),
      arabicText: String(verse.text ?? '').trim(),
      urduTranslation: '',
    });
  }

  for (const verse of urduVerses) {
    const surahId = Number(verse.chapter);
    const ayahNumber = Number(verse.verse);
    const entry = bySurah.get(surahId)?.find((a) => a.ayahNumber === ayahNumber);
    if (entry) entry.urduTranslation = String(verse.text ?? '').trim();
  }

  return bySurah;
}

function getBismillah() {
  return 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
}

function shouldShowBismillah(surahId) {
  return surahId !== 1 && surahId !== 9;
}

function renderPdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

async function generatePdf({ surah, ayahs, variant, fonts }) {
  const includeUrdu = variant === 'arabic-urdu';
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 48, right: 48 },
    info: {
      Title: `Surah ${surah.surahName} — ${includeUrdu ? 'Arabic with Urdu' : 'Arabic'}`,
      Author: 'Read al Quran — readalquran.online',
      Subject: `Quran Surah ${surah.id} ${surah.surahName}`,
    },
  });

  doc.registerFont('Arabic', fonts.arabic);
  if (fonts.urdu) doc.registerFont('Urdu', fonts.urdu);

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font('Helvetica').fontSize(10).fillColor('#666666').text('Read al Quran — readalquran.online', {
    align: 'center',
  });
  doc.moveDown(0.5);

  doc.font('Arabic').fontSize(28).fillColor('#1a1a1a').text(surah.surahNameArabic, {
    align: 'center',
    width: pageWidth,
    features: ['rtla', 'rlig', 'calt', 'liga'],
  });
  doc.moveDown(0.3);

  doc.font('Helvetica').fontSize(16).fillColor('#333333').text(`Surah ${surah.surahName}`, {
    align: 'center',
  });
  doc.fontSize(11).fillColor('#666666').text(surah.surahNameTranslation, { align: 'center' });
  doc.fontSize(10).text(`${surah.totalAyah} ayahs · ${surah.revelationPlace}`, { align: 'center' });

  doc.moveDown(1);
  doc
    .strokeColor('#cccccc')
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(1);

  if (shouldShowBismillah(surah.id)) {
    doc.font('Arabic').fontSize(18).fillColor('#1a1a1a').text(getBismillah(), {
      align: 'center',
      width: pageWidth,
      features: ['rtla', 'rlig', 'calt', 'liga'],
    });
    doc.moveDown(1.2);
  }

  for (const ayah of ayahs) {
    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage();
    }

    doc.font('Helvetica').fontSize(9).fillColor('#888888').text(`Ayah ${surah.id}:${ayah.ayahNumber}`, {
      align: 'left',
    });
    doc.moveDown(0.3);

    if (ayah.arabicText) {
      doc.font('Arabic').fontSize(16).fillColor('#1a1a1a').text(ayah.arabicText, {
        align: 'right',
        width: pageWidth,
        lineGap: 6,
        features: ['rtla', 'rlig', 'calt', 'liga'],
      });
      doc.moveDown(0.5);
    }

    if (includeUrdu && ayah.urduTranslation) {
      doc.font('Urdu').fontSize(13).fillColor('#333333').text(ayah.urduTranslation, {
        align: 'right',
        width: pageWidth,
        lineGap: 4,
        features: ['rtla', 'rlig', 'calt', 'liga'],
      });
      doc.moveDown(0.8);
    } else {
      doc.moveDown(0.5);
    }

    doc
      .strokeColor('#eeeeee')
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.8);
  }

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#999999')
    .text(
      `Downloaded from readalquran.online — Surah ${surah.surahName} (${includeUrdu ? 'Arabic + Urdu' : 'Arabic'})`,
      { align: 'center' }
    );

  return renderPdfToBuffer(doc);
}

function buildFileName(surahId, variant) {
  return `${String(surahId).padStart(3, '0')}-${variant}.pdf`;
}

async function main() {
  const surahFilter = process.argv.find((a) => a.startsWith('--surah='));
  const onlySurah = surahFilter ? Number(surahFilter.split('=')[1]) : null;

  const surahIndex = JSON.parse(await readFile(SURAH_INDEX_PATH, 'utf8'));
  await mkdir(OUTPUT_DIR, { recursive: true });

  process.stdout.write('Loading Quran text from fawazahmed0/quran-api...\n');
  const quranBySurah = await loadQuranText();

  process.stdout.write('Loading fonts...\n');
  const fonts = {
    arabic: await loadFont('arabic'),
    urdu: await loadFont('urdu'),
  };

  const manifest = [];
  const surahs = onlySurah
    ? surahIndex.filter((s) => s.id === onlySurah)
    : surahIndex;

  for (const surah of surahs) {
    const ayahs = quranBySurah.get(surah.id) ?? [];
    if (ayahs.length === 0) {
      process.stderr.write(`Skipping surah ${surah.id} — no ayah data\n`);
      continue;
    }

    for (const variant of ['arabic', 'arabic-urdu']) {
      const fileName = buildFileName(surah.id, variant);
      const outPath = join(OUTPUT_DIR, fileName);

      try {
        process.stdout.write(`Generating ${fileName} (${surah.surahName})...\n`);
        const buffer = await generatePdf({ surah, ayahs, variant, fonts });
        await writeFile(outPath, buffer);
        manifest.push({
          surahId: surah.id,
          surahName: surah.surahName,
          variant,
          fileName,
          sizeBytes: buffer.length,
          path: `/surah-pdfs/${fileName}`,
        });
        process.stdout.write(`  ✓ ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)\n`);
      } catch (error) {
        process.stderr.write(
          `  ✗ Failed ${fileName}: ${error instanceof Error ? error.message : String(error)}\n`
        );
      }
    }
  }

  await writeFile(
    join(OUTPUT_DIR, 'manifest.json'),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), files: manifest }, null, 2)}\n`
  );

  process.stdout.write(`\nDone! ${manifest.length} PDFs in ${OUTPUT_DIR}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exit(1);
});
