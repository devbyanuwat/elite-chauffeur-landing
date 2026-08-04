# Presentation motion pass — สิ่งที่วัดได้จริง (Task 9)

รอบวัด: 2026-08-04 · branch `redesign/editions-scroll-v1` · HEAD ตอนวัด `eabba23`
เครื่องมือ: `scripts/measure-viewport.mjs` + `chromium_headless_shell-1208` ยิงที่
`astro preview` บน `http://[::1]:4321/` (Chromium ตัวเต็มบนเครื่องนี้ต่อ loopback ไม่ได้)
baseline ก่อนเริ่มงาน: `git worktree` ของ commit `162807f` build แล้ว preview ที่พอร์ต 4322

ตัวเลขทุกตัวในเอกสารนี้มาจากการรันรอบนี้ ไม่ได้คัดลอกมาจากแผนหรือรายงานใด

---

## 1. Bundle (gzip, JS ทั้งหมดใน `dist/client`)

| | รวม gzip | motion chunk (`Base…index_1_lang`) |
|---|---|---|
| baseline `162807f` | 244,898 B | 49,322 B |
| หลังงานนี้ (รวมของแก้ Task 9) | 246,086 B | 50,429 B |
| **ผลต่าง** | **+1,188 B** | +1,107 B |

งบคือ +8,192 B → ผ่าน ใช้ไป 14.5% ของงบ
(`three.module` 188,381 B เท่ากันทั้งสองฝั่ง — งานนี้ไม่ได้แตะ hero depth)

## 2. เดสก์ท็อป 1440×900

เลื่อนทีละ 450px (ครึ่งจอ) 60 จุด ตั้งแต่ 0 ถึงท้ายเอกสาร

- ความสูงเอกสาร **26,636px** (baseline 22,096px → **1.206×**)
- `document.documentElement.scrollWidth` = **1440** ทุกจุด เท่ากับ `innerWidth` — ไม่มี horizontal overflow เลย (0/60 จุด)
- `#chapter-rail` มี class `rail-ready`
- rail ไม่ทับ `#sticky-cta` และไม่ทับ `.line-float` เลย (0/60 จุด)
- dot ที่ `aria-current="true"` ตรงกับ section ที่อยู่กลางจอทุกจุดที่บทนั้นมี dot
  (6 จุดท้ายที่ไม่ตรงคือ `reviews`/`faq`/`booking` ซึ่ง rail ไม่มี dot ให้ — ดูข้อ 7)

ลำดับบทที่วัดได้ (scrollY → section กลางจอ → dot ที่ติด):

| scrollY | section | dot |
|---|---|---|
| 900–2,700 | stats | stats |
| 3,600–7,200 | services (intro) | services |
| 8,100–11,700 | fleet | fleet |
| 12,600–15,300 | how | how |
| 16,200–18,900 | routes | routes |
| 19,800–22,500 | why | why |

### stats — ทุก stage วิ่งจริง

ค่าที่จับได้ระหว่างไล่ progress (ค่าเดียวกันซ้ำถูกยุบ):

| stat | ค่าที่ผ่านตา |
|---|---|
| 1 `24/7` | `24/7` ตลอด — ไม่แตกเป็น `0/7` |
| 2 (TripStat island) | `191+` → `339+` → `422+` → `474+` → `494+` → `500+` |
| 3 | `2.1 / 5` → `3.3 / 5` → `4.2 / 5` → `4.6 / 5` → `4.9 / 5` |
| 4 | `38%` → `68%` → `84%` → `95%` → `99%` → `100%` |

### why — เข้าทีละใบ

opacity ของการ์ดสามใบตามตำแหน่ง scroll (วัดถี่ 120px ที่ 390×844):

| ช่วง | opacity |
|---|---|
| หัวบท | `[0, 0, 0]` |
| stage 1 | `[1, 0, 0]` |
| stage 2 | `[0.45, 1, 0]` |
| stage 3 | `[0.45, 0.45, 1]` |

มีใบเดียวที่ opacity 1 ทุกช่วง ตามที่ออกแบบไว้

## 3. มือถือ 390×844

- ความสูงเอกสาร **18,640px** — ไม่มี horizontal overflow (`scrollWidth` = 390 ทุกจุดใน 45 จุด)
- rail `rail-ready`, ไม่ทับ CTA/LINE fab เลย (ระยะห่างน้อยสุด rail-bottom → CTA-top = **260px**, → fab-top = **312px**)
- `.how-mobile` มี `display: none` ตลอดช่วงที่บท `how` ถูก pin (8 จุดติดกันตั้งแต่ scrollY 7,500–9,600 ขณะ `#how` มี `.pin-ready`)
- fleet tabs 4 ปุ่ม ขนาด 40×40 มองเห็นได้จริงทั้งสี่ กดแล้วลงในช่วงของบท fleet ทุกปุ่ม:

