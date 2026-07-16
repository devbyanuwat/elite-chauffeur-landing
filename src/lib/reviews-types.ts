export interface Review {
  id: string;
  rating: number;
  comment: string;
  customerNameMasked: string;
  carPhotoUrl: string | null;
  vehicleType: string | null;
  createdAt: string;
}
