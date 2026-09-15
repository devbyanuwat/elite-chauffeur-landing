import type { ArticleSummary } from './blog-types';

const SITE = 'https://sabuygo.com';

const MAIN_PAGES: { href: string; title: string; desc: string }[] = [
  { href: '/', title: 'หน้าแรก', desc: 'ภาพรวมบริการ ราคาเริ่มต้น และฟอร์มจอง' },
  { href: '/van/', title: 'เช่ารถตู้พร้อมคนขับ', desc: 'รถตู้เหมาวันหรือรายเที่ยว กรุงเทพและต่างจังหวัด' },
  { href: '/charter/', title: 'เหมารถพร้อมคนขับ', desc: 'เหมารถเก๋ง SUV เที่ยวต่างจังหวัดหรือเหมาวันในเมือง' },
  { href: '/airport-transfer/suvarnabhumi-bkk/', title: 'รับส่งสนามบินสุวรรณภูมิ', desc: 'ติดตามเที่ยวบิน รอรับพร้อมป้ายชื่อ ราคาคงที่' },
  { href: '/airport-transfer/don-mueang-dmk/', title: 'รับส่งสนามบินดอนเมือง', desc: 'ติดตามเที่ยวบิน รอรับพร้อมป้ายชื่อ ราคาคงที่' },
  { href: '/routes/bangkok-to-pattaya/', title: 'กรุงเทพ พัทยา', desc: '147 กม. ราคาคงที่ one-way / round-trip / day-trip' },
  { href: '/routes/bangkok-to-hua-hin/', title: 'กรุงเทพ หัวหิน', desc: '200 กม. ราคาคงที่ one-way / round-trip / day-trip' },
  { href: '/blog/', title: 'บทความ', desc: 'คู่มือการเดินทางและคำแนะนำจาก SABUYGO' },
];

/**
 * llms.txt body: a plain-text map of the site for AI crawlers. Pure; safe on an
 * empty article list. No em dash, no trailing whitespace (asserted in tests).
 */
export function buildLlmsTxt(articles: ArticleSummary[]): string {
  const lines: string[] = [
    '# SABUYGO',
    '',
    '> บริการรถเช่าพร้อมคนขับระดับพรีเมียม กรุงเทพฯ รับส่งสนามบิน เดินทางพัทยา หัวหิน ราคาคงที่ จองผ่าน LINE ตอบใน 15 นาที',
    '',
    '## หน้าหลัก',
    '',
  ];

  for (const p of MAIN_PAGES) {
    lines.push(`- [${p.title}](${SITE}${p.href}): ${p.desc}`);
  }

  lines.push('', '## บทความ', '');
  for (const a of articles) {
    const desc = (a.summary ?? a.excerpt ?? '').replace(/\s+/g, ' ').trim();
    lines.push(`- [${a.title}](${SITE}/blog/${a.slug}/)${desc ? `: ${desc}` : ''}`);
  }

  return `${lines.join('\n')}\n`;
}
