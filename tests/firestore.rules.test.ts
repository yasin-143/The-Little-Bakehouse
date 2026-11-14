import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const firestoreRules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
const storageRules = fs.readFileSync(path.resolve(process.cwd(), 'storage.rules'), 'utf-8');

describe('Firestore & Storage Security Rules Audit', () => {
  it('enforces rules_version 2 and default-deny catch-all', () => {
    expect(firestoreRules).toContain("rules_version = '2';");
    expect(firestoreRules).toMatch(/match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
    expect(storageRules).toContain("rules_version = '2';");
    expect(storageRules).toMatch(/match \/\{allPaths=\*\*\} \{\s*allow read, write: if false;/);
  });

  it('enforces email verification and blocks self-promotion on admins collection', () => {
    expect(firestoreRules).toContain('request.auth.token.email_verified == true');
    expect(firestoreRules).toMatch(/match \/admins\/\{adminId\}[\s\S]*allow create, update: if isAdmin\(\)/);
  });

  it('isolates order PII from public listing and prevents order tampering or deletion', () => {
    expect(firestoreRules).not.toMatch(/match \/orders[\s\S]*allow list: if true/);
    expect(firestoreRules).toContain('existing().userId == request.auth.uid');
    expect(firestoreRules).toContain('resource.data.userId == request.auth.uid');
    expect(firestoreRules).toContain('incoming().totalAmount == existing().totalAmount');
    expect(firestoreRules).toContain("incoming().diff(existing()).affectedKeys().hasOnly(['status', 'paymentStatus', 'adminNotes', 'updatedAt'])");
    expect(firestoreRules).toMatch(/match \/orders\/\{orderId\}[\s\S]*allow delete: if false;/);
  });

  it('validates product writes to admins only and enforces strict schema keys & timestamps', () => {
    expect(firestoreRules).toMatch(/match \/products\/\{productId\}[\s\S]*allow create: if isAdmin\(\)/);
    expect(firestoreRules).toContain('incoming().createdAt == request.time');
    expect(firestoreRules).toContain('incoming().updatedAt == request.time');
    expect(firestoreRules).toContain('isValidId(id)');
    expect(firestoreRules).toContain('data.keys().hasOnly([');
  });

  it('restricts Storage uploads to valid image types and <= 5MB', () => {
    expect(storageRules).toContain('5 * 1024 * 1024');
    expect(storageRules).toContain("image/(jpeg|jpg|png|webp)");
  });
});
