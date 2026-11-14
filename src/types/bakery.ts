export type CakeCategory = 'Chocolate' | 'Fruit & Cream' | 'Signature Crunch' | 'Specials';

export type CakeSizeLabel = '500g' | '1kg';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export type PaymentMethod = 'COD' | 'PICKUP';

export type PaymentStatus = 'Pending' | 'Paid';

export type CustomCakeStatus = 'New' | 'Quoted' | 'Accepted' | 'Declined';

export const ORDER_STATUS_SEQUENCE: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

export const CONSTRAINTS = {
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  SLUG_REGEX: /^[a-z0-9-]+$/,
  PHONE_REGEX: /^[6-9]\d{9}$/,
  NAME_MIN: 2,
  NAME_MAX: 100,
  DESC_MIN: 10,
  DESC_MAX: 1000,
  ADDRESS_MIN: 5,
  ADDRESS_MAX: 400,
  NOTES_MAX: 300,
  CUSTOM_DESC_MIN: 10,
  CUSTOM_DESC_MAX: 1200,
  MAX_CART_QTY: 20,
  MAX_IMAGE_BYTES: 5 * 1024 * 1024,
} as const;

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: CakeCategory;
  price500g: number;
  price1kg: number;
  discountPercent: number;
  imageUrl: string;
  isAvailable: boolean;
  isEggless: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  imageUrl: string;
  size: CakeSizeLabel;
  unitBasePrice: number;
  discountPercent: number;
  unitFinalPrice: number;
  quantity: number;
  inscription?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  size: CakeSizeLabel;
  unitBasePrice: number;
  discountPercent: number;
  unitFinalPrice: number;
  quantity: number;
  lineTotal: number;
  inscription?: string;
}

export interface Order {
  orderId: string;
  idempotencyKey: string;
  userId: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryNotes?: string;
  items: OrderItem[];
  complimentaryItem?: string;
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomCakeRequest {
  requestId: string;
  userId: string;
  customerName: string;
  phone: string;
  occasion: string;
  preferredFlavour: string;
  weight: string;
  designDescription: string;
  deliveryDate: string;
  referenceImageUrl?: string;
  status: CustomCakeStatus;
  quotedAmount?: number;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  uid: string;
  email: string;
  name?: string;
  role: 'admin';
  createdAt: string;
}
