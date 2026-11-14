# Deployment & Operations Guide — The Little Bakehouse

## 1. Architecture Summary
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 (Vite SPA)
- **Backend**: Express (`server.ts`) handling server-authoritative order pricing, validation, duplicate-submission prevention, order tracking, and admin API endpoints
- **Database**: Cloud Firestore (`products`, `orders`, `orderIdempotency`, `customCakeRequests`, `admins`)
- **Authentication**: Firebase Authentication (Google Sign-In) with server-side ID token verification and Firestore Security Rules RBAC
- **File Storage**: Firebase Storage (`/cakes/*` for admin product photos, `/custom-requests/*` for customer reference images)

---

## 2. Environment Variables Setup
Copy `.env.example` to `.env` (or configure secrets in Firebase App Hosting / Cloud Run):

- `ADMIN_EMAILS`: Comma-separated list of authorized Google account emails for Muskan's Admin Dashboard (e.g., `muskan@gmail.com`). Customers cannot self-promote.
- `FIREBASE_SERVICE_ACCOUNT_KEY`: Single-line JSON from **Firebase Console → Project Settings → Service Accounts → Generate new private key**. Required for unauthenticated guest checkouts & automated server seeding.
- `VITE_WHATSAPP_NUMBER`: Business WhatsApp number with country code (default `919665619972`).
- `VITE_BUSINESS_PHONE`: Display phone number (`96656 19972`).
- `VITE_BAKERY_ADDRESS`: Pickup/bakery address (`Madhuban Society, Pirangut, Pune, Maharashtra`).
- `VITE_INSTAGRAM_URL`: Bakery Instagram profile link.

---

## 3. Firebase Console Setup Checklist
1. **Authentication**: Enable **Google** sign-in provider in Firebase Console → Authentication → Sign-in method. Add your hosted domain to Authorized Domains.
2. **Cloud Firestore**: Database is configured via `firebase-applet-config.json`. Deploy rules and indexes:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
3. **Firebase Storage**: Enable Storage in Firebase Console → Storage → Get Started, then deploy `storage.rules`:
   ```bash
   firebase deploy --only storage
   ```
4. **Admin Account Setup**:
   - Add Muskan's Google email to `ADMIN_EMAILS` in `.env` / `apphosting.yaml`.
   - Optionally create a document in Firestore at `/admins/{uid}` with `{ uid, email, role: "admin", createdAt: <serverTimestamp> }` so Firestore client rules also recognize additional staff admins.
5. **Initial 10 Cakes Database Seed**:
   - Sign in at `/admin` with an authorized admin Google account and click **Seed Initial 10 Cakes to Firestore** (calls `POST /api/admin/seed-products`). All 10 eggless cakes and launch discounts (`10%` / `15%`) are persisted into Firestore.

---

## 4. Local Development & Testing
```bash
npm install
npm run lint        # TypeScript check
npx eslint firestore.rules
npm test            # Vitest unit, API, price verification & security rule tests
npm run dev         # Starts Express + Vite on http://localhost:3000
```

---

## 5. Deploying to Firebase App Hosting / Cloud Run
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Push your repository to GitHub and connect it to **Firebase App Hosting** (`apphosting.yaml` is included), or deploy via Firebase CLI:
   ```bash
   firebase apphosting:backends:create --project <YOUR_PROJECT_ID>
   ```
3. Set `ADMIN_EMAILS` and `FIREBASE_SERVICE_ACCOUNT_KEY` as secrets in Firebase App Hosting:
   ```bash
   firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT_KEY
   ```
