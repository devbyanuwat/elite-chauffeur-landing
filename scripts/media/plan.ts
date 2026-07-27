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

/**
 * ราคาต่อชิ้น วัดจริงเมื่อ 2026-07-27 (ไม่ใช่ตัวเลขจากหน้าราคา):
 * color = $0.03 ตรงกับหน้าราคา fal ของ Seedream V4 (คงที่ต่อภาพ)
 * depth = $0.01776 — marigold-depth คิดเงินตามวินาที compute จริง ไม่มีราคาคงที่ต่อภาพในหน้าราคา
 * ยอดนี้มาจากส่วนต่างยอดคงเหลือจริงของงาน hero 1 คู่ (color+depth) ลบด้วยราคาคงที่ของ color
 * ตัวเลขนี้อาจขยับได้ในอนาคตถ้าเวลา compute ของ depth เปลี่ยน แต่ใกล้เคียงพอสำหรับ dry-run estimate
 */
export const COST_USD: Record<Job['kind'], number> = { color: 0.03, depth: 0.01776 };

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
