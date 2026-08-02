# Landing redesign — สถานะงาน ณ 2026-07-27 (อ่านไฟล์นี้ก่อนทำต่อ)

Branch: `redesign/parallax-v1` (แตกจาก `bde5808` ซึ่งอยู่ทั้งบน `main` และ `dev`) ยังไม่ merge
Plane: project SABUY workspace `sabuygo` REST `http://localhost:8080/api/v1/workspaces/sabuygo/projects/171ef80b-398b-4d72-a415-8fd51e996a61/issues/` header `X-API-Key` (key อยู่ใน `~/.claude.json` ที่ `projects."…/elite-chauffeur".mcpServers.plane.env.PLANE_API_KEY`)

## เอกสารอ้างอิง

| ไฟล์ | คืออะไร |
|---|---|
| `docs/superpowers/specs/2026-07-27-landing-layered-parallax-design.md` | spec ที่อนุมัติแล้ว (แก้ 2 ครั้ง: ข้อ 6 เรื่องลำดับ script, งบ JS ที่วัดจริง) |
| `docs/superpowers/plans/2026-07-27-landing-motion-system.md` | plan S1 — ทำเสร็จครบ |
| `docs/superpowers/plans/2026-07-27-landing-motion-system-verify.md` | ผลตรวจในเบราว์เซอร์จริงของ S1 |
| `docs/superpowers/plans/2026-07-27-landing-media-pipeline.md` | plan S2 — Task 1-3 เสร็จ Task 4 ทำแล้วแต่ 3 scene ยังไม่ผ่าน |
| `docs/superpowers/plans/2026-07-27-landing-media-inventory.md` | คลังไฟล์ภาพที่ generate แล้ว |
| `mockups/parallax-concept.html` | mockup layout ที่อนุมัติ (gitignored) |
| `mockups/parallax-boss-hero.html` | **mockup ที่ผ่านแล้ว** — hero สลับข้าง + ภาพหัวหน้า + depth parallax (gitignored) |

## S1 motion system (SABUY-52) — เสร็จ

`src/scripts/motion/{contract,tiers,index,legacy-reveal}.ts` + `src/styles/motion.css` + hook ใน `src/layouts/Base.astro`

- 30 unit tests ผ่าน · `npm test` = vitest
- สัญญา: `data-parallax` `data-reveal=up|mask` `data-reveal-stagger` `data-depth-group` `data-split` `data-count` `data-decimals` `data-suffix`
- สามระดับผ่าน `gsap.matchMedia()`: desktop ≥1024 เต็ม / mobile ตัด parallax / reduced-motion ไม่มี transform
- GSAP + ScrollTrigger = **46,368 B gzip** (งบ 61,440) · legacy `.reveal` แยก chunk **463 B** ไม่มี gsap เพื่อไม่ให้ hero รอ
- ปิด JS ซ่อน 0 element (เดิม 32 — ย้าย `.reveal` จาก `global.css` มาเป็น `.js-motion .reveal` ใน `motion.css`)
- **`.reveal` เดิมใช้ใน 14 ไฟล์ ไม่ใช่ 3** ตามที่ plan เขียนไว้ตอนแรก

ยกไป S3: `[data-split]` ยังไม่มี resting state (ข้อความจะกระพริบ) · `.split-line { overflow:hidden }` ตัดสระบน/วรรณยุกต์ไทย ต้องเผื่อ line box · ต้อง `ScrollTrigger.refresh()` เมื่อ `server:defer` island โหลด · jump-scroll เหลือ 4 element ค้าง · `npm test` ยังไม่อยู่ใน CI

## S2 media (SABUY-53)

`scripts/gen-media.ts` + `scripts/media/{scenes,plan,fal}.ts` — ไม่ยิงเน็ตถ้าไม่ส่ง `--run` รองรับ `--only <id>` `--force`
`FAL_KEY` อยู่ใน `.env.local` (gitignored) · depth map เก็บแบบ **near-bright** (invert หลังรับจาก marigold) จดใน `public/images/parallax/manifest.json`

เงิน fal: เริ่ม $9.937 → เหลือ **~$8.668** (ใช้ไป ~$1.27)

| ราคาจริงที่วัดได้ | |
|---|---|
| Seedream V4 color 2560px | ~$0.0378 |
| marigold-depth | ~$0.0178 |
| Wan 2.5 i2v 5 วิ (default 1080p) | **$0.75** ไม่ใช่ $0.25 |

ภาพที่ผ่าน: `hero` (รอบ 2), `service/rental`, `close`, `scene/airport` (มีข้อสังเกตเรื่องหัวเสาทอง)
**ยังไม่ผ่าน**: `service/airport`, `service/business` (ทั้งคู่มีไฟแท็กซี่/ของหรูที่ไม่ได้ขอ), `trust` (ดีขึ้นแต่ยังมีคิ้วโครเมียม)

**บทเรียนสำคัญ**: ฉาก "รถจอดริมทาง + มีคน + กรุงเทพ" พังทุกครั้ง (โมเดลเติมไฟแท็กซี่/กระจังทอง) ส่วนรถเดี่ยว ถนนโล่ง และภาพ detail ผ่านทุกครั้ง — ต้องเปลี่ยนสิ่งที่ยิง ไม่ใช่สู้กับ negative prompt

