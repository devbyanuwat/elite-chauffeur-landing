# Editions Scroll Story — spec การยกระดับการแสดงผล landing

วันที่: 2026-08-03 · สถานะ: อนุมัติผ่าน mockup แล้ว ("ok แล้ว") รอรีวิวไฟล์ spec
Absolute Reference: `mockups/pinned-editions.html` (gitignored — spec นี้คือ contract ฉบับ track ใน git; ขัดกันเมื่อไหร่ mockup ชนะ)
Ref ภายนอกที่ใช้ตั้งทิศ: Shopify Editions Winter 2026 — จอเต็มเป็น "บท", ของหลายชิ้นวิ่งคนละความเร็ว, ตัวหนังสือ/เลขใหญ่เป็น layer, สลับหนัก-เบา

## ปัญหาที่แก้

pin 3 จุดเดิม (SABUY-61) ทำงานเชิงกลไกแต่ "ขาดการแสดงผล" — การ์ดเดียวเล็กลอยกลางจอโล่ง stage สลับด้วย opacity เฉย ๆ (feedback คุณอนุวัชร 2026-08-03 พร้อมภาพ) และมือถือ static ไร้ชีวิต

## โครงหน้า (ลำดับใหม่ — จิตวิทยา conversion)

```
Hero 3 วินาที (คงเดิมทั้งก้อน — ห้ามแตะ)
Chapter 0  intro transform: first impression → present บริการ 4 ตัว   [pin]
Chapter 1  Fleet                                                      [pin]
Chapter 2  3 ขั้นตอน (collage)                                        [pin]
Chapter 3  Routes (พื้นเข้ม --bg-dark)                                 [pin]
Reviews    social proof — slider เลื่อนเอง                             [ไหลปกติ]
FAQ        ถอนข้อกังขาก่อนจุดขอ                                        [ไหลปกติ]
Booking    ฟอร์ม #booking — จุดปิดการขาย ไม่มีอะไรคั่นก่อนหน้า          [ไหลปกติ]
Blog       ย้ายมาหลังฟอร์ม (การ์ดมีภาพปก) — เก็บคนยังไม่พร้อม + SEO     [ไหลปกติ]
Footer
```

หลักที่ล็อก: proof → objection (FAQ) → ask (form) · ห้ามมี "ทางไหลออก" (บทความ) คั่นระหว่าง proof กับ form · Stats/TripStat เดิมให้ผนวกเข้า chapter ที่เกี่ยวหรือคง section เดิมตามที่ plan ตัดสิน (ไม่ใช่สาระของ spec นี้)

## Desktop ≥1024px — 4 pinned chapters

ทุกบทมีโครง chrome ร่วม: eyebrow + ชื่อบท (Fraunces = `--font-display`) บนซ้าย · ตัวนับ/rail บอกตำแหน่ง stage · ปล่อยจอเมื่อจบบท ต่อด้วยช่องหายใจ

### Chapter 0 — intro transform (pin ~420vh, แทน Services section เดิม)
1. เปิด: ภาพ hero (`hero-bg.travelv1-baseline.webp` — ห้าม regenerate) เต็มจอ + พาดหัวชุดเดิม + veil ทิศเดิม
2. phase A (0→28% ของ pin): ภาพบีบเข้าเป็นกรอบแผงขวา (inset บน-ล่าง 8%, ซ้าย 52%, ขวา 5%, radius 6px) · พาดหัวสลาย · veil จางออก · รายการบริการลอยขึ้นซีกซ้าย
3. phase B (30→100%): present บริการ 4 ตัวตามลำดับ: รับส่งสนามบิน / เหมารถเที่ยวรายวัน / เหมารถตู้พร้อมคนขับ / องค์กร & ผู้บริหาร — แถว active สว่าง+ขยายคำอธิบาย ภาพในกรอบสลับเป็นภาพบริการนั้น (crossfade + scale 1.06→1)
4. copy บริการตาม mockup (สอดคล้อง 3 เสา positioning ของ spec 2026-08-02)

