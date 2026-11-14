import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { BAKERY_CONFIG, buildWhatsAppUrl, formatINR } from '../lib/config';
import type { Order } from '../types/bakery';

export function OrderConfirmationPage() {
  const { orderId } = useParams();
  const location = useLocation();
  const state = location.state as { order?: Order } | null;
  const order = state?.order;

  const whatsappShareUrl = buildWhatsAppUrl(
    order
      ? `Hello Muskan! I just placed order ${order.orderId} for ${formatINR(order.totalAmount)} (${
          order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Pay on Pickup'
        }).`
      : `Hello Muskan! Confirming my order ID ${orderId || ''} from The Little Bakehouse.`
  );

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white rounded-2xl border border-[#765447]/15 p-6 sm:p-10 space-y-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <img
            src={BAKERY_CONFIG.thankYouStickerUrl}
            alt="Thank You For Your Order — The Little Bakehouse"
            referrerPolicy="no-referrer"
            className="w-28 h-28 rounded-full object-cover shrink-0 border border-[#765447]/10"
          />
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              <CheckCircle2 className="w-4 h-4" />
              <span>Order Saved to Bakehouse Queue</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#4A332B]">
              Thank you for your order!
            </h1>
            <p className="text-sm text-[#765447]">
              Order ID:{' '}
              <span className="font-mono-num font-semibold text-[#4A332B]">
                {order?.orderId || orderId}
              </span>
            </p>
          </div>
        </div>

        {order ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#FFF5E9] border border-[#765447]/12 text-sm">
              <div>
                <p className="text-xs text-[#765447]">Order Status</p>
                <p className="font-semibold text-[#4A332B] mt-0.5">{order.status}</p>
              </div>
              <div>
                <p className="text-xs text-[#765447]">Payment Method</p>
                <p className="font-semibold text-[#4A332B] mt-0.5">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Pay on Pickup'}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#765447]">Payment Status</p>
                <p className="font-semibold text-[#4A332B] mt-0.5">{order.paymentStatus}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-display text-2xl font-semibold text-[#4A332B]">
                Verified Order Receipt
              </h2>
              <ul className="divide-y divide-[#765447]/10 text-sm border-y border-[#765447]/10">
                {order.items.map((item, idx) => (
                  <li key={idx} className="py-3 flex justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#4A332B]">
                        {item.name} ({item.size}) × {item.quantity}
                      </p>
                      {item.inscription && (
                        <p className="text-xs text-[#765447] italic">
                          Inscription: &ldquo;{item.inscription}&rdquo;
                        </p>
                      )}
                    </div>
                    <span className="font-mono-num font-medium text-[#4A332B]">
                      {formatINR(item.lineTotal)}
                    </span>
                  </li>
                ))}
                {order.complimentaryItem && (
                  <li className="py-3 flex justify-between gap-4 text-emerald-800">
                    <span>{order.complimentaryItem}</span>
                    <span className="font-mono-num font-medium">FREE</span>
                  </li>
                )}
              </ul>

              <div className="space-y-1.5 text-sm pt-2">
                <div className="flex justify-between text-[#765447]">
                  <span>Subtotal</span>
                  <span className="font-mono-num">{formatINR(order.subtotal)}</span>
                </div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>Launch Discount</span>
                    <span className="font-mono-num">−{formatINR(order.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold text-[#4A332B] pt-2 border-t border-[#765447]/10">
                  <span>Server-Verified Total</span>
                  <span className="font-mono-num">{formatINR(order.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FFF5E9]/70 border border-[#765447]/10 text-sm space-y-1">
              <p className="font-semibold text-[#4A332B]">Delivery / Pickup Details</p>
              <p className="text-[#765447]">
                {order.customerName} · <span className="font-mono-num">{order.phone}</span>
              </p>
              <p className="text-[#765447]">{order.address}</p>
              {order.deliveryNotes && (
                <p className="text-xs text-[#765447]">Notes: {order.deliveryNotes}</p>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-[#765447]">
            Your order <span className="font-mono-num font-semibold">{orderId}</span> has been
            recorded. Use the Order Tracker anytime with your Order ID and phone number to check live
            baking progress.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <a
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#256D4F] text-white text-sm font-medium hover:bg-[#1E5940] transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Message Muskan on WhatsApp</span>
          </a>

          <div className="flex gap-3">
            <Link
              to="/track-order"
              className="px-4 py-2.5 rounded-lg border border-[#765447]/25 text-sm font-medium text-[#4A332B]"
            >
              Track Order
            </Link>
            <Link
              to="/menu"
              className="px-4 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium"
            >
              Back to Menu
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