## การตัดสินใจที่ล็อกแล้ว (คุณอนุวัชร 2026-07-27)

1. แนวทาง motion = **C layered parallax** แล้วภายหลังเปลี่ยนเป็น **Apple-style pin** (ยังไม่ล็อกจำนวนจุด)
2. มุม: `--r-touch: 5px` / `--r-frame: 0` (โครงคม จุดสัมผัสมน)
3. Fleet จัดตาม **ประเภทรถ** ไม่ใช่รุ่น: ประหยัด Altis ฿400 / SUV Fortuner ฿500 / ครอบครัว Xpander ฿450 / VIP Alphard ฿1,000
4. ตัวเลข trust: hero ถือ 4.9 ตัวเดียว แถบ Stats ถือ 24/7 + 500+ + 100%
5. ประเภทบริการ 4 แท็บอยู่หัวฟอร์ม ค่า `serviceType` = `airport→one_way` `rental→hourly_charter` `b2b→wait_return` `fullday→daily_charter`
6. **ภาพ hero ต้องเป็น `public/images/hero-bg.travelv1-baseline.webp`** — ภาพที่หัวหน้าลูกค้าภูมิใจ ห้ามแก้ ห้าม regenerate ห้าม i2v (หน้าคนระยะใกล้จะเพี้ยน)
7. **hero สลับข้าง**: ภาพเปิดโล่งซ้าย ข้อความ+ฟอร์มไปขวา veil กลับทิศเป็นใสซ้าย-ทึบขวา
8. depth strength ของภาพนี้ = **0.03** (0.09 ปีกหมวกเป็นเงาซ้อน / 0.16 ขอบฉีก) — `public/images/parallax/hero-travelv1/depth.webp`

## ที่ยังไม่ได้ตัดสิน

- **palette ขัดกัน**: brief (`.impeccable.md` + `CLAUDE.md`) เขียน off-white/charcoal muted แบบ Aman แต่ภาพหัวหน้าเป็นสายท่องเที่ยว ฟ้าสีฟ้าสด อิ่มสี — ต้องเลือกว่าจะแก้ brief ตามภาพ (แล้ว regenerate ภาพ muted 7 ใบใหม่) หรือทางอื่น
- **มือถือแทบไม่เห็นภาพ** เพราะ veil เดิม 94%→99% ทึบเกือบสนิท ผมเสนอให้ภาพเป็นแถบ ~45vh เหนือข้อความ ยังไม่อนุมัติ
- **veil ทึบขวาไปทับเจดีย์องค์กลาง** ทำให้จางเป็นเงา
- **Apple-style pin กี่จุด** (วัดแล้ว: 1 sequence = 6.34 MB / 40 fps desktop / Safari ยังไม่เทส · 48 เฟรมที่ 1280 จะเหลือ ~2-2.5 MB ต่อจุด)
- **base branch ตอนปิดงาน** `main` หรือ `dev` และจะ merge / เปิด PR / เก็บ branch ไว้

## Plane cards

SABUY-52 S1 (In Progress, มีคอมเมนต์ผลวัดครบ) · 53 S2 · 54 S3 index · 55 S4 routes · 56 S5 airport · 57 S6 brief+gate · 58 bug `data-vtype=premium` ไม่มีใน BOS taxonomy · 59 bug ServiceTabs ประเภทรถชุดเก่า · 60 map cache DB (ใหม่)

## S3 สไลซ์ 1: hero — เสร็จ (`c042c9e`)

hero สลับข้าง + ภาพหัวหน้า + depth field เข้า `src/components/Hero.astro` จริงแล้ว · 49 เทสต์ผ่าน · chunk three.js 188.4 KB gzip แยกจาก motion 46.0 KB (รวม 234.4 KB **เกินเพดาน spec 220 KB อยู่ 14 KB** บันทึกไว้ ไม่ได้กลบ) · ปิด JS ในโซน hero ซ่อน 0 element

ค้าง: มือถือยังไม่เห็นภาพ เพราะ `.hero-bg` สูงเท่าเนื้อหาที่ซ้อนกันทั้งก้อน (~2014px) ทำให้ `object-position` แนวตั้งไม่มีผล หน้าเธอไปอยู่หลังการ์ดฟอร์ม — ของเดิม ไม่ใช่ของที่เพิ่งพัง ข้อเสนอ: ภาพเป็นแถบ ~45vh เหนือข้อความ ยังไม่อนุมัติ

## S3 สไลซ์ 2: pin 3 จุดแบบ Apple (SABUY-61) — โค้ดครบ 7 task รอ review ปิดท้าย

spec ข้อ 3.1 (`e112ebb`) · plan `docs/superpowers/plans/2026-07-27-landing-pinned-sequences.md` (`6fb4b4d`, amend `60d71b7`) · ledger `.superpowers/sdd/2026-07-27-landing-pinned-sequences/progress.md` · ผลวัด `docs/superpowers/plans/2026-07-27-landing-pinned-sequences-verify.md`

