import { describe, expect, it } from 'vitest';
import type { Car } from '../../src/lib/fleet-view';
import { formatPrice, ghostFromName, mergeFleet } from '../../src/lib/fleet-view';

const FALLBACK: Car[] = [
  {
    ghost: 'ALTIS',
    name: 'Toyota Corolla Altis',
    price: '฿400',
    chips: [{ text: '4 ที่นั่ง', key: 'fl.chip.seat4' }],
    img: '/images/car4.webp',
    alt: 'Toyota Corolla Altis',
    vtype: 'sedan',
  },
  {
    ghost: 'ALPHARD',
    name: 'Toyota Alphard',
    price: '฿1,000',
    chips: [{ text: '7 ที่นั่ง', key: 'fl.chip.seat7' }],
    img: '/images/car2.webp',
    alt: 'Toyota Alphard',
    vtype: 'premium',
  },
];

describe('ghostFromName', () => {
  it('เอาคำสุดท้ายมาทำตัวพิมพ์ใหญ่', () => {
    expect(ghostFromName('Toyota Alphard')).toBe('ALPHARD');
    expect(ghostFromName('Toyota Corolla Altis')).toBe('ALTIS');
    expect(ghostFromName('')).toBe('');
  });
});

describe('formatPrice', () => {
  it('ใส่สัญลักษณ์บาทและคั่นหลักพัน', () => {
    expect(formatPrice(5000)).toBe('฿5,000');
    expect(formatPrice(400)).toBe('฿400');
  });
  it('ไม่มีราคาก็ต้องไม่พัง', () => {
    expect(formatPrice(null)).toBe('');
  });
});

describe('mergeFleet', () => {
  it('ไม่มีข้อมูลจาก BOS ต้องใช้ fallback ทั้งชุด', () => {
    expect(mergeFleet([], FALLBACK)).toEqual(FALLBACK);
  });

  it('แปลงข้อมูลจาก BOS เป็นการ์ด', () => {
    const cars = mergeFleet(
      [
        {
          vehicleClass: 'premium',
          name: 'Toyota Alphard',
          price: 5000,
          photoUrl: 'https://cdn.example.com/alphard.webp',
          seats: 7,
          vip: true,
          vtype: 'premium',
        },
      ],
      FALLBACK,
    );
    expect(cars).toHaveLength(1);
    expect(cars[0].ghost).toBe('ALPHARD');
    expect(cars[0].price).toBe('฿5,000');
    expect(cars[0].img).toBe('https://cdn.example.com/alphard.webp');
    expect(cars[0].alt).toBe('Toyota Alphard');
    expect(cars[0].vtype).toBe('premium');
  });

  it('BOS ไม่ได้ตั้งประเภท และไม่มีคู่ใน fallback -> vtype เป็น null ไม่เดาเป็น sedan', () => {
    const [car] = mergeFleet(
      [
        {
          vehicleClass: 'vip',
          name: 'Mercedes-Benz E-Class',
          price: 9000,
          photoUrl: null,
          seats: 4,
          vip: true,
          vtype: null,
        },
      ],
      FALLBACK,
    );
    expect(car.vtype).toBeNull();
  });

  it('ชิปมีที่นั่ง เกียร์ออโต้ ประกัน และ VIP เมื่อติดธง', () => {
    const [car] = mergeFleet(
      [
        {
          vehicleClass: 'premium',
          name: 'Toyota Alphard',
          price: 5000,
          photoUrl: null,
          seats: 7,
          vip: true,
          vtype: 'premium',
        },
      ],
      FALLBACK,
    );
    expect(car.chips.map((c) => c.key)).toEqual([
      'fl.chip.seats',
      'fl.chip.auto',
      'fl.chip.insured',
      'fl.chip.vip',
    ]);
    expect(car.chips[0].text).toBe('7 ที่นั่ง');
  });

  it('ไม่มี vip ต้องไม่มีชิป VIP และไม่มีที่นั่งต้องไม่มีชิปที่นั่ง', () => {
    const [car] = mergeFleet(
      [
        {
          vehicleClass: 'economy',
          name: 'Toyota Corolla Altis',
          price: 400,
          photoUrl: null,
          seats: null,
          vip: false,
          vtype: 'sedan',
        },
      ],
      FALLBACK,
    );
    expect(car.chips.map((c) => c.key)).toEqual(['fl.chip.auto', 'fl.chip.insured']);
  });

  it('ไม่มีรูปจาก BOS ต้องยืมรูปของ fallback ที่ชื่อตรงกัน', () => {
    const [car] = mergeFleet(
      [
        {
          vehicleClass: 'premium',
          name: 'Toyota Alphard',
          price: 5000,
          photoUrl: null,
          seats: 7,
          vip: true,
          vtype: 'premium',
        },
      ],
      FALLBACK,
    );
    expect(car.img).toBe('/images/car2.webp');
  });
});
