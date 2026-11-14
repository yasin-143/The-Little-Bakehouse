import fs from 'node:fs';
import path from 'node:path';
import { initializeApp, cert, getApps, type App as AdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

interface AppletFirebaseConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
}

function loadAppletConfig(): AppletFirebaseConfig {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(raw) as AppletFirebaseConfig;
  }
  return {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    firestoreDatabaseId:
      process.env.FIREBASE_DATABASE_ID || process.env.VITE_FIREBASE_DATABASE_ID || '(default)',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  };
}

export const firebaseServerConfig = loadAppletConfig();

let adminApp: AdminApp | null = null;
let hasExplicitServiceAccount = false;

function initAdminSdk(): void {
  if (adminApp) return;
  const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountRaw && serviceAccountRaw.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(serviceAccountRaw);
      adminApp =
        getApps().length > 0
          ? getApps()[0]
          : initializeApp({
              credential: cert(parsed),
              projectId: firebaseServerConfig.projectId || parsed.project_id,
              storageBucket: firebaseServerConfig.storageBucket,
            });
      hasExplicitServiceAccount = true;
      return;
    } catch (err) {
      console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON; falling back to REST mode:', err);
    }
  }
}

initAdminSdk();

export function isAdminSdkReady(): boolean {
  return hasExplicitServiceAccount && adminApp !== null;
}

export function getServerAdminDb() {
  if (!adminApp || !hasExplicitServiceAccount) return null;
  return getAdminFirestore(adminApp, firebaseServerConfig.firestoreDatabaseId);
}

export function getServerAdminAuth() {
  if (!adminApp || !hasExplicitServiceAccount) return null;
  return getAdminAuth(adminApp);
}

// ---------------------------------------------------------------------------
// Firestore REST Value Encoding / Decoding (used when Admin SDK SA is absent)
// ---------------------------------------------------------------------------
type FirestoreValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function toFirestoreValue(val: unknown): FirestoreValue {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (val instanceof Date) return { timestampValue: val.toISOString() };
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function fromFirestoreValue(val: FirestoreValue | undefined): unknown {
  if (!val) return undefined;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('stringValue' in val) return val.stringValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map((v) => fromFirestoreValue(v));
  }
  if ('mapValue' in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      out[k] = fromFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

export function fromFirestoreDoc<T = Record<string, unknown>>(doc: {
  name?: string;
  fields?: Record<string, FirestoreValue>;
}): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc.fields || {})) {
    out[k] = fromFirestoreValue(v);
  }
  return out as T;
}

function getFirestoreRestBase(): string {
  const { projectId, firestoreDatabaseId } = firebaseServerConfig;
  const dbId = firestoreDatabaseId || '(default)';
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${dbId}/documents`;
}

function getFirestoreDbRoot(): string {
  const { projectId, firestoreDatabaseId } = firebaseServerConfig;
  const dbId = firestoreDatabaseId || '(default)';
  return `projects/${projectId}/databases/${dbId}/documents`;
}

function buildRestHeaders(idToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (idToken) {
    headers.Authorization = `Bearer ${idToken}`;
  }
  return headers;
}

function normalizeAdminDocData(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v instanceof Timestamp) {
      out[k] = v.toDate().toISOString();
    } else if (Array.isArray(v)) {
      out[k] = v;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function listCollectionDocs<T = Record<string, unknown>>(
  collectionName: string,
  idToken?: string
): Promise<T[]> {
  const adminDb = getServerAdminDb();
  if (adminDb) {
    const snap = await adminDb.collection(collectionName).get();
    return snap.docs.map((d) => normalizeAdminDocData(d.data()) as T);
  }

  const url = `${getFirestoreRestBase()}:runQuery?key=${encodeURIComponent(
    firebaseServerConfig.apiKey
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: buildRestHeaders(idToken),
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: collectionName }],
        limit: 200,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore list(${collectionName}) failed (${res.status}): ${body}`);
  }
  const rows = (await res.json()) as Array<{
    document?: { name: string; fields?: Record<string, FirestoreValue> };
  }>;
  return rows
    .filter((row) => Boolean(row.document))
    .map((row) => fromFirestoreDoc<T>(row.document!));
}

export async function getSingleDoc<T = Record<string, unknown>>(
  collectionName: string,
  docId: string,
  idToken?: string
): Promise<T | null> {
  const adminDb = getServerAdminDb();
  if (adminDb) {
    const snap = await adminDb.collection(collectionName).doc(docId).get();
    if (!snap.exists) return null;
    return normalizeAdminDocData(snap.data() || {}) as T;
  }

  const url = `${getFirestoreRestBase()}/${collectionName}/${encodeURIComponent(
    docId
  )}?key=${encodeURIComponent(firebaseServerConfig.apiKey)}`;
  const res = await fetch(url, { headers: buildRestHeaders(idToken) });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore get(${collectionName}/${docId}) failed (${res.status}): ${body}`);
  }
  const doc = (await res.json()) as { name: string; fields?: Record<string, FirestoreValue> };
  return fromFirestoreDoc<T>(doc);
}