ความละเอียดที่เลือก: **transform + สลับข้อความ ไม่ใช้ frame sequence** เพราะสองทางที่วัดแล้วกิน 6.34 MB และ 6.79 MB ต่อจุด (~19 MB สำหรับ 3 จุด) บวก fal $2.25 ทั้งที่ JS desktop เกินเพดานอยู่แล้ว · `data-stage` บอกท่อนเรื่อง ไม่ผูกชนิดสื่อ อัปเกรดทีหลังได้โดยไม่แก้ contract

| task | commit | ผล |
|---|---|---|
| 1 `parsePin` + `collectStages` | `89d57b3` | review clean |
| 2 `pin.ts` + wiring | `1900a85`, fix `3d0d12b` | fix 1 รอบ (เทสต์ tier-exclusivity ไม่ได้พิสูจน์อะไรจริง) |
| 3 `motion.css` | `b20e0a9` | fix 1 รอบ (ลบ will-change ที่ค้างถาวร + บล็อก reduced-motion ที่ตายแล้ว) |
| 4 Fleet 4 คัน | `7cb62e3` | review clean |
| 5 How 3 ขั้น | `b53f39e` | review clean |
| 6 Routes 4 เส้นทาง + เส้น SVG | `a7a9ee4` | review clean |
| 7 วัดในเบราว์เซอร์ | `ac524c5`, fix `65e865d` | เจอ Critical (ข้างล่าง) |

สัญญาใหม่: `data-pin="<ชื่อ>"` `data-pin-length="<%ของความสูงจอ 100-400>"` `data-stage="<ลำดับเริ่ม 0>"` `data-draw` (เส้น SVG) · class `pin-ready` มาจาก `src/scripts/motion/pin.ts` หลังต่อ timeline สำเร็จเท่านั้น = ปิด JS / reduced-motion / จอแคบกว่า 1024px ได้ layout เดิมทั้งดุ้น

### บั๊กที่เจอ: บล็อก desktop ไม่เคยรันเลยตั้งแต่ S1

query `(min-width: 1024px) and not all and (prefers-reduced-motion: reduce)` ผิดไวยากรณ์ — `not all and (...)` เป็นการปฏิเสธทั้ง query ต่อท้าย `and` ไม่ได้ เบราว์เซอร์ parse เหลือ `"not all"` = false ตลอด ยืนยันสองทาง (Playwright ของ subagent + Chrome for Testing 1228 `--dump-dom` ที่ผมรันเอง) แปลว่า `applyParallax()` **ไม่เคยทำงานบนเว็บจริงเลยตั้งแต่ S1 final-review Fix 4** ตัวที่เห็นขยับใน hero เป็น three.js ซึ่งเดินผ่าน `pickTier` ไม่ใช่ `matchMedia` จึงไม่มีใครจับได้ · เทสต์ 68 ตัวจับไม่ได้เพราะ mock `gsap.matchMedia()` ทั้งก้อน ไม่มีใคร parse query

แก้แล้วที่ `65e865d`: เพิ่ม `NOT_REDUCED_MOTION_COMPOSABLE = '(not (prefers-reduced-motion: reduce))'` ใช้ในบล็อก full tier (ตัว standalone `not all and (...)` ถูกอยู่แล้ว ไม่แตะ) + regression test กันรูปแบบ `/\)\s+and\s+not\s+all/`

### ผลวัดหลังแก้ (ของจริง ไม่ใช่คำอ้าง)

69/69 เทสต์ผ่าน · build 0 error · chunk motion **46,427 B gzip** (+427 B จาก baseline งบ +6 KB) · three.js 188,381 B ไม่ขยับ · `pin-ready` ครบ 3 section · fleet/routes ไล่ `[0,1,2,3]` ถอย `[3,2,1,0]` · how `[0,1,2]/[2,1,0]` · ปล่อยแล้วชิด section ถัดไป gap 0px · scroll เร็วผ่านได้คลาดไม่เกิน 1px · เส้น SVG `strokeDashoffset` 1101→28 จาก 1170.56 · reduced-motion 0 pin-ready 0 hidden นับได้ 4/4/3 · สลับภาษากลาง pin ไม่หลุด stage

### ค้างไว้ตรงนี้ (คุณอนุวัชรสั่งหยุด)

