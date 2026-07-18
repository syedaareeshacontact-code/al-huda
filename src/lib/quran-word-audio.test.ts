import { describe, expect, it } from 'vitest';

import {
  parseQuranComWordAudioPayload,
  type QuranComWordAudioVerse,
} from './quran-word-audio';

describe('Quran word audio mapping', () => {
  it('does not shift later words when one spoken word has no audio_url', () => {
    const verse: QuranComWordAudioVerse = {
      verse_number: 5,
      verse_key: '2:5',
      words: [
        { position: 1, char_type_name: 'word', text_uthmani: 'أُو۟لَـٰٓئِكَ', audio_url: 'wbw/002_005_001.mp3' },
        { position: 2, char_type_name: 'word', text_uthmani: 'عَلَىٰ', audio_url: 'wbw/002_005_002.mp3' },
        { position: 3, char_type_name: 'word', text_uthmani: 'هُدًۭى', audio_url: 'wbw/002_005_003.mp3' },
        { position: 4, char_type_name: 'word', text_uthmani: 'مِّن', audio_url: 'wbw/002_005_004.mp3' },
        { position: 5, char_type_name: 'word', text_uthmani: 'رَّبِّهِمْ', audio_url: 'wbw/002_005_005.mp3' },
        { position: 6, char_type_name: 'pause', text_uthmani: 'ۖ', audio_url: null },
        { position: 7, char_type_name: 'word', text_uthmani: 'وَأُو۟لَـٰٓئِكَ', audio_url: null },
        { position: 8, char_type_name: 'word', text_uthmani: 'هُمُ', audio_url: 'wbw/002_005_008.mp3' },
        { position: 9, char_type_name: 'word', text_uthmani: 'ٱلْمُفْلِحُونَ', audio_url: 'wbw/002_005_009.mp3' },
        { position: 10, char_type_name: 'end', text_uthmani: '٥', audio_url: null },
      ],
    };

    const result = parseQuranComWordAudioPayload(2, [verse]);
    const words = result.ayahs[0]?.words ?? [];

    expect(words).toHaveLength(8);
    expect(words[5]).toMatchObject({
      wordIndex: 6,
      text: 'وَأُو۟لَـٰٓئِكَ',
      audioUrl: 'https://audio.qurancdn.com/wbw/002_005_007.mp3',
    });
    expect(words[6]).toMatchObject({
      wordIndex: 7,
      text: 'هُمُ',
      audioUrl: 'https://audio.qurancdn.com/wbw/002_005_008.mp3',
    });
    expect(words[7]).toMatchObject({
      wordIndex: 8,
      text: 'ٱلْمُفْلِحُونَ',
      audioUrl: 'https://audio.qurancdn.com/wbw/002_005_009.mp3',
    });
  });
});
