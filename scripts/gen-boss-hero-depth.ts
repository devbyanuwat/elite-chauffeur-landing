/* One-off depth-map generation for the LIVE hero photograph (SABUY landing motion-system,
 * "boss hero" parallax prototype).
 *
 * public/images/hero-bg.travelv1-baseline.webp is a real photograph — the one currently live
 * on sabuygo.com and the one the client is personally attached to. It is NOT a SCENES entry in
 * scripts/media/scenes.ts and must never become one: SCENES pairs are (re)generated together by
 * scripts/gen-media.ts (color via Seedream, depth via Marigold), and `--force` regenerates both.
 * If this photo were registered as a scene, a future --force run would hand it to
 * fal-ai/bytedance/seedream/v4/text-to-image and overwrite the boss's real photo with an AI
 * repaint. This script exists specifically to avoid that: it only ever calls the depth model,
 * reads the photo, and never writes back to its path.
 *
 * Reuses submitAndWait() from ./media/fal — the marigold-depth response shape (`images[].url`)
 * is exactly what that helper already parses for every other depth job in the pipeline, so no
 * bespoke client was needed here (contrast with mockups/gen-hero-video.ts, which reimplements
 * its own submit+poll because the video model returns a different response shape).
 *
 * FAL_KEY is read from .env.local only — never hardcoded, never logged, never written anywhere.
 *
 * Run (one call, ~$0.01-0.02): npx tsx scripts/gen-boss-hero-depth.ts
 */
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { submitAndWait, type FalDeps } from './media/fal';

const REPO_ROOT = process.cwd();
const SOURCE_PHOTO = join(REPO_ROOT, 'public/images/hero-bg.travelv1-baseline.webp');
const OUT_REL = 'parallax/hero-travelv1/depth.webp';
const OUT_FILE = join(REPO_ROOT, 'public/images', OUT_REL);
const MANIFEST_PATH = join(REPO_ROOT, 'public/images/parallax/manifest.json');
const DEPTH_MODEL = 'fal-ai/imageutils/marigold-depth';
const COST_USD = 0.01776; // measured for prior marigold-depth jobs today, see scripts/media/plan.ts

function readFalKey(): string {
  const envPath = join(REPO_ROOT, '.env.local');
  if (!existsSync(envPath)) {
    console.error('gen-boss-hero-depth: missing .env.local — need a FAL_KEY=... line first');
    process.exit(1);
  }
  const content = readFileSync(envPath, 'utf8');
  const line = content.split('\n').find((l) => l.trim().startsWith('FAL_KEY='));
  const value = line ? line.slice(line.indexOf('=') + 1).trim() : undefined;
  if (!value) {
    console.error('gen-boss-hero-depth: FAL_KEY missing from .env.local');
    process.exit(1);
  }
  return value;
}

interface ManifestEntry {
  sceneId: string;
  kind: 'depth';
  outPath: string;
  model: string;
  prompt: string;
  costUsd: number;
  generatedAt: string;
  fileSizeBytes: number;
  aiGenerated: true;
  depthConvention: 'near-bright';
}

function loadManifest(): unknown[] {
  if (!existsSync(MANIFEST_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveManifest(entries: unknown[]): void {
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}

async function main(): Promise<void> {
  if (existsSync(OUT_FILE)) {
    console.error(
      `gen-boss-hero-depth: ${OUT_REL} already exists — this script makes ONE paid call only. ` +
        'Delete the file first if you deliberately want to regenerate it.'
    );
    process.exit(1);
  }

  const apiKey = readFalKey();

  console.log(`source photo: ${SOURCE_PHOTO} (read-only, never modified)`);
  const photoBuffer = readFileSync(SOURCE_PHOTO);
  const photoDataUri = `data:image/webp;base64,${photoBuffer.toString('base64')}`;
  console.log(`  ${photoBuffer.length} bytes`);

  const deps: FalDeps = {
    fetch: globalThis.fetch,
    apiKey,
    sleep: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  };

  console.log(`\n> submitting ${DEPTH_MODEL} ...`);
  const resultUrl = await submitAndWait(DEPTH_MODEL, { image_url: photoDataUri }, deps);

  const res = await fetch(resultUrl);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  // marigold-depth returns raw far=bright; invert so near=bright, matching the stored
  // convention (depthConvention: "near-bright") every other depth.webp in this repo uses.
  await sharp(buffer).negate({ alpha: false }).webp({ quality: 90 }).toFile(OUT_FILE);
  const fileSizeBytes = statSync(OUT_FILE).size;
  console.log(`\ndone -> public/images/${OUT_REL} (${fileSizeBytes} bytes)`);

  const manifest = loadManifest();
  const entry: ManifestEntry = {
    sceneId: 'hero-travelv1',
    kind: 'depth',
    outPath: OUT_REL,
    model: DEPTH_MODEL,
    prompt:
      'Depth estimation only — color source is the real, client-approved hero photograph ' +
      'public/images/hero-bg.travelv1-baseline.webp (NOT AI-generated, not part of SCENES, ' +
      'never regenerated or altered). Run as a one-off via scripts/gen-boss-hero-depth.ts.',
    costUsd: COST_USD,
    generatedAt: new Date().toISOString(),
    fileSizeBytes,
    aiGenerated: true,
    depthConvention: 'near-bright',
  };
  manifest.push(entry);
  saveManifest(manifest);
  console.log('manifest.json updated.');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`gen-boss-hero-depth: failed — ${message}`);
  process.exit(1);
});