1. **scoped re-review ของ fix round 1 ของ Task 7** (`ac524c5..65e865d`) — ยังไม่ได้ดิสแพตช์
2. **final whole-branch review** ทั้ง branch ด้วยโมเดลที่แรงสุด ชี้ไปที่ deferred minor ใน ledger
3. **แก้ไขบันทึกเดิม (final whole-branch review, 2026-07-27): ไม่ใช่แค่ `[data-parallax]` — ทั้งหมด 8 attribute ไม่มีใครใช้ในมาร์กอัปเลย** ตรวจซ้ำด้วย `grep -rn '<attr>=' src/ --include="*.astro"` ทีละตัวจริง ไม่ใช่คัดลอกจากรายการเดิม: `data-parallax` `data-reveal` `data-reveal-stagger` `data-depth-group` `data-split` `data-count` `data-decimals` `data-suffix` — ครบ 0 usages ทุกตัว แปลว่า `applyParallax` `applyReveals` `applySplitReveal` `applyCounts` ใน `src/scripts/motion/index.ts:36-105` ตายทั้งฟังก์ชัน (ไม่ใช่แค่ parallax) รวมถึง `src/styles/motion.css:23-52` และเทสต์ส่วนใหญ่ในชุดที่ทดสอบ 4 ฟังก์ชันนี้ — มีแค่ `data-pin` `data-stage` `data-draw` `data-depth-field` (+ `data-depth-color`/`data-depth-map`/`data-depth-strength` ใน Hero.astro/Base.astro) เท่านั้นที่มีของจริงในมาร์กอัป **ไม่ลบโค้ด** เก็บไว้เป็น dead-but-tested code ต่อไป — ของเดิม แยกเรื่องจากบั๊กข้างบน
4. deferred minor 4 ข้ออยู่ใน ledger

### ปิดครบแล้วเมื่อ 2026-07-28

- scoped re-review ของ Task 7 ผ่าน — reviewer พิสูจน์เองด้วยการย้อนโค้ดกลับแล้วเทสต์ fail จริง
- final whole-branch review (opus) ตีกลับ **Not ready** ด้วย C1 (การ์ด Fleet ตอน pin ตกใต้ขอบจอทุก viewport 1440×900 ตก 207px) + I1 (หัวข้อ `#routes` มุดใต้ nav) + I5 (`fal.ts` ไม่เช็ค `r.ok`) + I3 (เพดาน JS)
- I3 ปิดโดยคุณอนุวัชรเลือก **ยกเพดาน 220 → 240 KB** (`c9d1f87`) พร้อมบันทึกว่าเลข 220 เดิมไม่เคยวัด (ประเมิน three.js ไว้ ~150 KB ของจริง 188 KB)
- fix wave `9b7c192` — 72/72 · C1 แก้โดยให้ section ที่ pin สูงเท่า viewport พอดี ภาพเป็นส่วนยืดหยุ่น ราคา/ปุ่ม/ชิปไม่ถูกย่อ · เทสต์ redact ฝัง key จริงลง body แล้วพิสูจน์ว่าถูกลบ
- re-review ของ fix wave เจอของที่ fix wave ทำพังเอง: `height: calc(100vh - 50px)` ทิ้งแถบล่าง 50px โชว์ `--bg-primary` ใต้ `--bg-secondary` เป็นรอยต่อ แก้ที่ `fc59666` ย้าย margin เข้าไปข้างใน · ผมวัดเองยืนยัน: section 768 = 100vh พอดี ขอบล่างเทียบจอ 0 แถวล่างสุดถูกทาโดย `section.block` ระยะปุ่ม 82/83px
- **ยังค้าง**: `pin.ts` อบ `translateY(24px)` ติดถาวรตอนแตะ transform ครั้งแรก (จับสถานะ `.reveal` ก่อน `legacy-reveal.ts` ใส่ `.in`) วัดได้ ~31px ตอนนี้กลบด้วย safety margin · re-reviewer ยืนยันว่าการแก้ C1 **ไม่ได้พึ่ง**บั๊กนี้ แก้ทีหลังปลอดภัย

## S3 สไลซ์ 3: hero 3 วินาที (SABUY-62) — โค้ดครบ 5 task ยังไม่ปิด review

spec `docs/superpowers/specs/2026-07-28-hero-three-second-design.md` (`3087b8f`) · plan `docs/superpowers/plans/2026-07-28-hero-three-second.md` (`e4350dc`) · ledger `.superpowers/sdd/2026-07-28-hero-three-second/progress.md` · ผลวัด `docs/superpowers/plans/2026-07-28-hero-three-second-verify.md`

**ปัญหาที่วัดได้ก่อนแก้**: จอแรก 1440×900 = 19 ก้อน 52 คำ 364 ตัวอักษรไทย ขณะที่งบ 3 วินาทีจริงราว 6-8 คำ + ปุ่มเดียว · มือถือภาพมองไม่เห็นเลยเพราะ veil 94→99% ถูกทาบนกล่องสูง 2014px บนจอสูง 844px

**การตัดสินใจของคุณอนุวัชร 2026-07-28**: ฟอร์มขอราคา **ย้ายลงล่างทั้งหมด** เหลือปุ่มใน hero — **ทับ spec 2026-07-27 ข้อ 1** ที่เขียนว่าฟอร์มต้องไม่หายจากสายตา แจ้งความขัดแย้งก่อนถามแล้วได้คำตอบเดิม ความเสี่ยงที่รับไว้: คนเริ่มกรอกฟอร์มอาจลดลง · ข้าม mockup ลงโค้ดจริงเลย · palette = UI สีนิ่งกรอบภาพสดหนึ่งภาพ ไม่ regenerate ภาพ

