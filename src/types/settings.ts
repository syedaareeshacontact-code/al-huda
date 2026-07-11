export type ThemeMode = 'light' | 'dark' | 'system';

export type ReadingMode = 'ayah' | 'continuous';

export type ArabicFont = 'uthmaniHafs' | 'amiriQuran' | 'notoNaskh' | 'scheherazade';

export type AudioPreference = 'ar' | 'tr';

export interface AppSettings {
  readingMode: ReadingMode;
  arabicFont: ArabicFont;
  arabicFontScale: number;
  audioPreference: AudioPreference;
  autoPlayAudio: boolean;
}

export interface UserSettings extends AppSettings {
  themeMode: ThemeMode;
}
