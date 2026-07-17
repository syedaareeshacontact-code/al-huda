export interface AyahTimingRange {
  ayahNumber: number;
  fromMs: number;
  toMs: number;
}

export interface WordTimingRange extends AyahTimingRange {
  wordIndex: number;
}

export interface ChapterTimestampEntry {
  verse_key?: string;
  timestamp_from?: number;
  timestamp_to?: number;
  segments?: number[][] | null;
}

export interface ParsedChapterTimings {
  ayahs: AyahTimingRange[];
  words: WordTimingRange[];
}

function normalizeSegmentWordIndexes(segments: number[][]): number[][] {
  let highestSeenIndex = 0;

  return segments.map((segment, index) => {
    const rawWordIndex = Number(segment[0]);
    const nextWordIndex = Number(segments[index + 1]?.[0]);
    let wordIndex = rawWordIndex;

    // A small number of upstream timestamp rows contain an isolated index
    // typo (for example 34, 118, 36). Repair only a forward spike that falls
    // back on the next segment; real repeated recitation moves backwards and
    // must be preserved.
    if (
      highestSeenIndex > 0 &&
      rawWordIndex > highestSeenIndex + 1 &&
      Number.isFinite(nextWordIndex) &&
      nextWordIndex < rawWordIndex
    ) {
      wordIndex = highestSeenIndex + 1;
    }

    highestSeenIndex = Math.max(highestSeenIndex, wordIndex);
    return [wordIndex, ...segment.slice(1)];
  });
}

export function parseChapterTimings(
  entries: ChapterTimestampEntry[] | null | undefined
): ParsedChapterTimings {
  const ayahs: AyahTimingRange[] = [];
  const words: WordTimingRange[] = [];

  for (const entry of entries ?? []) {
    const ayahNumber = Number(entry.verse_key?.split(':')[1]);
    const fromMs = Number(entry.timestamp_from);
    const toMs = Number(entry.timestamp_to);

    if (
      !Number.isInteger(ayahNumber) ||
      ayahNumber < 1 ||
      !Number.isFinite(fromMs) ||
      !Number.isFinite(toMs) ||
      toMs <= fromMs
    ) {
      continue;
    }

    ayahs.push({ ayahNumber, fromMs, toMs });

    const validSegments = (entry.segments ?? []).filter((segment) => {
      const wordIndex = Number(segment[0]);
      const wordFromMs = Number(segment[1]);
      const wordToMs = Number(segment[2]);
      return (
        segment.length >= 3 &&
        Number.isInteger(wordIndex) &&
        wordIndex >= 1 &&
        Number.isFinite(wordFromMs) &&
        Number.isFinite(wordToMs) &&
        wordToMs > wordFromMs
      );
    });

    for (const segment of normalizeSegmentWordIndexes(validSegments)) {
      words.push({
        ayahNumber,
        wordIndex: Number(segment[0]),
        fromMs: Number(segment[1]),
        toMs: Number(segment[2]),
      });
    }
  }

  ayahs.sort((left, right) => left.fromMs - right.fromMs);
  words.sort((left, right) => left.fromMs - right.fromMs);
  return { ayahs, words };
}

export function findTimingAtMs<T extends { fromMs: number; toMs: number }>(
  timings: T[],
  currentMs: number,
  endGraceMs = 0
): T | null {
  if (timings.length === 0 || !Number.isFinite(currentMs)) {
    return null;
  }

  let low = 0;
  let high = timings.length - 1;
  let candidateIndex = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (timings[middle].fromMs <= currentMs) {
      candidateIndex = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const candidate = candidateIndex >= 0 ? timings[candidateIndex] : null;
  return candidate && currentMs < candidate.toMs + endGraceMs ? candidate : null;
}
