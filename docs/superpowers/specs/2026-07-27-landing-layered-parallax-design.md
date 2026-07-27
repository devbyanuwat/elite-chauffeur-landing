# Landing redesign — layered parallax + WebGL depth hero

วันที่: 2026-07-27
ขอบเขต: `elite-chauffeur` 5 หน้า (`index.astro`, `routes/[slug]` 2 entry, `airport-transfer/[slug]` 2 entry)
Mockup อ้างอิง (source of truth): `mockups/parallax-concept.html` (gitignored, local only)

## 1. เป้าหมายและที่มา

ยกเครื่องการจัดวางหน้า landing ทั้งชุด ใส่ scroll storytelling แบบ layered parallax และเว้นช่องรับภาพ/วิดีโอที่จะ generate ด้วย fal.ai (ยอด $9.94 ณ วันเขียน)

งานหลักของหน้าเว็บยังเดิม: **trust transfer** เปลี่ยนคนที่เพิ่งเข้ามาให้กล้าฝากการเดินทางของตัวเองหรือของลูกค้าไว้กับเรา การจัดวางใหม่ต้องไม่ทำให้ฟอร์มขอราคาหายไปจากสายตา

## 2. การตัดสินใจที่ล็อกแล้ว

| เรื่อง | ผลตัดสิน | ใครตัดสิน |
|---|---|---|
| แนวทาง motion | C — Layered Parallax (ไม่ pin ไม่ hijack scroll) | คุณอนุวัชร |
| ไลบรารี | GSAP + ScrollTrigger, ไม่ใช้ ScrollSmoother | ตามข้อจำกัด no scroll-jacking |
| WebGL | three.js เฉพาะ hero depth field จุดเดียว | คุณอนุวัชร |
| มุม | โครงคม จุดสัมผัสมน: `--r-touch: 5px`, `--r-frame: 0` | คุณอนุวัชร |
| media | AI generate ได้ทุกชิ้น ต้องคุมโทนสีเดิม | คุณอนุวัชร |
| Fleet | จัดตามประเภทรถ ไม่ใช่ตามรุ่น | คุณอนุวัชร |
| ตัวเลข trust | hero ถือ 4.9 ตัวเดียว แถบ Stats ถือ 24/7, 500+, 100% | คุณอนุวัชร |

### ที่ทับกับ brief เดิม

`.impeccable.md` และ `CLAUDE.md` เขียนไว้ว่า motion ต้อง "quiet, no parallax, no scroll-linked effects" และขึ้นบัญชีดำ "WebGL overkill" ไว้ใน anti-references

**เอกสารนี้ทับข้อนั้น** ตามคำสั่งของคุณอนุวัชร (2026-07-27) การ implement ต้องแก้สองไฟล์นั้นด้วย ไม่ใช่แก้แต่โค้ด มิฉะนั้น session ถัดไปจะย้อนงานทิ้ง จุดที่ต้องแก้:

- `.impeccable.md` บรรทัด "Motion: **quiet.**..." และ anti-reference "Agency / awwwards showcase"
- `CLAUDE.md` หัวข้อ Aesthetic Direction บรรทัด "Motion: quiet"
- เป้า Lighthouse เปลี่ยนจาก "95+ ทั้งคู่" เป็น desktop 95+ / mobile 90+

## 3. Motion system

เขียนที่เดียว `src/scripts/motion.ts` โหลดจาก `Base.astro` component ทุกตัวไม่ import GSAP เอง สื่อสารผ่าน attribute เท่านั้น

| Attribute | ความหมาย | ค่า |
|---|---|---|
| `data-parallax="0.12"` | ชั้นเลื่อนช้ากว่า scroll | 0.05–0.25 (bg ช้าสุด fg เร็วสุด) |
| `data-reveal="up\|mask"` | ท่าโผล่ | `up` = เลื่อนขึ้น + fade, `mask` = `clip-path` ปัด |
| `data-reveal-stagger` | หน่วงเป็น ms | ตัวเลข |
| `data-depth-group` | กลุ่มชั้นในฉากเดียว ใช้เป็น ScrollTrigger trigger | ชื่อฉาก |
| `data-split` | หัวข้อที่แตกเป็นบรรทัดแล้วปัดขึ้น | ไม่มีค่า |
| `data-count` + `data-decimals` + `data-suffix` | ตัวเลขนับขึ้น | ค่าเป้าหมาย |

สามระดับผ่าน `gsap.matchMedia()`

- `≥1024px` + motion allowed: parallax + mask + split + count
- `<1024px`: ตัด parallax ทิ้ง เหลือ fade/mask (transform หลายชั้นบนมือถือคือต้นเหตุ jank)
- `prefers-reduced-motion: reduce`: ไม่มี transform ทุกอย่างแสดงครบทันที