| task | commit | ผล |
|---|---|---|
| 1 ย้ายฟอร์มไป `sections/Booking.astro` | `990bebb`, fix `d3982eb` | fix 1 รอบ (รายงานพิมพ์ตัวเลขที่คำสั่งไม่ได้ให้) |
| 2 ตัดจอแรกเหลือ 5 ก้อน | `eaddc47` | fix 1 รอบ (รายงานอ้างว่า mobile veil ไม่ถูกแตะ ทั้งที่ลบไปแล้ว) |
| 3 `.hero-bg` เป็นแถบ 52svh บนมือถือ | `a2d911e` | review clean |
| 4 แก้ `.impeccable.md` + `CLAUDE.md` | `32345c6`, fix `b903b2b` | fix 1 รอบ (ลำดับ bullet) |
| 5 วัดจริง + `scripts/measure-viewport.mjs` | `c3f0956` | ยังไม่ได้ review |

**ผลวัดที่ controller ยืนยันเอง** (ไม่ใช่แค่คำอ้างของ agent): 1440×900 = **5 ก้อน 10 คำ** · 390×844 = **4 ก้อน 10 คำ** `bgShareOfHero` 0.558 `veilDisplay` none · `h1Opacity` 1 ทั้งสองจอ · contrast 15.57:1 · เห็นด้วยตาจากภาพหน้าจอ: เดสก์ท็อปเจดีย์กลับมาเห็นเป็นเจดีย์ มือถือหน้าเธอเห็นครบไม่มีอะไรทับ

**ค้างของ SABUY-62 — ปิดครบเมื่อ 2026-08-03**
1. task review ของ Task 5 = **PASS** (4 🟡 minor: error handling ของ measure script + trap fix อยู่ในรูป prose) — 🟡 สองข้อแรกปิดที่ `3f1a2a0` (หา chromium ล่าสุดเอง + poll พอร์ตแทน sleep 1.5s — path 1228 เดิมตายเพราะ playwright อัปเดต)
2. final whole-branch review รอบใหม่ (fable, วัดจริงทั้งหมด) = **Ready ไม่มี Critical/Important** · งบ JS วัดสด: motion 46,427 + three 188,381 = ~229.3 KiB รวมทุก chunk ~236.3 KiB ใต้เพดาน 240 · ปิด JS ซ่อน 0 element ที่เป็นของ branch (16 ตัวที่เจอคือ `.tm-cta` hover-reveal มีตั้งแต่ base) · SEO ไม่ regress (JSON-LD/OG/robots/sitemap ไม่ถูกแตะจาก bde5808)
3. H1 ตัดคำกลางคำ — **แก้แล้ว `3f1a2a0`**: `.hero h1 span { white-space: nowrap }` ต่อวลี วัดยืนยัน TH+EN ที่ 1440/390 ทุกวลี line box เดียว overflow 0 (reviewer ทวนซ้ำอิสระ ผ่าน)
4. agent เจอบั๊กในสคริปต์ของ plan เอง 2 จุดแล้วแก้: สคริปต์ contrast สมมติ `rgb()` แต่ Chrome คืน `oklch()` ได้ ratio ปลอม 1.03 · สคริปต์เช็ค anchor อ่าน `scrollY` ก่อน smooth scroll จบ

**minor ที่ review ทิ้งไว้ (ไม่ block)**: comment ใน `motion.css` quote query ผิดรูป (แก้แล้วรอบ 2026-08-03) · doc ค้างเรื่อง H1 (แก้แล้ว) · h1 nowrap ล้นเมื่อจอแคบกว่า ~312px (Galaxy Fold cover — ต่ำกว่า viewport ที่รองรับ) · measure script sort lexicographic + พอร์ต 9339 ชนกันถ้ารันซ้อน — สองข้อหลัง defer

## Serena (ตั้งค่าเมื่อ 2026-07-29)

ทั้งสอง repo ลงทะเบียนเป็น MCP local scope ชี้ `--project` ของตัวเอง `--context ide-assistant` · **ต้อง restart session ถึงจะใช้ได้**

| | landing | BOS |
|---|---|---|
| ชื่อ | `sabuygo-landing` | `sabuygo-bos` |
| index | 34 ไฟล์ | 470 ไฟล์ |
| cache | 808 KB | 18 MB |

**ข้อจำกัดที่ต้องรู้**: serena ไม่รองรับภาษา astro ไฟล์ `.astro` ทั้งหมด (ที่งานจริงอยู่) จึงไม่ถูก index เป็น symbol — บน landing ได้ประโยชน์เฉพาะ `src/scripts/`, `src/lib/`, `scripts/` ส่วน BOS ได้เต็ม

`.serena/cache/` กับ `.serena/project.local.yml` ใส่ `.gitignore` แล้วทั้งสอง repo เพราะ hook `PreCompact` รัน `git add -A && git commit` บน BOS ถ้าไม่กันจะได้ commit 18 MB · `project.yml` track ไว้ให้ทีมใช้ร่วม

## งานการตลาด segment (2026-08-02/03)

