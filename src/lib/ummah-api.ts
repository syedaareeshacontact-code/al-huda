const UMMAH_BASE = 'https://ummahapi.com/api';

export interface DuaCategory {
  id: string;
  name: string;
  description: string;
  count: number;
}

export interface Dua {
  id: number;
  category: string;
  title: string;
  arabic: string;
  transliteration: string;
  translation: string;
  source: string;
  repeat?: number;
}

export interface AsmaUlHusna {
  number: number;
  arabic: string;
  transliteration: string;
  english: string;
  meaning: string;
}

async function ummahFetch<T>(path: string, revalidate = 86400): Promise<T> {
  const res = await fetch(`${UMMAH_BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`UmmahAPI error: ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error(`UmmahAPI: ${json.error ?? 'Unknown error'}`);
  return json.data as T;
}

export async function getDuaCategories(): Promise<DuaCategory[]> {
  const data = await ummahFetch<{ categories: DuaCategory[] }>('/duas/categories');
  return data.categories;
}

export async function getDuasByCategory(categoryId: string): Promise<{
  category: DuaCategory;
  duas: Dua[];
}> {
  const data = await ummahFetch<{
    category: DuaCategory;
    total: number;
    duas: Dua[];
  }>(`/duas/category/${categoryId}`);
  return { category: data.category, duas: data.duas };
}

export async function getAllDuasOverview(): Promise<{
  total: number;
  categories: DuaCategory[];
}> {
  const data = await ummahFetch<{ total: number; categories: DuaCategory[] }>('/duas');
  return data;
}

export async function getAsmaUlHusna(): Promise<AsmaUlHusna[]> {
  const data = await ummahFetch<{ names: AsmaUlHusna[] }>('/asma-ul-husna');
  return data.names;
}

/** Categories that are primarily adhkar/dhikr */
export const AZKAR_CATEGORY_IDS = [
  'morning',
  'evening',
  'after_prayer',
  'sleep',
  'dhikr',
  'protection',
  'forgiveness',
  'night_prayer',
];

export function isAzkarCategory(categoryId: string): boolean {
  return AZKAR_CATEGORY_IDS.includes(categoryId);
}
