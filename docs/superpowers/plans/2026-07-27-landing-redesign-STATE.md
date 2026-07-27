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

## ขั้นถัดไปที่คุยกันไว้

เอา hero (ภาพหัวหน้า + สลับข้าง + depth parallax + gate WebGL) เข้า `src/components/Hero.astro` จริง เพื่อให้ทดสอบบน `npm run dev` ที่ `localhost:4321` ได้ — เป็นสไลซ์แรกของ S3 ไม่ใช่ทั้ง S3
