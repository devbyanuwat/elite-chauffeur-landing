# Media pipeline (SABUY-53) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** สร้าง `scripts/gen-media.ts` ที่ generate ภาพทุก slot ของ landing ผ่าน fal.ai ได้ซ้ำๆ แบบกำหนดผลลัพธ์ได้ แล้วผลิตชุดแรกจริงลง `public/images/parallax/`

**Architecture:** manifest บรรยาย scene ทั้งหมด (ชื่อ, สัดส่วน, prompt) แยกจาก client ที่คุยกับ fal และแยกจาก orchestrator ที่ตัดสินว่าไฟล์ไหนต้อง generate ใหม่ ทั้งสามส่วนเทสต์ได้โดยไม่ต้องต่อเน็ต ตามแบบ `scripts/test-blog-api.ts` ที่ stub `global.fetch`

**Tech Stack:** Node 22 + `npx tsx`, fal.ai queue API, sharp สำหรับ composite และ resize

## Global Constraints

- `FAL_KEY` อ่านจาก `elite-chauffeur/.env.local` เท่านั้น (gitignored) ห้าม hardcode ห้าม log ค่า ห้าม commit
- **ห้ามยิง fal โดยไม่มีธงยืนยัน** — รันเปล่าๆ ต้องเป็น dry-run ที่พิมพ์ว่าจะยิงอะไรกี่ครั้งคิดเงินเท่าไหร่ ต้องส่ง `--run` ถึงจะยิงจริง
- ไฟล์ที่มีอยู่แล้วต้องข้าม ไม่ generate ซ้ำ เว้นแต่ส่ง `--force` (เงินจริง ยอดคงเหลือ $9.937 ณ 2026-07-27)
- ทุก prompt ต้องล็อกโทน: off-white `#FAF9F7` / charcoal / muted gold accent, `overcast soft light`, ห้าม neon ห้าม teal-orange grade
- ผลลัพธ์ลง `public/images/parallax/<scene>/{color,depth,flat}.webp` ตามตารางใน spec ข้อ 5
- เก็บ metadata ทุกครั้งที่ generate (model, prompt, seed, cost, เวลา) ลง `public/images/parallax/manifest.json` เพื่อให้ตามรอยได้ว่าไฟล์ไหนมาจาก prompt ไหน
- Google/fal ToS: ไฟล์ที่ได้เป็นของเรา ใช้ได้ ไม่มีข้อจำกัดเวลาเก็บ (ต่างจาก Google Maps) แต่ต้องบันทึกว่าเป็นภาพ AI ใน manifest
- ห้ามแตะ `src/` ในแผนนี้ — งานนี้ผลิตไฟล์ภาพกับสคริปต์เท่านั้น การเอาไปใช้เป็นงานของ S3

## File Structure

| ไฟล์ | หน้าที่ |
|---|---|
| `scripts/media/scenes.ts` | manifest: รายการ scene, สัดส่วน, prompt, ต้องมี depth ไหม |
| `scripts/media/fal.ts` | client: submit เข้าคิว, poll, ดาวน์โหลดผล — ไม่รู้จัก scene |
| `scripts/media/plan.ts` | ฟังก์ชันบริสุทธิ์: ดูว่าไฟล์ไหนขาด แล้วคืนรายการงาน + ค่าใช้จ่ายรวม |
| `scripts/gen-media.ts` | entry: อ่าน flag, เรียกสามไฟล์บน, เขียนไฟล์ + manifest |
| `tests/media/plan.test.ts` | เทสต์ตัวตัดสินงานกับการคิดเงิน |
| `tests/media/fal.test.ts` | เทสต์ client ด้วย fetch ที่ stub ไว้ |

---

### Task 1: manifest + planner (ยังไม่ต่อเน็ต)

**Files:**
- Create: `scripts/media/scenes.ts`, `scripts/media/plan.ts`
- Test: `tests/media/plan.test.ts`

**Interfaces:**
- Produces:
  - `type Scene = { id: string; dir: string; width: number; height: number; prompt: string; needsDepth: boolean }`
  - `SCENES: Scene[]`
  - `planJobs(scenes: Scene[], existing: Set<string>, force: boolean): { jobs: Job[]; estimatedUsd: number }`
  - `type Job = { sceneId: string; kind: 'color' | 'depth'; outPath: string }`

