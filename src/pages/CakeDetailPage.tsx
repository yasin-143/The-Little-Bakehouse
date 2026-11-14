import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Gift, Minus, Plus, ShoppingBag } from 'lucide-react';
import { WhatsAppButton } from '../components/WhatsAppButton';
import { useCart } from '../contexts/CartContext';
import { useProducts } from '../hooks/useProducts';
import { formatINR } from '../lib/config';
import { calculateDiscountedPrice } from '../lib/pricing';
import type { CakeSizeLabel } from '../types/bakery';

export function CakeDetailPage() {
  const { slug } = useParams();
  const { products, loading } = useProducts();
  const { addItem } = useCart();

  const [size, setSize] = useState<CakeSizeLabel>('500g');
  const [quantity, setQuantity] = useState(1);
  const [inscription, setInscription] = useState('');
  const [addedToast, setAddedToast] = useState(false);

  const product = products.find((p) => p.slug === slug || p.id === slug);

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="aspect-square rounded-2xl bg-white animate-pulse" />
          <div className="h-96 rounded-2xl bg-white animate-pulse" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-semibold text-[#4A332B]">Cake not found</h1>
        <p className="text-sm text-[#765447]">
          This cake may have been renamed or removed from the seasonal menu.
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Menu
        </Link>
      </main>
    );
  }

  const base500 = product.price500g;
  const final500 = calculateDiscountedPrice(base500, product.discountPercent);
  const base1kg = product.price1kg;
  const final1kg = calculateDiscountedPrice(base1kg, product.discountPercent);

  const activeBase = size === '1kg' ? base1kg : base500;
  const activeFinal = size === '1kg' ? final1kg : final500;

  const handleAdd = () => {
    addItem(product, size, quantity, inscription);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        to="/menu"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#765447] hover:text-[#4A332B]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Cake Menu</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Sticky Gallery Left */}
        <div className="lg:col-span-6 lg:sticky lg:top-24">
          <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-[#765447]/12">
            <img
              src={product.imageUrl}
              alt={`${product.name} — 100% eggless`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Contiguous Purchase Module Right */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#765447]/12 p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-xs text-[#765447]">
              {product.category}
              <span aria-hidden="true"> · </span>
              100% Eggless
              <span aria-hidden="true"> · </span>
              {product.isAvailable ? 'Freshly Made to Order' : 'Currently Unavailable'}
            </p>
            <h1 className="font-display text-4xl font-semibold text-[#4A332B]">{product.name}</h1>
            <div className="flex items-baseline gap-3 pt-1">
              <span className="font-mono-num text-3xl font-semibold text-[#4A332B]">
                {formatINR(activeFinal)}
              </span>
              {product.discountPercent > 0 && (
                <>
                  <span className="font-mono-num text-base text-[#765447] line-through">
                    {formatINR(activeBase)}
                  </span>
                  <span className="text-xs font-medium text-[#9B4D3E]">
                    Save {product.discountPercent}%
                  </span>
                </>
              )}
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#765447] leading-relaxed">
            {product.description}
          </p>

          {/* Weight Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A332B]">
              Select Weight
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '500g' as CakeSizeLabel, serves: 'Serves 4–6', price: final500, base: base500 },
                { label: '1kg' as CakeSizeLabel, serves: 'Serves 8–12', price: final1kg, base: base1kg },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSize(opt.label)}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    size === opt.label
                      ? 'border-[#765447] bg-[#FFF5E9]'
                      : 'border-[#765447]/20 hover:border-[#C99183]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#4A332B]">{opt.label}</span>
                    <span className="font-mono-num text-sm font-semibold text-[#4A332B]">
                      {formatINR(opt.price)}
                    </span>
                  </div>
                  <p className="text-xs text-[#765447] mt-0.5">{opt.serves}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Cake Inscription */}
          <div className="space-y-1.5">
            <label
              htmlFor="cake-inscription"
              className="block text-xs font-semibold uppercase tracking-wider text-[#4A332B]"
            >
              Message on Cake (Optional)
            </label>
            <input
              id="cake-inscription"
              type="text"
              maxLength={80}
              value={inscription}
              onChange={(e) => setInscription(e.target.value)}
              placeholder="e.g., Happy Birthday Aarav!"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B] focus:outline-none focus:border-[#C99183]"
            />
          </div>

          {/* Quantity & Primary CTA */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="inline-flex items-center border border-[#765447]/25 rounded-lg bg-[#FFF5E9]/40">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="p-3 text-[#4A332B] hover:bg-[#F6DDE2]/40 rounded-l-lg cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 text-sm font-mono-num font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                aria-label="Increase quantity"
                className="p-3 text-[#4A332B] hover:bg-[#F6DDE2]/40 rounded-r-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={!product.isAvailable}
              onClick={handleAdd}
              className={`flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 py-3 px-6 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                product.isAvailable
                  ? 'bg-[#765447] text-[#FFF5E9] hover:bg-[#5E4136] cursor-pointer'
                  : 'bg-[#765447]/20 text-[#765447] cursor-not-allowed'
              }`}
            >
              {addedToast ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Bag</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {product.isAvailable
                      ? `Add to Bag · ${formatINR(activeFinal * quantity)}`
                      : 'Currently Unavailable'}
                  </span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-[#F6DDE2]/50 border border-[#C99183]/25 flex items-start gap-3 text-xs text-[#4A332B]">
            <Gift className="w-4 h-4 text-[#765447] shrink-0 mt-0.5" />
            <span>
              Includes our Grand Opening complimentary cupcake · Cash on Delivery or Self Pickup in
              Madhuban Society, Pirangut.
            </span>
          </div>

          <div className="pt-2 border-t border-[#765447]/10 flex items-center justify-between gap-4">
            <span className="text-xs text-[#765447]">Have dietary or timing questions?</span>
            <WhatsAppButton
              variant="inline"
              label="Ask Muskan on WhatsApp"
              message={`Hello Muskan! I am interested in the ${product.name} (${size}) cake from The Little Bakehouse.`}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
