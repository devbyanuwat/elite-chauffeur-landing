/**
 * Product section — เนื้อหาและ schema
 * ====================================
 *
 * แยกออกจาก Product.astro เพราะ frontmatter ของไฟล์ .astro export ให้ไฟล์อื่น
 * import ไม่ได้ (Astro รองรับเฉพาะ getStaticPaths) — index.astro ต้องดึง
 * productCatalogSchema ไปใส่ prop jsonLd ของ Base.astro จึงต้องอยู่ในไฟล์ .ts
 *
 * ข้อเท็จจริงที่อ้างในย่อหน้าตอบ ดึงจากไฟล์เนื้อหาของ repo เอง ไม่ได้แต่งขึ้น
 *   ประกันชั้นหนึ่ง + พ.ร.บ. ทุกคัน .......... src/components/sections/Why.astro
 *   คนขับผ่านการคัดประวัติ ................... src/components/sections/Why.astro
 *   รอฟรี 60 นาที / ถือป้ายชื่อ / เช็คเที่ยวบิน  src/content/airports/*.yaml (waitMinutes, heroTrust)
 *   ราคารวมทางด่วน น้ำมัน จอด น้ำดื่ม ......... src/content/routes/*.yaml (priceDesc)
 *   Day-trip นับ 10 ชั่วโมง ................... src/content/routes/*.yaml (dayTripHours)
 *
 * ยังต้องยืนยันก่อนขึ้นหน้าจริง
 * ----------------------------
 * ข้อ 3 (รถรับส่งบริษัท) เป็นบริการเดียวที่ repo ไม่มีเนื้อหารองรับเลย ย่อหน้าตอบจึง
 * เขียนเฉพาะสิ่งที่จริงกับทุกบริการ ส่วนรายละเอียดฝั่งบริษัท (ออกใบกำกับภาษีได้ไหม
 * วางบิลรายเดือนได้ไหม มีสัญญาระยะยาวไหม) ยังเป็น TODO อยู่ใน proof ของข้อนั้น
 * อย่าเดาแทน ถามฝั่งธุรกิจก่อน
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
  eyebrow: 'บริการของเรา',
  title: 'เลือกแบบที่ตรงกับทริปของคุณ',
  sub: 'ทุกแบบใช้รถและคนขับชุดเดียวกัน ราคาบอกก่อนจอง ไม่มีบวกเพิ่มหน้างาน',
};

export const CTA = {
  label: 'ขอราคาทริปของคุณ',
  href: '#booking',
};

export const PRODUCTS: ProductItem[] = [
  {
    id: '1',
    name: 'เช่ารถพร้อมคนขับ',
    q: 'เช่ารถพร้อมคนขับ ต่างจากเรียกแท็กซี่ยังไง',
    a: 'คนขับคนเดิมอยู่กับคุณทั้งทริป รอได้ ไปต่อได้ ไม่ต้องเรียกรถใหม่ทุกจุด รถทุกคันมีประกันชั้นหนึ่งและ พ.ร.บ. คนขับผ่านการคัดประวัติก่อนรับงาน ราคาตกลงกันตั้งแต่ก่อนออกรถ ไม่มีมิเตอร์ ไม่มีบวกเพิ่มตอนรถติด',
    proofLabel: 'รวมอยู่ในราคาแล้ว',
    proof: [
      'ค่าน้ำมันและค่าทางด่วน',
      'ค่าจอดรถ',
      'ประกันชั้นหนึ่ง และ พ.ร.บ. ทุกคัน',
      'น้ำดื่มในรถ',
    ],
  },
  {
    id: '2',
    name: 'รับส่งสนามบิน',
    q: 'รับส่งสนามบิน ไปส่งได้ถึงไหนบ้าง',
    a: 'รับจากสุวรรณภูมิและดอนเมือง ส่งได้ทั้งโรงแรมในกรุงเทพและต่างจังหวัด เราเช็คเที่ยวบินให้เอง ไฟลต์ดีเลย์ไม่ต้องโทรบอก คนขับรอฟรี 60 นาทีนับจากเครื่องลง ถือป้ายชื่อรออยู่ที่ทางออกผู้โดยสาร ราคาล็อกตั้งแต่ตอนจอง',
    proofLabel: 'รับจากสุวรรณภูมิและดอนเมือง ส่งถึง',
    proof: [
      'โรงแรมในกรุงเทพ',
      'ชลบุรี',
      'ประจวบคีรีขันธ์',
      'หัวหิน',
      'อยุธยา',
      'กาญจนบุรี',
    ],
  },
  {
    id: '3',
    name: 'รถรับส่งสำหรับบริษัท',
    q: 'บริษัทอยากมีรถรับส่งประจำ เริ่มยังไง',
    a: 'รับงานรับส่งผู้บริหาร รับส่งแขกของบริษัท และงานที่ต้องใช้รถซ้ำเป็นรอบ ใช้รถและคนขับชุดเดียวกับงานทั่วไป คือมีประกันครบและผ่านการคัดประวัติมาแล้ว บอกจำนวนรอบและเส้นทางมา เราคิดราคาให้ก่อนเริ่มงาน ไม่มีบวกเพิ่มหน้างาน',
    proofLabel: 'สำหรับงานประจำของบริษัท',
    proof: [
      'รับส่งผู้บริหารและแขกของบริษัท',
      'จองเป็นรอบล่วงหน้าได้',
      'TODO: เอกสารฝั่งบัญชี (ใบกำกับภาษี / วางบิล) ถามฝ่ายธุรกิจก่อนเขียน',
    ],
  },
  {
    id: '4',
    name: 'เหมารถเที่ยว',
    q: 'เหมารถเที่ยวทั้งวัน คิดราคายังไง',
    a: 'เหมาทั้งวันแบบ Day-trip นับ 10 ชั่วโมงตั้งแต่รับจนส่ง แวะได้หลายจุดตามที่วางไว้ ไม่คิดเพิ่มต่อจุด คนขับชำนาญเส้นทาง รู้ว่าจอดตรงไหนได้ บอกเส้นทางคร่าว ๆ ตอนจอง เราคำนวณราคาให้ก่อนออกเดินทาง',
    proofLabel: 'เหมาทั้งวัน',
    proof: [
      'นับ 10 ชั่วโมงตั้งแต่รับจนส่ง',
      'แวะได้หลายจุด ไม่คิดเพิ่มต่อจุด',
      'ค่าทางด่วนและค่าน้ำมันรวมแล้ว',
    ],
  },
];

/**
 * OfferCatalog — สร้างจาก PRODUCTS ชุดเดียวกัน ไม่ต้อง maintain สองที่
 *
 * ผูก provider เป็น SABUYGO ให้ตรงกับ limousineServiceSchema ใน src/lib/schema.ts
 * เพื่อให้เครื่องมือ AI มองว่าเป็น entity เดียวกัน ไม่ใช่คนละแบรนด์
 *
 * ยังไม่ถูก render ที่ไหน เพราะ section ยังไม่ถูกเสียบเข้าหน้าไหน ตอนเสียบให้
 * import ตัวนี้ใน index.astro แล้วส่งเข้า prop `jsonLd` ของ Base.astro รวมกับ
 * schema ตัวอื่น อย่า render <script type="application/ld+json"> ใน Product.astro
 * เอง เพราะหน้าเดียวมี JSON-LD กระจายหลายที่แล้วไล่ debug ยาก
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
 * ใช้ตอนเติมคำแปล จะได้ไม่ตกบรรทัดไหน
 */
export function productI18nKeys(): string[] {
  const keys = ['pd.eyebrow', 'pd.title', 'pd.sub', 'pd.cta'];
  for (const p of PRODUCTS) {
    keys.push(`pd.${p.id}.q`, `pd.${p.id}.a`, `pd.${p.id}.pl`);
    p.proof.forEach((_, j) => keys.push(`pd.${p.id}.p.${j + 1}`));
  }
  return keys;
}
