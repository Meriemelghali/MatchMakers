export enum ProductType {
  SALE   = 'SALE',
  RENTAL = 'RENTAL',
  BOTH   = 'BOTH'
}

export interface Product {
  id?:               string;
  name:              string;
  description:       string;
  price:             number;
  rentalPricePerHour: number;
  stock:             number;
  imageUrl?:         string;
  sport:             string;
  type:              ProductType;
  available?:        boolean;
  createdAt?:        string;
  updatedAt?:        string;
}

export enum OrderType {
  PURCHASE = 'PURCHASE',
  RENTAL   = 'RENTAL'
}

export enum OrderStatus {
  PENDING   = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  DELIVERED = 'DELIVERED'
}

export interface OrderRequest {
  userId:     string;
  productId:  string;
  quantity:   number;
  orderType:  OrderType;
  startDateTime?:  string;
  endDateTime?:    string;
  deliveryName?:    string;
  deliveryPhone?:   string;
  deliveryAddress?: string;
  deliveryCity?:    string;
  pickupLocation?:  string;
  pickupNote?:      string;
  pickupDateTime?:  string;

}

export interface OrderResponse {
  id:          string;
  userId:      string;
  productId:   string;
  productName: string;
  quantity:    number;
  totalPrice:  number;
  deliveryFee:     number;
  orderType:   OrderType;
  status:      OrderStatus;
  startDateTime?:  string;
  endDateTime?:    string;
  durationHours?:  number;
  deliveryName?:    string;    
  deliveryPhone?:   string;    
  deliveryAddress?: string;    
  deliveryCity?:    string;    
  pickupLocation?:  string;
  pickupNote?:      string;
  pickupDateTime?:  string;
  createdAt:   string;
  updatedAt:   string;
}


