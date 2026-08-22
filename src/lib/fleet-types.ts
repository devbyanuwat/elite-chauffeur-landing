/** รูปร่างที่ GET /api/public/fleet ของ BOS ตอบกลับมา */
export interface FleetCar {
  vehicleClass: string;
  name: string;
  price: number | null;
  photoUrl: string | null;
  seats: number | null;
  vip: boolean;
  vtype: 'sedan' | 'suv' | 'premium' | null;
}
