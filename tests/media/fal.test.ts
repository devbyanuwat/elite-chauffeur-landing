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
