/**
 * เลือกเนื้อหา section: CMS เมื่อมีและผ่าน guard, ไม่งั้น DEFAULT ในไฟล์ component
 * guard = เช็คโครงขั้นต่ำพอไม่ให้ render พัง — validator ตัวจริงอยู่ฝั่ง BOS
 */

import type { CmsSections } from './cms-api';

export type LText = { th: string; en: string };

export function isLText(v: unknown): v is LText {
  return (
    typeof v === 'object' && v !== null &&
    typeof (v as LText).th === 'string' && (v as LText).th.trim() !== '' &&
    typeof (v as LText).en === 'string'
  );
}

export function section<T>(
  cms: CmsSections | null,
  key: string,
  fallback: T,
  guard: (v: Record<string, unknown>) => boolean,
): T {
  const c = cms?.[key];
  if (c && guard(c)) return c as unknown as T;
  if (c) console.error(`[cms-merge] section "${key}" fails guard, using built-in default`);
  return fallback;
}

/** section นี้ถูกปิดจาก BOS ไหม (visible === false เท่านั้นที่นับว่าปิด) */
export function isHidden(cms: CmsSections | null, key: string): boolean {
  return cms?.[key]?.visible === false;
}

/**
 * ดึงข้อความ th ต่อ i18n key จาก texts ของ section — คืน fallback เมื่อไม่มี
 * ใช้ใน component: t(texts, 'wy.1.t', 'พ.ร.บ. ครบทุกคัน')
 */
export function t(
  texts: Record<string, LText> | undefined,
  key: string,
  fallback: string,
): string {
  const v = texts?.[key];
  return isLText(v) ? v.th : fallback;
}

/** รวมค่า en ของทุก section เป็น dict สำหรับ pageI18n (merge ทับ en.json ตอน init) */
export function collectEnOverrides(cms: CmsSections | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cms) return out;
  for (const content of Object.values(cms)) {
    const texts = (content as { texts?: Record<string, unknown> }).texts;
    if (!texts) continue;
    for (const [k, v] of Object.entries(texts)) {
      if (isLText(v) && v.en.trim() !== '') out[k] = v.en;
    }
  }
  return out;
}
