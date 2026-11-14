import { Link } from 'react-router-dom';
import { ArrowRight, Gift, Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatINR } from '../lib/config';

export function CartPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    estimatedSubtotal,
    estimatedSavings,
    estimatedTotal,
  } = useCart();

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-4xl font-semibold text-[#4A332B]">Your Shopping Bag</h1>
        <p className="text-sm text-[#765447]">
          Review your 100% eggless cake selection before proceeding to checkout.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#765447]/15 p-12 text-center space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#4A332B]">Your bag is empty</h2>
          <p className="text-sm text-[#765447]">
            Explore our freshly baked 500g and 1kg cakes to begin an order.
          </p>
          <Link
            to="/menu"
            className="inline-block px-6 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium"
          >
            Explore Cake Menu
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#765447]/15 divide-y divide-[#765447]/12">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size}-${item.inscription || ''}`}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-xl object-cover bg-[#FFF5E9]"
                  />
                  <div>
                    <Link
                      to={`/cakes/${item.slug}`}
                      className="font-display text-xl font-semibold text-[#4A332B] hover:text-[#765447]"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-[#765447]">
                      {item.size} · {formatINR(item.unitFinalPrice)} each
                    </p>
                    {item.inscription && (
                      <p className="text-xs text-[#765447] italic mt-1">
                        Inscription: &ldquo;{item.inscription}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-5">
                  <div className="inline-flex items-center border border-[#765447]/20 rounded-lg bg-[#FFF5E9]/40">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.size,
                          item.inscription,
                          item.quantity - 1
                        )
                      }
                      aria-label="Decrease quantity"
                      className="p-2 text-[#4A332B] cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-sm font-mono-num font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.productId,
                          item.size,
                          item.inscription,
                          item.quantity + 1
                        )
                      }
                      aria-label="Increase quantity"
                      className="p-2 text-[#4A332B] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-mono-num text-base font-semibold text-[#4A332B] min-w-[70px] text-right">
                    {formatINR(item.unitFinalPrice * item.quantity)}
                  </span>

                  <button
                    type="button"
                    onClick={() => removeItem(item.productId, item.size, item.inscription)}
                    aria-label="Remove item"
                    className="p-1.5 text-[#765447] hover:text-red-700 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#765447]/15 p-6 space-y-5">
            <h2 className="font-display text-2xl font-semibold text-[#4A332B]">Order Summary</h2>
            <div className="p-3.5 rounded-xl bg-[#F6DDE2]/60 border border-[#C99183]/25 flex items-start gap-2.5 text-xs text-[#4A332B]">
              <Gift className="w-4 h-4 shrink-0 mt-0.5 text-[#765447]" />
              <span>Free Grand Opening Cupcake included with every order.</span>
            </div>
            <div className="space-y-2 text-sm">
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
              <div className="flex justify-between text-base font-semibold text-[#4A332B] pt-3 border-t border-[#765447]/10">
                <span>Estimated Total</span>
                <span className="font-mono-num">{formatINR(estimatedTotal)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
