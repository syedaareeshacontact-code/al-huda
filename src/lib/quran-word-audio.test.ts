import { describe, expect, it } from 'vitest';

import {
  buildQuranWordAudioFallbackUrl,
  parseQuranComWordAudioPayload,
  type QuranComWordAudioVerse,
} from './quran-word-audio';

describe('Quran word audio mapping', () => {
  it('builds a zero-padded canonical WBW audio URL', () => {
    expect(buildQuranWordAudioFallbackUrl(2, 5, 8)).toBe(
      'https://audio.qurancdn.com/wbw/002_005_008.mp3'
    );
  });

  it('repairs Quran.com audio URLs shifted by a pause mark in Ayah 2:5', () => {
    const verse: QuranComWordAudioVerse = {
      verse_number: 5,
      verse_key: '2:5',
      words: [
        { position: 1, char_type_name: 'word', text_uthmani: 'أُو۟لَـٰٓئِكَ', audio_url: 'wbw/002_005_001.mp3' },
        { position: 2, char_type_name: 'word', text_uthmani: 'عَلَىٰ', audio_url: 'wbw/002_005_002.mp3' },
        { position: 3, char_type_name: 'word', text_uthmani: 'هُدًۭى', audio_url: 'wbw/002_005_003.mp3' },
        { position: 4, char_type_name: 'word', text_uthmani: 'مِّن', audio_url: 'wbw/002_005_004.mp3' },
        { position: 5, char_type_name: 'word', text_uthmani: 'رَّبِّهِمْ ۖ', audio_url: 'wbw/002_005_005.mp3' },
        { position: 6, char_type_name: 'word', text_uthmani: 'وَأُو۟لَـٰٓئِكَ', audio_url: 'wbw/002_005_007.mp3' },
        { position: 7, char_type_name: 'word', text_uthmani: 'هُمُ', audio_url: 'wbw/002_005_008.mp3' },
        { position: 8, char_type_name: 'word', text_uthmani: 'ٱلْمُفْلِحُونَ', audio_url: 'wbw/002_005_009.mp3' },
        { position: 9, char_type_name: 'end', text_uthmani: '٥', audio_url: null },
      ],
    };

    const result = parseQuranComWordAudioPayload(2, [verse]);
    const words = result.ayahs[0]?.words ?? [];

    expect(words).toHaveLength(8);
    expect(words[5]).toMatchObject({
      wordIndex: 6,
      text: 'وَأُو۟لَـٰٓئِكَ',
      audioUrl: 'https://audio.qurancdn.com/wbw/002_005_006.mp3',
    });
    expect(words[6]).toMatchObject({
      wordIndex: 7,
      text: 'هُمُ',
      audioUrl: 'https://audio.qurancdn.com/wbw/002_005_007.mp3',
    });
    expect(words[7]).toMatchObject({
      wordIndex: 8,
      text: 'ٱلْمُفْلِحُونَ',
      audioUrl: 'https://audio.qurancdn.com/wbw/002_005_008.mp3',
    });
  });

  it('keeps later word indexes stable when metadata omits an audio_url', () => {
    const result = parseQuranComWordAudioPayload(2, [
      {
        verse_key: '2:1',
        words: [
          { position: 1, char_type_name: 'word', text: 'word-one', audio_url: null },
          { position: 2, char_type_name: 'word', text: 'word-two', audio_url: 'wbw/002_001_002.mp3' },
        ],
      },
    ]);

    expect(result.ayahs[0]?.words).toEqual([
      {
        wordIndex: 1,
        text: 'word-one',
        audioUrl: 'https://audio.qurancdn.com/wbw/002_001_001.mp3',
      },
      {
        wordIndex: 2,
        text: 'word-two',
        audioUrl: 'https://audio.qurancdn.com/wbw/002_001_002.mp3',
      },
    ]);
  });
});