### กติกาที่ห้ามละเมิด

1. LCP element ห้ามอยู่ในชั้นที่ JS ขยับ hero headline กับ poster เป็น static ล้วน
2. `data-split` ต้อง wrap `<span>` ครอบข้อความเดิม ห้ามให้ JS สร้างข้อความใหม่ crawler ต้องเห็นครบใน HTML ที่ server ส่งมา
3. ชั้นที่ขยับต้องอยู่ในกรอบที่ `overflow: hidden` และตัวมันต้องสูงเกินกรอบ (ใช้ `inset: -12% 0`) ไม่งั้น parallax ลากขอบว่างเข้ามาในจอ
4. `will-change` เปิดเฉพาะช่วง active ไม่ทิ้งไว้ถาวร
5. งบ JS: GSAP + ScrollTrigger ≤ 60 KB gzip สำหรับทุกเครื่อง และ three.js อีก ~150 KB gzip เฉพาะ desktop ที่ผ่านเงื่อนไขข้อ 4 รวมเพดาน desktop ≤ 220 KB gzip วัดจริงตอน build แล้วบันทึกลง plan

## 4. WebGL hero depth field

แทน 3 ชั้นตัดภาพด้วยภาพเดียว + depth map แล้วให้ fragment shader เลื่อน UV ตามความลึก พิกเซลใกล้เดินทางไกลกว่าพิกเซลไกล

### เงื่อนไขที่ต้องครบก่อนโหลด three.js

```
กว้าง ≥ 1024px  และ  prefers-reduced-motion: no-preference  และ  มี WebGL2
```

ไม่ครบข้อใดข้อหนึ่ง = ไม่โหลดไลบรารีเลยแม้ไบต์เดียว (`await import()` แบบ dynamic) และใช้ CSS layer แทน

รายละเอียดที่ต้องรักษาตอนย้ายเข้า Astro

- render loop หยุดเมื่อ hero ออกจาก viewport (IntersectionObserver)
- input มาจาก scroll + pointer ผ่าน lerp 0.055 ไม่มีการ snap
- ผสมหมอกเข้าชั้นไกล `(1 - depth) * 0.28` และเกรนฟิล์ม 0.022 เพื่อให้ยังอ่านเป็นกระดาษพิมพ์ ไม่ใช่ฟิลเตอร์
- ต้องเพิ่ม class `gl-on` ก่อนเรียก `resize()` ไม่ใช่หลัง เพราะ `#heroGL` เป็น `display: none` อยู่ก่อนหน้า ถ้าวัดตอนยังซ่อนจะได้ drawing buffer 0×0 และ canvas ว่างเปล่า (เจอจริงตอนทำ mockup)
- three.js ≈ 150 KB gzip เกินงบ JS ของหน้าไป 2.5 เท่า ยอมรับเฉพาะ desktop

## 5. Media pipeline และ slot inventory

### pipeline

1. base scene: Seedream V4 หรือ Flux Kontext Pro ($0.03–0.04)
2. depth map: `fal-ai/imageutils/marigold-depth` หรือ `fal-ai/image-preprocessors/depth-anything/v2` (~$0.005–0.02)
3. flat composite ทำในเครื่องด้วย sharp ($0) สำหรับ mobile และ reduced-motion
4. ambient loop: Wan 2.5 $0.05/วินาที — **ไม่จำเป็นต่อ design นี้** hero มี `hero-ambient.mp4/webm` + poster อยู่แล้ว งบที่กันไว้ 3 clip คือ headroom เผื่อเปลี่ยนของเดิมหรือเพิ่มที่แถบ close ถ้าตัดสินใจใช้ ต้องเพิ่ม slot เข้า inventory ข้อ 5 ก่อน

prompt ทุกชิ้นล็อกโทน: off-white `#FAF9F7`, charcoal, muted gold accent, `overcast soft light`, ห้าม neon และห้าม teal-orange grade ตรวจสีก่อนรับงาน ทิ้งแล้ว gen ใหม่ถูกกว่ามาแต่งทีหลัง

เก็บสคริปต์เรียก fal ไว้ที่ `scripts/gen-media.ts` อ่าน `FAL_KEY` จาก `.env.local` (gitignored) เพื่อให้ generate ซ้ำได้โดยไม่ต้องกดมือ

### slot