- spec กลุ่มเป้าหมาย `docs/superpowers/specs/2026-08-02-target-segments-positioning-design.md` (`65801de`) — 4 segment occasion-led + เสา differentiation 3 ต้น อิง Google Trends (รถตู้เหมา 71.5 / เหมารถ 78.3 / สนามบิน 15.1)
- plan หน้า `/van/` + `/charter/` `docs/superpowers/plans/2026-08-03-segment-pages-van-charter.md` (`d29dad0`) — 3 tasks, collection `services` + template `[service].astro` ตามแบบ routes · รถตู้ยังไม่มีเรต ใช้ "สอบถาม" (คุณอนุวัชรเลือก 2026-08-03) · ราคา charter ลอกจาก extraRatesTable ของ bangkok-to-pattaya.yaml เท่านั้น
- การ์ด Plane SABUY: "Segment pages /van/ + /charter/" id `e939779f-8256-4ec7-9c3f-266867fa1e4c` (labels landing+step-1, high, In Progress)
- DataForSEO ไม่ได้ตั้งค่าในเครื่อง (ไม่มี server entry/credentials) — demand ใช้ pytrends แทน · segment ต่างชาติต้องวัด geo US/UK/SG ก่อนลงแรง

## Segment pages /van/ + /charter/ — เสร็จ 2026-08-03 (Ready to merge)

commits `535c2c0` (collection+YAML) → `fed4c41` (แก้ plan เอง) → `f56bc62` (fix วลีต้องห้าม+reframe one-way) → `b961919` (template) → `710b617` (fix faq.desc) → `84fd04b` (sitemap) · การ์ด Plane `e939779f`

- review ต่อ task จับได้: (1) plan เขียนวลีต้องห้าม "เหมารถพร้อมคนขับ" ใส่ charter เองทั้งที่ตัวเองแบน + เอาราคา one-way แปะป้าย day-trip — แก้ที่ตัว plan ก่อนแล้วค่อย fix เนื้อหา (2) template ใส่ `data-i18n="faq.desc"` โดยไม่มี key — EN toggle ค้างไทย
- final review (fable, รันเอง+เบราว์เซอร์จริง): spec fidelity ครบ, JSON-LD ครบ 3 ชนิด van ไม่มี offers / charter AggregateOffer 1200-4000, ราคา charter ตรง source ทั้ง 13 แถว, EN toggle กด จริง 0 element ค้างไทย, overflow 0 ทุกจอ, homepage ไม่ถูกแตะ — **Ready**
- หมายเหตุ: build output อยู่ `dist/client/` ไม่ใช่ `dist/` (node standalone adapter)

**deferred minors (ไม่ block merge)**: van.yaml `related.desc` มีวลี "เหมารถพร้อมคนขับ" (ไม่ใช่ lead — reword เป็น "เหมารถรายวันกับคนขับ" เมื่อสะดวก) · `<th/>` แรกของ price table ว่าง screen reader อ่าน header เปล่า (pattern เดียวกับ routes ที่ ship แล้ว) · glyph ✓ ใน `.hero-points li::before` ไม่มี alt-text syntax

## Editions scroll story (2026-08-03)

Branch `redesign/editions-scroll-v1` (จาก `cf18959`) — สร้างชุด scroll-story chapters แบบ Editions (pin 3 จุด + intro transform) ทับ hero/services/fleet/how/routes เดิม ตาม spec `.superpowers/sdd/2026-08-03-editions-scroll-story/` (spec → plan → 8 tasks) SDD loop สำเร็จครบ 8 task บน session เดียว ledger เต็มอยู่ที่ `.superpowers/sdd/2026-08-03-editions-scroll-story/progress.md`

