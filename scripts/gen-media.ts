/* Entry point for the landing media pipeline (SABUY-53).
 *
 * Run:
 *   npx tsx scripts/gen-media.ts                    # dry run — prints jobs + cost, NO network call
 *   npx tsx scripts/gen-media.ts --run               # actually generate everything missing
 *   npx tsx scripts/gen-media.ts --run --only hero   # generate one scene only
 *   npx tsx scripts/gen-media.ts --run --force       # regenerate everything, even if it already exists
 *
 * FAL_KEY is read from .env.local only — never hardcoded, never logged, never written to manifest.json.
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { planJobs, type Job, type Scene } from './media/plan';
import { SCENES } from './media/scenes';
import { submitAndWait, type FalDeps } from './media/fal';

const REPO_ROOT = process.cwd();
const IMAGES_ROOT = join(REPO_ROOT, 'public', 'images');
const PARALLAX_ROOT = join(IMAGES_ROOT, 'parallax');
const MANIFEST_PATH = join(PARALLAX_ROOT, 'manifest.json');

const COLOR_MODEL = 'fal-ai/bytedance/seedream/v4/text-to-image';
const DEPTH_MODEL = 'fal-ai/imageutils/marigold-depth';

/** ต้องตรงกับตารางราคาใน scripts/media/plan.ts — ใช้แค่บันทึกลง manifest ต่อ job เดียว */
const COST_USD: Record<Job['kind'], number> = { color: 0.03, depth: 0.01 };

interface Flags {
  run: boolean;
  force: boolean;
  only?: string;
}

interface ManifestEntry {
  sceneId: string;
  kind: Job['kind'];
  outPath: string;
  model: string;
  prompt: string;
  costUsd: number;
  generatedAt: string;
  fileSizeBytes: number;
  aiGenerated: true;
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = { run: false, force: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--run') flags.run = true;
    else if (arg === '--force') flags.force = true;
    else if (arg === '--only') {
      flags.only = argv[i + 1];
      i += 1;
    }
  }
  return flags;
}

/** อ่าน FAL_KEY จาก .env.local เท่านั้น ตายทันทีถ้าไม่มี — ไม่พิมพ์ค่าคีย์ออกมาเด็ดขาด */
function readFalKey(): string {
  const envPath = join(REPO_ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.error('gen-media: ไม่พบไฟล์ .env.local — ต้องมีบรรทัด FAL_KEY=... ก่อนรันสคริปต์นี้');
    process.exit(1);
  }

  const content = readFileSync(envPath, 'utf8');
  const line = content.split('\n').find((l) => l.trim().startsWith('FAL_KEY='));
  const value = line ? line.slice(line.indexOf('=') + 1).trim() : undefined;

  if (!value) {
    console.error('gen-media: ไม่พบ FAL_KEY ใน .env.local — เพิ่มบรรทัด FAL_KEY=... ก่อนรัน');
    process.exit(1);
  }
  return value;
}

/** สแกนว่าไฟล์ output ของแต่ละ scene มีอยู่แล้วหรือยัง — คืน path แบบเดียวกับที่ planJobs คาดหวัง (เช่น parallax/hero/color.webp) */
function scanExisting(scenes: Scene[]): Set<string> {
  const existing = new Set<string>();
  for (const scene of scenes) {
    for (const kind of ['color', 'depth'] as const) {
      const outPath = `${scene.dir}/${kind}.webp`;
      if (existsSync(join(IMAGES_ROOT, outPath))) existing.add(outPath);
    }
  }
  return existing;
}

function printJobTable(jobs: Job[], estimatedUsd: number): void {
  if (jobs.length === 0) {
    console.log('ไม่มีงานต้องทำ — ไฟล์ครบทุก scene แล้ว (ใส่ --force ถ้าต้องการ generate ใหม่ทั้งหมด)');
    return;
  }

  console.log('scene'.padEnd(24) + 'kind'.padEnd(8) + 'outPath');
  for (const job of jobs) {
    console.log(job.sceneId.padEnd(24) + job.kind.padEnd(8) + job.outPath);
  }
  console.log(`\n${jobs.length} งาน — ประเมินค่าใช้จ่ายรวม $${estimatedUsd.toFixed(2)}`);
}

