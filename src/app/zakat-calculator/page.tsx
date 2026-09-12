import { serializeJsonLd } from '@/lib/seo/structured-data';
import IslamicPageHeader from '@/components/islamic-tools/islamic-page-header';
import ZakatCalculatorClient from '@/components/zakat/zakat-calculator-client';
import {
  buildZakatMetadata,
  buildIslamicToolsBreadcrumb,
} from '@/lib/islamic-tools-seo';
import { buildFaqJsonLd } from '@/lib/seo';
import { ZAKAT_FAQ } from '@/lib/zakat-calculator';

export const metadata = buildZakatMetadata();

export default function ZakatCalculatorPage() {
  const breadcrumb = buildIslamicToolsBreadcrumb([
    { name: 'Zakat Calculator', path: '/zakat-calculator' },
  ]);
  const faq = buildFaqJsonLd(ZAKAT_FAQ);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
      <IslamicPageHeader
        badge="Zakat"
        badgeSecondary="2.5%"
        title="Zakat Calculator Pakistan"
        titleUrdu="زکوٰۃ کیلکولیٹر"
        description="Calculate your Zakat obligation on gold, silver, cash, and other assets. Based on current Nisab thresholds in Pakistani Rupees (PKR)."
      />

      <ZakatCalculatorClient />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faq) }} />
    </div>
  );
}