export async function upsertDocWithServerTimestamps(
  collectionName: string,
  docId: string,
  data: Record<string, unknown>,
  options: { isCreate: boolean; serverTimeFields: string[]; idToken?: string }
): Promise<Record<string, unknown>> {
  const adminDb = getServerAdminDb();
  if (adminDb) {
    const payload = { ...data };
    for (const field of options.serverTimeFields) {
      payload[field] = FieldValue.serverTimestamp();
    }
    const ref = adminDb.collection(collectionName).doc(docId);
    if (options.isCreate) {
      await ref.create(payload);
    } else {
      await ref.set(payload, { merge: true });
    }
    const saved = await ref.get();
    return normalizeAdminDocData(saved.data() || {});
  }

  const dbRoot = getFirestoreDbRoot();
  const docName = `${dbRoot}/${collectionName}/${docId}`;
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!options.serverTimeFields.includes(k) && v !== undefined) {
      fields[k] = toFirestoreValue(v);
    }
  }

  const fieldTransforms = options.serverTimeFields.map((fieldPath) => ({
    fieldPath,
    setToServerValue: 'REQUEST_TIME',
  }));

  const writeOp: Record<string, unknown> = {
    update: { name: docName, fields },
    updateTransforms: fieldTransforms,
  };

  if (options.isCreate) {
    writeOp.currentDocument = { exists: false };
  }

  const commitUrl = `https://firestore.googleapis.com/v1/projects/${firebaseServerConfig.projectId}/databases/${firebaseServerConfig.firestoreDatabaseId}/documents:commit?key=${encodeURIComponent(
    firebaseServerConfig.apiKey
  )}`;

  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: buildRestHeaders(options.idToken),
    body: JSON.stringify({ writes: [writeOp] }),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Firestore write(${collectionName}/${docId}) failed (${res.status}): ${body}`);
    (err as Error & { statusCode?: number }).statusCode = res.status;
    throw err;
  }

  const nowIso = new Date().toISOString();
  const result = { ...data };
  for (const field of options.serverTimeFields) {
    result[field] = nowIso;
  }
  return result;
}

export async function patchDocWithServerTimestamp(
  collectionName: string,
  docId: string,
  updates: Record<string, unknown>,
  idToken?: string
): Promise<void> {
  const adminDb = getServerAdminDb();
  if (adminDb) {
    await adminDb
      .collection(collectionName)
      .doc(docId)
      .update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
    return;
  }

  const dbRoot = getFirestoreDbRoot();
  const docName = `${dbRoot}/${collectionName}/${docId}`;
  const fields: Record<string, FirestoreValue> = {};
  const fieldPaths: string[] = [];

  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v);
      fieldPaths.push(k);
    }
  }

  const commitUrl = `https://firestore.googleapis.com/v1/projects/${firebaseServerConfig.projectId}/databases/${firebaseServerConfig.firestoreDatabaseId}/documents:commit?key=${encodeURIComponent(
    firebaseServerConfig.apiKey
  )}`;

  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: buildRestHeaders(idToken),
    body: JSON.stringify({
      writes: [
        {
          update: { name: docName, fields },
          updateMask: { fieldPaths },
          updateTransforms: [
            {
              fieldPath: 'updatedAt',
              setToServerValue: 'REQUEST_TIME',
            },
          ],
          currentDocument: { exists: true },
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Firestore patch(${collectionName}/${docId}) failed (${res.status}): ${body}`);
  }
}