| slot | หน้า | สัดส่วน / px | ไฟล์ |
|---|---|---|---|
| hero | index | 21:9 · 2560×1097 | `parallax/hero/{color,depth,flat}.webp` |
| service-airport | index | 16:9 · 1920×1080 | `parallax/service/airport-{color,depth}.webp` |
| service-business | index | 16:9 · 1920×1080 | `parallax/service/business-{color,depth}.webp` |
| service-rental | index | 16:9 · 1920×1080 | `parallax/service/rental-{color,depth}.webp` |
| band-trust | index | 16:9 · 1920×1080 | `parallax/trust/bg.webp` (ชั้นเดียว) |
| fleet × 4 | index | 4:3 · 1200×900 | `parallax/fleet/{eco,suv,family,vip}.webp` |
| close | index | 21:9 · 2560×1097 | `parallax/close/bg.webp` |
| scene-city | `routes/bangkok-to-pattaya` | 3:2 · 1800×1200 | `parallax/city/{color,depth}.webp` |
| scene-highway | `routes/bangkok-to-hua-hin` | 3:2 · 1800×1200 | `parallax/highway/{color,depth}.webp` |
| scene-airport | `airport-transfer/*` ทั้ง 2 หน้า | 3:2 · 1800×1200 | `parallax/airport/{color,depth}.webp` |

หน้า `[slug]` ทั้ง 4 ใช้ scene ร่วมกัน 3 ชุด ไม่ใช่ชุดต่อหน้า

### งบ

| รายการ | จำนวน | รวม retry ×3 | รวม |
|---|---|---|---|
| layer set (color + depth) | 7 | ~$0.15 | $1.05 |
| ambient loop 5 วินาที | 3 | ~$0.75 | $2.25 |
| เผื่อ gen ซ้ำ | | | ~$2.00 |
| **รวม** | | | **~$5.30** จาก $9.94 |

## 6. Information architecture — สามแกน ห้ามปน

| แกน | ตอบคำถาม | อยู่ที่ไหน | ค่าอ้างอิง |
|---|---|---|---|
| ประเภทบริการ | คิดราคาแบบไหน | แท็บบนหัวฟอร์มจอง | `ServiceTabs.astro`: `airport→one_way`, `rental→hourly_charter`, `b2b→wait_return`, `fullday→daily_charter` |
| ประเภทรถ | นั่งกี่คน งบเท่าไหร่ | แถบ Fleet + dropdown ในฟอร์ม | ประหยัด / SUV / ครอบครัว / VIP |
| โอกาสใช้งาน | เราทำอะไรได้ | แถบ Services | สนามบิน / ธุรกิจ / เช่าเที่ยว |

### Fleet ตามประเภท

| ประเภท | รุ่น | ที่นั่ง | เริ่มต้น/วัน |
|---|---|---|---|
| ประหยัด (Economy) | Toyota Corolla Altis | 4 | ฿400 |
| เอสยูวี (SUV) | Toyota Fortuner | 7 (5 กระเป๋าใหญ่) | ฿500 |
| ครอบครัว (Family) | Mitsubishi Xpander Cross | 7 | ฿450 |
| วีไอพี (VIP) | Toyota Alphard | 7 (6 กระเป๋าใหญ่) | ฿1,000 |

ป้ายประเภทมีอยู่ในเว็บเดิมแล้ว (`fl.cat.eco|suv|family|vip`) งานนี้แค่เอาประเภทขึ้นนำ รุ่นเป็นรายละเอียดรอง เพื่อให้คนที่ไม่รู้จักรถเลือกได้เอง

dropdown ประเภทรถในฟอร์มต้องพูดภาษาเดียวกับแถบ Fleet ถ้าคนเลือก "ครอบครัว" จากตารางแล้วมาหาในฟอร์มไม่เจอ คือ bug

## 7. โครงหน้า index

ลำดับแถบ: nav → hero → stats → services → fleet → how → trust → เสียงจากลูกค้า → faq → close → footer

รายละเอียดที่ต่างจากของเดิม

- **hero**: สองคอลัมน์ยึดหัวเสมอกัน (`align-items: start`) ฟอร์มอยู่คอลัมน์ขวา `--nav-h: 68px` เป็นตัวแปรกลางให้ hero คิด padding-top จากค่านี้ ของเดิมยึดก้นคอลัมน์ทำให้ฟอร์มที่สูงกว่างอกขึ้นไปมุดใต้ nav ตอนจอเตี้ย
- **hero trust**: เหลือ 4.9 ★ ตัวเดียว
- **stats**: 3 ช่อง (24/7, 500+, 100%) บนมือถือเรียงลงแนวตั้ง
- **services**: 3 แถวสลับซ้ายขวา มีเลขลำดับ 01–03 ไม่ใช่การ์ด 3 ใบเรียงกัน
- **fleet**: รายการราคาแบบตาราง ประเภทขึ้นนำ
- **how**: 3 ขั้น หัวข้อมีเส้นคาดด้านบน mask reveal
- **trust**: bg slot เต็มความกว้าง ข้อความทับด้านบน
- **เสียงจากลูกค้า**: ดึงสดจาก BOS ผ่าน `<Reviews server:defer>` มี `<StaticReviews>` เป็น fallback (ของเดิมใน `index.astro:57-58`) **ห้ามเขียนข้อความรีวิวขึ้นเอง**
- **close**: จุดเดียวที่สีทองรับน้ำหนักเป็นปุ่ม

