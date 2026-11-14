import { Link } from 'react-router-dom';
import { BAKERY_CONFIG } from '../lib/config';

export function AboutPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
            Our Home Bakehouse · Pirangut, Pune
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#4A332B]">
            Baked fresh by Muskan, with zero shortcuts
          </h1>
          <p className="text-base text-[#765447] leading-relaxed">
            The Little Bakehouse began in Muskan&rsquo;s sunlit home kitchen in Madhuban Society,
            Pirangut with a simple promise: every celebration deserves a fresh, 100% eggless cake
            made with real couverture cocoa, house-simmered fruit compotes, and gentle sweetness.
          </p>
          <p className="text-base text-[#765447] leading-relaxed">
            Unlike commercial bakeries that stock frozen sponges for days, we bake every cake only
            after your order is confirmed. From signature Chocolate Truffle and KitKat Crunch cakes
            to custom-themed birthday centerpieces, every layer is hand-frosted with care.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors"
            >
              Browse Cake Menu
            </Link>
            <Link
              to="/custom-cake"
              className="px-5 py-2.5 rounded-lg border border-[#765447]/30 text-[#4A332B] text-sm font-medium hover:bg-[#F6DDE2]/50 transition-colors"
            >
              Plan a Custom Cake
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          <div className="rounded-2xl overflow-hidden bg-white border border-[#765447]/12 p-6 flex items-center justify-center col-span-2">
            <img
              src={BAKERY_CONFIG.logoUrl}
              alt="The Little Bakehouse brand illustration"
              referrerPolicy="no-referrer"
              className="max-h-56 object-contain"
            />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square bg-white border border-[#765447]/12">
            <img
              src="/assets/aistudio/c1_9ae462a4.jpg"
              alt="Chocolate Chips cake freshly frosted"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square bg-white border border-[#765447]/12">
            <img
              src="/assets/aistudio/cupcakes1_3de14ccc.webp"
              alt="Fresh strawberry cupcakes"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            title: '01. Strictly 100% Eggless Kitchen',
            body: 'No eggs ever enter our baking equipment or preparation surfaces—safe and joyful for every vegetarian family celebration.',
          },
          {
            title: '02. Baked Fresh to Order',
            body: 'Sponges, chocolate ganache, and berry compotes are prepared fresh for your pickup or delivery slot in Pirangut and Pune.',
          },
          {
            title: '03. Honest, Transparent Pricing',
            body: 'Clear 500g and 1kg weights, Grand Opening launch discounts, and direct WhatsApp communication with Muskan.',
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl border border-[#765447]/12 p-6 space-y-2"
          >
            <h2 className="font-display text-2xl font-semibold text-[#4A332B]">{item.title}</h2>
            <p className="text-sm text-[#765447] leading-relaxed">{item.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
