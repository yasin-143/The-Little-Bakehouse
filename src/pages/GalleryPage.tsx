import { useState } from 'react';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProducts } from '../hooks/useProducts';

interface GalleryItem {
  title: string;
  caption: string;
  imageUrl: string;
  slug?: string;
}

const CUPCAKE_SHOWCASE: GalleryItem[] = [
  {
    title: 'Strawberry Swirl Cupcakes',
    caption: 'Complimentary Grand Opening treat · Fresh berry buttercream',
    imageUrl: '/assets/aistudio/cupcakes1_3de14ccc.webp',
  },
  {
    title: 'Belgian Chocolate Fudge Cupcakes',
    caption: '100% eggless cocoa sponge topped with whipped fudge ganache',
    imageUrl: '/assets/aistudio/cupcakes2_79ae00ae.webp',
  },
];

export function GalleryPage() {
  const { products } = useProducts();
  const [activePhoto, setActivePhoto] = useState<GalleryItem | null>(null);

  const items: GalleryItem[] = [
    ...products.map((p) => ({
      title: p.name,
      caption: `${p.category} · 100% Eggless`,
      imageUrl: p.imageUrl,
      slug: p.slug,
    })),
    ...CUPCAKE_SHOWCASE,
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
            Freshly Handcrafted in Pirangut
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#4A332B]">
            Cake Gallery
          </h1>
          <p className="text-base text-[#765447]">
            A closer look at our signature 100% eggless celebration cakes and cupcakes. Need a
            theme tailored to your event? Send us a custom cake brief.
          </p>
        </div>
        <Link
          to="/custom-cake"
          className="px-5 py-2.5 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors whitespace-nowrap w-fit"
        >
          Request Custom Design
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, idx) => (
          <button
            key={`${item.title}-${idx}`}
            type="button"
            onClick={() => setActivePhoto(item)}
            className="group text-left bg-white rounded-2xl border border-[#765447]/12 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          >
            <div className="aspect-[4/3] overflow-hidden bg-[#FFF5E9]">
              <img
                src={item.imageUrl}
                alt={item.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-4">
              <h2 className="font-display text-xl font-semibold text-[#4A332B]">{item.title}</h2>
              <p className="text-xs text-[#765447] mt-0.5">{item.caption}</p>
            </div>
          </button>
        ))}
      </div>

      {activePhoto && (
        <div
          className="fixed inset-0 z-50 bg-[#4A332B]/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="bg-[#FFF5E9] rounded-2xl max-w-2xl w-full overflow-hidden border border-[#765447]/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] bg-white">
              <img
                src={activePhoto.imageUrl}
                alt={activePhoto.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                aria-label="Close lightbox"
                className="absolute top-3 right-3 p-2 rounded-full bg-white/90 text-[#4A332B] hover:bg-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl font-semibold text-[#4A332B]">
                  {activePhoto.title}
                </h3>
                <p className="text-sm text-[#765447]">{activePhoto.caption}</p>
              </div>
              {activePhoto.slug && (
                <Link
                  to={`/cakes/${activePhoto.slug}`}
                  onClick={() => setActivePhoto(null)}
                  className="px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium whitespace-nowrap"
                >
                  Order This Cake
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
