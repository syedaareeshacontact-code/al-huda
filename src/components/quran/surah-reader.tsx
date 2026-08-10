'use client';

import type { ComponentProps } from 'react';

import QuranReaderPage from '@/components/sidebar';

type SurahReaderProps = ComponentProps<typeof QuranReaderPage>;

export default function SurahReader(props: SurahReaderProps) {
  return <QuranReaderPage {...props} />;
}
