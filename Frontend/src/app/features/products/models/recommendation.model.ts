export interface Recommendation {
  id: string;
  score: number;
  reason: string;
  name: string;
  sport: string;
  type: string;
  imageUrl?: string;
  price: number;
  rentalPricePerHour: number;
  averageRating: number;
}