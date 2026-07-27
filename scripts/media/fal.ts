export interface FalDeps {
  fetch: typeof globalThis.fetch;
  apiKey: string;
  sleep: (ms: number) => Promise<void>;
}

const QUEUE_BASE = 'https://queue.fal.run';
const POLL_MS = 2000;
const MAX_POLLS = 90; // ~3 นาที
const MAX_DETAIL_LEN = 300;

/**
 * ตัด apiKey ออกจากข้อความก่อนโยน error เสมอ — ป้องกันไม่ให้ FAL_KEY หลุดไป log
 * หรือ manifest แม้ว่า API จะ echo อะไรกลับมาแบบไม่คาดคิดก็ตาม (final-review I5)
 */
function redactKey(text: string, apiKey: string): string {
  if (!apiKey) return text;
  return text.split(apiKey).join('[REDACTED]');
}

/**
 * ดึงข้อความ error จาก body ของ response ที่ตอบมาไม่ ok — พยายามอ่านเป็น JSON
 * ก่อน (fal มักตอบ `{ detail: ... }` หรือ `{ error: ... }`) ถ้า parse ไม่ได้ก็ใช้
 * raw text ตรง ๆ (เช่น HTML error page ของ gateway/proxy)
 */
async function readErrorDetail(response: Response, apiKey: string): Promise<string> {
  const raw = await response.text().catch(() => '');
  if (!raw) return '(ไม่มี body)';

  let detail = raw;
  try {
    const json: unknown = JSON.parse(raw);
    if (json && typeof json === 'object') {
      const record = json as Record<string, unknown>;
      const message = record.detail ?? record.error ?? record.message;
      if (typeof message === 'string' && message) detail = message;
    }
  } catch {
    // raw text ไม่ใช่ JSON — ใช้ raw ตรง ๆ ต่อไป
  }

  return redactKey(detail, apiKey).slice(0, MAX_DETAIL_LEN);
}

/**
 * final-review I5 fix: ก่อนหน้านี้โค้ดเรียก `r.json()` ตรง ๆ โดยไม่เช็ค `r.ok`
 * เลยสักครั้ง — 401 (key ผิด/หมดอายุ), 402 (เครดิตหมด), 429 (rate limit) ทั้งหมด
 * ตอบ body ที่ไม่มี `status_url`/`response_url` มาด้วย ทำให้บรรทัดถัดไปเรียก
 * `deps.fetch(undefined, …)` แล้วเจอ "Failed to parse URL from undefined" ซึ่งไม่
 * บอกอะไรกับ operator เลยว่าจริง ๆ แล้วมันคือ auth ผิดหรือเครดิตหมด
 */
async function assertOk(response: Response, apiKey: string, step: string, model: string): Promise<void> {
  if (response.ok) return;
  const detail = await readErrorDetail(response, apiKey);
  throw new Error(`${model}: ${step} ล้มเหลว — HTTP ${response.status} ${response.statusText} — ${detail}`);
}

/** ยิงงานเข้าคิว fal แล้วรอจนเสร็จ คืน url ของภาพแรกที่ได้ */
export async function submitAndWait(
  model: string,
  input: Record<string, unknown>,
  deps: FalDeps
): Promise<string> {
  const headers = { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' };

  const queueResponse = await deps.fetch(`${QUEUE_BASE}/${model}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  await assertOk(queueResponse, deps.apiKey, 'ส่งงานเข้าคิว', model);
  const queued = (await queueResponse.json()) as { status_url: string; response_url: string };

  for (let i = 0; i < MAX_POLLS; i += 1) {
    const statusResponse = await deps.fetch(queued.status_url, { headers });
    await assertOk(statusResponse, deps.apiKey, 'เช็คสถานะคิว', model);
    const status = (await statusResponse.json()) as { status: string; error?: string };

    if (status.status === 'COMPLETED') {
      const resultResponse = await deps.fetch(queued.response_url, { headers });
      await assertOk(resultResponse, deps.apiKey, 'ดึงผลลัพธ์', model);
      const result = (await resultResponse.json()) as {
        images?: { url: string }[];
        image?: { url: string };
      };
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
