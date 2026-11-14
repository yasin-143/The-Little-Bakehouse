import { useState } from 'react';
import { Clock, Instagram, MapPin, MessageCircle, Phone } from 'lucide-react';
import { BAKERY_CONFIG, buildWhatsAppUrl } from '../lib/config';

export function ContactPage() {
  const [name, setName] = useState('');
  const [enquiryText, setEnquiryText] = useState('');

  const handleOpenWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const message = [
      'Hello Muskan! I am reaching out from The Little Bakehouse website.',
      name.trim() ? `Name: ${name.trim()}` : null,
      enquiryText.trim()
        ? `Enquiry: ${enquiryText.trim()}`
        : 'I would like to ask about ordering a fresh eggless cake.',
    ]
      .filter(Boolean)
      .join('\n');

    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="space-y-2 max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-widest text-[#9B4D3E]">
          Get in Touch · Pune, Maharashtra
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-semibold text-[#4A332B]">
          Contact The Little Bakehouse
        </h1>
        <p className="text-base text-[#765447]">
          Have a question about same-day availability, Pune delivery zones, or custom cake themes?
          Reach Muskan directly on WhatsApp or visit for self-pickup.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-[#765447]/12 p-6 space-y-5">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#C99183] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-sm text-[#4A332B]">Bakery Pickup Address</h2>
                <p className="text-sm text-[#765447] mt-0.5">{BAKERY_CONFIG.address}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#C99183] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-sm text-[#4A332B]">Call / WhatsApp</h2>
                <p className="font-mono-num text-sm text-[#765447] mt-0.5">
                  {BAKERY_CONFIG.businessPhone}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#C99183] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-sm text-[#4A332B]">Baking &amp; Pickup Hours</h2>
                <p className="text-sm text-[#765447] mt-0.5">{BAKERY_CONFIG.hours}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Instagram className="w-5 h-5 text-[#C99183] shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-sm text-[#4A332B]">Instagram</h2>
                <a
                  href={BAKERY_CONFIG.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[#9B4D3E] hover:underline mt-0.5 inline-block break-all"
                >
                  {BAKERY_CONFIG.instagramUrl}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#765447]/12 p-6 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h2 className="font-display text-3xl font-semibold text-[#4A332B]">
              Send a WhatsApp Order Enquiry
            </h2>
            <p className="text-sm text-[#765447]">
              Clicking below opens WhatsApp with your pre-filled message so you can send it
              directly to Muskan.
            </p>
          </div>

          <form onSubmit={handleOpenWhatsApp} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="contact-name" className="block text-xs font-semibold text-[#4A332B]">
                Your Name
              </label>
              <input
                id="contact-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Priya Kulkarni"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B] focus:outline-none focus:border-[#C99183]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contact-msg" className="block text-xs font-semibold text-[#4A332B]">
                Your Cake Enquiry
              </label>
              <textarea
                id="contact-msg"
                rows={4}
                value={enquiryText}
                onChange={(e) => setEnquiryText(e.target.value)}
                placeholder="Tell us the flavour, weight (500g / 1kg), delivery area in Pune, and date..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#765447]/25 bg-[#FFF5E9]/40 text-sm text-[#4A332B] focus:outline-none focus:border-[#C99183]"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#256D4F] text-white text-sm font-medium hover:bg-[#1E5940] transition-colors cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Continue to WhatsApp</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
