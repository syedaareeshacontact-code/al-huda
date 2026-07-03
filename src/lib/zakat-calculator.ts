/** Nisab thresholds based on gold (87.48g) and silver (612.36g) — Hanafi standard */

export const NISAB_GOLD_GRAMS = 87.48;
export const NISAB_SILVER_GRAMS = 612.36;
export const ZAKAT_RATE = 0.025;

/** Approximate gold price per gram in PKR (updated periodically) */
export const DEFAULT_GOLD_PRICE_PKR_PER_GRAM = 21500;
/** Approximate silver price per gram in PKR */
export const DEFAULT_SILVER_PRICE_PKR_PER_GRAM = 280;

export interface ZakatAsset {
  type: 'cash' | 'gold' | 'silver' | 'stocks' | 'business' | 'other';
  label: string;
  value: number;
  weightGrams?: number;
}

export interface ZakatResult {
  totalWealth: number;
  nisabThreshold: number;
  nisabBasis: 'gold' | 'silver';
  isEligible: boolean;
  zakatDue: number;
  zakatRate: number;
  breakdown: Array<{ type: string; label: string; value: number }>;
  message: string;
}

export function calculateNisab(
  goldPricePerGram: number = DEFAULT_GOLD_PRICE_PKR_PER_GRAM,
  silverPricePerGram: number = DEFAULT_SILVER_PRICE_PKR_PER_GRAM
): { gold: number; silver: number; recommended: number; basis: 'gold' | 'silver' } {
  const goldNisab = NISAB_GOLD_GRAMS * goldPricePerGram;
  const silverNisab = NISAB_SILVER_GRAMS * silverPricePerGram;
  const basis = goldNisab <= silverNisab ? 'gold' : 'silver';
  return {
    gold: goldNisab,
    silver: silverNisab,
    recommended: Math.min(goldNisab, silverNisab),
    basis,
  };
}

export function calculateZakat(
  assets: ZakatAsset[],
  goldPricePerGram: number = DEFAULT_GOLD_PRICE_PKR_PER_GRAM,
  silverPricePerGram: number = DEFAULT_SILVER_PRICE_PKR_PER_GRAM
): ZakatResult {
  const nisab = calculateNisab(goldPricePerGram, silverPricePerGram);

  const breakdown = assets.map((asset) => {
    let value = asset.value;
    if (asset.type === 'gold' && asset.weightGrams) {
      value = asset.weightGrams * goldPricePerGram;
    } else if (asset.type === 'silver' && asset.weightGrams) {
      value = asset.weightGrams * silverPricePerGram;
    }
    return { type: asset.type, label: asset.label, value };
  });

  const totalWealth = breakdown.reduce((sum, item) => sum + item.value, 0);
  const isEligible = totalWealth >= nisab.recommended;
  const zakatDue = isEligible ? totalWealth * ZAKAT_RATE : 0;

  let message: string;
  if (!isEligible) {
    message = `Your total wealth (PKR ${totalWealth.toLocaleString()}) is below the Nisab threshold of PKR ${Math.round(nisab.recommended).toLocaleString()}. Zakat is not obligatory.`;
  } else {
    message = `Your total zakatable wealth is PKR ${totalWealth.toLocaleString()}. At 2.5%, your Zakat due is PKR ${Math.round(zakatDue).toLocaleString()}.`;
  }

  return {
    totalWealth,
    nisabThreshold: nisab.recommended,
    nisabBasis: nisab.basis,
    isEligible,
    zakatDue: Math.round(zakatDue * 100) / 100,
    zakatRate: ZAKAT_RATE,
    breakdown,
    message,
  };
}

export const ZAKAT_FAQ = [
  {
    question: 'What is Nisab for Zakat?',
    answer:
      'Nisab is the minimum amount of wealth a Muslim must possess before Zakat becomes obligatory. It equals 87.48 grams of gold or 612.36 grams of silver. Most scholars recommend using the lower threshold (silver) to benefit more recipients.',
  },
  {
    question: 'What is the Zakat rate?',
    answer:
      'Zakat is 2.5% (1/40th) of your total zakatable wealth that has been held for one full lunar year (Hawl).',
  },
  {
    question: 'What assets are subject to Zakat?',
    answer:
      'Zakat is due on cash, gold, silver, stocks, business inventory, and other liquid assets. Personal items like your home, car, and clothing are generally exempt.',
  },
  {
    question: 'When should I pay Zakat?',
    answer:
      'Zakat should be paid once a year when your wealth has remained above Nisab for a full lunar year. Many Muslims pay during Ramadan for extra reward.',
  },
];
