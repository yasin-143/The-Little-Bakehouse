import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { BAKERY_CONFIG, formatINR } from '../lib/config';
import { validateCheckoutInput } from '../lib/pricing';
import type { Order, PaymentMethod } from '../types/bakery';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, signInWithGoogle, getIdToken } = useAuth();
  const { items, estimatedSubtotal, estimatedSavings, estimatedTotal, clearCart } = useCart();

  // Stable idempotency key per checkout session prevents duplicate order creation on retries
  const [idempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [address, setAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const requestPayload = useMemo(
    () => ({
      idempotencyKey,
      customerName,
      phone,
      address:
        paymentMethod === 'PICKUP' && !address.trim()
          ? `Self Pickup — ${BAKERY_CONFIG.address}`
          : address,
      deliveryNotes,
      paymentMethod,
      items: items.map((item) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        inscription: item.inscription,
      })),
    }),
    [idempotencyKey, customerName, phone, address, deliveryNotes, paymentMethod, items]
  );

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold text-[#4A332B]">
          Your bag is empty
        </h1>
        <p className="text-sm text-[#765447]">Add a fresh eggless cake before checking out.</p>
        <Link
          to="/menu"
          className="inline-block px-6 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium"
        >
          Browse Menu
        </Link>
      </main>
    );
  }

  const submitOrder = async (tokenOverride?: string | null) => {
    setSubmitError(null);
    const validation = validateCheckoutInput(requestPayload);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      const token = tokenOverride ?? (await getIdToken());
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(requestPayload),
      });

      const data = (await res.json()) as {
        code?: string;
        error?: string;
        fieldErrors?: Record<string, string>;
        order?: Order;
      };

      if (res.status === 401 && data.code === 'SIGN_IN_REQUIRED') {
        setNeedsSignIn(true);
        setSubmitError(data.error || 'Please sign in with Google to place your order securely.');
        return;
      }

      if (!res.ok || !data.order) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setSubmitError(data.error || 'Could not complete your order.');
        return;
      }

      clearCart();
      navigate(`/order-confirmation/${data.order.orderId}`, {
        state: { order: data.order },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Network error placing order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    await submitOrder();
  };

  const handleSignInAndOrder = async () => {
    try {
      const signedIn = await signInWithGoogle();
      const freshToken = await signedIn.getIdToken();
      await submitOrder(freshToken);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
          Secure Checkout · Server-Verified Pricing
        </p>
        <h1 className="font-display text-4xl font-semibold text-[#4A332B]">Complete Your Order</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white rounded-2xl border border-[#765447]/15 p-6 sm:p-8 space-y-6"
        >
          {submitError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 space-y-3">
              <p>{submitError}</p>
              {needsSignIn && (
                <button
                  type="button"
                  onClick={handleSignInAndOrder}
                  className="px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-xs font-medium cursor-pointer"
                >
                  Sign in with Google &amp; Place Order
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="chk-name" className="block text-xs font-semibold text-[#4A332B]">
                Full Name *
              </label>
              <input
                id="chk-name"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g., Rohan Deshmukh"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
              />
              {fieldErrors.customerName && (
                <p className="text-xs text-red-700">{fieldErrors.customerName}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="chk-phone" className="block text-xs font-semibold text-[#4A332B]">
                Mobile Number (WhatsApp / Call) *
              </label>
              <input
                id="chk-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
              />
              {fieldErrors.phone && <p className="text-xs text-red-700">{fieldErrors.phone}</p>}
            </div>
          </div>

          {/* Fulfillment & Payment Method */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#4A332B]">
              Fulfillment &amp; Payment Method *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'COD' as PaymentMethod,
                  title: 'Cash on Delivery',
                  desc: 'Pay cash / UPI upon delivery in Pirangut & Pune',
                },
                {
                  id: 'PICKUP' as PaymentMethod,
                  title: 'Pay on Pickup',
                  desc: `Collect fresh at ${BAKERY_CONFIG.address}`,
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`p-4 rounded-xl border text-left transition-colors cursor-pointer ${
                    paymentMethod === opt.id
                      ? 'border-[#765447] bg-[#FFF5E9]'
                      : 'border-[#765447]/20 hover:border-[#C99183]'
                  }`}
                >
                  <p className="font-semibold text-sm text-[#4A332B]">{opt.title}</p>
                  <p className="text-xs text-[#765447] mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="chk-address" className="block text-xs font-semibold text-[#4A332B]">
              {paymentMethod === 'COD'
                ? 'Delivery Address (Flat, Society, Landmark in Pune) *'
                : 'Pickup Note / Address (Optional)'}
            </label>
            <textarea
              id="chk-address"
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={
                paymentMethod === 'COD'
                  ? 'e.g., B-402, Madhuban Society, Pirangut, Pune 412115'
                  : 'e.g., Will pick up at 6:30 PM'
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            />
            {fieldErrors.address && <p className="text-xs text-red-700">{fieldErrors.address}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="chk-notes" className="block text-xs font-semibold text-[#4A332B]">
              Preferred Delivery Time / Special Notes (Optional)
            </label>
            <input
              id="chk-notes"
              type="text"
              maxLength={300}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g., Please deliver between 5 PM – 6 PM"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>
              {submitting
                ? 'Confirming Order with Bakehouse...'
                : `Place Order · ${formatINR(estimatedTotal)}`}
            </span>
          </button>

          <p className="text-xs text-[#765447] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#765447] shrink-0" />
            <span>
              Prices are verified against Cloud Firestore on our server. Duplicate submissions are
              automatically blocked.
            </span>
          </p>
        </form>

        <aside className="lg:col-span-5 bg-white rounded-2xl border border-[#765447]/15 p-6 space-y-5">
          <h2 className="font-display text-2xl font-semibold text-[#4A332B]">Order Summary</h2>
          <ul className="divide-y divide-[#765447]/10 text-sm">
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.size}-${item.inscription || ''}`}
                className="py-3 flex justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-[#4A332B]">
                    {item.name} × {item.quantity}
                  </p>
                  <p className="text-xs text-[#765447]">{item.size} · Eggless</p>
                  {item.inscription && (
                    <p className="text-xs text-[#765447] italic">
                      &ldquo;{item.inscription}&rdquo;
                    </p>
                  )}
                </div>
                <span className="font-mono-num font-medium text-[#4A332B]">
                  {formatINR(item.unitFinalPrice * item.quantity)}
                </span>
              </li>
            ))}
          </ul>

          <div className="p-3.5 rounded-xl bg-[#F6DDE2]/60 border border-[#C99183]/25 flex items-start gap-2.5 text-xs text-[#4A332B]">
            <Gift className="w-4 h-4 shrink-0 mt-0.5 text-[#765447]" />
            <span>
              <strong>Grand Opening Bonus:</strong> Free Cupcake (1 pc) included with your order.
            </span>
          </div>

          <div className="space-y-2 text-sm pt-2 border-t border-[#765447]/10">
            <div className="flex justify-between text-[#765447]">
              <span>Menu Subtotal</span>
              <span className="font-mono-num">{formatINR(estimatedSubtotal)}</span>
            </div>
            {estimatedSavings > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Launch Offer Savings</span>
                <span className="font-mono-num">−{formatINR(estimatedSavings)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold text-[#4A332B] pt-2 border-t border-[#765447]/10">
              <span>Payable ({paymentMethod === 'COD' ? 'Cash on Delivery' : 'On Pickup'})</span>
              <span className="font-mono-num">{formatINR(estimatedTotal)}</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
