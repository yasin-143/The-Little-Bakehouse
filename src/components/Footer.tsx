import { Link } from 'react-router-dom';
import { BAKERY_CONFIG, buildWhatsAppUrl } from '../lib/config';

export function Footer() {
  const enquiryUrl = buildWhatsAppUrl(
    'Hello Muskan! I would like to enquire about ordering a fresh eggless cake from The Little Bakehouse.'
  );

  return (
    <footer className="bg-[#4A332B] text-[#FFF5E9] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-3">
            <img
              src={BAKERY_CONFIG.logoUrl}
              alt="The Little Bakehouse logo"
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover bg-[#FFF5E9]"
            />
            <div>
              <h3 className="font-display text-2xl font-semibold text-[#FFF5E9]">
                {BAKERY_CONFIG.brandName}
              </h3>
              <p className="text-xs text-[#F6DDE2]">{BAKERY_CONFIG.tagline}</p>
            </div>
          </div>
          <p className="text-sm text-[#FFF5E9]/80 max-w-md leading-relaxed pt-1">
            Muskan&rsquo;s 100% eggless home bakehouse in Pirangut, Pune. Every celebration cake is
            baked fresh to order using fine Belgian cocoa, seasonal fruit compotes, and whipped cream.
          </p>
          <p className="text-xs text-[#F6DDE2]/90">
            {BAKERY_CONFIG.address} · Call / WhatsApp: {BAKERY_CONFIG.businessPhone}
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-lg font-semibold text-[#F6DDE2]">Explore</h4>
          <ul className="space-y-2 text-sm text-[#FFF5E9]/85">
            <li>
              <Link to="/menu" className="hover:text-[#F6DDE2] transition-colors">
                Cake Menu
              </Link>
            </li>
            <li>
              <Link to="/custom-cake" className="hover:text-[#F6DDE2] transition-colors">
                Custom Cake Request
              </Link>
            </li>
            <li>
              <Link to="/gallery" className="hover:text-[#F6DDE2] transition-colors">
                Cake Gallery
              </Link>
            </li>
            <li>
              <Link to="/track-order" className="hover:text-[#F6DDE2] transition-colors">
                Track Your Order
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-[#F6DDE2] transition-colors">
                About Muskan&rsquo;s Bakehouse
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-lg font-semibold text-[#F6DDE2]">Connect & Manage</h4>
          <ul className="space-y-2 text-sm text-[#FFF5E9]/85">
            <li>
              <Link to="/contact" className="hover:text-[#F6DDE2] transition-colors">
                Contact & Location
              </Link>
            </li>
            <li>
              <a
                href={enquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F6DDE2] transition-colors"
              >
                WhatsApp Enquiry
              </a>
            </li>
            <li>
              <a
                href={BAKERY_CONFIG.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F6DDE2] transition-colors"
              >
                Instagram
              </a>
            </li>
            <li className="pt-2 border-t border-[#FFF5E9]/15">
              <Link to="/admin" className="text-xs text-[#F6DDE2] hover:underline">
                Owner Admin Dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#FFF5E9]/10 py-4 px-4 sm:px-6 lg:px-8 text-xs text-[#FFF5E9]/70 max-w-7xl mx-auto flex flex-col sm:flex-row justify-between gap-2">
        <span>&copy; {new Date().getFullYear()} The Little Bakehouse, Pirangut, Pune.</span>
        <span>100% Eggless Home Bakery · Cash on Delivery &amp; Self Pickup</span>
      </div>
    </footer>
  );
}
