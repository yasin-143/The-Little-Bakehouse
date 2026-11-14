import {
  CONSTRAINTS,
  type CakeSizeLabel,
  type OrderItem,
  type PaymentMethod,
  type Product,
} from '../types/bakery.ts';

export function calculateDiscountedPrice(basePrice: number, discountPercent: number): number {
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    throw new Error('Base price must be a positive number.');
  }
  const safeDiscount = Math.min(50, Math.max(0, Number.isFinite(discountPercent) ? discountPercent : 0));
  return Math.floor((basePrice * (100 - safeDiscount)) / 100);
}

export function normalizeIndianPhone(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export interface CheckoutItemRequest {
  productId: string;
  size: CakeSizeLabel;
  quantity: number;
  inscription?: string;
}

export interface CheckoutOrderInput {
  idempotencyKey: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryNotes?: string;
  paymentMethod: PaymentMethod;
  items: CheckoutItemRequest[];
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  normalizedPhone?: string;
}

export function validateCheckoutInput(input: CheckoutOrderInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.idempotencyKey || !CONSTRAINTS.ID_REGEX.test(input.idempotencyKey)) {
    errors.idempotencyKey = 'Missing or invalid submission token.';
  }

  const name = (input.customerName || '').trim();
  if (name.length < CONSTRAINTS.NAME_MIN || name.length > CONSTRAINTS.NAME_MAX) {
    errors.customerName = 'Please enter your full name (2 to 100 characters).';
  }

  const normalizedPhone = normalizeIndianPhone(input.phone || '');
  if (!CONSTRAINTS.PHONE_REGEX.test(normalizedPhone)) {
    errors.phone = 'Please enter a valid 10-digit Indian mobile number.';
  }

  const address = (input.address || '').trim();
  if (input.paymentMethod === 'COD') {
    if (address.length < CONSTRAINTS.ADDRESS_MIN || address.length > CONSTRAINTS.ADDRESS_MAX) {
      errors.address = 'Please enter a complete delivery address in Pirangut / Pune.';
    }
  } else if (address.length > CONSTRAINTS.ADDRESS_MAX) {
    errors.address = 'Address notes must be under 400 characters.';
  }

  if (input.deliveryNotes && input.deliveryNotes.trim().length > CONSTRAINTS.NOTES_MAX) {
    errors.deliveryNotes = 'Delivery notes must be 300 characters or fewer.';
  }

  if (input.paymentMethod !== 'COD' && input.paymentMethod !== 'PICKUP') {
    errors.paymentMethod = 'Select Cash on Delivery or Pay on Pickup.';
  }

  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > CONSTRAINTS.MAX_CART_QTY) {
    errors.items = 'Your cart must contain between 1 and 20 items.';
  } else {
    for (const item of input.items) {
      if (!item.productId || !CONSTRAINTS.ID_REGEX.test(item.productId)) {
        errors.items = 'Invalid product ID in cart.';
        break;
      }
      if (item.size !== '500g' && item.size !== '1kg') {
        errors.items = 'Cake size must be 500g or 1kg.';
        break;
      }
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10) {
        errors.items = 'Each cake quantity must be between 1 and 10.';
        break;
      }
      if (item.inscription && item.inscription.trim().length > 80) {
        errors.items = 'Cake inscription message must be 80 characters or fewer.';
        break;
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
  };
}

export interface ServerPricedSummary {
  items: OrderItem[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
}

export function calculateServerOrderTotals(
  requestedItems: CheckoutItemRequest[],
  productsById: Map<string, Product>
): ServerPricedSummary {
  if (!Array.isArray(requestedItems) || requestedItems.length === 0) {
    throw new Error('Order must contain at least one cake.');
  }

  const verifiedItems: OrderItem[] = [];
  let subtotal = 0;
  let totalAmount = 0;

  for (const reqItem of requestedItems) {
    const product = productsById.get(reqItem.productId);
    if (!product) {
      throw new Error(`Product "${reqItem.productId}" was not found in our menu.`);
    }
    if (!product.isAvailable) {
      throw new Error(`"${product.name}" is currently sold out or unavailable.`);
    }

    const unitBasePrice = reqItem.size === '1kg' ? product.price1kg : product.price500g;
    if (!Number.isFinite(unitBasePrice) || unitBasePrice <= 0) {
      throw new Error(`Invalid database price configured for "${product.name}".`);
    }

    const discountPercent = Number.isFinite(product.discountPercent) ? product.discountPercent : 0;
    const unitFinalPrice = calculateDiscountedPrice(unitBasePrice, discountPercent);
    const quantity = reqItem.quantity;

    const lineBase = unitBasePrice * quantity;
    const lineTotal = unitFinalPrice * quantity;

    subtotal += lineBase;
    totalAmount += lineTotal;

    const cleanInscription = reqItem.inscription?.trim();

    verifiedItems.push({
      productId: product.id,
      name: product.name,
      size: reqItem.size,
      unitBasePrice,
      discountPercent,
      unitFinalPrice,
      quantity,
      lineTotal,
      ...(cleanInscription ? { inscription: cleanInscription } : {}),
    });
  }

  return {
    items: verifiedItems,
    subtotal,
    discountTotal: Math.max(0, subtotal - totalAmount),
    totalAmount,
  };
}

export interface CustomCakeFormInput {
  customerName: string;
  phone: string;
  occasion: string;
  preferredFlavour: string;
  weight: string;
  designDescription: string;
  deliveryDate: string;
  referenceImageUrl?: string;
}

export function validateCustomCakeInput(input: CustomCakeFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  const name = (input.customerName || '').trim();
  if (name.length < CONSTRAINTS.NAME_MIN || name.length > CONSTRAINTS.NAME_MAX) {
    errors.customerName = 'Please enter your name (2 to 100 characters).';
  }

  const normalizedPhone = normalizeIndianPhone(input.phone || '');
  if (!CONSTRAINTS.PHONE_REGEX.test(normalizedPhone)) {
    errors.phone = 'Please enter a valid 10-digit mobile number.';
  }

  if (!(input.occasion || '').trim() || input.occasion.trim().length < 2) {
    errors.occasion = 'Please specify the occasion (e.g., Birthday, Anniversary).';
  }

  if (!(input.preferredFlavour || '').trim() || input.preferredFlavour.trim().length < 2) {
    errors.preferredFlavour = 'Please choose a preferred cake flavour.';
  }

  if (!(input.weight || '').trim()) {
    errors.weight = 'Please select an approximate cake weight.';
  }

  const desc = (input.designDescription || '').trim();
  if (desc.length < CONSTRAINTS.CUSTOM_DESC_MIN || desc.length > CONSTRAINTS.CUSTOM_DESC_MAX) {
    errors.designDescription = 'Describe your design idea in 10 to 1200 characters.';
  }

  if (!(input.deliveryDate || '').trim() || input.deliveryDate.trim().length < 8) {
    errors.deliveryDate = 'Please choose a required delivery date.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    normalizedPhone,
  };
}

export function generateOrderId(prefix = 'TLB'): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}-${y}${m}${d}-${suffix}`;
}
