import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApiApp, type ServerDeps } from '../src/server/app.ts';
import { INITIAL_SEED_PRODUCTS } from '../src/lib/seedProducts.ts';

function createInMemoryDeps(): ServerDeps {
  const store = new Map<string, Map<string, Record<string, unknown>>>();
  const ensureCol = (col: string) => {
    if (!store.has(col)) store.set(col, new Map());
    return store.get(col)!;
  };

  const now = new Date().toISOString();
  const prodCol = ensureCol('products');
  for (const p of INITIAL_SEED_PRODUCTS) {
    prodCol.set(p.id, { ...p, createdAt: now, updatedAt: now });
  }

  return {
    adminSdkReady: () => true,
    listDocs: async <T>(col: string) => {
      return Array.from(ensureCol(col).values()) as T[];
    },
    getDoc: async <T>(col: string, id: string) => {
      return (ensureCol(col).get(id) as T) || null;
    },
    upsertDoc: async (col, id, data) => {
      const record = { ...data, createdAt: now, updatedAt: now };
      ensureCol(col).set(id, record);
      return record;
    },
    patchDoc: async (col, id, updates) => {
      const existing = ensureCol(col).get(id) || {};
      ensureCol(col).set(id, { ...existing, ...updates, updatedAt: now });
    },
    deleteDoc: async (col, id) => {
      ensureCol(col).delete(id);
    },
    commitOrder: async ({ idempotencyKey, orderId, orderData, userId }) => {
      const idemCol = ensureCol('orderIdempotency');
      const ordersCol = ensureCol('orders');
      const existingIdem = idemCol.get(idempotencyKey);
      if (existingIdem) {
        const prev = ordersCol.get(String(existingIdem.orderId));
        if (prev) return { ...prev, duplicatePrevented: true };
      }
      idemCol.set(idempotencyKey, { orderId, userId, createdAt: now });
      const created = { ...orderData, createdAt: now, updatedAt: now };
      ordersCol.set(orderId, created);
      return created;
    },
  };
}

describe('Order Management & Security API Integration', () => {
  let server: http.Server;
  let baseUrl = '';

  beforeAll(async () => {
    const app = createApiApp(createInMemoryDeps());
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('fetches live products from database', async () => {
    const res = await fetch(`${baseUrl}/api/products`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { products: Array<{ id: string }>; needsSeed: boolean };
    expect(body.products.length).toBe(10);
    expect(body.needsSeed).toBe(false);
  });

  it('ignores tampered client total/prices, computes real total on server, and prevents duplicate submissions', async () => {
    const idempotencyKey = 'idem-test-order-0001';
    const payloadWithTamperedPrice = {
      idempotencyKey,
      customerName: 'Rohan Kulkarni',
      phone: '9876543210',
      address: 'Madhuban Society, Pirangut, Pune',
      paymentMethod: 'COD',
      totalAmount: 1, // Malicious client override attempt
      status: 'Confirmed', // Malicious status attempt
      items: [
        {
          productId: 'kitkat-cake',
          size: '500g',
          quantity: 1,
          unitFinalPrice: 1, // Malicious item price attempt
        },
      ],
    };

    const res1 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithTamperedPrice),
    });
    expect(res1.status).toBe(201);
    const data1 = (await res1.json()) as {
      order: { orderId: string; totalAmount: number; status: string; paymentStatus: string };
      duplicatePrevented: boolean;
    };

    // KitKat Cake 500g = 549 with 15% off = 466 (never ₹1)
    expect(data1.order.totalAmount).toBe(466);
    expect(data1.order.status).toBe('Pending');
    expect(data1.order.paymentStatus).toBe('Pending');
    expect(data1.duplicatePrevented).toBe(false);

    // Repeat submission with same idempotencyKey must return original order without duplicating
    const res2 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithTamperedPrice),
    });
    expect(res2.status).toBe(200);
    const data2 = (await res2.json()) as {
      order: { orderId: string; totalAmount: number };
      duplicatePrevented: boolean;
    };
    expect(data2.duplicatePrevented).toBe(true);
    expect(data2.order.orderId).toBe(data1.order.orderId);

    // Order lookup works with matching phone and blocks wrong phone
    const lookupBad = await fetch(`${baseUrl}/api/orders/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: data1.order.orderId, phone: '9111111111' }),
    });
    expect(lookupBad.status).toBe(403);

    const lookupGood = await fetch(`${baseUrl}/api/orders/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: data1.order.orderId, phone: '9876543210' }),
    });
    expect(lookupGood.status).toBe(200);
  });

  it('rejects unauthenticated requests to protected admin routes', async () => {
    const resOrders = await fetch(`${baseUrl}/api/admin/orders`);
    expect(resOrders.status).toBe(401);

    const resProductCreate = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Cake', price500g: 1, price1kg: 2 }),
    });
    expect(resProductCreate.status).toBe(401);
  });
});
