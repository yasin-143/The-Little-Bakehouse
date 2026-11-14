import express, { type Express } from 'express';
import {
  commitAtomicOrderCreation,
  deleteSingleDoc,
  firebaseServerConfig,
  getSingleDoc,
  isAdminSdkReady,
  listCollectionDocs,
  patchDocWithServerTimestamp,
  upsertDocWithServerTimestamps,
} from './firestoreService.ts';
import {
  isAuthorizedAdmin,
  optionalAuthMiddleware,
  requireAdminMiddleware,
} from './authMiddleware.ts';
import {
  calculateServerOrderTotals,
  generateOrderId,
  normalizeIndianPhone,
  validateCheckoutInput,
  validateCustomCakeInput,
  type CheckoutOrderInput,
  type CustomCakeFormInput,
} from '../lib/pricing.ts';
import { INITIAL_SEED_PRODUCTS } from '../lib/seedProducts.ts';
import {
  CONSTRAINTS,
  ORDER_STATUS_SEQUENCE,
  type CakeCategory,
  type CustomCakeRequest,
  type CustomCakeStatus,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type Product,
} from '../types/bakery.ts';

const VALID_CATEGORIES: CakeCategory[] = [
  'Chocolate',
  'Fruit & Cream',
  'Signature Crunch',
  'Specials',
];

const VALID_CUSTOM_STATUSES: CustomCakeStatus[] = ['New', 'Quoted', 'Accepted', 'Declined'];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface ServerDeps {
  listDocs?: typeof listCollectionDocs;
  getDoc?: typeof getSingleDoc;
  upsertDoc?: typeof upsertDocWithServerTimestamps;
  patchDoc?: typeof patchDocWithServerTimestamp;
  deleteDoc?: typeof deleteSingleDoc;
  commitOrder?: typeof commitAtomicOrderCreation;
  adminSdkReady?: () => boolean;
}

