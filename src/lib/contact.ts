/**
 * เบอร์โทร / LINE ของแบรนด์ — แหล่งเดียวของทั้งเว็บ
 * ค่าจริงมาจาก section 'global-contact' ของ CMS (แก้ที่ BOS /v3/landing เห็นผลตอน rebuild)
 * BOS ล่มหรือยังไม่ได้ตั้งค่า -> DEFAULT_CONTACT ซึ่งเป็นค่าที่ hardcode อยู่เดิมทุกจุด
 */

import { getLandingContent } from './cms-api';

export interface Contact {
  /** รูปแบบสากล ใช้ตรง ๆ ใน JSON-LD telephone */
  phone: string;
  /** รูปแบบที่แสดงบนหน้าเว็บ */
  phoneDisplay: string;
  lineId: string;
  lineUrl: string;
}

export const DEFAULT_CONTACT: Contact = {
  phone: '+66623879159',
  phoneDisplay: '062-387-9159',
  lineId: '@031cvnva',
  lineUrl: 'https://line.me/R/ti/p/@031cvnva',
};

/** รับเฉพาะ string ที่ไม่ว่าง ฟิลด์ไหนขาด/ผิดชนิดใช้ default ของฟิลด์นั้น */
export function mergeContact(raw: unknown): Contact {
  const c = (raw ?? {}) as Partial<Record<keyof Contact, unknown>>;
  const pick = (key: keyof Contact): string => {
    const v = c[key];
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : DEFAULT_CONTACT[key];
  };
  return { phone: pick('phone'), phoneDisplay: pick('phoneDisplay'), lineId: pick('lineId'), lineUrl: pick('lineUrl') };
}

/** href สำหรับปุ่มโทร — เบอร์สากลกดในไทยไม่ติด จึงแปลง +66 กลับเป็น 0 */
export function telHref(phone: string): string {
  return 'tel:' + phone.replace(/^\+66/, '0');
}

export async function getContact(): Promise<Contact> {
  return mergeContact((await getLandingContent())?.['global-contact']);
}
