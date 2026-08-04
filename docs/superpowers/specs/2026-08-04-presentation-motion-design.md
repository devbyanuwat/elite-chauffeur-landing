# Presentation Motion — ทั้งหน้าเล่าเป็นบท + CTA "จองรถ"

วันที่: 2026-08-04
สถานะ: อนุมัติแล้ว (design)
Branch: `redesign/editions-scroll-v1` (ต่อยอด — ไม่แตะ main)

## ปัญหา

หน้า landing มีจังหวะเล่าเรื่องแค่ 4 บทที่ pin ไว้ (`intro`, `fleet`, `how`, `routes` ใน
`src/scripts/motion/editions.ts`) และเปิดเฉพาะจอ ≥ 1024px ส่วนที่เหลือของหน้า —
Hero (ไม่มีท่าออก), Stats, Why, Faq, Booking, Cta, BlogTeaser, Footer — เลื่อนผ่านแบบ
fade เดียวจบ (`.reveal` legacy) หรือไม่มีอะไรเลย ผลคือหน้าอ่านเหมือนเว็บยาว ๆ ที่มี
ช่วงสวยแทรกกลาง ไม่ใช่งานนำเสนอที่ต่อเนื่องกันทั้งเรื่อง และผู้ใช้มือถือ (ทราฟฟิกหลัก)
ไม่ได้เห็นจังหวะพวกนั้นเลยสักบท

พร้อมกันนั้น ปุ่มหลักของหน้าเขียนว่า "ขอใบเสนอราคา" ซึ่งฟังเป็นงานเอกสารของฝ่ายจัดซื้อ
ไม่ใช่การตัดสินใจเดินทาง

## เป้าหมาย

1. ทุก section มีจังหวะเข้า–ออกของตัวเอง หน้าอ่านเป็นบทต่อบทเหมือนสไลด์ที่เลื่อนต่อกัน
2. มือถือได้จังหวะครบเท่าเดสก์ท็อป (ยกเว้น parallax/WebGL ที่ยังปิดตามเดิม)
3. คำเรียกร้องหลักทั้งเว็บเปลี่ยนเป็น "จองรถ" / "Book a car"

## ไม่อยู่ในขอบเขต

- ไม่เปลี่ยนปลายทางของปุ่ม (ยังเป็น `#booking` ฟอร์มเดิม) และไม่แตะ backoffice
- ไม่เปิด three.js hero depth บนมือถือ
- ไม่รื้อ `.reveal` legacy ที่เพจ `[service]` / `routes/[slug]` / `airport-transfer/[slug]` ใช้อยู่
- ไม่แตะ logic ภายในของ 4 บทเดิม (ย้ายไฟล์อย่างเดียว)

## สถาปัตยกรรม

`editions.ts` ตอนนี้ 485 บรรทัดถือ 4 บทรวมกัน การเพิ่ม `stats` + `why` เข้าไปตรง ๆ จะดัน
ไฟล์ไปราว 750 บรรทัด ซึ่งเกินขนาดที่แก้ได้อย่างมั่นใจ จึงแยกก่อนแล้วค่อยเพิ่ม

```
src/scripts/motion/
  chapters/intro.ts        ← ย้าย buildIntroChapter ตามเดิม ไม่แก้ logic
  chapters/fleet.ts        ← ย้าย buildFleetChapter + fleetStageForProgress
  chapters/how.ts          ← ย้าย buildHowChapter + howStageForProgress
  chapters/routes.ts       ← ย้าย buildRoutesChapter
  chapters/stats.ts        ← ใหม่
  chapters/why.ts          ← ใหม่
  editions.ts              ← เหลือ collectChapters + applyEditionsPins (registry ล้วน)
  rail.ts                  ← ใหม่: chapter rail
  tiers.ts                 ← เพิ่ม chapterLenFor()
  contract.ts              ← เพิ่ม parseRevealGroup()
```

การย้ายไฟล์ต้องเป็น commit แยกจากการเพิ่มบทใหม่ เพื่อให้ diff ของบทเดิมเป็นศูนย์และ
รีวิวได้ว่าไม่มีอะไรเปลี่ยนพฤติกรรม

หางหน้า (Faq / Booking / Cta / BlogTeaser / Footer) **ไม่เพิ่มเอนจินใหม่** — ย้ายจาก
`.reveal` legacy ไปใช้สัญญา `[data-reveal]` / `[data-reveal-stagger]` ที่ `contract.ts`
รองรับอยู่แล้ว เพิ่มเพียง `data-reveal-group="<ms>"` บน element แม่ เพื่อกระจาย stagger
ให้ลูกโดยไม่ต้องเขียน delay รายตัวใน markup

## จังหวะรายบท