- [ ] **Step 1: เขียนเทสต์ที่ยังไม่ผ่าน** — `tests/media/plan.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { planJobs, type Scene } from '../../scripts/media/plan';

const scene = (id: string, needsDepth = true): Scene => ({
  id, dir: `parallax/${id}`, width: 2560, height: 1097,
  prompt: 'x', needsDepth,
});

describe('planJobs', () => {
  it('ไม่มีไฟล์เลย = ต้อง generate ทั้ง color และ depth', () => {
    const { jobs } = planJobs([scene('hero')], new Set(), false);
    expect(jobs.map((j) => j.kind)).toEqual(['color', 'depth']);
  });

  it('ข้าม scene ที่มีไฟล์ครบแล้ว', () => {
    const existing = new Set(['parallax/hero/color.webp', 'parallax/hero/depth.webp']);
    expect(planJobs([scene('hero')], existing, false).jobs).toHaveLength(0);
  });

  it('generate เฉพาะส่วนที่ขาด', () => {
    const existing = new Set(['parallax/hero/color.webp']);
    const { jobs } = planJobs([scene('hero')], existing, false);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].kind).toBe('depth');
  });

  it('force ทำใหม่ทั้งหมดแม้ไฟล์ครบ', () => {
    const existing = new Set(['parallax/hero/color.webp', 'parallax/hero/depth.webp']);
    expect(planJobs([scene('hero')], existing, true).jobs).toHaveLength(2);
  });

  it('scene ที่ไม่ต้องใช้ depth ได้แค่ color', () => {
    const { jobs } = planJobs([scene('trust', false)], new Set(), false);
    expect(jobs.map((j) => j.kind)).toEqual(['color']);
  });

  it('คิดเงินตามชนิดงาน color 0.03 depth 0.01', () => {
    const { estimatedUsd } = planJobs([scene('hero'), scene('trust', false)], new Set(), false);
    expect(estimatedUsd).toBeCloseTo(0.07, 5);
  });
});
```

- [ ] **Step 2: รันให้เห็นว่าไม่ผ่าน** — `npx vitest run tests/media/plan.test.ts` — FAIL เพราะยังไม่มีไฟล์

- [ ] **Step 3: เขียน `scripts/media/plan.ts`**

```ts
export interface Scene {
  id: string;
  dir: string;
  width: number;
  height: number;
  prompt: string;
  needsDepth: boolean;
}

export interface Job {
  sceneId: string;
  kind: 'color' | 'depth';
  outPath: string;
}

/** ราคาต่อชิ้นจาก fal (2026-07-27): Seedream V4 $0.03/รูป, marigold-depth ~$0.01/รูป */
const COST_USD: Record<Job['kind'], number> = { color: 0.03, depth: 0.01 };

export function planJobs(
  scenes: Scene[],
  existing: Set<string>,
  force: boolean
): { jobs: Job[]; estimatedUsd: number } {
  const jobs: Job[] = [];

  for (const scene of scenes) {
    const kinds: Job['kind'][] = scene.needsDepth ? ['color', 'depth'] : ['color'];
    for (const kind of kinds) {
      const outPath = `${scene.dir}/${kind}.webp`;
      if (!force && existing.has(outPath)) continue;
      jobs.push({ sceneId: scene.id, kind, outPath });
    }
  }

  const estimatedUsd = jobs.reduce((sum, job) => sum + COST_USD[job.kind], 0);
  return { jobs, estimatedUsd };
}
```

- [ ] **Step 4: เขียน `scripts/media/scenes.ts`** — 7 scene ตามตารางใน spec ข้อ 5

ทุก prompt ต่อท้ายด้วย palette lock เดียวกัน:

