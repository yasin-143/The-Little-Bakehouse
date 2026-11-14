import { Link, useNavigate } from 'react-router-dom';
import { Gift, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatINR } from '../lib/config';

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    updateQuantity,
    removeItem,
    estimatedSubtotal,
    estimatedSavings,
    estimatedTotal,
  } = useCart();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#4A332B]/40 backdrop-blur-[2px]"
        onClick={closeCart}
        aria-hidden="true"
      />
      <aside className="relative z-10 w-full max-w-md bg-[#FFF5E9] h-full flex flex-col border-l border-[#765447]/15 shadow-2xl">
        <div className="px-6 py-5 border-b border-[#765447]/15 flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#4A332B]">Your Bakery Bag</h2>
            <p className="text-xs text-[#765447]">100% Eggless · Freshly baked to order</p>
          </div>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close bag"
            className="p-2 rounded-lg text-[#765447] hover:bg-[#F6DDE2]/60 hover:text-[#4A332B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#F6DDE2] flex items-center justify-center text-[#765447]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-2xl font-semibold text-[#4A332B]">
                  Your bag is empty
                </p>
                <p className="text-sm text-[#765447] max-w-xs mx-auto">
                  Explore our freshly baked eggless cakes in Pirangut, Pune or request a custom design.
                </p>
              </div>
              <Link
                to="/menu"
                onClick={closeCart}
                className="inline-block px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors"
              >
                Browse Cake Menu
              </Link>
            </div>
          ) : (
            <>
              <div className="p-3.5 rounded-xl bg-[#F6DDE2]/65 border border-[#C99183]/30 flex items-start gap-3">
                <Gift className="w-5 h-5 text-[#765447] shrink-0 mt-0.5" />
                <div className="text-xs text-[#4A332B] leading-relaxed">
                  <span className="font-semibold">Grand Opening Special Included:</span> You receive a
                  complimentary freshly baked cupcake with this order.
                </div>
              </div>

              <ul className="divide-y divide-[#765447]/15">
                {items.map((item) => (
                  <li
                    key={`${item.productId}-${item.size}-${item.inscription || ''}`}
                    className="py-4 flex gap-4"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-20 h-20 rounded-lg object-cover bg-[#F6DDE2]/40 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm text-[#4A332B] truncate">
                            {item.name}
                          </h3>
                          <p className="text-xs text-[#765447]">
                            {item.size} · Eggless
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(item.productId, item.size, item.inscription)
                          }
                          aria-label={`Remove ${item.name}`}
                          className="p-1 text-[#765447] hover:text-red-700 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.inscription && (
                        <p className="text-xs text-[#765447] mt-1 italic truncate">
                          Message: &ldquo;{item.inscription}&rdquo;
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center border border-[#765447]/25 rounded-lg bg-white">
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
                            className="p-1.5 text-[#4A332B] hover:bg-[#F6DDE2]/50 rounded-l-lg cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-mono-num font-medium">
                            {item.quantity}
                          </span>
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
                            className="p-1.5 text-[#4A332B] hover:bg-[#F6DDE2]/50 rounded-r-lg cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right">
                          <span className="font-mono-num text-sm font-semibold text-[#4A332B]">
                            {formatINR(item.unitFinalPrice * item.quantity)}
                          </span>
                          {item.discountPercent > 0 && (
                            <span className="block font-mono-num text-xs text-[#765447] line-through">
                              {formatINR(item.unitBasePrice * item.quantity)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-6 border-t border-[#765447]/15 bg-white/80 space-y-4">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#765447]">
                <span>Menu Subtotal</span>
                <span className="font-mono-num">{formatINR(estimatedSubtotal)}</span>
              </div>
              {estimatedSavings > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Grand Opening Savings</span>
                  <span className="font-mono-num">−{formatINR(estimatedSavings)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-[#4A332B] pt-2 border-t border-[#765447]/10">
                <span>Estimated Total</span>
                <span className="font-mono-num">{formatINR(estimatedTotal)}</span>
              </div>
              <p className="text-[11px] text-[#765447]">
                Final total is confirmed on our server against live menu prices at checkout.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/cart"
                onClick={closeCart}
                className="py-2.5 px-4 rounded-lg border border-[#765447]/30 text-center text-sm font-medium text-[#4A332B] hover:bg-[#F6DDE2]/40 transition-colors"
              >
                Review Bag
              </Link>
              <button
                type="button"
                onClick={handleCheckout}
                className="py-2.5 px-4 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors cursor-pointer"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
