# Presentation motion pass — สิ่งที่วัดได้จริง (Task 9)

รอบวัด: 2026-08-04 · branch `redesign/editions-scroll-v1` · HEAD ตอนวัด `eabba23`
เครื่องมือ: `scripts/measure-viewport.mjs` + `chromium_headless_shell-1208` ยิงที่
`astro preview` บน `http://[::1]:4321/` (Chromium ตัวเต็มบนเครื่องนี้ต่อ loopback ไม่ได้)
baseline ก่อนเริ่มงาน: `git worktree` ของ commit `162807f` build แล้ว preview ที่พอร์ต 4322

ตัวเลขทุกตัวในเอกสารนี้มาจากการรันรอบนี้ ไม่ได้คัดลอกมาจากแผนหรือรายงานใด

> **อัปเดต 2026-08-04 (task-8, HEAD `fe85369`):** rail โตจาก 6 เป็น 9 จุด
> (เพิ่ม `#reviews`/`#faq`/`#booking`), stop list มาจาก markup ของ rail เอง
> แทนที่จะมาจาก chapter list, และเพิ่ม `@media (max-height: 480px)` สำหรับจอเตี้ย
> จุดที่พูดถึง rail โดยตรงในเอกสารนี้ (ตาราง dot/section หัวข้อ 2,
> การตรวจ overlap กับ CTA/LINE fab หัวข้อ 2 กับ 3, และหัวข้อย่อย "จอเตี้ย
> 390×640" ในหัวข้อ 3) ถูกแทนที่ด้วยตัวเลขจากรอบวัดนี้ทั้งหมด — ส่วนที่เหลือ
> ของเอกสาร (bundle, stats/why, reduced-motion, no-JS, ของค้างข้อ 8-9) ยังเป็น
> ของรอบวัดเดิม (2026-08-04, HEAD `eabba23`) ไม่ได้แตะ

> **อัปเดต 2026-08-04 (arrow fix, HEAD `c7ef929`):** แก้ของค้างข้อ 4 — rail
> ชนปุ่มลูกศรแคโรเซลรีวิว `.rev-arrow` ที่ 390px กว้าง ด้วยการเพิ่ม
> `@media (max-width: 1023px) { .rev-nav { padding-right: clamp(28px, 5vw, 34px); } }`
> ใน `src/styles/global.css` (ดัน `.rev-nav` เข้าจากขอบขวาเฉพาะช่วงความกว้างที่
> rail active ทุกความกว้าง — ไม่แตะ `#chapter-rail` เลย ตำแหน่ง/ระยะห่างจาก
> `#sticky-cta`/LINE fab ที่วัดไว้เดิมจึงไม่เปลี่ยน) จุดที่พูดถึงการชนนี้ในหัวข้อ 3
> (ทั้งย่อหน้า 390×844 และหัวข้อย่อย "จอเตี้ย 390×640") และของค้างข้อ 4 ในหัวข้อ 8
> ถูกแทนที่ด้วยผลวัดซ้ำรอบนี้ทั้งหมด

> **อัปเดต 2026-08-04 (final fix wave, ตัวเลขจากรอบวัดนี้เท่านั้น):** rail ถูก
> แก้สามเรื่องพร้อมกัน — (1) ลำดับจุดในอาร์เรย์ `stops` เรียงใหม่ให้ `#stats`
> มาก่อน `#services` ตรงกับลำดับจริงในหน้า, (2) แต่ละจุดกลายเป็นกล่องกด
> **24×24px** (WCAG 2.2 AA 2.5.8) โดยวงกลม 7px ย้ายไปเป็น `::before` และ
> `gap` ของ `ul` เหลือ 0, (3) ชื่อบททั้งเก้า + ชื่อ nav ผูก `data-i18n`
> (`rail.*`) แล้ว และ `initRail` อ่าน label จาก `textContent` สด ๆ ของจุด
> ตัวเลขด้านล่างนี้แทนที่ค่าเดิมของ rail ทั้งหมด (rail สูงขึ้นจาก 133.375px
> เป็น 216px เพราะกล่องกด 24px × 9):
>
> | วัดที่ | rail สูง | กล่องกด | ระยะจุดต่อจุด | ลำดับจุดที่ติดจริงตอนเลื่อนทั้งหน้า |
> |---|---|---|---|---|
> | 1440×900 | 216px | 24×24 | 24px | `stats → services → fleet → how → routes → why → reviews → booking` (monotonic ตามลำดับหน้า; `#faq` ถูกตัวสุ่มตัวอย่างข้ามบางรอบเพราะช่วง active สั้นและ pin refresh ทำให้ scrollTo กระโดด — ไม่ใช่ลำดับที่ผิด) |
> | 390×844 | 216px | 24×24 | 24px | ครบทั้งเก้าจุดตามลำดับหน้าเป๊ะ: `stats → services → fleet → how → routes → why → reviews → faq → booking` |
>
> ระยะห่างต่ำสุดตลอดการเลื่อน (สแกน 40–120 ตำแหน่งทั้งหน้า, นับเฉพาะ element
> ที่มองเห็นจริง):
>
> | วัดที่ | rail → `#sticky-cta` | rail → LINE fab | rail → `.rev-arrow` |
> |---|---|---|---|
> | 1440×900 | 228.6px | 275.5px | ไม่เข้าใกล้เลย (ลูกศรอยู่ในกรอบ `.wrap`) |
> | 390×844 | 195.1px | 247.5px | 181.2px |
> | 390×640 | ไม่ปรากฏในเฟรมที่สแกน (CTA opacity 0 ช่วงนั้น) | 145.5px | ไม่เข้าใกล้เลย |
>
> ไม่มี overlap ที่ความกว้าง/ความสูงใดเลย และ `@media (max-height: 480px)`
> ปรับเป็น `max-height: min(75svh, 240px)` เพราะ rail สูง 216px คงที่แล้ว
> (`gap` บีบไม่ได้อีก — กล่องกด 24px คือค่าต่ำสุดที่ WCAG ยอม)
>
> การสลับภาษา: กด EN แล้ว `#chapter-rail-label` = "Chapters on this page",
> ชื่อจุดทั้งเก้า = `By the numbers / Our story / Our fleet / How to book /
> Routes / Why us / Reviews / FAQ / Booking`, label ที่โชว์ข้าง rail เปลี่ยนตาม
>
> **dim-state (Fix 12):** `.why-item.entered` เลิกหรี่เหลือ .45 แล้ว —
> คอนทราสต์ตัวอักษรเนื้อความของการ์ดที่ "ไม่ใช่ใบปัจจุบัน" วัดได้ **4.59:1**
> (ผ่าน WCAG 1.4.3 ที่ 4.5:1; ของเดิมประมาณ 2.2:1) ใบปัจจุบันได้
> **4.73:1** พร้อมกรอบทอง `oklch(0.78 0.085 55)` + พื้นหลัง
> `rgba(196,117,75,.14)` + box-shadow — ค่าเท่ากันทั้ง 390×844 และ 1440×900
> ส่วน `#services .svc` ทุกแถวอยู่ที่ opacity 1 แล้ว แถวที่ active มีเส้นทอง
> ซ้าย `oklch(0.64 0.115 48)` + พื้น `rgba(196,117,75,.1)`

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

- ความสูงเอกสาร **26,636px** (baseline 22,096px → **1.206×** — เท่ากับรอบก่อน
  เพราะจำนวนจุดใน rail ไม่กระทบความสูงของหน้า)
- `document.documentElement.scrollWidth` = **1440** ทุกจุด เท่ากับ `innerWidth` — ไม่มี horizontal overflow เลย
- `#chapter-rail` มี class `rail-ready` ทุกจุด, สูง **133.375px** (โตขึ้นจาก ~110px
  ตอน 6 จุด เพราะเพิ่ม 3 จุด × ช่องว่าง 0.55rem)
- rail ไม่ทับ `#sticky-cta` และไม่ทับ `.line-float` เลย — วัดที่ scrollY 24,000
  (ทั้งสามอย่างมองเห็นชัด, CTA opacity 0.926, fab opacity 1): rail
  `{top:383.3, bottom:516.7}`, `#sticky-cta` `{top:774.1, bottom:823.0}`,
  `.line-float` `{top:833.5, bottom:880.0}` → **ระยะห่าง rail→CTA 257.4px,
  CTA→fab 10.4px** ไม่มี overlap
- ครบทั้ง 9 จุด ติด `aria-current` อย่างน้อยหนึ่งช่วงของการเลื่อน (ไม่มีจุดใดไม่ทำงานเลย)
  และ section กลางจอตรงกับ dot ที่ติดทุกจุดที่วัด (0 mismatch จาก 80 ตำแหน่ง เดินทีละ 333px)

ลำดับบทที่วัดได้ (scrollY → dot ที่ติด, ตรงกับ section กลางจอทุกช่วง):

| scrollY | dot |
|---|---|
| 666–2,664 | stats |
| 2,997–7,326 | services |
| 7,659–11,655 | fleet |
| 11,988–15,318 | how |
| 15,651–19,314 | routes |
| 19,647–22,311 | why |
| 22,644–23,310 | reviews |
| 23,643–23,976 | faq |
| 24,309–25,736 (ถึงท้ายหน้าที่เลื่อนได้ = docH − viewport) | booking |

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

- ความสูงเอกสาร **18,638px** — ไม่มี horizontal overflow (`scrollWidth` = 390 ทุกจุด)
- rail `rail-ready`, สูง **133.375px** (`top:355.3, bottom:488.7`), ไม่ทับ CTA/LINE
  fab เลย — ระยะห่างน้อยสุดตลอดการเลื่อน (เดินทีละ 150px ทั้งหน้า): rail→CTA
  **236.4px** (ที่ scrollY 6,600), rail→fab **288.8px** คงที่ (fab ไม่ขยับตามสกอลล์)
  วัดจุดที่มองเห็นทั้งสามชัด (scrollY 15,000, CTA opacity 0.90, fab opacity 1):
  rail `{top:355.3, bottom:488.7}`, CTA `{top:726.5, bottom:775.4}`, fab
  `{top:777.5, bottom:824.0}` — gap rail→CTA 237.8px
- ครบทั้ง 9 จุด ติด `aria-current` อย่างน้อยหนึ่งช่วง, section กลางจอตรงกับ dot ที่ติด
  ทุกจุดที่วัด (0 mismatch จาก 94 ตำแหน่ง เดินทีละ 200px รวมถึงตรวจละเอียดทีละ 15px
  รอบรอยต่อ how→routes และ routes→why เพื่อความชัวร์ — ไม่พังที่ความสูงนี้)
- **แก้แล้ว (arrow fix):** เดิมปุ่มลูกศร `.rev-arrow` (แคโรเซลรีวิว, `→`) ซ้อนทับ rail
  ในแนวนอนช่วงที่เลื่อนผ่านบทรีวิว — วัดซ้ำหลังเพิ่ม `padding-right` ให้ `.rev-nav`
  ด้วยการสแกนละเอียด (step 70ms) ตลอดช่วง scrollY ที่ปุ่มลูกศรเลื่อนผ่านแนวตั้งของ
  rail (scrollY 14,617–14,831, 31 จุด): `#chapter-rail` คงที่ที่
  `{top:355.3, bottom:488.7, left:373, right:380}` ทุกจุด, `.rev-arrow`
  ขยับจาก `{top:~264, bottom:~306}` ถึง `{top:~537, bottom:~579}` แต่ขอบขวาอยู่ที่
  `right:362` ตลอด (เดิม 390) — ห่างจาก rail (`left:373`) **11px** ทุกจุด ไม่มี
  overlap เลยสักจุด (`overlapCount: 0` จาก 31 ตัวอย่างที่มองเห็นทั้งคู่) และ
  `document.elementFromPoint` ที่ศูนย์กลางทั้ง dot ที่ `.on` และปุ่มลูกศรตรงกับ
  element เดิมทุกจุด (`badHitCount: 0`)
- `.how-mobile` มี `display: none` ตลอดช่วงที่บท `how` ถูก pin (8 จุดติดกันตั้งแต่ scrollY 7,500–9,600 ขณะ `#how` มี `.pin-ready`)
- fleet tabs 4 ปุ่ม ขนาด 40×40 มองเห็นได้จริงทั้งสี่ กดแล้วลงในช่วงของบท fleet ทุกปุ่ม:

| ปุ่ม | scrollY หลังกด | section กลางจอ |
|---|---|---|
| 1 | 5,489 | fleet |
| 2 | 5,930 | fleet |
| 3 | 6,371 | fleet |
| 4 | 6,812 | fleet |

### จอเตี้ย 390×640 (คำถามค้างเรื่อง rail ชนปุ่มลอย)

**rail ไม่ชน CTA/fab** — rail สูง 133.375px (`top:253.3, bottom:386.7`, โตขึ้นจาก
6 จุดเดิม ~110px แต่ยังกึ่งกลางจอเท่ากัน). ระยะห่างน้อยสุดตลอดการเลื่อนทั้งหน้า
(เดินทีละ 150px): rail → CTA **134.4px** (ที่ scrollY 5,400), rail → fab
**186.8px** คงที่. วัดจุดที่มองเห็นทั้งสามชัด (scrollY 10,000, CTA opacity 0.98,
fab opacity 1): gap rail→CTA 134.7px, ไม่มี overlap

**rail ชนปุ่มลูกศรแคโรเซลรีวิว — แก้แล้ว (arrow fix)**: วัดซ้ำด้วยการสแกนละเอียด
(step 70ms) ตลอดช่วง scrollY ที่ปุ่มลูกศรเลื่อนผ่านแนวตั้งของ rail
(scrollY 11,277–11,490, 31 จุด): rail คงที่ที่
`{top:253.3, bottom:386.7, left:373, right:380}` ทุกจุด, `.rev-arrow` ขอบขวาอยู่ที่
`right:362` ตลอด (เดิม 390) — ห่างจาก rail 11px ทุกจุด, `overlapCount: 0`,
`badHitCount: 0` (elementFromPoint ตรง element เดิมทั้ง dot และปุ่มลูกศรทุกจุด)

**dot กับ section กลางจอไม่ตรงกันช่วงสั้น ๆ ที่รอยต่อสองจุด** (พบจากการเดินละเอียด
ทีละ 30px ตลอดหน้า 507 ตำแหน่ง แล้วซูมเข้าทีละ 15-25px รอบรอยต่อที่พบ):

| รอยต่อ | ช่วง scrollY ที่ไม่ตรง | ความกว้าง | สิ่งที่เกิด |
|---|---|---|---|
| routes → why | 9,240–9,330 | 90px | section กลางจอเป็น `why` แล้ว แต่ dot `routes` ยังติดอยู่ |
| why → reviews | 10,830–10,890 | 60px | dot `reviews` ติดก่อน section กลางจอเปลี่ยนจาก `why` |

รอยต่ออีก 7 จุดที่เหลือ (stats/services, services/fleet, fleet/how, how/routes,
why-boundary ฝั่งอื่น, faq/booking) ตรวจละเอียดแล้วไม่พบ mismatch — เกิดเฉพาะสอง
รอยต่อรอบบท `why` ที่ 390×640 เท่านั้น ไม่พบที่ 390×844 หรือ 1440×900

สาเหตุ: `initRail`'s trigger ใช้ `start:'top center', end:'bottom center'`
วัดตำแหน่งจากความสูงตามธรรมชาติของ section (ไม่ถูก pin) ในขณะที่ chapter ที่ถูก pin
จริงครองจอนานกว่านั้นตามสัดส่วน `chapter-len%` (> 100% เกือบทุกบท) ทำให้ช่วง scroll
ที่ dot ควรติดสั้นกว่าช่วงที่ section แสดงจริงเล็กน้อย — ที่จอ 640px ส่วนต่างนี้ใหญ่พอจะ
เห็นเป็นช่วงว่าง (dead zone) ที่ dot ก่อนหน้าค้างอยู่

**ลองแก้แล้ว rollback:** เปลี่ยน `end: 'bottom center'` เป็น
`endTrigger: '#nextId', end: 'top center'` (ผูกจุดจบของ dot หนึ่งเข้ากับจุดเริ่ม
ของ dot ถัดไปโดยตรง ปิด dead zone โดยโครงสร้าง) — วัดซ้ำแล้วพังกว่าเดิม: dot
`routes` ไม่ติดเลยตลอดทั้งหน้า (67 mismatch จาก 507 ตำแหน่ง แทนที่จะเป็น 7) น่าจะ
เพราะ `endTrigger` ชี้ไปยัง element ที่ตัวเองก็ถูก pin อยู่ทำให้ GSAP คำนวณตำแหน่ง
ผิดเพี้ยน — revert กลับเป็นโค้ดเดิมแล้ว (`git checkout -- src/scripts/motion/rail.ts`,
ยืนยันด้วย `git status` สะอาด) ปล่อย dead zone 60-90px นี้ไว้เป็นของค้างให้คนตัดสิน
(ข้อ 4c) แทนที่จะเสี่ยงพังจุดที่ใช้งานได้ดีอยู่แล้ว

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
2. ~~rail dot ค้างที่ `why` หลังจบบทที่หก~~ **แก้แล้วในรอบนี้** — rail มี 9 จุดครบ
   `reviews`/`faq`/`booking` ติด `aria-current` เองตามลำดับ ที่ท้ายหน้า dot ที่ค้างคือ
   `booking` (บทสุดท้ายจริง) ไม่ใช่ `why` แล้ว — วัดยืนยันทั้ง 1440×900 และ 390×844/640
   (task-8, ดูหัวข้อ 2-3 ที่อัปเดต)
3. **dead zone 60-90px ที่รอยต่อ `routes`→`why`→`reviews` เฉพาะจอ 390×640** (หัวข้อ 3
   "จอเตี้ย 390×640") — dot ค้างของเดิมช่วงสั้น ๆ ก่อนสลับ ไม่ใช่ bug จากการเพิ่ม 3 จุด
   (rail กลไกเดิมเป็นแบบนี้อยู่แล้ว ไม่เคยวัดที่ความสูงนี้มาก่อน) ลองแก้ด้วย
   `endTrigger` แล้วพังกว่าเดิม (ดู log การ revert ในหัวข้อ 3) ทางแก้จริงต้องคำนวณ
   `end` จาก `chapter-len%` ของแต่ละบทแทนตำแหน่งธรรมชาติของ section ซึ่งกระทบ
   `editions.ts`/`tiers.ts` กว้างกว่าไฟล์ rail — ให้คนตัดสินว่าคุ้มจะแก้ไหม
4. ~~rail ชนปุ่มลูกศรแคโรเซลรีวิว (`.rev-arrow`) ที่ 390px กว้าง ทั้ง 844 และ 640 สูง~~
   **แก้แล้ว (arrow fix, HEAD `c7ef929`)** — ดัน `.rev-nav` เข้าจากขอบขวา
   (`padding-right: clamp(28px, 5vw, 34px)` ต่ำกว่า 1024px, `src/styles/global.css`)
   แทนที่จะแตะ rail เอง วัดซ้ำทั้ง 390×844 และ 390×640 ไม่พบ overlap อีกเลย
   (ดูหัวข้อ 3) และทั้ง dot กับปุ่มลูกศรยัง hit-test ตรง element เดิมทุกจุด

## 9. ความคมชัดของ `.intro-services .svc-p` (ที่ค้างไว้ให้คนตัดสิน)

วัดที่ 390×844 — ตอนนี้ **ไม่มี scrim และไม่มีภาพอยู่ใต้ข้อความแล้ว** พื้นเป็นสีทึบของ `.intro-chapter`

| | ค่า computed | sRGB | contrast กับพื้น |
|---|---|---|---|
| ข้อความ `.svc-p` | `oklch(0.46 0.015 60)` | `#5F5650` | **6.77 : 1** |
| หัวข้อในบทเดียวกัน | `oklch(0.24 0.018 60)` | — | 15.63 : 1 |
| พื้น (`.intro-chapter`) | `oklch(0.98 0.008 75)` | `#FCF8F3` | — |

ขนาดตัวอักษร 13.76px น้ำหนัก 400 → ผ่าน WCAG AA (ต้องการ 4.5:1) แต่ไม่ถึง AAA (7:1) ยังขาดอีก 0.23

## 10. gate สุดท้าย

รอบเดิม (2026-08-04, HEAD `eabba23`): `npx astro check` 0/0/11 hints (84 ไฟล์),
`npm test` 14 ไฟล์ 157 เทสต์ผ่าน, `npm run build` สำเร็จ

รอบ task-8 (2026-08-04, HEAD `fe85369`, หลัง revert การลองแก้ rail.ts กลับที่เดิม):
- `npx astro check` — 0 errors, 0 warnings, 11 hints (84 ไฟล์)
- `npm test` — 14 ไฟล์ **159** เทสต์ ผ่านทั้งหมด (เพิ่ม 2 จาก commit ระหว่างสองรอบ ไม่เกี่ยวกับ rail)
- `npm run build` — สำเร็จ
- `git status` หลัง revert — สะอาด (`nothing to commit, working tree clean`), ไม่มีโค้ดเปลี่ยนจากรอบนี้

รอบ arrow fix (2026-08-04, HEAD `c7ef929`):
- `npx astro check` — 0 errors, 0 warnings, 11 hints (84 ไฟล์)
- `npm test` — 14 ไฟล์ 159 เทสต์ ผ่านทั้งหมด
- `npm run build` + `npm run preview` — สำเร็จ, วัดผ่าน `chromium_headless_shell-1208`
