'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  calculateZakat,
  calculateNisab,
  DEFAULT_GOLD_PRICE_PKR_PER_GRAM,
  DEFAULT_SILVER_PRICE_PKR_PER_GRAM,
  ZAKAT_FAQ,
  type ZakatAsset,
  type ZakatResult,
} from '@/lib/zakat-calculator';
import { Calculator, Plus, Trash2 } from 'lucide-react';

const ASSET_TYPES = [
  { type: 'cash' as const, label: 'Cash / Savings (PKR)' },
  { type: 'gold' as const, label: 'Gold (grams)' },
  { type: 'silver' as const, label: 'Silver (grams)' },
  { type: 'stocks' as const, label: 'Stocks / Investments (PKR)' },
  { type: 'business' as const, label: 'Business Assets (PKR)' },
  { type: 'other' as const, label: 'Other Assets (PKR)' },
];

export default function ZakatCalculatorClient() {
  const [assets, setAssets] = useState<ZakatAsset[]>([
    { type: 'cash', label: 'Cash / Savings', value: 0 },
  ]);
  const [goldPrice, setGoldPrice] = useState(DEFAULT_GOLD_PRICE_PKR_PER_GRAM);
  const [silverPrice, setSilverPrice] = useState(DEFAULT_SILVER_PRICE_PKR_PER_GRAM);
  const [result, setResult] = useState<ZakatResult | null>(null);

  const nisab = calculateNisab(goldPrice, silverPrice);

  const addAsset = () => {
    setAssets([...assets, { type: 'cash', label: 'Cash / Savings', value: 0 }]);
  };

  const removeAsset = (index: number) => {
    setAssets(assets.filter((_, i) => i !== index));
  };

  const updateAsset = (index: number, updates: Partial<ZakatAsset>) => {
    setAssets(assets.map((a, i) => (i === index ? { ...a, ...updates } : a)));
  };

  const handleCalculate = () => {
    setResult(calculateZakat(assets, goldPrice, silverPrice));
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="text-xs text-[var(--color-muted-text)]">Nisab (Gold — 87.48g)</p>
          <p className="font-bold text-[var(--color-heading)]">
            PKR {Math.round(nisab.gold).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
          <p className="text-xs text-[var(--color-muted-text)]">Nisab (Silver — 612.36g)</p>
          <p className="font-bold text-[var(--color-heading)]">
            PKR {Math.round(nisab.silver).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm text-[var(--color-muted-text)]">Gold price (PKR/gram)</span>
          <input
            type="number"
            value={goldPrice}
            onChange={(e) => setGoldPrice(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm outline-none focus:border-[var(--color-accent-soft)]"
          />
        </label>
        <label className="block">
          <span className="text-sm text-[var(--color-muted-text)]">Silver price (PKR/gram)</span>
          <input
            type="number"
            value={silverPrice}
            onChange={(e) => setSilverPrice(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm outline-none focus:border-[var(--color-accent-soft)]"
          />
        </label>
      </div>

      <div className="space-y-3">
        <p className="font-semibold text-[var(--color-heading)]">Your Assets</p>
        {assets.map((asset, index) => (
          <div key={index} className="flex flex-wrap items-end gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <label className="min-w-[140px] flex-1">
              <span className="text-xs text-[var(--color-muted-text)]">Type</span>
              <select
                value={asset.type}
                onChange={(e) => {
                  const type = e.target.value as ZakatAsset['type'];
                  const label = ASSET_TYPES.find((t) => t.type === type)?.label ?? type;
                  updateAsset(index, { type, label });
                }}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              >
                {ASSET_TYPES.map((t) => (
                  <option key={t.type} value={t.type}>{t.label}</option>
                ))}
              </select>
            </label>
            <label className="min-w-[120px] flex-1">
              <span className="text-xs text-[var(--color-muted-text)]">
                {asset.type === 'gold' || asset.type === 'silver' ? 'Weight (grams)' : 'Amount (PKR)'}
              </span>
              <input
                type="number"
                min={0}
                value={asset.type === 'gold' || asset.type === 'silver' ? (asset.weightGrams ?? 0) : asset.value}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (asset.type === 'gold' || asset.type === 'silver') {
                    updateAsset(index, { weightGrams: val, value: 0 });
                  } else {
                    updateAsset(index, { value: val });
                  }
                }}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm"
              />
            </label>
            {assets.length > 1 && (
              <button
                type="button"
                onClick={() => removeAsset(index)}
                aria-label="Remove asset"
                className="rounded-lg border border-[var(--color-border)] p-2 text-[var(--color-danger)] transition hover:bg-[var(--color-surface-2)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addAsset}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted-text)] transition hover:border-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
        >
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <button
        type="button"
        onClick={handleCalculate}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,var(--color-accent-soft),var(--color-accent))] px-6 py-3 font-bold text-[var(--color-accent-foreground)] shadow-[var(--shadow-glow)] transition hover:brightness-110 sm:w-auto"
      >
        <Calculator className="h-5 w-5" />
        Calculate Zakat
      </button>

      {result && (
        <Card className={`border-2 ${result.isEligible ? 'border-[var(--color-accent-soft)]' : 'border-[var(--color-border)]'} shadow-[var(--shadow-glow)]`}>
          <CardContent className="p-6">
            <h3 className="font-display text-xl font-bold text-[var(--color-heading)]">
              Zakat Result
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-text)]">{result.message}</p>
            {result.isEligible && (
              <div className="mt-4 rounded-xl bg-[color-mix(in_oklab,var(--color-accent),transparent_90%)] p-5 text-center">
                <p className="text-sm text-[var(--color-muted-text)]">Zakat Due (2.5%)</p>
                <p className="font-display text-4xl font-bold text-[var(--color-accent)]">
                  PKR {result.zakatDue.toLocaleString()}
                </p>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {result.breakdown.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-[var(--color-muted-text)]">{item.label}</span>
                  <span className="font-semibold tabular-nums text-[var(--color-heading)]">
                    PKR {Math.round(item.value).toLocaleString()}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-[var(--color-border)] pt-2 text-sm font-bold">
                <span>Total Wealth</span>
                <span className="tabular-nums">PKR {Math.round(result.totalWealth).toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6">
        <h3 className="mb-4 font-display text-lg font-semibold text-[var(--color-heading)]">Zakat FAQ</h3>
        <div className="space-y-3">
          {ZAKAT_FAQ.map((item) => (
            <details key={item.question} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--color-heading)]">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-[var(--color-muted-text)]">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
