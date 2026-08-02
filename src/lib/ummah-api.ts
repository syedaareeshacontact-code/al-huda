const UMMAH_BASE = 'https://ummahapi.com/api';

export class UmmahApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'UmmahApiError';
  }
}

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
  let response: Response;

  try {
    response = await fetch(`${UMMAH_BASE}${path}`, {
      next: { revalidate },
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new UmmahApiError(502, 'The duas provider is temporarily unreachable.');
  }

  if (!response.ok) {
    throw new UmmahApiError(response.status, `The duas provider returned ${response.status}.`);
  }

  let json: { success?: boolean; error?: string; data?: T };
  try {
    json = (await response.json()) as { success?: boolean; error?: string; data?: T };
  } catch {
    throw new UmmahApiError(502, 'The duas provider returned an invalid response.');
  }

  if (!json.success || json.data === undefined) {
    throw new UmmahApiError(502, json.error || 'The duas provider returned no content.');
  }

  return json.data;
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
