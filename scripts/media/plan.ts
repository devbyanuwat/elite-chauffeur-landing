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
