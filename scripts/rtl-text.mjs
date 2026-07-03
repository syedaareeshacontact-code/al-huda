import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

/**
 * PDFKit renders strings LTR. Reorder RTL text (Arabic/Urdu) into visual order
 * so words and letters display correctly. Do NOT use arabic-reshaper here —
 * presentation forms break Amiri/Noto OpenType layout in pdfkit/fontkit.
 */
export function prepareRtlTextForPdf(text) {
  if (!text || !String(text).trim()) return '';

  const normalized = String(text).trim();
  const embeddingLevels = bidi.getEmbeddingLevels(normalized, 'rtl');
  return bidi.getReorderedString(normalized, embeddingLevels);
}