```ts
const PALETTE =
  'muted off-white and warm charcoal palette, soft overcast daylight, ' +
  'restrained gilded gold accents only, no neon, no teal and orange grade, ' +
  'no text, no watermark, photographic, medium format look';

export const SCENES: Scene[] = [
  {
    id: 'hero', dir: 'parallax/hero', width: 2560, height: 1097, needsDepth: true,
    prompt: `Black luxury van waiting on a quiet Bangkok street at early morning, seen three-quarters from the front, driver in a dark suit standing by the rear door, wet asphalt, low city skyline far behind, deep depth of field separation between car and background. ${PALETTE}`,
  },
  {
    id: 'service/airport', dir: 'parallax/service/airport', width: 1920, height: 1080, needsDepth: true,
    prompt: `Arrival hall of a modern Asian airport seen from a distance, a chauffeur waiting with a name board, travellers blurred in motion, wide calm composition with space on the left. ${PALETTE}`,
  },
  {
    id: 'service/business', dir: 'parallax/service/business', width: 1920, height: 1080, needsDepth: true,
    prompt: `Executive sedan pulling up to a glass office tower entrance in Bangkok, morning, doorman stepping forward, reflections on the car body, wide calm composition. ${PALETTE}`,
  },
  {
    id: 'service/rental', dir: 'parallax/service/rental', width: 1920, height: 1080, needsDepth: true,
    prompt: `Seven seat van on a coastal Thai highway seen from a low roadside angle, palm shadows across the road, hills in the far distance, unhurried holiday mood. ${PALETTE}`,
  },
  {
    id: 'trust', dir: 'parallax/trust', width: 1920, height: 1080, needsDepth: false,
    prompt: `Close detail of a clean vehicle interior, folded cold towel and bottled water in a door pocket, shallow focus, nobody in frame, quiet hotel dossier mood. ${PALETTE}`,
  },
  {
    id: 'close', dir: 'parallax/close', width: 2560, height: 1097, needsDepth: true,
    prompt: `Empty Bangkok expressway curve at dusk seen from above, a single dark vehicle mid-frame, city lights just beginning, generous negative space in the upper third. ${PALETTE}`,
  },
  {
    id: 'scene/airport', dir: 'parallax/airport', width: 1800, height: 1200, needsDepth: true,
    prompt: `Curbside pickup lane at Suvarnabhumi style airport terminal, luggage trolley beside a waiting van, canopy overhead, soft even light. ${PALETTE}`,
  },
];
```

- [ ] **Step 5: รันเทสต์ให้ผ่าน** — `npm test` — ทุกไฟล์ผ่าน รวมของเดิม 30 เทสต์

- [ ] **Step 6: Commit**

```bash
git add scripts/media/scenes.ts scripts/media/plan.ts tests/media/plan.test.ts
git commit -m "feat(media): scene manifest and job planner for the landing image set"
```

---

### Task 2: fal client + entry script (dry-run เท่านั้น)

**Files:**
- Create: `scripts/media/fal.ts`, `scripts/gen-media.ts`
- Test: `tests/media/fal.test.ts`

**Interfaces:**
- Consumes: `Scene`, `Job`, `planJobs` จาก Task 1
- Produces: `submitAndWait(model: string, input: Record<string, unknown>, deps: FalDeps): Promise<string>` คืน URL ของไฟล์ผลลัพธ์

- [ ] **Step 1: เขียนเทสต์ที่ stub fetch** — `tests/media/fal.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { submitAndWait } from '../../scripts/media/fal';

function fakeFetch(responses: unknown[]) {
  let call = 0;
  return vi.fn(async () => {
    const body = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return { ok: true, status: 200, json: async () => body } as Response;
  });
}

describe('submitAndWait', () => {
  it('ส่งงานเข้าคิวแล้ว poll จน COMPLETED และคืน url ของภาพ', async () => {
    const fetch = fakeFetch([
      { status_url: 'https://q/status', response_url: 'https://q/result' },
      { status: 'IN_PROGRESS' },
      { status: 'COMPLETED' },
      { images: [{ url: 'https://cdn/out.png' }] },
    ]);

    const url = await submitAndWait('fal-ai/x', { prompt: 'p' }, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      apiKey: 'k',
      sleep: async () => {},
    });

    expect(url).toBe('https://cdn/out.png');
    const firstCall = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(firstCall[0]).toContain('fal-ai/x');
    expect((firstCall[1].headers as Record<string, string>).Authorization).toBe('Key k');
  });

  it('โยน error เมื่อคิวตอบ FAILED', async () => {
    const fetch = fakeFetch([
      { status_url: 'https://q/status', response_url: 'https://q/result' },
      { status: 'FAILED', error: 'bad prompt' },
    ]);

    await expect(
      submitAndWait('fal-ai/x', {}, {
        fetch: fetch as unknown as typeof globalThis.fetch,
        apiKey: 'k',
        sleep: async () => {},
      })
    ).rejects.toThrow(/FAILED/);
  });

  it('ไม่ใส่ api key ลงในข้อความ error', async () => {
    const fetch = fakeFetch([{ status_url: 'https://q/s', response_url: 'https://q/r' }, { status: 'FAILED' }]);
    const err = await submitAndWait('fal-ai/x', {}, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      apiKey: 'SECRET-KEY',
      sleep: async () => {},
    }).catch((e: Error) => e);
    expect(String(err)).not.toContain('SECRET-KEY');
  });
});
```