### Chapter 1 — Fleet (pin ~380vh)
- 3 layer คนละความเร็ว: ghost word ชื่อรุ่น (Fraunces ~15rem, `oklch(90% .03 60/.55)`) ช้าสุด / ภาพรถใหญ่กลางจอ (drop-shadow) กลาง / แถบ meta (ชื่อ+chips+ราคา+CTA) เร็วสุด
- เปลี่ยนคัน: ทิศตามการ scroll (เข้า-ออกคนละฝั่ง) + stagger
- rail ซ้าย 01-04 กดข้ามได้ + ตัวนับ "0n / 04" มุมขวาบน
- ใช้ภาพ car1-4.webp ชุด crop 16:10 (commit `791de03`)

### Chapter 2 — 3 ขั้นตอน (pin ~300vh)
- collage ซ้าย: การ์ดภาพ + เลขทองทึบ (Fraunces italic, `--gold`, text-shadow) ซ้อนมุมขวาล่าง + caption ในภาพ
- ภาพต่อขั้น: 1 = `parallax/hero/color.webp` · 2 = `parallax/airport/color.webp` · 3 = `parallax/trust/color.webp`
- ขวา: 3 ขั้นเห็นครบ ขั้น active หัวข้อขยาย (1.15→1.5rem) + แท็ก pill โผล่ ("ใช้เวลาไม่ถึง 1 นาที" / "ราคาล็อกตั้งแต่จอง" / "ตรงเวลา · มีประกันทุกคัน") + เส้นทองไหลตาม progress
- พื้น `--bg-secondary`

### Chapter 3 — Routes (pin ~360vh)
- ทั้งบทพื้น `--bg-dark` (จังหวะเปลี่ยนอารมณ์)
- การ์ดปลายทางภาพเต็ม (16:10, ~58vw) เลื่อนแนวนอนตาม scroll + ภาพในการ์ด drift สวน (xPercent ±10 ตามตำแหน่งจอ) + แถบ progress ล่าง
- 4 การ์ด: พัทยา / หัวหิน / สนามบิน / เส้นทางอื่น ๆ — ราคาจากข้อมูลจริง (routes YAML) เท่านั้น

## Mobile <1024px — motion tier ใหม่ (ไม่ static แล้ว)

ไม่มี pin ทุกบท (pin+scrub สู้ momentum scroll บนนิ้ว) แต่ต้องมีชีวิต:
- **Parallax-lite**: ภาพ intro / ปก blog scale 1.15 + drift yPercent ±8-12 ตาม scroll (scrub, ไม่ยึดจอ)
- **Reveal เด้ง**: ทุกการ์ด/แถว `back.out(1.8)` + scale .97→1 · เลข 01-04 บริการ `back.out(3)` เข้าก่อนตัวหนังสือ
- **Intro**: ภาพแถบบน 46svh พาดหัวขาวทับล่างภาพ (ยึดกับก้นภาพ ไม่ใช่ก้น section — เคยพลาดแล้ว) + บริการ 4 แถวเรียงลง
- **Fleet**: การ์ดเดียว + ปุ่มเลข 1-4 แตะสลับคัน (อนิเมชันสไลด์ชุดเดียวกับ desktop)
- **3 ขั้นตอน**: markup แยกชุด mobile — บล็อกละขั้น (ภาพ+เลขทอง+ข้อความมาด้วยกัน) · เข้า: ภาพสไลด์จากขวา rotate 1.2°→0 `power3.out`, เลขทอง `elastic.out(1,0.45)`, ข้อความ stagger `back.out(2.2)` · ออก: reverse เมื่อพ้นจอ เล่นซ้ำได้สองทิศ (toggleActions ไม่ใช่ scrub — scrub ทื่อ ถูกตีกลับมาแล้ว)
- **Routes**: แถว scroll-snap ปัดเอง การ์ด 84vw
- `prefers-reduced-motion: reduce` = ตัด motion ทั้งหมดทุก breakpoint เหลือ layout สมบูรณ์

## Quiet zones