**Task-by-task (implement → review → fix rounds)**:
- Task 1 (hero-to-services intro chapter): complete, review clean 0 findings รอบแรก — minor deferred: plan self-contradicts tag list ลำดับ (ผู้ทำตามตามคำ clarifier ถูกแล้ว)
- Task 2 (reorder page + sticky CTA + blog teaser): complete, review clean — minor deferred: `Services.astro` กลายเป็น dead code (ลบตอน cleanup), พิจารณา shared continuous-chapter builder ถ้ามี chapter ไม่มี stage เพิ่ม
- Task 3 (fleet 3-layer depth chapter): 1 fix round — เจอ Important 2 จุด (fleet-tabs ซ่อนผูกกับ pin-ready เดียว หลุดโชว์ pill บน desktop no-JS/reduced-motion; meta layer snap ไม่มี fromTo ตาม mockup) แก้แล้ว re-review PASS
- Task 4 (photo-collage 3-step how chapter): 1 fix round — เจอ Important (how-cap เขียนไทยตรง ๆ ใน JS ค้างเมื่อสลับ EN) + reviewer เจอบั๊กคลาสเดียวกันใน T3 fleet chips ที่ merge ไปแล้วด้วย ตั้งกฎ **JS ห้ามเขียนข้อความไทยที่ EN toggle แก้ไม่ได้ — ต้องอ่านจาก data-i18n DOM (hidden bank pattern)** แก้ทั้งคู่ re-review PASS
- Task 5 (routes dark scroll-driven track): complete, review clean 0 findings — ราคาสอบทานตรง source YAML ครบ
- Task 6 (reviews seamless drift loop): 1 fix round — implementer เจอ+แก้บั๊กจริงในตรรกะ drift เอง 2 จุด (scroll-snap ปฏิเสธการเขียนนอก snap point; scrollLeft getter ปัดเศษ 0.45px ต่อ step ทำ accumulator เพี้ยน) review รอบแรก Not approved: Critical (MutationObserver เฝ้า node เดิมที่ island swap แทนที่ไปแล้ว → ไม่ทำงานเลยเมื่อ island ตอบช้า 1200ms ในโปรดักชันจริง) + Important (scrollSnapType ถูกปิดค้างตลอดชีพ, pause ไม่คืนค่า) แก้แล้ว re-review PASS พร้อมตรวจ Astro runtime source ยืนยัน — minor deferred: `.tm-cta` inline script ที่ตายแล้วใน index.astro, ข้อความ "(คำชมตัวอย่างสำหรับ mockup นี้)" มีอยู่ก่อนงานนี้แล้ว, key `tm.q/n/r` เหลือค้างใน en.json, ฟีเจอร์ per-card booking-prefill CTA หายไปจาก reviews (mockup/spec เป็น quote-only ผู้ใช้อนุมัติแล้ว — แจ้งตอนปิดงาน)
- Task 7 (mobile motion tier): complete, review clean (Approved) — agent เอง browser-verify ไม่ได้เพราะ env chromium เต็มรูปแบบเสีย loopback-http กลางเซสชัน (ระดับเครื่อง ไม่ใช่โค้ด); ผู้ควบคุมวินิจฉัยและวัดยืนยันเองด้วย chromium_headless_shell + `[::1]` + async-IIFE (recipe ด้านล่าง) — 390: pin-spacer 0, `.hm-step` 3, sticky show กลางหน้า/hidden บนสุด, ไม่มี reveal ตกค้างยกเว้น legacy Stats + sticky เอง; 1440: pin 4, overflow 0, sticky โผล่หลัง intro pin จบ (ตรงกับ mockup)
- Task 8 (final verification + docs): กำลังบันทึกในส่วนนี้

**Verification ตัวเลขจริง (task 8, รันวันนี้)**:
- `npm test`: 10 test files, 108 tests — ผ่านหมด
- `npm run build`: 0 errors, 0 warnings (11 hints เดิมไม่เกี่ยวกับ branch นี้ — Turnstile CSP, inline script is:inline hint, unused Props)
- งบ JS gzip ต่อ chunk (`dist/client/_astro/*.js`):
  - `Base.astro..._index_0...js` 2,425 B
  - `Base.astro..._index_1...js` 49,216 B (motion bundle)
  - `Base.astro..._index_2...js` 459 B
  - `Base.astro..._index_3...js` 3,669 B
  - `contract...js` 877 B
  - `three.module...js` 188,381 B
  - `tiers...js` 169 B
  - **รวม 245,196 B** ต่ำกว่าเพดาน 245,760 B (240 KiB) อยู่ 564 B — ผ่านแบบเฉียด ต้องระวังถ้ามีของเพิ่มอีก
- Desktop 1440×900: pin-spacer 4 ตัว ลำดับ `intro → fleet → how → routes` ตรง spec; stage count `#services .svc` 4, `#fleet .rail button` 4, `#how .how-step` 3, `#routes .route-card` 4; หลัง `scrollTo(0,6000)` + รอ 1s: `.sticky-cta` มีคลาส `show`, overflow แนวนอน 0; ลำดับหน้า `reviews`(18500) < `faq`(19365) < `booking`(20096) < `blog-teaser` — blog-teaser ไม่ render ตอน build offline (blog API fetch failed ตามที่คาด ไม่ใช่บั๊ก); EN toggle sweep: หา `[data-i18n]` ที่ยังมีอักษรไทยหลังกด `button[data-lang="en"]` = 0, กด rail button เปลี่ยน fleet stage แล้วนับซ้ำ = 0 เช่นกัน
- Mobile 390×844: pin-spacer 0, `.hm-step` 3, `.fleet-tabs` visible, `.track-clip` scrollable = true, overflow 0, sticky hidden ที่บนสุด/แสดงกลางหน้าหลัง scroll — EN toggle sweep (เปิดเมนูมือถือก่อนกด) = 0 ค้างไทย
- Reduced motion: ตรวจแบบ static (measure script emulate ไม่ได้) — grep `src/scripts/motion/index.ts` ยืนยัน parallax/pins/editions-pins/sticky-cta/split-reveal/reveals/counts/review-drift ทั้งหมดลงทะเบียนอยู่ใน `gsap.matchMedia()` block ที่ query มี `(not (prefers-reduced-motion: reduce))` หรือ `not all and (prefers-reduced-motion: reduce)` เท่านั้น; บรรทัดเดียวที่เช็ค `matchMedia('(prefers-reduced-motion: reduce)').matches` ตรง ๆ (บรรทัด 212) คือ fallback `applyReviewArrowsOnly` ที่ตั้งใจให้รันเฉพาะตอน reduced-motion เปิด (ตรงข้ามเงื่อนไข ไม่ใช่ข้อยกเว้น)
- SEO: `<script type="application/ld+json">` ใน `dist/client/index.html` นับด้วย `grep -o` = 5 ตรง (4 จาก Base + 1 Organization schema); meta description + og:title ยืนยันอยู่ครบ; `git diff cf18959..HEAD --stat -- public/` ว่างเปล่า — branch นี้ไม่แตะ `robots.txt`/`sitemap.xml` เลย