- [ ] **Step 2: รันให้เห็นว่าไม่ผ่าน** — `npx vitest run tests/media/fal.test.ts`

- [ ] **Step 3: เขียน `scripts/media/fal.ts`**

```ts
export interface FalDeps {
  fetch: typeof globalThis.fetch;
  apiKey: string;
  sleep: (ms: number) => Promise<void>;
}

const QUEUE_BASE = 'https://queue.fal.run';
const POLL_MS = 2000;
const MAX_POLLS = 90; // ~3 นาที

/** ยิงงานเข้าคิว fal แล้วรอจนเสร็จ คืน url ของภาพแรกที่ได้ */
export async function submitAndWait(
  model: string,
  input: Record<string, unknown>,
  deps: FalDeps
): Promise<string> {
  const headers = { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' };

  const queued = await deps
    .fetch(`${QUEUE_BASE}/${model}`, { method: 'POST', headers, body: JSON.stringify(input) })
    .then((r) => r.json() as Promise<{ status_url: string; response_url: string }>);

  for (let i = 0; i < MAX_POLLS; i += 1) {
    const status = await deps
      .fetch(queued.status_url, { headers })
      .then((r) => r.json() as Promise<{ status: string; error?: string }>);

    if (status.status === 'COMPLETED') {
      const result = await deps
        .fetch(queued.response_url, { headers })
        .then((r) => r.json() as Promise<{ images?: { url: string }[] ; image?: { url: string } }>);
      const url = result.images?.[0]?.url ?? result.image?.url;
      if (!url) throw new Error(`${model}: งานเสร็จแต่ไม่มี url ของภาพในผลลัพธ์`);
      return url;
    }

    if (status.status === 'FAILED') {
      throw new Error(`${model}: งานที่คิว FAILED — ${status.error ?? 'ไม่มีรายละเอียด'}`);
    }

    await deps.sleep(POLL_MS);
  }

  throw new Error(`${model}: หมดเวลารอคิว`);
}
```

- [ ] **Step 4: เขียน `scripts/gen-media.ts`** — entry ที่ยังไม่ยิงจริงถ้าไม่ส่ง `--run`

ต้องทำตามลำดับนี้: อ่าน `.env.local` เอา `FAL_KEY` (ถ้าไม่มีให้ตายพร้อมข้อความชัดเจน), สแกน `public/images/parallax/` หาไฟล์ที่มีอยู่, เรียก `planJobs`, พิมพ์ตารางงานกับยอดเงินรวม, แล้ว **ถ้าไม่มี `--run` ให้จบตรงนั้น** ถ้ามี `--run` ค่อยไล่ทำทีละงาน: color ใช้ `fal-ai/bytedance/seedream/v4/text-to-image` ส่ง `{ prompt, image_size: { width, height } }`, depth ใช้ `fal-ai/imageutils/marigold-depth` ส่ง `{ image_url }` ของ color ที่เพิ่งได้, ดาวน์โหลดแล้วแปลงเป็น webp ด้วย sharp, เขียน `manifest.json` สะสม (model, prompt, cost, timestamp, ขนาดไฟล์) ทุกครั้ง

- [ ] **Step 5: ตรวจ dry-run** — `npx tsx scripts/gen-media.ts` ต้องพิมพ์ 13 งาน (6 scene × color+depth + trust color) ยอดรวม $0.19 และ **ต้องไม่มี request ออกเน็ตเลย** ยืนยันด้วยยอดคงเหลือ fal ที่ไม่ขยับ

- [ ] **Step 6: Commit**

```bash
git add scripts/media/fal.ts scripts/gen-media.ts tests/media/fal.test.ts
git commit -m "feat(media): fal queue client and dry-run generator entry point"
```

---

### Task 3: ยิงจริงเฉพาะ hero แล้วดูผล

**Files:** ผลลัพธ์ลง `public/images/parallax/hero/` และ `public/images/parallax/manifest.json`

- [ ] **Step 1: จดยอดคงเหลือก่อนยิง**

