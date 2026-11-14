import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { CakeCard } from '../components/CakeCard';
import { useProducts } from '../hooks/useProducts';
import type { CakeCategory } from '../types/bakery';

const CATEGORIES: Array<'All' | CakeCategory> = [
  'All',
  'Chocolate',
  'Signature Crunch',
  'Fruit & Cream',
];

export function MenuPage() {
  const { products, loading, error } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState<'All' | CakeCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (onlyAvailable && !p.isAvailable) return false;
      if (q && !p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery, onlyAvailable]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="space-y-3 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
          100% Eggless Menu · 500g &amp; 1kg
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#4A332B]">
          Our Fresh Cake Menu
        </h1>
        <p className="text-base text-[#765447]">
          Every cake is baked fresh in Pirangut, Pune. Choose 500g or 1kg and enjoy our Grand
          Opening 10–15% launch savings plus a complimentary cupcake.
        </p>
      </div>

      {/* Interactive Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#765447]/15">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-white border border-[#765447]/15 w-fit">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === category
                  ? 'bg-[#765447] text-[#FFF5E9]'
                  : 'text-[#765447] hover:text-[#4A332B]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#765447] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cakes or flavours..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white border border-[#765447]/20 text-sm text-[#4A332B] placeholder:text-[#765447]/60 focus:outline-none focus:border-[#C99183]"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#4A332B] cursor-pointer select-none px-3 py-2 rounded-lg bg-white border border-[#765447]/20">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="accent-[#765447]"
            />
            <span>In Stock Only</span>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-[410px] bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#765447]/15 p-12 text-center space-y-3">
          <h2 className="font-display text-2xl font-semibold text-[#4A332B]">
            {products.length === 0 ? 'Catalog Not Yet Seeded' : 'No Matching Cakes Found'}
          </h2>
          <p className="text-sm text-[#765447] max-w-md mx-auto">
            {products.length === 0
              ? 'Our Firestore product collection is currently empty. Muskan can initialize the 10 signature cakes from the Admin Dashboard.'
              : 'Try clearing your search or switching cake categories.'}
          </p>
          {products.length === 0 ? (
            <Link
              to="/admin"
              className="inline-block px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium"
            >
              Go to Admin Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setSearchQuery('');
                setOnlyAvailable(false);
              }}
              className="px-5 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filtered.map((product) => (
            <CakeCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
