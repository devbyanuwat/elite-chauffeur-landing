import type { FleetCar } from './fleet-types';

export interface Chip {
  text: string;
  key: string;
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

function seatChip(seats: number): Chip {
  return { text: `${seats} ที่นั่ง`, key: SEAT_CHIP_KEY };
}

/**
 * รวมข้อมูลจาก BOS เข้ากับการ์ดที่ hardcode ไว้
 * - BOS ตอบว่าง (ล่ม / ยังไม่ตั้งค่า) -> ใช้ fallback ทั้งชุด
 * - BOS ตอบมาแต่ยังไม่มีรูป -> ยืมรูปของ fallback ที่ชื่อรุ่นตรงกัน
 */
export function mergeFleet(api: FleetCar[], fallback: Car[]): Car[] {
  if (api.length === 0) return fallback;

  return api.map((c) => {
    const twin = fallback.find((f) => f.name === c.name);
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
    };
  });
}
