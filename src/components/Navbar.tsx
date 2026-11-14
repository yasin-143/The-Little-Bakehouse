import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { BAKERY_CONFIG } from '../lib/config';
import { useCart } from '../contexts/CartContext';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Menu', to: '/menu' },
  { label: 'Custom Cake', to: '/custom-cake' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About', to: '/about' },
];

export function Navbar() {
  const { pathname } = useLocation();
  const { totalCount, openCart } = useCart();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40">
      {bannerVisible && (
        <div className="bg-[#765447] text-[#FFF5E9] px-4 py-1.5 text-xs flex items-center justify-center relative min-h-[34px]">
          <p className="text-center font-medium tracking-wide pr-6 truncate">
            {BAKERY_CONFIG.promoBanner}
          </p>
          <button
            type="button"
            onClick={() => setBannerVisible(false)}
            aria-label="Dismiss announcement"
            className="absolute right-3 p-1 text-[#F6DDE2] hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <header className="bg-[#FFF5E9]/95 backdrop-blur-md border-b border-[#765447]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="font-display text-2xl sm:text-[26px] font-semibold tracking-tight text-[#4A332B] whitespace-nowrap shrink-0"
          >
            {BAKERY_CONFIG.brandName}
          </Link>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#765447]">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                    active
                      ? 'text-[#4A332B] border-[#C99183]'
                      : 'border-transparent hover:text-[#4A332B] hover:border-[#C99183]/50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={openCart}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#765447] text-[#FFF5E9] text-sm font-medium hover:bg-[#5E4136] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Bag</span>
              <span className="font-mono-num text-xs bg-[#C99183] text-white px-1.5 py-0.5 rounded">
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle navigation menu"
              className="md:hidden p-2 rounded-lg border border-[#765447]/20 text-[#4A332B]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#765447]/15 bg-[#FFF5E9] px-4 py-4 space-y-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-[#4A332B] hover:text-[#C99183]"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-[#765447]/10 flex gap-4 text-sm">
              <Link
                to="/track-order"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#765447] hover:text-[#4A332B]"
              >
                Track Order
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#765447] hover:text-[#4A332B]"
              >
                Contact
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[#765447] hover:text-[#4A332B]"
              >
                Admin
              </Link>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}
