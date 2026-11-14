export const BAKERY_CONFIG = {
  brandName: 'The Little Bakehouse',
  ownerName: 'Muskan',
  tagline: 'Made with love, baked with happiness.',
  subTagline: 'Handmade with love · 100% Eggless',
  whatsappNumber: (import.meta.env.VITE_WHATSAPP_NUMBER as string) || '919665619972',
  businessPhone: (import.meta.env.VITE_BUSINESS_PHONE as string) || '96656 19972',
  address:
    (import.meta.env.VITE_BAKERY_ADDRESS as string) ||
    'Madhuban Society, Pirangut, Pune, Maharashtra',
  instagramUrl:
    (import.meta.env.VITE_INSTAGRAM_URL as string) ||
    'https://instagram.com/thelittlebakehousepune',
  promoBanner: 'Grand Opening Special: Free Cupcake with Every Purchase · 10–15% Launch Discount Applied',
  hours: 'Daily, 9:00 AM – 8:30 PM (Pre-orders recommended 4–6 hours ahead)',
  logoUrl: '/assets/aistudio/Logo_final__3be318aa.jpg',
  thankYouStickerUrl: '/assets/aistudio/Gemini_Generated_Image_7yib1j7yib1j7yib_47388a92.png',
  posterUrl: '/assets/aistudio/P3_final2__221abe1e.webp',
};

export function buildWhatsAppUrl(message: string): string {
  const cleanedNumber = BAKERY_CONFIG.whatsappNumber.replace(/\D/g, '');
  return `https://wa.me/${cleanedNumber}?text=${encodeURIComponent(message)}`;
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