| ปุ่ม | scrollY หลังกด | section กลางจอ |
|---|---|---|
| 1 | 5,489 | fleet |
| 2 | 5,930 | fleet |
| 3 | 6,371 | fleet |
| 4 | 6,812 | fleet |

### จอเตี้ย 390×640 (คำถามค้างเรื่อง rail ชนปุ่มลอย)

ไม่ชน — rail bottom สูงสุดอยู่ที่ 363px, `#sticky-cta` top 535px, `.line-float` top 573px
ระยะห่างน้อยสุดตลอด 48 จุด: rail → CTA **158px**, rail → fab **210px**

## 4. ความยาวหน้าเทียบก่อนเริ่มงาน

| viewport | baseline `162807f` | ตอนนี้ | อัตราส่วน | งบ 1.6× |
|---|---|---|---|---|
| 1440×900 | 22,096px | 26,636px | **1.206×** | ผ่าน |
| 390×844 | 9,630px | 18,640px | **1.936×** | **เกิน** |

baseline ที่ 390×844 มี `.pin-ready` = 0 บท (ก่อนหน้านี้ pin เฉพาะเดสก์ท็อป) ส่วนตอนนี้มี 6 บท
ความยาวที่เพิ่มคือผลโดยตรงของการตัดสินใจใน Task 6 ที่ให้บททั้งหกทำงานทุกความกว้าง

คณิตของงบ: base len รวม = intro 420 + fleet 380 + how 300 + routes 360 + stats 160 + why 240 = **1,860%vh**
`LITE_LEN_SHARE = 0.55` → มือถือได้ **1,023%vh** = 8,634px บนจอ 844px
งบ 1.6× ยอมให้เพิ่มได้แค่ 5,778px ≈ **684%vh** → ต้องหั่น `LITE_LEN_SHARE` ลงเหลือราว 0.30–0.32
ซึ่งจะดัน 4 ใน 6 บทไปนั่งที่พื้น `MIN_CHAPTER_LEN = 100` พร้อมกัน (จังหวะของทุกบทเท่ากันหมด)
เกินขอบเขต "แก้แบบ minimal" — ยกให้เป็นการตัดสินใจเชิงดีไซน์ ดูข้อ 7

## 5. prefers-reduced-motion: reduce

วัดผ่าน `Emulation.setEmulatedMedia` (เพิ่ม env `MEASURE_MEDIA` ให้ `scripts/measure-viewport.mjs` รอบนี้)

- `matchMedia('(prefers-reduced-motion: reduce)').matches` = `true`
- `document.querySelectorAll('.pin-ready').length` = **0** ทั้งเดสก์ท็อปและมือถือ
- `#chapter-rail` ไม่มี `rail-ready` (ซ่อนอยู่)
- ความสูงเอกสาร 8,405px (เดสก์ท็อป) / 9,629px (มือถือ) — เท่ากับหน้าที่ไม่มี motion
- element ที่ opacity 0 ค้าง: ไม่มีที่เป็นเนื้อหา สิ่งที่เจอเป็น stack ที่ตั้งใจให้โชว์ทีละใบและมีใบที่ opacity 1 อยู่เสมอ
  - `.intro-photo img.svc-img` `[0,0,0,0]` — เป็น overlay `alt=""` ทับ `.intro-photo-img` ที่ opacity 1
  - `#fleet .rail button .lbl` `[1,0,0,0]`
  - `.how-media img` `[1,0,0]`

**ที่พังจริงแล้วแก้:** `#sticky-cta` ค้าง `opacity: 0; pointer-events: none` ตลอดกาล — ดูข้อ 6

## 6. ปิด JavaScript

วัดผ่าน `Emulation.setScriptExecutionDisabled` (เพิ่ม env `MEASURE_NO_JS` รอบนี้)

- `document.body.innerText` ยาว 3,761 ตัวอักษร
- ทุก section มีข้อความอ่านได้: stats 104, services 368, fleet 190, how 391, routes 234, why 422, reviews 494, faq 578, booking 331 ตัวอักษร
- `#chapter-rail` computed `display: none` — ไม่มีจุดลอยที่กดแล้วไม่เกิดอะไร
- `.pin-ready` = 0, ไม่มี horizontal overflow (`scrollWidth` 1440 = `innerWidth`)
- `#sticky-cta` opacity 0 (ไม่มี JS ก็ไม่มีใครใส่ `.show`) — ยอมรับได้ CTA จองรถมีอยู่แล้วทั้งใน nav, hero และ section `booking`

## 7. ของที่แก้ในรอบวัดนี้