export async function deleteSingleDoc(
  collectionName: string,
  docId: string,
  idToken?: string
): Promise<void> {
  const adminDb = getServerAdminDb();
  if (adminDb) {
    await adminDb.collection(collectionName).doc(docId).delete();
    return;
  }

  const url = `${getFirestoreRestBase()}/${collectionName}/${encodeURIComponent(
    docId
  )}?key=${encodeURIComponent(firebaseServerConfig.apiKey)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildRestHeaders(idToken),
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    throw new Error(`Firestore delete(${collectionName}/${docId}) failed (${res.status}): ${body}`);
  }
}

export async function commitAtomicOrderCreation(params: {
  idempotencyKey: string;
  orderId: string;
  orderData: Record<string, unknown>;
  userId: string;
  idToken?: string;
}): Promise<Record<string, unknown>> {
  const { idempotencyKey, orderId, orderData, userId, idToken } = params;

  const adminDb = getServerAdminDb();
  if (adminDb) {
    const idemRef = adminDb.collection('orderIdempotency').doc(idempotencyKey);
    const orderRef = adminDb.collection('orders').doc(orderId);

    const existingOrder = await adminDb.runTransaction(async (tx) => {
      const idemSnap = await tx.get(idemRef);
      if (idemSnap.exists) {
        const existingId = idemSnap.data()?.orderId as string | undefined;
        if (existingId) {
          const ordSnap = await tx.get(adminDb.collection('orders').doc(existingId));
          if (ordSnap.exists) {
            return normalizeAdminDocData(ordSnap.data() || {});
          }
        }
      }

      tx.create(idemRef, {
        orderId,
        userId,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.create(orderRef, {
        ...orderData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return null;
    });

    if (existingOrder) {
      return { ...existingOrder, duplicatePrevented: true };
    }
    const createdSnap = await orderRef.get();
    return normalizeAdminDocData(createdSnap.data() || {});
  }

  // Check idempotency doc first in REST mode
  const existingIdem = await getSingleDoc<{ orderId: string }>(
    'orderIdempotency',
    idempotencyKey,
    idToken
  );
  if (existingIdem?.orderId) {
    const existingOrder = await getSingleDoc<Record<string, unknown>>(
      'orders',
      existingIdem.orderId,
      idToken
    );
    if (existingOrder) {
      return { ...existingOrder, duplicatePrevented: true };
    }
  }

  const dbRoot = getFirestoreDbRoot();
  const idemFields: Record<string, FirestoreValue> = {
    orderId: toFirestoreValue(orderId),
    userId: toFirestoreValue(userId),
  };

  const orderFields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(orderData)) {
    if (k !== 'createdAt' && k !== 'updatedAt' && v !== undefined) {
      orderFields[k] = toFirestoreValue(v);
    }
  }

  const commitUrl = `https://firestore.googleapis.com/v1/projects/${firebaseServerConfig.projectId}/databases/${firebaseServerConfig.firestoreDatabaseId}/documents:commit?key=${encodeURIComponent(
    firebaseServerConfig.apiKey
  )}`;

  const res = await fetch(commitUrl, {
    method: 'POST',
    headers: buildRestHeaders(idToken),
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: `${dbRoot}/orderIdempotency/${idempotencyKey}`,
            fields: idemFields,
          },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          currentDocument: { exists: false },
        },
        {
          update: {
            name: `${dbRoot}/orders/${orderId}`,
            fields: orderFields,
          },
          updateTransforms: [
            { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
            { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ],
          currentDocument: { exists: false },
        },
      ],
    }),
  });

  if (res.status === 409) {
    const retryIdem = await getSingleDoc<{ orderId: string }>(
      'orderIdempotency',
      idempotencyKey,
      idToken
    );
    if (retryIdem?.orderId) {
      const existingOrder = await getSingleDoc<Record<string, unknown>>(
        'orders',
        retryIdem.orderId,
        idToken
      );
      if (existingOrder) {
        return { ...existingOrder, duplicatePrevented: true };
      }
    }
  }

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Atomic order commit failed (${res.status}): ${body}`);
    (err as Error & { statusCode?: number }).statusCode = res.status;
    throw err;
  }

  const nowIso = new Date().toISOString();
  return {
    ...orderData,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}
