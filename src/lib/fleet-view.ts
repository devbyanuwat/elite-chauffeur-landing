import type { FleetCar } from './fleet-types';

export interface Chip {
  text: string;
  key: string;
  /**
   * fix-review IMPORTANT (2026-08-23): ตัวเลขที่ต้องอยู่นอก node ที่ setLang
   * เขียนทับ (ดูคอมเมนต์ seatChip ด้านล่าง) — ผู้ render ต้องวาง prefix ไว้
   * นอก <span data-i18n>, ไม่ใช่ต่อกับ text แล้วยัดเข้า span เดียวกัน ไม่ตั้ง
   * ค่านี้ = ชิปแบบเดิม (flat span เดียว, ไม่มีตัวเลขแยก)
   */
  prefix?: string;
}

export interface Car {
  ghost: string;
  name: string;
  price: string;
  chips: Chip[];
  img: string;
  alt: string;
  /** null = แอดมินยังไม่ได้ผูกประเภท -> ปุ่ม "เลือกคันนี้" จะไม่ส่ง vtype ให้ฟอร์มจอง */
  vtype: 'sedan' | 'suv' | 'premium' | null;
  /**
   * fix-review IMPORTANT (2026-08-23): ชั้นราคาของ BOS (economy/standard/
   * premium/vip) — ใช้จับคู่กับ fallback เพื่อยืมรูป/vtype ตาม "class" แทน
   * "name" ของรุ่นรถ เพราะ showcase_name แก้ได้ทุกเมื่อบน BOS แต่ class ไม่แก้
   */
  vehicleClass: string;
}

/**
 * ชิปที่คงที่ทุกคัน — ไม่เก็บใน BOS เพราะไม่เคยต่างกัน
 * ชิปที่นั่งใช้ key เดียว (`fl.chip.seats` = แค่คำว่า "ที่นั่ง") แล้วเอาตัวเลขไว้นอก
 * span ที่ setLang เขียนทับ ไม่งั้นสลับเป็นอังกฤษแล้วตัวเลขหาย
 */
export const AUTO_CHIP: Chip = { text: 'เกียร์ออโต้', key: 'fl.chip.auto' };
export const INSURED_CHIP: Chip = { text: 'ประกันเต็มคัน', key: 'fl.chip.insured' };
export const VIP_CHIP: Chip = { text: 'VIP', key: 'fl.chip.vip' };
export const SEAT_CHIP_KEY = 'fl.chip.seats';

export function ghostFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words[words.length - 1] ?? '').toUpperCase();
}

export function formatPrice(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return '';
  return `฿${price.toLocaleString('en-US')}`;
}

// fix-review IMPORTANT (2026-08-23): ตัวเลขต้องอยู่นอก node ที่ setLang เขียน
// ทับ — ก่อนหน้านี้ text เก็บเป็น "7 ที่นั่ง" ก้อนเดียวใน span data-i18n เดียว
// ทำให้ (1) toggle เป็น EN แล้วตัวเลขหาย (en.json มีแค่คำว่า "seats") และ (2)
// i18n.ts เก็บ TH[key] แบบ "key ล่าสุดใน document ชนะ" — รถหลายคันใช้ key
// fl.chip.seats ร่วมกันแต่ text ต่างกัน กลับไทยทีก็เลยได้ตัวเลขของคันสุดท้าย
// ทุกคัน. ใส่ prefix ให้ตัวเลขอยู่นอก span ที่ setLang แตะ ก็ไม่มีอะไรให้ผิดพลาด
function seatChip(seats: number): Chip {
  return { prefix: `${seats} `, text: 'ที่นั่ง', key: SEAT_CHIP_KEY };
}

/**
 * รวมข้อมูลจาก BOS เข้ากับการ์ดที่ hardcode ไว้
 * - BOS ตอบว่าง (ล่ม / ยังไม่ตั้งค่า) -> ใช้ fallback ทั้งชุด
 * - BOS ตอบมาแต่ยังไม่มีรูป -> ยืมรูปของ fallback ที่ vehicleClass ตรงกัน
 *   (ไม่ใช่ name — ชื่อรุ่นแก้ได้ทุกเมื่อบน BOS, class ไม่แก้)
 */
export function mergeFleet(api: FleetCar[], fallback: Car[]): Car[] {
  if (api.length === 0) return fallback;

  return api.map((c) => {
    const twin = fallback.find((f) => f.vehicleClass === c.vehicleClass);
    const chips: Chip[] = [];
    if (c.seats) chips.push(seatChip(c.seats));
    chips.push(AUTO_CHIP, INSURED_CHIP);
    if (c.vip) chips.push(VIP_CHIP);

    return {
      ghost: ghostFromName(c.name),
      name: c.name,
      price: formatPrice(c.price),
      chips,
      img: c.photoUrl ?? twin?.img ?? '',
      alt: c.name,
      // ไม่เดาประเภทรถ — เดาผิดแปลว่าฟอร์มจองเลือกรถผิดคันให้ลูกค้าเงียบ ๆ
      vtype: c.vtype ?? twin?.vtype ?? null,
      vehicleClass: c.vehicleClass,
    };
  });
}
