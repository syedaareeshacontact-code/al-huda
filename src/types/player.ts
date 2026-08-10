import type { SurahAudioOption } from '@/types/quran';

export interface QuranPlayerPrefs {
  volume: number;
  playbackRate: number;
  loop: boolean;
  reciterIndex: number;
}

export interface LoadSurahOptions {
  autoplay?: boolean;
  startAyah?: number;
  reciterIndex?: number;
}

export interface QuranPlayerContextValue {
  activeSurahId: number;
  sourceType: 'ar' | 'tr' | 'hi';
  surahTitle: string;
  reciterName: string;
  reciters: SurahAudioOption[];
  reciterIndex: number;
  isLoadingSource: boolean;
  sourceError: string | null;

  isPlaying: boolean;
  isBuffering: boolean;
  duration: number;
  currentTime: number;
  progress: number;
  activeAyah: number | null;
  totalAyahs: number;

  volume: number;
  playbackRate: number;
  loop: boolean;

  loadSurah: (surahId: number, options?: LoadSurahOptions) => void;
  play: () => Promise<void>;
  pause: () => void;
  togglePlay: () => Promise<void>;
  seek: (seconds: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  setVolume: (value: number) => void;
  setPlaybackRate: (value: number) => void;
  setLoop: (value: boolean) => void;
  setReciterIndex: (value: number) => void;
}
