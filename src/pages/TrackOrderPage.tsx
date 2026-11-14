import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatINR } from '../lib/config';
import { ORDER_STATUS_SEQUENCE, type Order } from '../types/bakery';

export function TrackOrderPage() {
  const { signInWithGoogle, getIdToken } = useAuth();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);

  const performLookup = async (tokenOverride?: string | null) => {
    setError(null);
    setOrder(null);
    setLoading(true);
    try {
      const token = tokenOverride ?? (await getIdToken());
      const res = await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ orderId: orderId.trim(), phone: phone.trim() }),
      });

      const data = (await res.json()) as {
        code?: string;
        error?: string;
        order?: Order;
      };

      if (res.status === 401 && data.code === 'SIGN_IN_REQUIRED') {
        setNeedsSignIn(true);
        setError(data.error || 'Please sign in to look up your order.');
        return;
      }

      if (!res.ok || !data.order) {
        setError(data.error || 'Order not found.');
        return;
      }

      setOrder(data.order);
      setNeedsSignIn(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to look up order.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLookup();
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
          Live Bakehouse Status
        </p>
        <h1 className="font-display text-4xl font-semibold text-[#4A332B]">Track Your Order</h1>
        <p className="text-sm text-[#765447]">
          Enter the Order ID from your confirmation receipt and your 10-digit mobile number.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-[#765447]/15 p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="trk-id" className="block text-xs font-semibold text-[#4A332B]">
              Order ID
            </label>
            <input
              id="trk-id"
              type="text"
              required
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="e.g., TLB-20261114-A1B2"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm font-mono-num text-[#4A332B]"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="trk-phone" className="block text-xs font-semibold text-[#4A332B]">
              Phone Number
            </label>
            <input
              id="trk-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm font-mono-num text-[#4A332B]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] cursor-pointer"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          <span>Check Order Status</span>
        </button>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 space-y-2">
            <p>{error}</p>
            {needsSignIn && (
              <button
                type="button"
                onClick={async () => {
                  const u = await signInWithGoogle();
                  const t = await u.getIdToken();
                  await performLookup(t);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-xs font-medium cursor-pointer"
              >
                Sign in with Google
              </button>
            )}
          </div>
        )}
      </form>

      {order && (
        <section className="bg-white rounded-2xl border border-[#765447]/15 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#765447]/10 pb-4">
            <div>
              <p className="text-xs text-[#765447]">Order ID</p>
              <h2 className="font-mono-num text-xl font-semibold text-[#4A332B]">
                {order.orderId}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#765447]">Current Status</p>
              <p className="text-base font-semibold text-[#9B4D3E]">{order.status}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {ORDER_STATUS_SEQUENCE.filter((s) => s !== 'Cancelled').map((step) => {
              const activeIdx = ORDER_STATUS_SEQUENCE.indexOf(order.status);
              const stepIdx = ORDER_STATUS_SEQUENCE.indexOf(step);
              const reached = order.status !== 'Cancelled' && stepIdx <= activeIdx;
              return (
                <div
                  key={step}
                  className={`px-3 py-2 rounded-lg border ${
                    reached
                      ? 'border-[#765447] bg-[#F6DDE2]/60 text-[#4A332B] font-semibold'
                      : 'border-[#765447]/15 text-[#765447]'
                  }`}
                >
                  {step}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 text-sm">
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span>
                  {item.name} ({item.size}) × {item.quantity}
                </span>
                <span className="font-mono-num">{formatINR(item.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-[#4A332B] pt-2 border-t border-[#765447]/10">
              <span>Total ({order.paymentMethod} · {order.paymentStatus})</span>
              <span className="font-mono-num">{formatINR(order.totalAmount)}</span>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