**A. `#sticky-cta` มองไม่เห็นเลยเมื่อ prefers-reduced-motion: reduce**
`initStickyCtaOf` ถูกเรียกเฉพาะใน `mm.add` สองสาขา ซึ่งทั้งคู่ปิดเมื่อ reduce
StickyCta.astro ตั้งสถานะพักไว้ที่ `opacity: 0; pointer-events: none` ปุ่มจึงไม่มีวันโผล่
แก้: เรียก `initStickyCtaOf(root)` ในสาขา reduced-motion ด้วย (เป็นการสลับ class ไม่ใช่ tween)
พร้อมปิด transform/transition ของปุ่มใน `@media (prefers-reduced-motion: reduce)`
วัดซ้ำหลังแก้: opacity ไล่จาก `0` → `1` (scrollY 1,500–5,000) → `0` (ใกล้ `#booking`) และ `pointer-events: auto` ตอนโชว์
ไฟล์: `src/scripts/motion/index.ts`, `src/components/StickyCta.astro`, เทสต์ใน `tests/motion/index.test.ts`

**B. counter ของ stats อ่าน source ของ Astro island แทนตัวเลข**
`<b>` ของสถิติ "เที่ยวเดินทาง" ห่อ `TripStat` ที่เป็น island `server:defer`
ก่อน island ลงจอด `b.textContent` คืน `"async function replaceServerIsland(id, r) {…500+…"`
วัดจริงได้ค่านี้ในรอบแรก → `statsCountTarget` อ่านไม่ออก → ตกไปใช้ mask ตัวเลขไม่วิ่ง
และถ้าปล่อยให้ tween เขียน `b.textContent` ทับ ตัว `<script>` ของ island จะถูกล้างจน island ไม่มีวันลงจอด
แก้: เพิ่ม `statDisplayText()` ที่อ่านเฉพาะ text node นอก `<script>`,
ถ้ายังมี `script[data-island-id]` ใน `<b>` ให้ถือว่าสถิตินั้นยังนับไม่ได้ (mask) แล้วอ่านใหม่รอบถัดไป แทนที่จะล็อกค่าถาวร
วัดซ้ำหลังแก้: `191+ → 339+ → 422+ → 474+ → 494+ → 500+` (ค่า 500+ คือ fallback เพราะเครื่องวัดไม่มี `BOS_PUBLIC_API`)
ไฟล์: `src/scripts/motion/chapters/stats.ts`, เทสต์ใน `tests/motion/chapters/stats.test.ts`

**C. เครื่องมือวัด** เพิ่ม env `MEASURE_MEDIA` และ `MEASURE_NO_JS` ให้ `scripts/measure-viewport.mjs`
เพราะไม่มีวิธีวัดสองสาขานี้มาก่อน

## 8. ของที่ยังค้าง — ต้องคนตัดสิน ไม่ใช่ bug ให้แก้

1. **มือถือยาว 1.936× ของก่อนเริ่มงาน** (ข้อ 4) การดึงกลับให้ต่ำกว่า 1.6× ต้องหั่น
   `LITE_LEN_SHARE` จาก 0.55 เหลือ ~0.30 ซึ่งเปลี่ยนจังหวะเล่าเรื่องบนมือถือทั้งหมด
   ทางเลือกและผลที่คำนวณไว้: `0.32` → 1.588× (เฉียดงบ), `0.28` → 1.548× (4 ใน 6 บทชนพื้น 100)
2. **rail dot ค้างที่ `why` หลังจบบทที่หก** — `reviews` / `faq` / `booking` ไม่มี dot
   `aria-current="true"` จึงค้างอยู่ที่ `why` ตลอดสามส่วนท้าย (6 จุดจาก 60 บนเดสก์ท็อป)
   ถ้าไม่ต้องการแบบนี้ ต้องเลือกว่าจะเพิ่ม dot ให้ท้ายหน้า หรือให้ rail ปลด `aria-current` เมื่อพ้นบทสุดท้าย

## 9. ความคมชัดของ `.intro-services .svc-p` (ที่ค้างไว้ให้คนตัดสิน)

วัดที่ 390×844 — ตอนนี้ **ไม่มี scrim และไม่มีภาพอยู่ใต้ข้อความแล้ว** พื้นเป็นสีทึบของ `.intro-chapter`

| | ค่า computed | sRGB | contrast กับพื้น |
|---|---|---|---|
| ข้อความ `.svc-p` | `oklch(0.46 0.015 60)` | `#5F5650` | **6.77 : 1** |
| หัวข้อในบทเดียวกัน | `oklch(0.24 0.018 60)` | — | 15.63 : 1 |
| พื้น (`.intro-chapter`) | `oklch(0.98 0.008 75)` | `#FCF8F3` | — |

ขนาดตัวอักษร 13.76px น้ำหนัก 400 → ผ่าน WCAG AA (ต้องการ 4.5:1) แต่ไม่ถึง AAA (7:1) ยังขาดอีก 0.23

## 10. gate สุดท้าย

- `npx astro check` — 0 errors, 0 warnings, 11 hints (84 ไฟล์)
- `npm test` — 14 ไฟล์ 157 เทสต์ ผ่านทั้งหมด
- `npm run build` — สำเร็จ
