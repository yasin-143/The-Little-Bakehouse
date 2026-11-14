import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CakeSlice, Plus } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { formatINR } from '../lib/config';
import { calculateDiscountedPrice } from '../lib/pricing';
import type { CakeSizeLabel, Product } from '../types/bakery';

export function CakeCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<CakeSizeLabel>('500g');
  const [imgError, setImgError] = useState(false);

  const basePrice = selectedSize === '1kg' ? product.price1kg : product.price500g;
  const finalPrice = calculateDiscountedPrice(basePrice, product.discountPercent);

  return (
    <article className="group bg-white rounded-2xl border border-[#765447]/12 overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to={`/cakes/${product.slug}`}
        className="relative aspect-[4/3] bg-[#FFF5E9] overflow-hidden block"
      >
        {!imgError ? (
          <img
            src={product.imageUrl}
            alt={`${product.name} — 100% eggless cake`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#F6DDE2] to-[#FFF5E9] text-[#765447] p-4 text-center">
            <CakeSlice className="w-8 h-8 mb-2" />
            <span className="font-display text-lg font-semibold">{product.name}</span>
          </div>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-xs text-[#765447]">
            {product.category}
            <span aria-hidden="true"> · </span>
            100% Eggless
            {product.discountPercent > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="text-[#9B4D3E] font-medium">{product.discountPercent}% Launch Off</span>
              </>
            )}
          </p>

          <Link to={`/cakes/${product.slug}`} className="block">
            <h3 className="font-display text-2xl font-semibold text-[#4A332B] group-hover:text-[#765447] transition-colors">
              {product.name}
            </h3>
          </Link>

          <p className="text-sm text-[#765447] line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-[#765447]/10">
          <div className="flex items-center justify-between gap-2">
            <div
              className="inline-flex p-0.5 rounded-lg bg-[#FFF5E9] border border-[#765447]/15"
              role="group"
              aria-label={`Select weight for ${product.name}`}
            >
              {(['500g', '1kg'] as CakeSizeLabel[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    selectedSize === size
                      ? 'bg-[#765447] text-[#FFF5E9]'
                      : 'text-[#765447] hover:text-[#4A332B]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>

            <div className="text-right">
              <span className="font-mono-num text-lg font-semibold text-[#4A332B]">
                {formatINR(finalPrice)}
              </span>
              {product.discountPercent > 0 && (
                <span className="ml-2 font-mono-num text-xs text-[#765447]/70 line-through">
                  {formatINR(basePrice)}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!product.isAvailable}
              onClick={() => addItem(product, selectedSize, 1)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                product.isAvailable
                  ? 'bg-[#C99183] text-white hover:bg-[#B47A6C] cursor-pointer'
                  : 'bg-[#765447]/15 text-[#765447] cursor-not-allowed'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>{product.isAvailable ? 'Add to Bag' : 'Currently Unavailable'}</span>
            </button>
            <Link
              to={`/cakes/${product.slug}`}
              className="py-2.5 px-3.5 rounded-lg border border-[#765447]/20 text-sm font-medium text-[#4A332B] hover:bg-[#FFF5E9] transition-colors whitespace-nowrap"
            >
              Details
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
