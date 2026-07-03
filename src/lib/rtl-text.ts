import 'server-only';

import bidiFactory from 'bidi-js';

const bidi = bidiFactory();

/**
 * PDFKit renders strings LTR. Reorder RTL text (Arabic/Urdu) into visual order
 * so words and letters display correctly when drawn with align:left.
 */
export function prepareRtlTextForPdf(text: string): string {
  if (!text.trim()) return '';

  const normalized = text.trim();
  const embeddingLevels = bidi.getEmbeddingLevels(normalized, 'rtl');
  return bidi.getReorderedString(normalized, embeddingLevels);
}
