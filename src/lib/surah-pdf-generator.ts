import 'server-only';

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';

import type { SurahIndexEntry } from '@/lib/quran-index';
import type { AyahContentEntry } from '@/lib/quran-server';
import {
  buildSurahPdfFileName,
  getBismillahText,
  buildSurahPdfPublicPath,
  shouldShowBismillah,
  type SurahPdfVariant,
} from '@/lib/surah-download';
import { prepareRtlTextForPdf } from '@/lib/rtl-text';

const API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';

const FONT_URLS = {
  arabic: `${API_BASE}/fonts/amiri-quran-full.ttf`,
  urdu: `${API_BASE}/fonts/noto-nastaliq-urdu-regular.ttf`,
} as const;

const fontCache = new Map<string, Buffer>();

async function loadFont(key: keyof typeof FONT_URLS): Promise<Buffer> {
  const cached = fontCache.get(key);
  if (cached) return cached;

  const response = await fetch(FONT_URLS[key], {
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) {
    throw new Error(`Unable to load font: ${key} (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fontCache.set(key, buffer);
  return buffer;
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function renderPdfToBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

export function getPrebuiltPdfPath(surahId: number, variant: SurahPdfVariant): string | null {
  const relativePath = buildSurahPdfPublicPath(surahId, variant);
  const absolutePath = join(process.cwd(), 'public', relativePath.replace(/^\//, ''));

  if (!existsSync(absolutePath)) {
    return null;
  }

  return absolutePath;
}

export async function readPrebuiltPdfBuffer(
  surahId: number,
  variant: SurahPdfVariant
): Promise<Buffer | null> {
  const filePath = getPrebuiltPdfPath(surahId, variant);
  if (!filePath) return null;
  return readFile(filePath);
}

export async function generateSurahPdfBuffer(options: {
  surah: SurahIndexEntry;
  ayahs: AyahContentEntry[];
  variant: SurahPdfVariant;
}): Promise<Buffer> {
  const { surah, ayahs, variant } = options;
  const includeUrdu = variant === 'arabic-urdu';

  const [arabicFont, urduFont] = await Promise.all([
    loadFont('arabic'),
    includeUrdu ? loadFont('urdu') : Promise.resolve(null),
  ]);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 48, right: 48 },
    info: {
      Title: `Surah ${surah.surahName} — ${variant === 'arabic' ? 'Arabic' : 'Arabic with Urdu'}`,
      Author: 'Read al Quran — readalquran.online',
      Subject: `Quran Surah ${surah.id} ${surah.surahName}`,
      Keywords: `quran, surah ${surah.surahName}, ${variant}, pdf download`,
    },
  });

  doc.registerFont('Arabic', arabicFont);
  if (urduFont) {
    doc.registerFont('Urdu', urduFont);
  }

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.font('Helvetica').fontSize(10).fillColor('#666666').text('Read al Quran — readalquran.online', {
    align: 'center',
  });
  doc.moveDown(0.5);

  doc.font('Arabic').fontSize(28).fillColor('#1a1a1a').text(prepareRtlTextForPdf(surah.surahNameArabic), {
    align: 'center',
    width: pageWidth,
  });
  doc.moveDown(0.3);

  doc
    .font('Helvetica')
    .fontSize(16)
    .fillColor('#333333')
    .text(`Surah ${surah.surahName}`, { align: 'center' });
  doc.fontSize(11).fillColor('#666666').text(surah.surahNameTranslation, { align: 'center' });
  doc
    .fontSize(10)
    .text(`${surah.totalAyah} ayahs · ${surah.revelationPlace}`, { align: 'center' });

  doc.moveDown(1);
  doc
    .strokeColor('#cccccc')
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.width - doc.page.margins.right, doc.y)
    .stroke();
  doc.moveDown(1);

  if (shouldShowBismillah(surah.id)) {
    doc.font('Arabic').fontSize(18).fillColor('#1a1a1a').text(prepareRtlTextForPdf(getBismillahText()), {
      align: 'center',
      width: pageWidth,
    });
    doc.moveDown(1.2);
  }

  for (const ayah of ayahs) {
    const arabicText = stripHtml(ayah.arabicText);
    const urduText = stripHtml(ayah.urduTranslation);

    if (!arabicText && !urduText) continue;

    if (doc.y > doc.page.height - doc.page.margins.bottom - 100) {
      doc.addPage();
    }

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#888888')
      .text(`Ayah ${surah.id}:${ayah.ayahNumber}`, { align: 'left' });
    doc.moveDown(0.3);

    if (arabicText) {
      doc.font('Arabic').fontSize(16).fillColor('#1a1a1a').text(prepareRtlTextForPdf(arabicText), {
        align: 'left',
        width: pageWidth,
        lineGap: 6,
      });
      doc.moveDown(0.5);
    }

    if (includeUrdu && urduText) {
      doc.font('Urdu').fontSize(13).fillColor('#333333').text(prepareRtlTextForPdf(urduText), {
        align: 'left',
        width: pageWidth,
        lineGap: 4,
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
      `Downloaded from readalquran.online — Surah ${surah.surahName} (${variant === 'arabic' ? 'Arabic only' : 'Arabic + Urdu tarjuma'})`,
      { align: 'center' }
    );

  return renderPdfToBuffer(doc);
}

export async function resolveSurahPdfBuffer(options: {
  surah: SurahIndexEntry;
  ayahs: AyahContentEntry[];
  variant: SurahPdfVariant;
}): Promise<Buffer> {
  const prebuilt = await readPrebuiltPdfBuffer(options.surah.id, options.variant);
  if (prebuilt) return prebuilt;
  return generateSurahPdfBuffer(options);
}