```bash
curl -s -H "Authorization: Key $(grep '^FAL_KEY=' .env.local | cut -d= -f2-)" https://rest.alpha.fal.ai/billing/user_balance
```

- [ ] **Step 2: ยิงเฉพาะ hero**

```bash
npx tsx scripts/gen-media.ts --run --only hero
```

- [ ] **Step 3: ตรวจไฟล์ที่ได้** — `public/images/parallax/hero/color.webp` ต้องมีสัดส่วน 21:9 และขนาดไฟล์ ≤ 400 KB, `depth.webp` ต้องเป็นภาพโทนเทาที่ใกล้=สว่าง

```bash
node -e "const s=require('sharp');['color','depth'].forEach(async k=>{const m=await s('public/images/parallax/hero/'+k+'.webp').metadata();console.log(k,m.width+'x'+m.height,m.size)})"
```

- [ ] **Step 4: จดยอดคงเหลือหลังยิง** แล้วเทียบว่าหักไปเท่าไหร่จริง เทียบกับที่ประเมินไว้ $0.04

- [ ] **Step 5: Commit ไฟล์ภาพ + manifest**

```bash
git add public/images/parallax/hero public/images/parallax/manifest.json
git commit -m "feat(media): generate hero colour pass and depth map"
```

**หยุดตรงนี้** — ให้คุณอนุวัชรดูภาพ hero ก่อนจะยิงอีก 6 scene ที่เหลือ ถ้าโทนไม่ผ่านให้แก้ prompt ใน `scenes.ts` แล้ว `--force --only hero` ใหม่ ถูกกว่าการยิงครบชุดแล้วทิ้ง

---

### Task 4: ยิงที่เหลือ + บันทึกคลัง

**Files:** `public/images/parallax/**`, `docs/superpowers/plans/2026-07-27-landing-media-inventory.md`

- [ ] **Step 1: ยิงส่วนที่เหลือ** — `npx tsx scripts/gen-media.ts --run`
- [ ] **Step 2: สร้าง flat composite ของทุก scene ที่มี depth** สำหรับ mobile และ reduced-motion (sharp resize เป็นความกว้าง 1280 แล้ว encode webp คุณภาพ 78)
- [ ] **Step 3: วัดขนาดรวมของ `public/images/parallax/`** ต้องไม่เกิน 6 MB ถ้าเกินให้ลดคุณภาพ webp ทีละ 5 แล้ววัดใหม่
- [ ] **Step 4: เขียน `docs/superpowers/plans/2026-07-27-landing-media-inventory.md`** — ตารางไฟล์จริงทั้งหมดพร้อมขนาด, ยอดเงินที่ใช้จริง, ยอดคงเหลือ, และ prompt ที่ใช้ได้ผล
- [ ] **Step 5: Commit**

---

## Self-Review

**Spec coverage** — spec ข้อ 5 ครบ: pipeline color→depth→flat (Task 2 ข้อ 4, Task 4 ข้อ 2), palette lock ในทุก prompt (Task 1 ข้อ 4), slot ตามตาราง (`SCENES`), งบและการบันทึก (Task 3 ข้อ 1/4, Task 4 ข้อ 4), `FAL_KEY` จาก `.env.local` (Global Constraints)

**ต่างจาก spec ตรงไหน** — spec เขียนว่าใช้ BiRefNet ตัดพื้นหลังกับ Flux Kontext ลบวัตถุ แผนนี้ตัดสองอย่างนั้นทิ้ง เพราะ WebGL depth field (spec ข้อ 4) ต้องการแค่ color + depth ไม่ต้องแยกเลเยอร์แล้ว ผลคือถูกลงและขั้นตอนสั้นลง — spec ข้อ 5 ตารางไฟล์ระบุ `{color,depth,flat}` อยู่แล้ว จึงไม่ขัดกัน

**Placeholder scan** — ไม่มี TBD ทุกขั้นมีคำสั่งจริง ยกเว้น Task 2 ข้อ 4 กับ Task 4 ที่บรรยายเป็นข้อความเพราะเป็น glue code ที่ผูกกับ filesystem ผู้ทำต้องเขียนเอง — ระบุ input/output/ลำดับไว้ครบแล้ว

**Type consistency** — `Scene` และ `Job` นิยามใน `plan.ts` ที่เดียว `scenes.ts` import ไปใช้ `gen-media.ts` ใช้ทั้งคู่ ไม่มีการนิยามซ้ำ
