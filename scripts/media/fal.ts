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
        .then((r) => r.json() as Promise<{ images?: { url: string }[]; image?: { url: string } }>);
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