| บท | ท่า | pin len (desktop) |
|---|---|---|
| hero exit | copy `yPercent: -18` + opacity ลด, ภาพ `scale: 1.04` ระหว่างเลื่อน 60vh แรก scrub ต่อเนื่องเข้า intro | ไม่ pin |
| intro / fleet / how / routes | เดิมทั้งหมด | 300–380% (ค่าเดิมใน markup) |
| **stats** | pin แล้วสถิติเข้าทีละตัว: `500+` และ `4.9` เป็น counter จริง, `24/7` และ `100%` ใช้ mask (นับไม่ได้) เส้นทองใต้แถวยาวตาม progress | 160% |
| **why** | หัวเรื่อง mask ขึ้น แล้วการ์ด 3 ใบเข้าทีละใบขณะ hold ใบก่อนหน้าหรี่เหลือ opacity 0.45 ไอคอนวาดเส้น (`data-draw` ที่ `pin.ts` มีอยู่แล้ว) | 240% |
| faq | แถวคำถาม stagger 70ms + hairline วาดจากซ้าย | ไม่ pin |
| booking | ฟิลด์ฟอร์มขึ้นเป็นชุด 60ms ปุ่ม "จองรถ" เข้าท้ายสุด | ไม่ pin |
| cta / blogTeaser / footer | mask headline, การ์ด stagger + ภาพ `scale: 1.06 → 1`, footer fade เงียบ | ไม่ pin |

### ข้อบังคับของ stats

`TripStat` เป็น island `server:defer` ค่าจริงมาหลัง fallback `500+` ดังนั้น counter ต้อง
อ่านค่าเป้าหมายจาก DOM **ตอน ScrollTrigger ยิงครั้งแรก** ไม่ใช่ตอนสร้าง timeline
ไม่งั้นจะนับไปหา `500+` ที่เป็นเพียง fallback ค้างไว้ตลอด

### rail (presentation chrome)

`rail.ts` วาดแถบจุดชิดขอบขวา จุดละบท พร้อมชื่อบทปัจจุบัน อัปเดตจาก ScrollTrigger ชุด
เดียวกับที่บทใช้ (ไม่สร้าง observer ซ้อน) คลิกที่จุดแล้วกระโดดไปต้นบทนั้น

ข้อบังคับสองข้อ:
- rail ต้องอยู่ **นอก** DOM ของ section ที่ถูก pin — element `position: fixed` ที่อยู่ใน
  subtree ของ pin จะถูก transform ของ pin ลากไปด้วย นี่คือบั๊กเดียวกับที่ commit
  `fc0720d` เพิ่งแก้ให้ nav และปุ่มลอย
- ต้องไม่ทับ sticky CTA และ LINE fab ที่มุมล่างขวา — rail จบเหนือแนวปุ่มเหล่านั้น

## ระดับมือถือ

`pickTier` คงชื่อ `full` / `lite` / `static` ไว้ แต่ความหมายของ `lite` เปลี่ยนจาก
"ไม่มี pin" เป็น "**pin ครบ แต่ไม่มี parallax และไม่มี WebGL**"

- `chapterLenFor(tier, base)` — `lite` คูณ 0.55 เพราะระยะปัดนิ้วสั้นกว่าล้อเมาส์มาก
  ถ้าใช้ len เดสก์ท็อปบทจะรู้สึกติดหล่ม
- CSS ของ pin ใช้ `100svh` ไม่ใช่ `100vh` กัน address bar ยืด/หดแล้วความสูง pin เพี้ยน
- ScrollTrigger ทุกบทตั้ง `ignoreMobileResize: true`
- **ไม่ใช้ `ScrollTrigger.normalizeScroll`** — มันยึดการเลื่อนทั้งหน้าไปทำเอง ซึ่งรบกวน
  การโฟกัสช่อง input ของฟอร์มจองและการแตะปุ่ม LINE fab บน iOS แลกไม่คุ้ม
- `canRunHeroDepth` ไม่แตะ — three.js ยังปิดต่ำกว่า 1024px
- rail บนมือถือแสดงเฉพาะจุด ไม่มีป้ายชื่อบท

### การชนกันกับ mobile-lite

`applyMobileLite` ใน `src/scripts/motion/mobile-lite.ts` สร้าง timeline ของตัวเองสำหรับ
มือถืออยู่แล้ว เมื่อเปิดบทบนมือถือ จะมีสองระบบขยับ element เดียวกัน ต้องถอดเฉพาะส่วนที่
ทับกับบทออกจาก `applyMobileLite` เหลือไว้เฉพาะสิ่งที่ไม่ใช่บท คือ review drift และ
sticky CTA (`startReviewDrift`, `initStickyCta`, `watchReviewTrack`, `wireReviewArrows`)

