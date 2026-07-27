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

/**
 * จำลอง response ที่ไม่ ok (401/402/429 ฯลฯ) — มี `.text()` แต่ตั้งใจไม่ให้
 * `.json()` เรียกสำเร็จ เพื่อยืนยันว่า assertOk() ต้องเช็ค `r.ok` ก่อนอ่าน body
 * แบบ json เสมอ ไม่ใช่แค่ "เผอิญ" อ่าน text ได้
 */
function fakeFetchNotOk(status: number, statusText: string, bodyText: string) {
  return vi.fn(
    async () =>
      ({
        ok: false,
        status,
        statusText,
        text: async () => bodyText,
        json: async () => {
          throw new Error('ไม่ควรถูกเรียก — response ไม่ ok ต้องอ่านด้วย .text() เท่านั้น');
        },
      }) as unknown as Response
  );
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

  it('final-review I5: response ไม่ ok (401) ต้องโยน error บอก status + ข้อความจาก API ไม่ใช่พยายาม parse url จาก undefined', async () => {
    const fetch = fakeFetchNotOk(401, 'Unauthorized', JSON.stringify({ detail: 'Invalid API key' }));

    const err = await submitAndWait('fal-ai/x', {}, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      apiKey: 'SECRET-KEY',
      sleep: async () => {},
    }).catch((e: Error) => e);

    expect(err).toBeInstanceOf(Error);
    expect(String(err)).toContain('401');
    expect(String(err)).toContain('Invalid API key');
    // ต้องไม่ใช่ error เก่าที่มาจากการเรียก fetch(undefined, …) ตอน status_url หายไป
    expect(String(err)).not.toMatch(/parse URL/i);
    expect(String(err)).not.toContain('SECRET-KEY');
  });

  it('final-review I5: response ไม่ ok (402 หมดเครดิต) ก็ต้องบอก status เหมือนกัน และไม่มี api key หลุดไป', async () => {
    const fetch = fakeFetchNotOk(402, 'Payment Required', JSON.stringify({ error: 'insufficient balance' }));

    const err = await submitAndWait('fal-ai/x', {}, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      apiKey: 'SECRET-KEY',
      sleep: async () => {},
    }).catch((e: Error) => e);

    expect(String(err)).toContain('402');
    expect(String(err)).toContain('insufficient balance');
    expect(String(err)).not.toContain('SECRET-KEY');
  });

  it('final-review I5: ถ้า apiKey เผอิญโผล่ใน body ของ response ก็ยังต้องถูก redact ออก', async () => {
    const fetch = fakeFetchNotOk(429, 'Too Many Requests', 'rate limited for key SECRET-KEY, try later');

    const err = await submitAndWait('fal-ai/x', {}, {
      fetch: fetch as unknown as typeof globalThis.fetch,
      apiKey: 'SECRET-KEY',
      sleep: async () => {},
    }).catch((e: Error) => e);

    expect(String(err)).toContain('429');
    expect(String(err)).not.toContain('SECRET-KEY');
    expect(String(err)).toContain('[REDACTED]');
  });
});