function loadManifest(): ManifestEntry[] {
  if (!existsSync(MANIFEST_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as unknown;
    return Array.isArray(parsed) ? (parsed as ManifestEntry[]) : [];
  } catch {
    return [];
  }
}

function saveManifest(entries: ManifestEntry[]): void {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

async function downloadToWebp(url: string, outFile: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ดาวน์โหลดไฟล์ผลลัพธ์ไม่สำเร็จ (HTTP ${res.status})`);
  const buffer = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outFile), { recursive: true });
  await sharp(buffer).webp({ quality: 90 }).toFile(outFile);
  return statSync(outFile).size;
}

/** ใช้เมื่อต้อง generate เฉพาะ depth ของ scene ที่มี color.webp อยู่แล้วในเครื่อง (ไม่มี url จากคิวรอบนี้) */
function localColorAsDataUri(scene: Scene): string {
  const file = join(IMAGES_ROOT, `${scene.dir}/color.webp`);
  const buffer = readFileSync(file);
  return `data:image/webp;base64,${buffer.toString('base64')}`;
}

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));

  // Step order per plan: อ่าน FAL_KEY ก่อนเสมอ (แม้ dry run) เพื่อให้ config พังไว ไม่ใช่พังกลางทาง
  const apiKey = readFalKey();

  const scenes = flags.only ? SCENES.filter((s) => s.id === flags.only) : SCENES;
  if (flags.only && scenes.length === 0) {
    console.error(`gen-media: ไม่พบ scene id "${flags.only}" ใน SCENES`);
    process.exit(1);
  }

  const existing = scanExisting(scenes);
  const { jobs, estimatedUsd } = planJobs(scenes, existing, flags.force);

  printJobTable(jobs, estimatedUsd);

  if (!flags.run) {
    console.log('\n[dry run] ไม่ได้ใส่ --run — ไม่มีการยิง fal และไม่มี network call ใดๆ เกิดขึ้น');
    return;
  }

  if (jobs.length === 0) return;

  const sceneById = new Map(scenes.map((s) => [s.id, s]));
  const manifest = loadManifest();
  const colorUrlBySceneId = new Map<string, string>();

  const deps: FalDeps = {
    fetch: globalThis.fetch,
    apiKey,
    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  };

  for (const job of jobs) {
    const scene = sceneById.get(job.sceneId);
    if (!scene) throw new Error(`gen-media: ไม่พบ scene "${job.sceneId}" ใน SCENES`);

    console.log(`\n> ${job.sceneId} / ${job.kind} ...`);

    const model = job.kind === 'color' ? COLOR_MODEL : DEPTH_MODEL;
    const resultUrl =
      job.kind === 'color'
        ? await submitAndWait(model, {
            prompt: scene.prompt,
            image_size: { width: scene.width, height: scene.height },
          }, deps)
        : await submitAndWait(model, {
            image_url: colorUrlBySceneId.get(scene.id) ?? localColorAsDataUri(scene),
          }, deps);

    if (job.kind === 'color') colorUrlBySceneId.set(scene.id, resultUrl);

    const outFile = join(IMAGES_ROOT, job.outPath);
    const fileSizeBytes = await downloadToWebp(resultUrl, outFile);

    manifest.push({
      sceneId: scene.id,
      kind: job.kind,
      outPath: job.outPath,
      model,
      prompt: scene.prompt,
      costUsd: COST_USD[job.kind],
      generatedAt: new Date().toISOString(),
      fileSizeBytes,
      aiGenerated: true,
    });
    saveManifest(manifest);

    console.log(`  done -> ${job.outPath} (${fileSizeBytes} bytes)`);
  }
}

main().catch((err: unknown) => {
  // ห้ามพิมพ์ apiKey ไม่ว่ากรณีใด — err ที่นี่เป็นแค่ Error ปกติจาก submitAndWait/fetch/fs ไม่เคยมี key อยู่ในตัวมันเอง
  const message = err instanceof Error ? err.message : String(err);
  console.error(`gen-media: ล้มเหลว — ${message}`);
  process.exit(1);
});
