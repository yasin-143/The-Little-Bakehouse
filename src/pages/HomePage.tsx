import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { CakeCard } from '../components/CakeCard';
import { useProducts } from '../hooks/useProducts';
import { BAKERY_CONFIG } from '../lib/config';

export function HomePage() {
  const { products, loading } = useProducts();
  const featured = products.filter((p) => p.isAvailable).slice(0, 6);

  return (
    <main>
      {/* 1. Split Editorial Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <p className="text-xs font-medium tracking-widest uppercase text-[#765447]">
              100% Eggless Home Bakery · Madhuban Society, Pirangut, Pune
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[56px] font-semibold leading-[1.08] text-[#4A332B]">
              Made with love, baked with happiness.
            </h1>
            <p className="text-base sm:text-lg text-[#765447] leading-relaxed max-w-xl">
              Freshly handcrafted eggless celebration cakes by Muskan—layered with Belgian cocoa
              ganache, real fruit compotes, and light whipped cream, baked to order in Pirangut.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/menu"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors whitespace-nowrap"
              >
                <span>Order Fresh Cakes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/custom-cake"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#765447]/30 text-[#4A332B] text-sm font-medium hover:bg-[#F6DDE2]/50 transition-colors whitespace-nowrap"
              >
                Request Custom Cake
              </Link>
            </div>

            <div className="pt-4 border-t border-[#765447]/15 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-mono-num font-semibold text-[#4A332B]">100%</p>
                <p className="text-xs text-[#765447]">Pure Eggless Kitchen</p>
              </div>
              <div>
                <p className="font-mono-num font-semibold text-[#4A332B]">10–15% Off</p>
                <p className="text-xs text-[#765447]">Grand Opening Offer</p>
              </div>
              <div>
                <p className="font-mono-num font-semibold text-[#4A332B]">Free Cupcake</p>
                <p className="text-xs text-[#765447]">With Every Purchase</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1 rounded-2xl overflow-hidden bg-white border border-[#765447]/10 min-h-[280px]">
              <img
                src="/assets/aistudio/c2_6c21a7a6.jpg"
                alt="Chocolate Truffle eggless celebration cake"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="col-span-2 sm:col-span-1 grid grid-rows-2 gap-4">
              <div className="rounded-2xl overflow-hidden bg-white border border-[#765447]/10 flex items-center justify-center p-4">
                <img
                  src={BAKERY_CONFIG.logoUrl}
                  alt="The Little Bakehouse handmade with love logo"
                  referrerPolicy="no-referrer"
                  className="max-h-40 object-contain"
                />
              </div>
              <div className="rounded-2xl overflow-hidden bg-white border border-[#765447]/10">
                <img
                  src="/assets/aistudio/c8_8277b846.jpg"
                  alt="Strawberry pastel pink celebration cake"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured Menu Grid */}
      <section className="bg-white/65 border-y border-[#765447]/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium tracking-widest uppercase text-[#9B4D3E]">
                Fresh From Muskan&rsquo;s Oven
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#4A332B]">
                Signature Eggless Cakes
              </h2>
            </div>
            <Link
              to="/menu"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#765447] hover:text-[#4A332B] whitespace-nowrap"
            >
              <span>View Full Menu ({products.length})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-[#765447]/10 h-[410px] animate-pulse"
                />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#765447]/15 p-10 text-center space-y-3">
              <p className="font-display text-2xl font-semibold text-[#4A332B]">
                Menu is ready to be initialized in Firestore
              </p>
              <p className="text-sm text-[#765447] max-w-lg mx-auto">
                No cakes are stored in Firestore yet. If you are Muskan (owner), sign in to the
                Admin Dashboard to seed the 10 initial eggless cakes into your live database.
              </p>
              <Link
                to="/admin"
                className="inline-block px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136]"
              >
                Open Admin Dashboard
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {featured.map((product) => (
                <CakeCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. Craftsmanship & Grand Opening Offer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="rounded-3xl bg-[#F6DDE2]/55 border border-[#C99183]/25 p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5 rounded-2xl overflow-hidden bg-white shadow-sm">
            <img
              src={BAKERY_CONFIG.posterUrl}
              alt="The Little Bakehouse Grand Opening Special Offers"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#765447]">
              <Sparkles className="w-4 h-4 text-[#C99183]" />
              <span>Grand Opening Celebration · Pirangut, Pune</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#4A332B]">
              Every cake includes a complimentary fresh cupcake
            </h2>
            <p className="text-base text-[#765447] leading-relaxed">
              Whether you are celebrating a birthday in Madhuban Society or sending a surprise
              across Pune, every order is baked small-batch after confirmation—never pre-frozen,
              always 100% eggless, with Cash on Delivery or convenient Self Pickup.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/about"
                className="px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors"
              >
                Read Muskan&rsquo;s Story
              </Link>
              <Link
                to="/track-order"
                className="px-5 py-2.5 rounded-lg bg-white border border-[#765447]/20 text-[#4A332B] text-sm font-medium hover:bg-[#FFF5E9] transition-colors"
              >
                Track Existing Order
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
