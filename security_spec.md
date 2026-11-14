# Security Specification — The Little Bakehouse Firestore & Storage

## 1. Data Invariants
1. **Default-Deny Catch-All**: Any path not explicitly matched is denied (`allow read, write: if false;`).
2. **Admin Exclusivity**: Only verified admins (`request.auth.token.email_verified == true` and either bootstrapped owner email or an existing `/admins/{uid}` document) may create, update, or delete `/products`, modify order statuses or payment statuses, quote `/customCakeRequests`, or manage `/admins`.
3. **Zero Self-Promotion**: Authenticated customers can NEVER write to `/admins/{uid}` or assign themselves an admin role.
4. **PII Isolation**: `/orders` and `/customCakeRequests` contain customer names, phone numbers, and home addresses. Public `list` or cross-user `get` is strictly forbidden.
5. **Server-Authoritative Pricing & Status**: Client-initiated order creation (when authenticated) is locked to `status == 'Pending'` and `paymentStatus == 'Pending'`, and cannot tamper with `totalAmount`, `status`, or `paymentStatus` after creation. Order updates are restricted to admins via `affectedKeys().hasOnly(...)`.
6. **Temporal & ID Integrity**: Every document ID must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), `createdAt` must equal `request.time` on creation and remain immutable on update, and `updatedAt` must equal `request.time`.
7. **Bounded Strings & Lists**: Every string field enforces `.size()` limits; `orders.items` is bounded (`size() >= 1 && size() <= 20`).

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Product Tamper**: Anonymous/non-admin `update` on `/products/chocolate-truffle` setting `price500g: 1` -> `PERMISSION_DENIED`.
2. **Self-Admin Escalation**: Verified non-admin user attempts `create` on `/admins/{theirUid}` with `{ role: 'admin' }` -> `PERMISSION_DENIED`.
3. **Order PII Scraping**: Verified customer attempts `list` on `/orders` without filtering to `userId == request.auth.uid` -> `PERMISSION_DENIED`.
4. **Cross-Customer Order Read**: Customer B attempts `get` on `/orders/TLB-20261114-0001` belonging to Customer A -> `PERMISSION_DENIED`.
5. **Order Total Tampering After Creation**: Customer A attempts `update` on their own order changing `totalAmount: 1` -> `PERMISSION_DENIED`.
6. **Order Status Spoofing on Create**: Customer A attempts `create` on `/orders/...` with `status: 'Confirmed'` or `paymentStatus: 'Paid'` -> `PERMISSION_DENIED`.
7. **Shadow Ghost Field Injection**: User includes an unexpected field `isVerified: true` or `adminOverride: true` in `/orders` or `/customCakeRequests` -> `PERMISSION_DENIED` (`hasOnly` check).
8. **ID Poisoning / Resource Exhaustion**: Write to `/products/..%2Fbad_id_longer_than_128_chars...` or 1MB string in `customerName` -> `PERMISSION_DENIED`.
9. **Spoofed Unverified Email Admin**: Token has admin email string but `email_verified: false` -> `PERMISSION_DENIED`.
10. **Immutable `createdAt` Backdating**: Admin or user tries to backdate `createdAt` on create (`createdAt != request.time`) or mutate `createdAt` on update -> `PERMISSION_DENIED`.
11. **Order Deletion Attempt**: Anyone (even admin) attempts `delete` on `/orders/{orderId}` -> `PERMISSION_DENIED` (orders must be `Cancelled`, never erased).
12. **Malicious Storage Upload**: Upload of `.exe` / `application/javascript` or `> 5MB` file to `/custom-requests/` -> `PERMISSION_DENIED`.
