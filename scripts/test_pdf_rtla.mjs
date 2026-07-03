import PDFDocument from 'pdfkit';
import { writeFile } from 'node:fs/promises';
import { prepareRtlTextForPdf } from './rtl-text.mjs';

const API_BASE = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1';
const FONT_URLS = {
  arabic: `${API_BASE}/fonts/amiri-quran-full.ttf`,
  urdu: `${API_BASE}/fonts/noto-nastaliq-urdu-regular.ttf`,
};

async function loadFont(key) {
  const response = await fetch(FONT_URLS[key]);
  return Buffer.from(await response.arrayBuffer());
}

async function run() {
  console.log('Fetching fonts...');
  const arabicFont = await loadFont('arabic');
  const urduFont = await loadFont('urdu');

  const doc = new PDFDocument({ size: 'A4' });
  doc.registerFont('Arabic', arabicFont);
  doc.registerFont('Urdu', urduFont);

  const arabicText = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
  const urduText = 'شروع اللہ کے نام سے جو بڑا مہربان نہایت رحم والا ہے';

  doc.font('Helvetica').fontSize(14).text('Test PDF Rendering Options:');
  doc.moveDown(1);

  // Option 1: Current Implementation (prepareRtlTextForPdf only)
  doc.font('Helvetica').fontSize(10).fillColor('#666').text('Option 1: Current (prepareRtlTextForPdf only)');
  doc.font('Arabic').fontSize(18).fillColor('#000').text(prepareRtlTextForPdf(arabicText));
  doc.font('Urdu').fontSize(14).text(prepareRtlTextForPdf(urduText));
  doc.moveDown(1.5);

  // Option 2: prepareRtlTextForPdf + features: ['rtla']
  doc.font('Helvetica').fontSize(10).fillColor('#666').text('Option 2: prepareRtlTextForPdf + features: [rtla]');
  doc.font('Arabic').fontSize(18).fillColor('#000').text(prepareRtlTextForPdf(arabicText), { features: ['rtla'] });
  doc.font('Urdu').fontSize(14).text(prepareRtlTextForPdf(urduText), { features: ['rtla'] });
  doc.moveDown(1.5);

  // Option 3: Raw text + features: ['rtla']
  doc.font('Helvetica').fontSize(10).fillColor('#666').text('Option 3: Raw text + features: [rtla]');
  doc.font('Arabic').fontSize(18).fillColor('#000').text(arabicText, { features: ['rtla'] });
  doc.font('Urdu').fontSize(14).text(urduText, { features: ['rtla'] });
  doc.moveDown(1.5);

  // Option 4: Raw text + multiple features
  doc.font('Helvetica').fontSize(10).fillColor('#666').text('Option 4: Raw text + features: [rtla, rlig, calt, liga]');
  doc.font('Arabic').fontSize(18).fillColor('#000').text(arabicText, { features: ['rtla', 'rlig', 'calt', 'liga'] });
  doc.font('Urdu').fontSize(14).text(urduText, { features: ['rtla', 'rlig', 'calt', 'liga'] });
  doc.moveDown(1.5);

  // Option 5: Raw text, no features
  doc.font('Helvetica').fontSize(10).fillColor('#666').text('Option 5: Raw text, no features');
  doc.font('Arabic').fontSize(18).fillColor('#000').text(arabicText);
  doc.font('Urdu').fontSize(14).text(urduText);
  doc.moveDown(1.5);

  const chunks = [];
  doc.on('data', (c) => chunks.push(c));
  doc.on('end', async () => {
    const buffer = Buffer.concat(chunks);
    await writeFile('public/test-rtla.pdf', buffer);
    console.log('Generated public/test-rtla.pdf');
  });
  doc.end();
}

run().catch(console.error);