## 8. โครงหน้า [slug]

`routes/[slug]` และ `airport-transfer/[slug]` ใช้ chapter component ชุดเดียวกับ index สลับแค่ scene และเนื้อหาจาก content collection

- ห้ามแตะ JSON-LD ที่ build จาก collection entry (`serviceSchema` และเพื่อน) SEO เป็น load-bearing คะแนนปัจจุบัน 93/100
- ตารางราคา `rateRows` (one-way / round-trip / day-trip) ยังอยู่ตำแหน่งเดิมในหน้า เป็นแกน "ประเภทบริการ" ของหน้า route
- เนื้อหา `included` 6 ข้อยังอยู่ เปลี่ยนแค่ท่าโผล่

## 9. กติกาการเขียนข้อความ

รันผ่าน skill `humanizer` (Wikipedia signs of AI writing, 33 pattern) ก่อน merge ทุกครั้ง ข้อที่ผิดบ่อยและเจอจริงในรอบนี้

1. **ห้ามแต่งข้อเท็จจริง** ทุกตัวเลข ทุกสเปก ทุกคำสัญญาต้องมีที่มาจาก `Fleet.astro`, `Faq.astro`, `src/content/**/*.yaml` หรือจากคุณอนุวัชร รอบร่างแรกมีของแต่งขึ้น 8 จุด รวมทั้งคำสัญญา "ตอบกลับภายใน 15 นาที" และการกลับความหมายเรื่องค่าทางด่วน (ของจริง: แจ้งล่วงหน้า ไม่ได้รวมในราคา)
2. ห้าม em dash และ en dash ในข้อความที่ผู้ใช้เห็น ยกเว้นข้อความเดิมของเว็บที่เจ้าของเขียนไว้เอง เช่น "จุดรับ–ปลายทาง"
3. ห้าม false range แบบ "ตั้งแต่ X ไปจนถึง Y" เมื่อ X กับ Y ไม่ได้อยู่บนสเกลเดียวกัน
4. ห้าม rule of three ที่ยัดมาให้ครบสามข้อ
5. ห้าม negation ห้อยท้ายแบบไม่มีประธาน

## 10. เกณฑ์ตรวจก่อนถือว่าเสร็จ

1. `npm run build` ผ่าน (มี `astro check` อยู่ในสคริปต์แล้ว)
2. Lighthouse: desktop performance ≥ 95, mobile ≥ 90, accessibility ≥ 95 ทั้งคู่
3. เปิด `prefers-reduced-motion: reduce` แล้วทุกข้อความและทุกภาพต้องเห็นครบ ไม่มีอะไรค้างที่ opacity 0
4. ปิด JavaScript แล้วเนื้อหาต้องยังอ่านได้ครบ (ทดสอบว่า split text ไม่ได้ซ่อนข้อความจาก crawler)
5. iOS Safari จริง 1 เครื่อง: hero ไม่กระตุก ไม่มี layer edge โผล่
6. JSON-LD ทุกบล็อกและ meta ทุกตัวยังอยู่ครบ เทียบกับ main ด้วย diff
7. `serviceType` ที่ยิงจากฟอร์มยังเป็นค่าที่ BOS รับ (`one_way|hourly_charter|wait_return|daily_charter`)

## 11. ของค้างที่แยกการ์ด ไม่ทำในงานนี้

1. `Fleet.astro` ส่ง `data-vtype="premium"` แต่ BOS รับแค่ `sedan|suv|van|luxury` (`elite-chauffeur-backoffice/src/lib/constants.ts:136-139`) และ Xpander ส่ง `suv` ทั้งที่ควรเป็น `van`
2. `ServiceTabs.astro` มีตัวเลือกประเภทรถชุดเก่า (รถเก๋ง / รถ SUV / พรีเมียมแวน / ยังไม่แน่ใจ) ไม่ตรงกับ 4 ประเภทใหม่ Xpander ไม่มีที่ยืน ต้องรวมเป็นชุดเดียว

## 12. นอกขอบเขต

- หน้า blog และ `privacy`
- การถ่ายภาพจริงมาแทน AI
- รถ 3D ใน WebGL (ไม่มีโมเดลลิขสิทธิ์ถูกต้องของรุ่นที่ให้บริการ)
- design system กลางที่แชร์กับ BOS และ sabuydrive-app
