import type { NextFunction, Request, Response } from 'express';
import {
  firebaseServerConfig,
  getServerAdminAuth,
  getSingleDoc,
} from './firestoreService.ts';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  idToken: string;
}

declare global {
  namespace Express {
    interface Request {
      firebaseUser?: VerifiedFirebaseUser;
    }
  }
}

const BOOTSTRAPPED_ADMIN_EMAIL = 'yasin.ladab.28@gmail.com';

export function getAllowedAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS || '';
  const emails = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  emails.push(BOOTSTRAPPED_ADMIN_EMAIL);
  return new Set(emails);
}

export async function verifyIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  if (!idToken) return null;

  const adminAuth = getServerAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: (decoded.email || '').toLowerCase(),
        emailVerified: Boolean(decoded.email_verified),
        name: decoded.name,
        idToken,
      };
    } catch {
      return null;
    }
  }

  // Verify via Google Identity Toolkit REST API using the project's Firebase Web API key
  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(
      firebaseServerConfig.apiKey
    )}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as {
      users?: Array<{
        localId: string;
        email?: string;
        emailVerified?: boolean;
        displayName?: string;
      }>;
    };
    const user = payload.users?.[0];
    if (!user?.localId) return null;
    return {
      uid: user.localId,
      email: (user.email || '').toLowerCase(),
      emailVerified: Boolean(user.emailVerified),
      name: user.displayName,
      idToken,
    };
  } catch {
    return null;
  }
}

export async function isAuthorizedAdmin(user: VerifiedFirebaseUser): Promise<boolean> {
  if (!user.emailVerified) return false;
  const allowlist = getAllowedAdminEmails();
  if (user.email && allowlist.has(user.email.toLowerCase())) {
    return true;
  }
  try {
    const adminDoc = await getSingleDoc<{ role?: string }>('admins', user.uid, user.idToken);
    return adminDoc?.role === 'admin';
  } catch {
    return false;
  }
}

export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const verified = await verifyIdToken(token);
    if (verified) {
      req.firebaseUser = verified;
    }
  }
  next();
}

export async function requireAdminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in as an administrator.' });
    return;
  }
  const token = authHeader.slice(7).trim();
  const user = await verifyIdToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired Firebase authentication token.' });
    return;
  }
  const allowed = await isAuthorizedAdmin(user);
  if (!allowed) {
    res.status(403).json({
      error:
        'Access denied. Only authorized bakery administrators can access this resource.',
    });
    return;
  }
  req.firebaseUser = user;
  next();
}