**Deferred minors รวมทั้ง 8 task (ไม่ block merge)**:
1. plan Step-1 tag list ขัดแย้งกับ clarifier ของตัวเอง (T1)
2. `Services.astro` เป็น dead code รอลบตอน cleanup (T2)
3. พิจารณา shared continuous-chapter builder ถ้ามี non-stage chapter เพิ่ม (T2)
4. fl.cat.* keys ที่ไม่ได้ใช้แล้ว, `animate` param ที่ไม่ได้ใช้ (T3)
5. `.tm-cta` inline script ตายแล้วใน `index.astro` (T6)
6. ข้อความ "(คำชมตัวอย่างสำหรับ mockup นี้)" ใน `tm.sub` (มีอยู่ก่อนงานนี้แล้ว ไม่ใช่ regression) (T6)
7. key `tm.q`/`tm.n`/`tm.r` เหลือค้างไม่ได้ใช้ใน `en.json` (T6)
8. per-card booking-prefill CTA หายจาก reviews section (mockup/spec ตั้งใจให้เป็น quote-only cards ผู้ใช้อนุมัติแล้ว — เป็น product note ไม่ใช่บั๊ก) (T6)

**หมายเหตุสภาพแวดล้อมสำหรับ session ถัดไป (สำคัญ — เบี่ยงจากนี้จะค้าง session)**: chromium เต็มรูปแบบ (playwright `chromium-*`) เสีย loopback-http บนเครื่องนี้กลางเซสชัน 2026-08-03 (ระดับเครื่อง ไม่ใช่โค้ด) ต้องใช้ `CHROME_BIN="$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-mac-arm64/chrome-headless-shell"` กับ `scripts/measure-viewport.mjs` แทน · preview server (`npm run preview`) bind แค่ IPv6 ต้องยิง `MEASURE_URL="http://[::1]:4321/..."` (`localhost` ใช้ไม่ได้กับ CDP ตรงนี้) · expression ที่มี `await` ต้องห่อ `(async()=>{ ...; return JSON.stringify(...) })()` เพราะ Runtime.evaluate ไม่รองรับ top-level await · ห้ามใช้ Playwright เต็มรูปแบบตอนนี้, ห้ามติดตั้งอะไรเพิ่ม

## ขั้นถัดไป

`superpowers:finishing-a-development-branch` — ถาม base branch (`main` หรือ `dev`) ที่ยังไม่ได้ตอบ (ครอบทั้ง pin+hero+segment pages+editions scroll story)

### ปิดท้าย editions scroll story (2026-08-03 หลัง T8)

- final whole-branch review (fable) ตีกลับ Not ready 4 blocker: ภาพแท็กซี่ต้องห้ามหลุดเข้า IntroStory ตาม mockup (spec เตือนไว้แล้วก็ยังหลุด), rail jump คำนวณจาก getBoundingClientRect ระหว่าง pin (ย้อนกลับไม่ได้เลย — reproduce ในเบราว์เซอร์), inline style ไม่ revert ตอนสลับ tier ข้าม 1024px (iPad หมุนจอ = layout พัง), copy "(คำชมตัวอย่างสำหรับ mockup นี้)" ค้างทับรีวิวจริง (ของเก่าตั้งแต่ v2)
- fix wave เดียว `cdea72f` เก็บครบ + gsap.context ทุก builder + ลบ orphan i18n keys 28 ตัว — re-review PASS ยืนยันถึงระดับอ่าน source GSAP
- สถานะสุดท้าย: 115 เทสต์ · build สะอาด · งบ JS 244,889/245,760 (เหลือ 871B — three.js กิน 77% ของงบ) · **Ready to merge**
- deferred ไม่ block: ลบ Services.astro ตาย, ลบ script .tm-cta ตาย, mobile fleet tab เป็น crossfade ไม่ใช่สไลด์เต็ม (spec-letter miss ยอมรับแล้ว), duplication applyStage/applyContent, drift ไม่ลบ clone ตอน stop, blog teaser ต้อง verify ตอน build ที่ต่อ BOS ได้ (offline = section หายเงียบ)
- environment เครื่องนี้ (2026-08-03): chromium ตัวเต็มเสีย loopback-http กลางเซสชัน — ใช้ chromium_headless_shell-1208 + MEASURE_URL http://[::1]:4321/ + expression ห่อ (async()=>{...})()

## ขั้นถัดไป (รวมทุก branch)

1. redesign/editions-scroll-v1 (ต่อยอดจาก parallax-v1) — Ready ทั้งสาย: pin+hero เดิม + segment pages + editions story
2. merge รอคำตอบ base branch (main หรือ dev) จากคุณอนุวัชร — คำถามเดิมที่ค้างอยู่
3. หลัง deploy: ตรวจ blog teaser บน build ที่ต่อ BOS + วัด Lighthouse จริง
