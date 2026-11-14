import { describe, expect, it } from 'vitest';
import {
  calculateDiscountedPrice,
  calculateServerOrderTotals,
  validateCheckoutInput,
  validateCustomCakeInput,
} from '../src/lib/pricing.ts';
import { INITIAL_SEED_PRODUCTS } from '../src/lib/seedProducts.ts';
import type { Product } from '../src/types/bakery.ts';

function buildProductMap(): Map<string, Product> {
  const now = new Date().toISOString();
  return new Map(
    INITIAL_SEED_PRODUCTS.map((p) => [
      p.id,
      { ...p, createdAt: now, updatedAt: now },
    ])
  );
}

describe('Pricing & Flyer Discount Math', () => {
  it('calculates exact Grand Opening launch prices matching flyer values', () => {
    expect(calculateDiscountedPrice(449, 10)).toBe(404); // Blueberry
    expect(calculateDiscountedPrice(399, 10)).toBe(359); // Black Forest / Pineapple / Strawberry
    expect(calculateDiscountedPrice(449, 15)).toBe(381); // Chocolate Chips / White Forest
    expect(calculateDiscountedPrice(499, 15)).toBe(424); // Chocolate Truffle / Oreo Overload
    expect(calculateDiscountedPrice(549, 15)).toBe(466); // Choco Royale / KitKat Cake
  });

  it('rejects non-positive base prices', () => {
    expect(() => calculateDiscountedPrice(0, 10)).toThrow();
    expect(() => calculateDiscountedPrice(-100, 10)).toThrow();
  });

  it('calculates server-authoritative order totals from Firestore catalog', () => {
    const map = buildProductMap();
    const summary = calculateServerOrderTotals(
      [
        { productId: 'chocolate-truffle', size: '500g', quantity: 2 },
        { productId: 'pineapple-cake', size: '1kg', quantity: 1 },
      ],
      map
    );

    // Chocolate Truffle 500g: 499 -> 424 * 2 = 848; Pineapple 1kg: 749 -> 674
    expect(summary.subtotal).toBe(499 * 2 + 749);
    expect(summary.totalAmount).toBe(424 * 2 + 674);
    expect(summary.discountTotal).toBe(summary.subtotal - summary.totalAmount);
    expect(summary.items).toHaveLength(2);
  });

  it('throws when ordering an unavailable cake or unknown product ID', () => {
    const map = buildProductMap();
    const truffle = map.get('chocolate-truffle')!;
    map.set('chocolate-truffle', { ...truffle, isAvailable: false });

    expect(() =>
      calculateServerOrderTotals(
        [{ productId: 'chocolate-truffle', size: '500g', quantity: 1 }],
        map
      )
    ).toThrow(/unavailable/i);

    expect(() =>
      calculateServerOrderTotals([{ productId: 'non-existent', size: '500g', quantity: 1 }], map)
    ).toThrow(/not found/i);
  });
});

describe('Checkout & Custom Cake Validation', () => {
  it('validates complete COD checkout and normalizes +91 phone numbers', () => {
    const res = validateCheckoutInput({
      idempotencyKey: 'abc12345-key',
      customerName: 'Aarav Joshi',
      phone: '+91 98765 43210',
      address: 'Flat 301, Madhuban Society, Pirangut, Pune',
      paymentMethod: 'COD',
      items: [{ productId: 'chocolate-chips', size: '500g', quantity: 1 }],
    });
    expect(res.valid).toBe(true);
    expect(res.normalizedPhone).toBe('9876543210');
  });

  it('rejects invalid phone, missing COD address, and empty cart', () => {
    const res = validateCheckoutInput({
      idempotencyKey: 'abc12345-key',
      customerName: 'A',
      phone: '12345',
      address: '',
      paymentMethod: 'COD',
      items: [],
    });
    expect(res.valid).toBe(false);
    expect(res.errors.customerName).toBeDefined();
    expect(res.errors.phone).toBeDefined();
    expect(res.errors.address).toBeDefined();
    expect(res.errors.items).toBeDefined();
  });

  it('validates custom cake requests and rejects short descriptions', () => {
    const ok = validateCustomCakeInput({
      customerName: 'Sneha Patil',
      phone: '9665619972',
      occasion: 'Birthday',
      preferredFlavour: 'Belgian Chocolate Truffle',
      weight: '1kg',
      designDescription: 'Pastel pink floral piping with gold acrylic topper',
      deliveryDate: '2026-12-01',
    });
    expect(ok.valid).toBe(true);

    const bad = validateCustomCakeInput({
      customerName: 'Sneha Patil',
      phone: '9665619972',
      occasion: 'Birthday',
      preferredFlavour: 'Chocolate',
      weight: '1kg',
      designDescription: 'Too short',
      deliveryDate: '',
    });
    expect(bad.valid).toBe(false);
    expect(bad.errors.designDescription).toBeDefined();
    expect(bad.errors.deliveryDate).toBeDefined();
  });
});