markup ที่มีบล็อกสำรองสำหรับมือถือ (เช่น `.how-mobile` ใน `How.astro`) ต้องแสดงทางเดียว
ไม่ใช่ทั้งบทและบล็อกสำรองพร้อมกัน

## เปลี่ยนคำเป็น "จองรถ"

ปุ่มทั้ง 4 จุด → ไทย `จองรถ`, อังกฤษ `Book now` ปลายทางยัง `#booking`

อังกฤษใช้ `Book now` ไม่ใช่ `Book a car` เพราะปุ่ม `nav.cta` บนแถบนำทางเขียนว่า
`จองรถ` / `Book now` อยู่ก่อนแล้ว (`src/components/Nav.astro:44`, `src/i18n/en.json:9`)
ปุ่มที่พาไปที่เดียวกันต้องอ่านเหมือนกัน

| ไฟล์ | คีย์ / บรรทัด | เป็น |
|---|---|---|
| `src/components/Hero.astro:36` | `hero.cta1` | จองรถ |
| `src/components/StickyCta.astro:4` | `sticky.cta` | จองรถ |
| `src/components/BookingForm.astro:66` | `book.submit` | จองรถ |
| `src/components/sections/Cta.astro:10` | `cta.b1` | จองรถ |
| `src/components/sections/Cta.astro:8` | `cta.sub` | จองรถได้ทันที หรือทักหาเราทาง LINE ทีมงานดูแลคุณตลอด 24 ชั่วโมง |
| `src/i18n/en.json:21` | `book.title` | Book a car (หัวข้อ ไม่ใช่ปุ่ม จึงไม่ต้องตรงกับ `Book now`) |
| `src/components/sections/How.astro:28` | ขั้น 2 | รับราคายืนยันใน 15 นาที / Confirmed price within 15 minutes |
| `src/content/services/van.yaml:56,60` | FAQ | เขียนใหม่เป็น "ราคาที่เราแจ้ง" / "ราคายืนยัน" |
| `src/content/airports/suvarnabhumi-bkk.yaml:42` | `priceFootnote` | เขียนใหม่ ไม่ใช้คำว่าใบเสนอราคา |

ภาษาไทยอยู่ใน markup โดยตรง (`src/i18n/th.json` เป็น `{}` ว่าง) ภาษาอังกฤษอยู่ใน
`src/i18n/en.json` ต้องแก้ทั้งสองฝั่งให้ตรงกัน

ขั้นที่ 2 ของ How และ FAQ ใน yaml เปลี่ยนถ้อยคำแต่ต้องคงความจริงของขั้นตอน — ราคายัง
ยืนยันหลังกรอกฟอร์ม ไม่ใช่รู้ทันทีตอนกดปุ่ม ห้ามเขียนให้เข้าใจว่าจองแล้วจบทันที

**SEO**: `CLAUDE.md` ระบุว่า SEO เป็น load-bearing วลี "ใบเสนอราคา" ไม่ปรากฏใน `<title>`,
meta description หรือ JSON-LD — ต้อง grep ยืนยันซ้ำก่อนแตะ yaml เพราะ yaml เหล่านั้น
ป้อน FAQ schema ของเพจ service / route / airport

## การพิสูจน์

- **unit (vitest, ตามแพตเทิร์น `tests/motion/` เดิม)** — `chapterLenFor`,
  `statsStageForProgress`, `whyStageForProgress`, `parseRevealGroup`, ตัวเลือกบท active
  ของ rail ทุกตัวต้องเป็นฟังก์ชันบริสุทธิ์ที่เทสต์ได้ด้วย jsdom โดยไม่ต้องมี GSAP จริง
- **วัดในเบราว์เซอร์จริง 2 ขนาด** 1440×900 และ 390×844 (chromium headless shell ยิงที่
  `[::1]:4321` ตามที่ตั้งค่าไว้แล้ว) — แคปทุก stage ของ stats และ why, ยืนยันว่าไม่มี
  horizontal overflow, rail ไม่ทับ sticky CTA และ LINE fab, ขอบ pin ไม่กระโดดตอนเข้า/ออก
- **`prefers-reduced-motion: reduce`** — ไม่มี pin เลยสักบท ทุกอย่างมองเห็นครบ
- **ปิด JavaScript** — ข้อความและภาพครบทั้งหน้า (Global Constraint ข้อ 2 ที่ `motion.css`
  ย้ำไว้)
- **งบ** — bundle เพิ่มไม่เกิน 8KB gzip และ `legacy-reveal.ts` ห้าม import gsap เพราะมัน
  ปลดล็อก element ที่เป็น LCP candidate
- `astro check && npm run build && npm test` ผ่านก่อนปิดงาน
