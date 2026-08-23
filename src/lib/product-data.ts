/**
 * Product section — เนื้อหาและ schema
 * ====================================
 *
 * แยกออกจาก Product.astro เพราะ frontmatter ของไฟล์ .astro export ให้ไฟล์อื่น
 * import ไม่ได้ (Astro รองรับเฉพาะ getStaticPaths) — index.astro ต้องดึง
 * productCatalogSchema ไปใส่ prop jsonLd ของ Base.astro จึงต้องอยู่ในไฟล์ .ts
 *
 * วิธีเติมเนื้อหา
 * ---------------
 * แก้เฉพาะ PRODUCTS / HEAD / CTA ด้านล่าง ทุกสตริงที่ขึ้นต้นด้วย `TODO:` คือช่องว่าง
 * หาให้ครบ:  grep -n 'TODO:' src/lib/product-data.ts
 *
 *   name   ชื่อบริการ ใช้ใน schema ไม่แสดงบนจอ ตั้งให้เป็นคำที่คนเรียกจริง
 *   q      หัวข้อที่แสดง — เขียนเป็น "คำถามที่ลูกค้าพิมพ์หาเอง" ไม่ใช่ label
 *          ดี:  "เหมารถทั้งวัน คิดราคายังไง"      ไม่ดี:  "บริการเหมาวัน"
 *   a      ย่อหน้าตอบตรง 40-60 คำ ตอบให้จบในย่อหน้าเดียวโดยไม่ต้องอ่านต่อ
 *          นี่คือย่อหน้าที่ Google/AI จะหยิบไปตอบแทนเรา เขียนให้ยืนได้ลำพัง
 *   proofLabel  หัวคอลัมน์ฝั่งตรงข้าม เช่น "รวมอยู่ในราคาแล้ว"
 *   proof  รายการย่อย ข้อที่แตกเป็น 6 ให้ใส่ 6 บรรทัด ที่เหลือ 3-4 บรรทัดพอ
 *
 * ห้ามใส่ตัวเลขที่ยังไม่ยืนยัน (จำนวนลูกค้า, % ความพึงพอใจ, จำนวนเที่ยว)
 * ถ้ายังไม่มีเลขจริง เขียนเป็นข้อความคุณสมบัติแทน อย่าแต่งเลขขึ้นมา
 *
 * i18n: key ถูกจองไว้แล้วเป็น `pd.*` ต้องเติมคู่อังกฤษใน src/i18n/en.json
 *       ดูรายการ key ที่ต้องมีจาก productI18nKeys() ท้ายไฟล์
 */

export interface ProductItem {
  id: string;
  name: string;
  q: string;
  a: string;
  proofLabel: string;
  proof: string[];
}

export const HEAD = {
  eyebrow: 'TODO: eyebrow สั้น ๆ',
  title: 'TODO: หัวเรื่อง section ไม่เกิน 7 คำ',
  sub: 'TODO: ประโยคเดียวบอกว่าทั้ง 4 ข้อนี้รวมกันแล้วคืออะไร',
};

export const CTA = {
  label: 'TODO: ปุ่ม',
  href: '#booking',
};