export function createApiApp(deps: ServerDeps = {}): Express {
  const listDocs = deps.listDocs ?? listCollectionDocs;
  const getDoc = deps.getDoc ?? getSingleDoc;
  const upsertDoc = deps.upsertDoc ?? upsertDocWithServerTimestamps;
  const patchDoc = deps.patchDoc ?? patchDocWithServerTimestamp;
  const deleteDoc = deps.deleteDoc ?? deleteSingleDoc;
  const commitOrder = deps.commitOrder ?? commitAtomicOrderCreation;
  const checkAdminSdk = deps.adminSdkReady ?? isAdminSdkReady;

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health & Environment Diagnostics (no secrets exposed)
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      projectId: firebaseServerConfig.projectId,
      databaseId: firebaseServerConfig.firestoreDatabaseId,
      adminSdkReady: checkAdminSdk(),
    });
  });

  // ---------------------------------------------------------------------------
  // Public Catalog Routes (Firestore-backed)
  // ---------------------------------------------------------------------------
  app.get('/api/products', async (_req, res) => {
    try {
      const products = await listDocs<Product>('products');
      products.sort((a, b) => a.name.localeCompare(b.name));
      res.json({
        products,
        needsSeed: products.length === 0,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch products from Firestore.',
      });
    }
  });

  app.get('/api/products/:idOrSlug', async (req, res) => {
    try {
      const key = req.params.idOrSlug;
      if (!CONSTRAINTS.ID_REGEX.test(key)) {
        res.status(400).json({ error: 'Invalid cake identifier.' });
        return;
      }
      const direct = await getDoc<Product>('products', key);
      if (direct) {
        res.json({ product: direct });
        return;
      }
      const all = await listDocs<Product>('products');
      const matched = all.find((p) => p.slug === key || p.id === key);
      if (!matched) {
        res.status(404).json({ error: 'Cake not found.' });
        return;
      }
      res.json({ product: matched });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load cake details.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Server-Authoritative Order Creation & Tracking
  // ---------------------------------------------------------------------------
  app.post('/api/orders', optionalAuthMiddleware, async (req, res) => {
    try {
      const body = req.body as CheckoutOrderInput;
      const validation = validateCheckoutInput(body);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Please correct the highlighted checkout fields.',
          fieldErrors: validation.errors,
        });
        return;
      }

      const adminReady = checkAdminSdk();
      const user = req.firebaseUser;

      if (!adminReady && (!user || !user.emailVerified)) {
        res.status(401).json({
          code: 'SIGN_IN_REQUIRED',
          error:
            'Please sign in with Google to place your order securely (server Admin SDK service account is not configured for guest writes).',
        });
        return;
      }

      const idToken = adminReady ? undefined : user?.idToken;
      const userId = user?.uid || 'guest-checkout';

      // Always fetch authoritative prices from Firestore
      const catalog = await listDocs<Product>('products', idToken);
      const productsById = new Map<string, Product>(catalog.map((p) => [p.id, p]));

      let summary;
      try {
        summary = calculateServerOrderTotals(body.items, productsById);
      } catch (calcErr) {
        res.status(400).json({
          error: calcErr instanceof Error ? calcErr.message : 'Invalid cart items.',
        });
        return;
      }

      const orderId = generateOrderId('TLB');
      const cleanAddress =
        body.paymentMethod === 'PICKUP' && !(body.address || '').trim()
          ? 'Self Pickup — Madhuban Society, Pirangut, Pune'
          : body.address.trim();

      const orderPayload: Record<string, unknown> = {
        orderId,
        idempotencyKey: body.idempotencyKey.trim(),
        userId,
        customerName: body.customerName.trim(),
        phone: validation.normalizedPhone!,
        address: cleanAddress,
        items: summary.items,
        complimentaryItem: 'Free Grand Opening Cupcake (1 pc)',
        subtotal: summary.subtotal,
        discountTotal: summary.discountTotal,
        totalAmount: summary.totalAmount,
        paymentMethod: body.paymentMethod,
        paymentStatus: 'Pending',
        status: 'Pending',
      };

      if (body.deliveryNotes && body.deliveryNotes.trim()) {
        orderPayload.deliveryNotes = body.deliveryNotes.trim();
      }

      const savedOrder = await commitOrder({
        idempotencyKey: body.idempotencyKey.trim(),
        orderId,
        orderData: orderPayload,
        userId,
        idToken,
      });

      const isDuplicate = Boolean((savedOrder as { duplicatePrevented?: boolean }).duplicatePrevented);
      res.status(isDuplicate ? 200 : 201).json({
        order: savedOrder,
        duplicatePrevented: isDuplicate,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unable to place order at this time.',
      });
    }
  });

  app.post('/api/orders/lookup', optionalAuthMiddleware, async (req, res) => {
    try {
      const orderId = String(req.body?.orderId || '').trim().toUpperCase();
      const rawPhone = String(req.body?.phone || '').trim();
      const phone = normalizeIndianPhone(rawPhone);

      if (!orderId || !CONSTRAINTS.ID_REGEX.test(orderId)) {
        res.status(400).json({ error: 'Please enter a valid Order ID (e.g. TLB-20261114-XXXX).' });
        return;
      }
      if (!CONSTRAINTS.PHONE_REGEX.test(phone)) {
        res.status(400).json({ error: 'Please enter the 10-digit mobile number used at checkout.' });
        return;
      }

      const adminReady = checkAdminSdk();
      const user = req.firebaseUser;

      if (!adminReady && !user) {
        res.status(401).json({
          code: 'SIGN_IN_REQUIRED',
          error: 'Please sign in with the Google account used for this order to look up live status.',
        });
        return;
      }

      const order = await getDoc<Order>('orders', orderId, adminReady ? undefined : user?.idToken);
      if (!order) {
        res.status(404).json({ error: 'No order found matching that Order ID and phone number.' });
        return;
      }

      if (normalizeIndianPhone(order.phone) !== phone) {
        res.status(403).json({ error: 'Phone number does not match this Order ID.' });
        return;
      }

      res.json({ order });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unable to look up order.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Custom Cake Requests
  // ---------------------------------------------------------------------------
  app.post('/api/custom-cakes', optionalAuthMiddleware, async (req, res) => {
    try {
      const body = req.body as CustomCakeFormInput;
      const validation = validateCustomCakeInput(body);
      if (!validation.valid) {
        res.status(400).json({
          error: 'Please check the highlighted custom cake fields.',
          fieldErrors: validation.errors,
        });
        return;
      }

      const adminReady = checkAdminSdk();
      const user = req.firebaseUser;

      if (!adminReady && (!user || !user.emailVerified)) {
        res.status(401).json({
          code: 'SIGN_IN_REQUIRED',
          error:
            'Please sign in with Google to submit a custom cake request (or configure FIREBASE_SERVICE_ACCOUNT_KEY for guest requests).',
        });
        return;
      }

      const requestId = generateOrderId('CCR');
      const payload: Record<string, unknown> = {
        requestId,
        userId: user?.uid || 'guest-request',
        customerName: body.customerName.trim(),
        phone: validation.normalizedPhone!,
        occasion: body.occasion.trim(),
        preferredFlavour: body.preferredFlavour.trim(),
        weight: body.weight.trim(),
        designDescription: body.designDescription.trim(),
        deliveryDate: body.deliveryDate.trim(),
        status: 'New',
      };

      if (body.referenceImageUrl && body.referenceImageUrl.trim()) {
        payload.referenceImageUrl = body.referenceImageUrl.trim();
      }

      const saved = await upsertDoc('customCakeRequests', requestId, payload, {
        isCreate: true,
        serverTimeFields: ['createdAt', 'updatedAt'],
        idToken: adminReady ? undefined : user?.idToken,
      });

      res.status(201).json({ request: saved });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to submit custom cake request.',
      });
    }
  });

  // ---------------------------------------------------------------------------
  // Auth Status Check (Frontend verifies whether signed-in user is admin)
  // ---------------------------------------------------------------------------
  app.get('/api/auth/status', optionalAuthMiddleware, async (req, res) => {
    if (!req.firebaseUser) {
      res.json({ authenticated: false, isAdmin: false });
      return;
    }
    const admin = await isAuthorizedAdmin(req.firebaseUser);
    res.json({
      authenticated: true,
      isAdmin: admin,
      email: req.firebaseUser.email,
      uid: req.firebaseUser.uid,
    });
  });

  // ---------------------------------------------------------------------------
  // Protected Admin Routes (Muskan's Dashboard)
  // ---------------------------------------------------------------------------
  app.use('/api/admin', requireAdminMiddleware);

  app.get('/api/admin/me', (req, res) => {
    res.json({
      isAdmin: true,
      user: {
        uid: req.firebaseUser?.uid,
        email: req.firebaseUser?.email,
        name: req.firebaseUser?.name,
      },
    });
  });

  app.post('/api/admin/seed-products', async (req, res) => {
    try {
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const existing = await listDocs<Product>('products', idToken);
      const existingIds = new Set(existing.map((p) => p.id));

      let seededCount = 0;
      for (const seed of INITIAL_SEED_PRODUCTS) {
        if (!existingIds.has(seed.id)) {
          await upsertDoc('products', seed.id, { ...seed }, {
            isCreate: true,
            serverTimeFields: ['createdAt', 'updatedAt'],
            idToken,
          });
          seededCount++;
        }
      }

      const all = await listDocs<Product>('products', idToken);
      all.sort((a, b) => a.name.localeCompare(b.name));
      res.json({ seededCount, products: all });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to seed initial cakes.',
      });
    }
  });

  app.get('/api/admin/summary', async (req, res) => {
    try {
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const [orders, customRequests, products] = await Promise.all([
        listDocs<Order>('orders', idToken),
        listDocs<CustomCakeRequest>('customCakeRequests', idToken),
        listDocs<Product>('products', idToken),
      ]);

      const activeOrders = orders.filter((o) => o.status !== 'Cancelled');
      const totalRevenue = activeOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
      const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
      const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
      const openCustomRequests = customRequests.filter((r) => r.status === 'New').length;

      res.json({
        totalOrders: orders.length,
        pendingOrders,
        deliveredOrders,
        totalRevenue,
        totalProducts: products.length,
        availableProducts: products.filter((p) => p.isAvailable).length,
        openCustomRequests,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to compute bakery summary.',
      });
    }
  });

  app.get('/api/admin/orders', async (req, res) => {
    try {
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      let orders = await listDocs<Order>('orders', idToken);

      const statusFilter = String(req.query.status || '').trim();
      const search = String(req.query.q || '').trim().toLowerCase();

      if (statusFilter && statusFilter !== 'All') {
        orders = orders.filter((o) => o.status === statusFilter);
      }

      if (search) {
        orders = orders.filter(
          (o) =>
            o.orderId.toLowerCase().includes(search) ||
            o.customerName.toLowerCase().includes(search) ||
            o.phone.toLowerCase().includes(search)
        );
      }

      orders.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      res.json({ orders });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch orders.',
      });
    }
  });

  app.patch('/api/admin/orders/:orderId', async (req, res) => {
    try {
      const orderId = req.params.orderId;
      if (!CONSTRAINTS.ID_REGEX.test(orderId)) {
        res.status(400).json({ error: 'Invalid order ID.' });
        return;
      }

      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const updates: Record<string, unknown> = {};

      if (req.body.status !== undefined) {
        if (!ORDER_STATUS_SEQUENCE.includes(req.body.status as OrderStatus)) {
          res.status(400).json({ error: 'Invalid order status value.' });
          return;
        }
        updates.status = req.body.status;
      }

      if (req.body.paymentStatus !== undefined) {
        if (req.body.paymentStatus !== 'Pending' && req.body.paymentStatus !== 'Paid') {
          res.status(400).json({ error: 'Payment status must be Pending or Paid.' });
          return;
        }
        updates.paymentStatus = req.body.paymentStatus as PaymentStatus;
      }

      if (req.body.adminNotes !== undefined) {
        const notes = String(req.body.adminNotes).trim();
        if (notes.length > 400) {
          res.status(400).json({ error: 'Admin notes must be 400 characters or fewer.' });
          return;
        }
        updates.adminNotes = notes;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No valid order updates provided.' });
        return;
      }

      await patchDoc('orders', orderId, updates, idToken);
      const updated = await getDoc<Order>('orders', orderId, idToken);
      res.json({ order: updated });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update order.',
      });
    }
  });

  app.get('/api/admin/products', async (req, res) => {
    try {
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const products = await listDocs<Product>('products', idToken);
      products.sort((a, b) => a.name.localeCompare(b.name));
      res.json({ products });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to fetch admin products.',
      });
    }
  });

  app.post('/api/admin/products', async (req, res) => {
    try {
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const name = String(req.body?.name || '').trim();
      const description = String(req.body?.description || '').trim();
      const category = String(req.body?.category || 'Chocolate') as CakeCategory;
      const price500g = Number(req.body?.price500g);
      const price1kg = Number(req.body?.price1kg);
      const discountPercent = Number(req.body?.discountPercent ?? 0);
      const imageUrl = String(req.body?.imageUrl || '').trim();
      const isAvailable = req.body?.isAvailable !== false;

      if (name.length < CONSTRAINTS.NAME_MIN || name.length > CONSTRAINTS.NAME_MAX) {
        res.status(400).json({ error: 'Cake name must be 2 to 100 characters.' });
        return;
      }
      if (description.length < CONSTRAINTS.DESC_MIN || description.length > CONSTRAINTS.DESC_MAX) {
        res.status(400).json({ error: 'Description must be 10 to 1000 characters.' });
        return;
      }
      if (!VALID_CATEGORIES.includes(category)) {
        res.status(400).json({ error: 'Invalid cake category.' });
        return;
      }
      if (!Number.isFinite(price500g) || price500g <= 0 || !Number.isFinite(price1kg) || price1kg <= 0) {
        res.status(400).json({ error: '500g and 1kg prices must be positive numbers.' });
        return;
      }
      if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 50) {
        res.status(400).json({ error: 'Discount percent must be between 0 and 50.' });
        return;
      }
      if (imageUrl.length < 4) {
        res.status(400).json({ error: 'Please provide or upload a cake photograph.' });
        return;
      }

      const baseSlug = slugify(name) || `cake-${Date.now()}`;
      const id =
        req.body?.id && CONSTRAINTS.ID_REGEX.test(String(req.body.id))
          ? String(req.body.id)
          : `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const productData = {
        id,
        name,
        slug: baseSlug,
        description,
        category,
        price500g,
        price1kg,
        discountPercent,
        imageUrl,
        isAvailable,
        isEggless: true,
      };

      const saved = await upsertDoc('products', id, productData, {
        isCreate: true,
        serverTimeFields: ['createdAt', 'updatedAt'],
        idToken,
      });

      res.status(201).json({ product: saved });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create cake.',
      });
    }
  });

  app.patch('/api/admin/products/:productId', async (req, res) => {
    try {
      const productId = req.params.productId;
      if (!CONSTRAINTS.ID_REGEX.test(productId)) {
        res.status(400).json({ error: 'Invalid product ID.' });
        return;
      }
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const existing = await getDoc<Product>('products', productId, idToken);
      if (!existing) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const merged = {
        id: existing.id,
        name: req.body.name !== undefined ? String(req.body.name).trim() : existing.name,
        slug:
          req.body.name !== undefined
            ? slugify(String(req.body.name)) || existing.slug
            : existing.slug,
        description:
          req.body.description !== undefined
            ? String(req.body.description).trim()
            : existing.description,
        category:
          req.body.category !== undefined
            ? (String(req.body.category) as CakeCategory)
            : existing.category,
        price500g:
          req.body.price500g !== undefined ? Number(req.body.price500g) : existing.price500g,
        price1kg: req.body.price1kg !== undefined ? Number(req.body.price1kg) : existing.price1kg,
        discountPercent:
          req.body.discountPercent !== undefined
            ? Number(req.body.discountPercent)
            : existing.discountPercent,
        imageUrl:
          req.body.imageUrl !== undefined ? String(req.body.imageUrl).trim() : existing.imageUrl,
        isAvailable:
          req.body.isAvailable !== undefined ? Boolean(req.body.isAvailable) : existing.isAvailable,
        isEggless: true,
      };

      if (merged.name.length < CONSTRAINTS.NAME_MIN || merged.name.length > CONSTRAINTS.NAME_MAX) {
        res.status(400).json({ error: 'Cake name must be 2 to 100 characters.' });
        return;
      }
      if (
        merged.description.length < CONSTRAINTS.DESC_MIN ||
        merged.description.length > CONSTRAINTS.DESC_MAX
      ) {
        res.status(400).json({ error: 'Description must be 10 to 1000 characters.' });
        return;
      }
      if (!VALID_CATEGORIES.includes(merged.category)) {
        res.status(400).json({ error: 'Invalid cake category.' });
        return;
      }
      if (
        !Number.isFinite(merged.price500g) ||
        merged.price500g <= 0 ||
        !Number.isFinite(merged.price1kg) ||
        merged.price1kg <= 0
      ) {
        res.status(400).json({ error: 'Prices must be positive numbers.' });
        return;
      }
      if (
        !Number.isFinite(merged.discountPercent) ||
        merged.discountPercent < 0 ||
        merged.discountPercent > 50
      ) {
        res.status(400).json({ error: 'Discount must be between 0 and 50.' });
        return;
      }

      await patchDoc('products', productId, merged, idToken);
      const updated = await getDoc<Product>('products', productId, idToken);
      res.json({ product: updated });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update cake.',
      });
    }
  });

  app.delete('/api/admin/products/:productId', async (req, res) => {
    try {
      const productId = req.params.productId;
      if (!CONSTRAINTS.ID_REGEX.test(productId)) {
        res.status(400).json({ error: 'Invalid product ID.' });
        return;
      }
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      await deleteDoc('products', productId, idToken);
      res.json({ deleted: true, productId });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to delete cake.',
      });
    }
  });

  app.get('/api/admin/custom-cakes', async (req, res) => {
    try {
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const requests = await listDocs<CustomCakeRequest>('customCakeRequests', idToken);
      requests.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      res.json({ requests });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to load custom cake requests.',
      });
    }
  });

  app.patch('/api/admin/custom-cakes/:requestId', async (req, res) => {
    try {
      const requestId = req.params.requestId;
      if (!CONSTRAINTS.ID_REGEX.test(requestId)) {
        res.status(400).json({ error: 'Invalid custom request ID.' });
        return;
      }
      const idToken = checkAdminSdk() ? undefined : req.firebaseUser?.idToken;
      const updates: Record<string, unknown> = {};

      if (req.body.status !== undefined) {
        if (!VALID_CUSTOM_STATUSES.includes(req.body.status as CustomCakeStatus)) {
          res.status(400).json({ error: 'Invalid custom request status.' });
          return;
        }
        updates.status = req.body.status;
      }

      if (req.body.quotedAmount !== undefined && req.body.quotedAmount !== '') {
        const quoted = Number(req.body.quotedAmount);
        if (!Number.isFinite(quoted) || quoted < 0) {
          res.status(400).json({ error: 'Quoted amount must be a valid non-negative number.' });
          return;
        }
        updates.quotedAmount = quoted;
      }

      if (req.body.adminNotes !== undefined) {
        updates.adminNotes = String(req.body.adminNotes).trim().slice(0, 500);
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No updates provided.' });
        return;
      }

      await patchDoc('customCakeRequests', requestId, updates, idToken);
      const updated = await getDoc<CustomCakeRequest>('customCakeRequests', requestId, idToken);
      res.json({ request: updated });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to update custom cake request.',
      });
    }
  });

  return app;
}