- **Reviews**: slider เลื่อนเองแบบ drift ช้า (~0.45px/frame) วนลูปไร้รอยต่อ (โคลนชุดการ์ดต่อท้าย) · หยุดเมื่อ hover/touch/focus ปล่อยแล้วไหลต่อ · ลูกศร ← → กดข้าม · reduced-motion = ไม่เลื่อนเอง · การ์ด: ภาพ 16:10 + quote + ชื่อ·occasion · ข้อมูลจริงจาก reviews API (BOS) — ข้อความใน mockup เป็น placeholder ห้าม ship
- **FAQ**: accordion ชุดคำถามจริงจาก `Faq.astro` เดิม + FAQPage JSON-LD คงอยู่
- **Booking**: `sections/Booking.astro` เดิม ทุก CTA ในเรื่องยิง `#booking`
- **Blog**: การ์ดมีภาพปก 16:9 (hover zoom 1.04) จาก BOS · บทความไม่มีปก = fallback พื้นสี + tag · ย้ายไปหลังฟอร์ม
- **Sticky CTA**: ปุ่ม "ขอใบเสนอราคา" (`--gold-dark`, pill, มุมขวาล่างเหนือปุ่ม LINE) โผล่เมื่อ scroll พ้น intro 30% หายเมื่อถึงฟอร์ม

## กติกา assets

- ใช้ได้: `parallax/hero`, `parallax/airport`, `parallax/trust`, `parallax/service/rental`, `parallax/close`, `car1-4.webp`, `service-van-hero.webp`, `service-charter-hero.webp`, `review-*.webp`, `hero-bg.travelv1-baseline.webp`
- **ห้ามใช้**: `parallax/service/business` (มีป้ายแท็กซี่ — ตีตกแล้ว หลุดเข้า mockup รอบหนึ่ง), `service-rental.webp` / `service-airport.webp` / `service-business.webp` / `route-huahin.webp` (มีข้อความ marketing ฝังในภาพ)
- การ์ดหัวหินใน Routes ยังไม่มีภาพสะอาด → generate ใหม่ผ่าน media pipeline (fal, สูตร "รถเดี่ยว/วิวโล่ง ผ่านตลอด") หรือใช้ `parallax/service/rental` ชั่วคราว

## ข้อจำกัดระบบ (สืบทอดจาก spec เดิม ไม่เปลี่ยน)

- JS budget รวม ≤ 240KB gzip (c9d1f87) — งานนี้เพิ่ม markup/timeline ไม่เพิ่ม lib ใหม่ (GSAP+ScrollTrigger มีแล้ว, Fraunces/ฟอนต์มีแล้ว)
- SEO load-bearing: เนื้อหาทุกบทอยู่ใน DOM จริง (ไม่ inject ด้วย JS), JSON-LD/OG/meta ห้าม regress, ปิด JS ต้องอ่านได้ครบ
- i18n TH/EN ครบทุกข้อความใหม่ผ่านกลไก data-i18n เดิม
- Hero 3 วินาที (SABUY-62) ห้ามแตะ · depth field hero คงเดิม
- contract `data-pin`/`data-stage` เดิมเป็นฐาน ขยายได้แต่ห้าม break
- Thai copy ผ่าน skill `thai-natural-copy` (grep คำต้องห้ามก่อน commit)

## Acceptance

- Desktop: 4 บท pin ทำงานตามพฤติกรรมใน mockup · rail/ตัวนับถูกต้อง · ปล่อยจอแล้ว gap 0
- Mobile: ไม่มี pin · บท 3 ขั้นตอนเป็นบล็อกละขั้น in/out เด้งตาม mockup · ภาพ drift ทำงาน
- Reviews เลื่อนเอง-หยุดเมื่อแตะ-วนลูปไร้รอยต่อ · reduced-motion ปิดทุก motion ทุกจอ
- ลำดับ section ตามโครงข้างบนเป๊ะ · sticky CTA โผล่/หายถูกจังหวะ
- vitest เดิมเขียว · build สะอาด · JS ≤ 240KB gzip วัดจริง · ปิด JS ซ่อน 0 element
- วัดในเบราว์เซอร์จริงด้วย `scripts/measure-viewport.mjs` ทั้ง 1440x900 และ 390x844 ก่อนปิดงาน