export const PRODUCTS: ProductItem[] = [
  {
    id: '1',
    name: 'TODO: ชื่อบริการข้อ 1',
    q: 'TODO: หัวข้อข้อ 1 เขียนเป็นคำถามที่ลูกค้าพิมพ์หา',
    a: 'TODO: ย่อหน้าตอบตรง 40-60 คำ ตอบคำถามข้างบนให้จบในย่อหน้านี้ย่อหน้าเดียว เขียนให้อ่านแล้วเข้าใจโดยไม่ต้องดูบริบทอื่น เพราะย่อหน้านี้คือสิ่งที่เครื่องมือค้นหาและ AI จะหยิบไปตอบแทนเรา',
    proofLabel: 'TODO: หัวคอลัมน์ฝั่งตรงข้าม',
    proof: ['TODO: บรรทัดย่อย', 'TODO: บรรทัดย่อย', 'TODO: บรรทัดย่อย'],
  },
  {
    // ข้อที่แตกเป็นรายการย่อย 6 บรรทัดตามโน้ต
    id: '2',
    name: 'TODO: ชื่อบริการข้อ 2',
    q: 'TODO: หัวข้อข้อ 2 เขียนเป็นคำถามที่ลูกค้าพิมพ์หา',
    a: 'TODO: ย่อหน้าตอบตรง 40-60 คำ ข้อนี้มีรายการย่อยยาวที่สุด ย่อหน้านี้ควรบอกภาพรวมว่าทั้ง 6 บรรทัดฝั่งตรงข้ามรวมกันแล้วให้อะไรกับลูกค้า ไม่ใช่ไล่ซ้ำทีละบรรทัด',
    proofLabel: 'TODO: หัวคอลัมน์ฝั่งตรงข้าม',
    proof: [
      'TODO: บรรทัดย่อย 1',
      'TODO: บรรทัดย่อย 2',
      'TODO: บรรทัดย่อย 3',
      'TODO: บรรทัดย่อย 4',
      'TODO: บรรทัดย่อย 5',
      'TODO: บรรทัดย่อย 6',
    ],
  },
  {
    id: '3',
    name: 'TODO: ชื่อบริการข้อ 3',
    q: 'TODO: หัวข้อข้อ 3 เขียนเป็นคำถามที่ลูกค้าพิมพ์หา',
    a: 'TODO: ย่อหน้าตอบตรง 40-60 คำ',
    proofLabel: 'TODO: หัวคอลัมน์ฝั่งตรงข้าม',
    proof: ['TODO: บรรทัดย่อย', 'TODO: บรรทัดย่อย', 'TODO: บรรทัดย่อย'],
  },
  {
    id: '4',
    name: 'TODO: ชื่อบริการข้อ 4',
    q: 'TODO: หัวข้อข้อ 4 เขียนเป็นคำถามที่ลูกค้าพิมพ์หา',
    a: 'TODO: ย่อหน้าตอบตรง 40-60 คำ',
    proofLabel: 'TODO: หัวคอลัมน์ฝั่งตรงข้าม',
    proof: ['TODO: บรรทัดย่อย', 'TODO: บรรทัดย่อย', 'TODO: บรรทัดย่อย'],
  },
];

/**
 * OfferCatalog — สร้างจาก PRODUCTS ชุดเดียวกัน ไม่ต้อง maintain สองที่
 *
 * ผูก provider เป็น SABUYGO ให้ตรงกับ limousineServiceSchema ใน src/lib/schema.ts
 * เพื่อให้เครื่องมือ AI มองว่าเป็น entity เดียวกัน ไม่ใช่คนละแบรนด์
 *
 * ยังไม่ถูก render ที่ไหน — ตอนเสียบ section เข้าหน้า ให้ import ตัวนี้ใน
 * index.astro แล้วส่งเข้า prop `jsonLd` ของ Base.astro รวมกับ schema ตัวอื่น
 * (อย่า render <script type="application/ld+json"> ใน Product.astro เอง —
 * หน้าเดียวมี JSON-LD กระจายหลายที่แล้วไล่ debug ยาก)
 */
export const productCatalogSchema: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'OfferCatalog',
  name: HEAD.title,
  provider: { '@type': 'Organization', name: 'SABUYGO', url: 'https://sabuygo.com' },
  itemListElement: PRODUCTS.map((p, i) => ({
    '@type': 'Service',
    position: i + 1,
    name: p.name,
    description: p.a,
    provider: { '@type': 'Organization', name: 'SABUYGO' },
    ...(p.proof.length
      ? {
          hasOfferCatalog: {
            '@type': 'OfferCatalog',
            name: p.proofLabel,
            itemListElement: p.proof.map((line, j) => ({
              '@type': 'Offer',
              position: j + 1,
              itemOffered: { '@type': 'Service', name: line },
            })),
          },
        }
      : {}),
  })),
};

/**
 * รายการ i18n key ทั้งหมดที่ section นี้ต้องมีคู่อังกฤษใน src/i18n/en.json
 * ใช้ตอนเติมคำแปล — จะได้ไม่ตกบรรทัดไหน
 */
export function productI18nKeys(): string[] {
  const keys = ['pd.eyebrow', 'pd.title', 'pd.sub', 'pd.cta'];
  for (const p of PRODUCTS) {
    keys.push(`pd.${p.id}.q`, `pd.${p.id}.a`, `pd.${p.id}.pl`);
    p.proof.forEach((_, j) => keys.push(`pd.${p.id}.p.${j + 1}`));
  }
  return keys;
}
