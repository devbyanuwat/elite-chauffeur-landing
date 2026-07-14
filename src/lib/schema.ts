/**
 * Live JSON-LD structured data, ported verbatim from index.html (lines ~45-154).
 * Every field (LimousineService/areaServed/sameAs etc.) is kept identical to the
 * live production markup. Consumed via Base.astro's `jsonLd` prop -> JsonLd.astro.
 */

// Structured Data — LimousineService + LocalBusiness (multi-type for AI categorization)
// Ported from index.html lines 45-85.
export const limousineServiceSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': ['LimousineService', 'LocalBusiness'],
  name: 'SABUYGO',
  alternateName: ['Sabuygo', 'สบายโก'],
  description:
    'Premium chauffeur and limousine service in Bangkok and across Thailand. บริการรถเช่าพร้อมคนขับระดับพรีเมียม กรุงเทพฯ พัทยา หัวหิน และทั่วไทย',
  url: 'https://sabuygo.com',
  logo: 'https://sabuygo.com/images/logo.webp',
  image: 'https://sabuygo.com/images/logo.webp',
  telephone: '+66623879159',
  priceRange: '$$$',
  areaServed: [
    { '@type': 'City', name: 'Bangkok' },
    { '@type': 'City', name: 'Pattaya' },
    { '@type': 'City', name: 'Hua Hin' },
    { '@type': 'Airport', name: 'Suvarnabhumi Airport', iataCode: 'BKK' },
    { '@type': 'Airport', name: 'Don Mueang International Airport', iataCode: 'DMK' },
    { '@type': 'Country', name: 'Thailand' },
  ],
  serviceArea: {
    '@type': 'AdministrativeArea',
    name: 'Thailand',
  },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Bangkok',
    addressRegion: 'Bangkok',
    addressCountry: 'TH',
  },
  sameAs: ['https://line.me/R/ti/p/@031cvnva'],
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '00:00',
    closes: '23:59',
  },
};

// WebSite — bilingual hint for AI engines (no SearchAction; site has no real search)
// Ported from index.html lines 88-97.
export const websiteSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Sabuygo',
  alternateName: 'SABUYGO',
  url: 'https://sabuygo.com',
  inLanguage: ['th-TH', 'en-US'],
};

// SiteNavigationElement array — ported from index.html lines 99-126.
// The live block is a top-level JSON array (valid JSON-LD: an array of node
// objects), not a single object. JsonLd.astro's `schema` prop and Base.astro's
// `jsonLd` prop are both typed `Record<string, unknown>` per the interface
// contract, so this is cast to that shape at the export boundary; at runtime
// it is still a real array and JSON.stringify() emits it exactly as the
// original <script> tag (a JSON array of 4 items), byte-for-byte.
const siteNavigationSchemaList = [
  {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'บริการ',
    url: 'https://sabuygo.com/#services',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'รถในเครือข่าย',
    url: 'https://sabuygo.com/#fleet',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'ความปลอดภัย',
    url: 'https://sabuygo.com/#safety',
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SiteNavigationElement',
    name: 'ติดต่อเรา',
    url: 'https://sabuygo.com/#contact',
  },
];
export const siteNavigationSchema = siteNavigationSchemaList as unknown as Record<
  string,
  unknown
>;

// BreadcrumbList — ช่วย Google เข้าใจโครงสร้างเว็บ
// Ported from index.html lines 129-154.
export const breadcrumbSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'หน้าแรก',
      item: 'https://sabuygo.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'บริการ',
      item: 'https://sabuygo.com/#services',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'รถในเครือข่าย',
      item: 'https://sabuygo.com/#fleet',
    },
  ],
};
